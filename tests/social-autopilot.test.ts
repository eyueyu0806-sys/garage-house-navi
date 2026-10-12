import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cronAuthorized,nextSocialSlot,occupiedSlot,alreadyMentioned,postObservation} from '../lib/social-autopilot-policy';
import {BufferClient,type BufferPost} from '../lib/buffer-api';
const post:BufferPost={id:'post-1',channelId:'ig',status:'scheduled',text:'津田西町１丁目 ガレージハウス',dueAt:'2026-10-14T11:00:00Z',sentAt:null,externalLink:null};
test('cron rejects missing, truncated and incorrect secrets',()=>{
 const secret='a'.repeat(48);
 assert.equal(cronAuthorized(null,secret),false);
 assert.equal(cronAuthorized('Bearer '+secret,undefined),false);
 assert.equal(cronAuthorized('Bearer '+secret.slice(1),secret),false);
 assert.equal(cronAuthorized('Bearer '+'b'.repeat(48),secret),false);
 assert.equal(cronAuthorized('Bearer '+secret,secret),true);
});
test('automation follows Wed Fri Sun 20 JST, leaves 30 minutes lead time and handles year changes',()=>{
 assert.equal(nextSocialSlot(Date.parse('2026-10-12T19:13:00Z')),'2026-10-14T11:00:00.000Z');
 assert.equal(nextSocialSlot(Date.parse('2026-10-14T10:29:00Z')),'2026-10-14T11:00:00.000Z');
 assert.equal(nextSocialSlot(Date.parse('2026-10-14T10:31:00Z')),'2026-10-16T11:00:00.000Z');
 assert.equal(nextSocialSlot(Date.parse('2026-12-31T15:01:00Z')),'2027-01-01T11:00:00.000Z');
});
test('provider history blocks duplicate properties and occupied Japan dates',()=>{
 assert.equal(alreadyMentioned([post],'津田西町1丁目　ガレージハウス','008'),true);
 assert.equal(alreadyMentioned([{...post,text:'https://garagehouse-navi.com/properties/008?utm_source=threads'}],'別名','008'),true);
 assert.equal(alreadyMentioned([post],'Kanon garage 玉造','new'),false);
 assert.equal(occupiedSlot([post],'2026-10-14T12:00:00Z'),true);
 assert.equal(occupiedSlot([post],'2026-10-15T11:00:00Z'),false);
});
test('only provider sent state is publication; errors never become retryable creation failures',()=>{
 assert.equal(postObservation(post).published_at,null);
 const failure=postObservation({...post,status:'error'});
 assert.equal(failure.provider_status,'error');assert.equal('status' in failure,false);
 const sent=postObservation({...post,status:'sent',sentAt:'2026-10-14T11:00:10Z',externalLink:'https://instagram.com/p/example'});
 assert.equal(sent.published_at,'2026-10-14T11:00:10Z');assert.match(sent.published_url!,/instagram/);
});
test('Buffer reads actual post status and paginates history without leaking authentication',async()=>{
 const requests:any[]=[];
 const c=new BufferClient('private-key',async(_,init)=>{
  const req=JSON.parse(String(init?.body));requests.push(req);
  if(req.query.startsWith('query Post('))return Response.json({data:{post}});
  return Response.json({data:{posts:{edges:[{node:post}],pageInfo:{hasNextPage:!req.variables.after,endCursor:'cursor'}}}});
 });
 assert.equal((await c.post('post-1')).status,'scheduled');
 assert.equal((await c.recentPosts('org',['ig'],'2026-10-01T00:00:00Z')).length,2);
 assert.equal(requests[2].variables.after,'cursor');assert.doesNotMatch(JSON.stringify(requests),/private-key/);
 const excessive=new BufferClient('key',async()=>Response.json({data:{posts:{edges:[],pageInfo:{hasNextPage:true,endCursor:'cursor'}}}}));
 await assert.rejects(()=>excessive.recentPosts('org',['ig'],'2026-10-01T00:00:00Z'));
});
