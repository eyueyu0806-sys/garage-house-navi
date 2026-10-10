import type {SocialDelivery,SocialService} from './social-content';
import {BufferFailure} from './buffer-api';

type Store={
 claim:(id:string)=>Promise<boolean>;
 finish:(id:string,result:{status:string;buffer_post_id?:string;error_message:string|null})=>Promise<void>;
};
// Each destination owns its claim. No retry of an ambiguous provider response.
export async function deliverSocial(
 rows:SocialDelivery[], store:Store,
 send:(row:SocialDelivery)=>Promise<{id:string}>,
){
 for(const row of rows){
  if(!['pending','failed'].includes(row.status)||!await store.claim(row.id))continue;
  let result:{status:string;buffer_post_id?:string;error_message:string|null};
  try{
   const post=await send(row);
   result={status:'scheduled',buffer_post_id:post.id,error_message:null};
  }catch(e){
   const uncertain=!(e instanceof BufferFailure)||e.uncertain;
   result={status:uncertain?'uncertain':'failed',error_message:
    uncertain?'結果が不明です。重複を防ぐため再送を停止しています。Bufferの予約一覧を確認してください。':
    (e as BufferFailure).message};
  }
  // A failed receipt write leaves "sending". Never turn a known external success
  // into a retryable error when our database is temporarily unavailable.
  await store.finish(row.id,result);
 }
}
export function selectedChannels(channels:{id:string;service:SocialService;isDisconnected:boolean;isLocked:boolean;isQueuePaused:boolean}[],ids:string[]){
 const selected=ids.map(id=>channels.find(c=>c.id===id));
 if(selected.some(c=>!c||c.isDisconnected||c.isLocked||c.isQueuePaused))throw new Error('投稿先の接続・一時停止の状態をBufferで確認してください。');
 if(new Set(selected.map(c=>c!.service)).size!==ids.length)throw new Error('投稿先はInstagram・Threadsから各1件を選んでください。');
 return selected as NonNullable<typeof selected[number]>[];
}
