import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {socialCopy,jstToIso,checkSchedule,assertPublishable} from '../lib/social-content';
import {BufferClient,BufferFailure} from '../lib/buffer-api';
import {deliverSocial,selectedChannels} from '../lib/social-schedule';
import {makeSocialImage} from '../lib/social-image';
import {demoProperties} from '../lib/demo';
import type {SocialDelivery} from '../lib/social-content';

test('social copy uses registered facts, preserves zero fees and excludes internal/unknown fields',()=>{
 const p={...demoProperties[0],city:'大阪府箕面市',management_fee:0,ev_charger:null,pet:false,catch_copy:null};
 const result=socialCopy(p,'https://garagehouse-navi.com');
 assert.match(result.instagram,/管理費 0円/);
 assert.doesNotMatch(result.instagram,/大阪府大阪府|EV充電|ペット可|幅|奥行/);
 const url=result.threads.match(/https:\/\/[^\s]+/)![0];
 assert.equal(new URL(url).searchParams.get('utm_source'),'threads');
 assert.match(new URL(url).pathname,/^\/properties\//);
 assert.ok(Array.from(result.threads).length<=500);
 assert.ok(Array.from(socialCopy({...p,catch_copy:'あ'.repeat(200),property_name:'名'.repeat(200)},'https://garagehouse-navi.com').threads).length<=500);
});
test('Japan scheduling is independent of browser timezone and rejects rollover/past/long horizon',()=>{
 assert.equal(jstToIso('2026-10-11T10:00'),'2026-10-11T01:00:00.000Z');
 assert.throws(()=>jstToIso('2026-02-30T10:00'));
 assert.throws(()=>jstToIso('2026-10-11T24:00'));
 const now=Date.parse('2026-10-10T14:00:00Z');
 assert.throws(()=>checkSchedule('2026-10-10T23:01',now));
 assert.throws(()=>checkSchedule('2026-12-10T10:00',now));
 assert.equal(checkSchedule('2026-10-11T10:00',now),'2026-10-11T01:00:00.000Z');
});
test('nonpublished, missing image and outdated listing cannot be promoted',()=>{
 const p={...demoProperties[0],status:'published' as const,next_update_at:'2026-10-12'};
 const now=Date.parse('2026-10-10T14:00:00Z');
 assert.doesNotThrow(()=>assertPublishable(p,now,'2026-10-11T01:00:00Z'));
 assert.throws(()=>assertPublishable({...p,status:'closed'},now));
 assert.throws(()=>assertPublishable({...p,property_images:[]},now));
 assert.throws(()=>assertPublishable(p,now,'2026-10-13T01:00:00Z'));
});
test('social image is a real JPEG at 4:5 with full photo and without metadata',async()=>{
 const input=await sharp({create:{width:1200,height:600,channels:3,background:'#c00'}}).jpeg().toBuffer();
 const output=await makeSocialImage(input);
 const meta=await sharp(output).metadata();
 assert.equal(meta.width,1080);assert.equal(meta.height,1350);assert.equal(meta.format,'jpeg');
 assert.equal(meta.exif,undefined);
 const {data}=await sharp(output).raw().toBuffer({resolveWithObject:true});
 assert.ok(data[0]>220); // padding rather than a crop filling the whole image
});
const schedule={channelId:'ig',service:'instagram' as const,text:'登録情報',imageUrl:'https://example.com/image.jpg',dueAt:'2026-10-11T01:00:00Z'};
test('Buffer uses GraphQL variables, image, explicit scheduling, and never sends secrets in payload',async()=>{
 let sent:Record<string,any>={};
 const transport:typeof fetch=async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({data:{createPost:{__typename:'PostActionSuccess',post:{id:'buffer-1',dueAt:schedule.dueAt}}}});};
 const client=new BufferClient('secret-test',transport);
 assert.equal((await client.schedule(schedule)).id,'buffer-1');
 assert.equal(sent.variables.input.mode,'customScheduled');
 assert.equal(sent.variables.input.metadata.instagram.type,'post');
 assert.equal(sent.variables.input.schedulingType,'automatic');
 assert.equal(sent.variables.input.needsApproval,false);
 assert.doesNotMatch(JSON.stringify(sent),/secret-test/);
});
test('Buffer timeout and HTTP 500 are uncertain, auth/quota rejections are safely retryable',async()=>{
 for(const status of [401,403,429,500]){
  const c=new BufferClient('key',async()=>new Response('',{status}));
  await assert.rejects(()=>c.schedule(schedule),(e:unknown)=>e instanceof BufferFailure&&e.uncertain===(status===500));
 }
 await assert.rejects(()=>new BufferClient('key',async()=>{throw new Error('network');}).schedule(schedule),(e:unknown)=>e instanceof BufferFailure&&e.uncertain);
 await assert.rejects(()=>new BufferClient('key',async()=>Response.json({data:{createPost:{__typename:'Unexpected'}}})).schedule(schedule),(e:unknown)=>e instanceof BufferFailure&&e.uncertain);
});
function row(id:string,status='pending'):SocialDelivery{return {id,draft_id:'draft',channel_id:id,channel_name:id,service:'instagram',status,buffer_post_id:null,error_message:null,due_at:schedule.dueAt};}
test('concurrent schedule attempts claim each destination once; success is never sent again',async()=>{
 const states=new Map([['a',row('a')],['b',row('b')]]);let calls=0;
 const store={claim:async(id:string)=>{const r=states.get(id)!;if(!['pending','failed'].includes(r.status))return false;r.status='sending';return true;},
 finish:async(id:string,r:any)=>{Object.assign(states.get(id)!,r);}};
 const send=async()=>{calls++;return {id:'result'};};
 await Promise.all([deliverSocial([row('a'),row('b')],store,send),deliverSocial([row('a'),row('b')],store,send)]);
 await deliverSocial([...states.values()],store,send);
 assert.equal(calls,2);assert.equal(states.get('a')!.status,'scheduled');
});
test('partial failure retries only explicit failures, not successes or ambiguous timeouts',async()=>{
 const states=new Map(['a','b','c'].map(id=>[id,row(id)]));const counts:Record<string,number>={};
 const store={claim:async(id:string)=>{const r=states.get(id)!;if(!['pending','failed'].includes(r.status))return false;r.status='sending';return true;},
 finish:async(id:string,r:any)=>{Object.assign(states.get(id)!,r);}};
 const send=async(r:SocialDelivery)=>{counts[r.id]=(counts[r.id]||0)+1;if(r.id==='b'&&counts.b===1)throw new BufferFailure('quota');if(r.id==='c')throw new BufferFailure('timeout',true);return {id:r.id};};
 await deliverSocial([...states.values()],store,send);
 assert.equal(states.get('c')!.status,'uncertain');
 await deliverSocial([...states.values()],store,send);
 assert.deepEqual(counts,{a:1,b:2,c:1});
});
test('receipt write failure does not become retryable after remote success',async()=>{
 let status='pending',calls=0;
 const store={claim:async()=>{if(status!=='pending')return false;status='sending';return true;},
 finish:async()=>{throw new Error('database offline');}};
 await assert.rejects(()=>deliverSocial([row('a')],store,async()=>{calls++;return {id:'success'};}));
 await deliverSocial([row('a')],store,async()=>{calls++;return {id:'duplicate'};});
 assert.equal(calls,1);assert.equal(status,'sending');
});
test('channel selection rejects wrong account IDs, paused channels, and two of same platform',()=>{
 const a={id:'a',service:'instagram' as const,isDisconnected:false,isLocked:false,isQueuePaused:false};
 assert.throws(()=>selectedChannels([a],['unknown']));
 assert.throws(()=>selectedChannels([{...a,isQueuePaused:true}],['a']));
 assert.throws(()=>selectedChannels([a,{...a,id:'b'}],['a','b']));
 assert.equal(selectedChannels([a],['a']).length,1);
});
