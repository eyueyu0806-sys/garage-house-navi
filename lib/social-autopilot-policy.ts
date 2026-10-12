import {timingSafeEqual} from 'node:crypto';
import type {BufferPost} from './buffer-api';
export function cronAuthorized(header:string|null,secret:string|undefined){
 if(!secret||secret.length<32||!header)return false;
 const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(header);
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export function jstDate(at:number|string){return new Date((typeof at==='string'?Date.parse(at):at)+9*3600000).toISOString().slice(0,10);}
// Existing editorial cadence: Wednesday, Friday, Sunday, 20:00 Japan time.
export function nextSocialSlot(now=Date.now()){
 const today=jstDate(now);
 for(let i=0;i<8;i++){
  const day=new Date(Date.parse(today+'T00:00:00Z')+i*86400000);
  if(![0,3,5].includes(day.getUTCDay()))continue;
  const at=Date.parse(day.toISOString().slice(0,10)+'T20:00:00+09:00');
  if(at>=now+30*60000)return new Date(at).toISOString();
 }
 throw new Error('予約日を決められませんでした。');
}
export function alreadyMentioned(posts:BufferPost[],name:string,slug:string){
 const normalize=(v:string)=>v.normalize('NFKC').replace(/\s+/g,'');
 return posts.some(p=>normalize(p.text||'').includes(normalize(name))||(p.text||'').includes('/properties/'+slug));
}
export function occupiedSlot(posts:BufferPost[],dueAt:string){
 return posts.some(p=>p.dueAt&&jstDate(p.dueAt)===jstDate(dueAt)&&['scheduled','sending','sent','error','needs_approval'].includes(p.status));
}
export function postObservation(post:BufferPost,now=new Date().toISOString()){
 // Provider state stays separate from reservation receipt. A failed publish is NEVER
 // turned into a retryable creation failure (which would create a duplicate post).
 return {provider_status:post.status,provider_checked_at:now,provider_check_error:null,
  published_at:post.status==='sent'?post.sentAt:null,published_url:post.status==='sent'?post.externalLink:null};
}
