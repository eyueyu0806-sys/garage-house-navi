// Only server modules may instantiate this client with a secret.
import type {SocialChannel,SocialService} from './social-content';
export type BufferPost={id:string;status:string;channelId:string;text:string|null;dueAt:string|null;sentAt:string|null;externalLink:string|null};

export class BufferFailure extends Error {
 constructor(message:string,public uncertain=false){super(message);}
}
export class BufferClient {
 constructor(private key:string,private transport:typeof fetch=fetch){}
 private async query<T>(query:string,variables:Record<string,unknown>={},mutation=false):Promise<T>{
  if(!this.key)throw new BufferFailure('Bufferの接続キーが未設定です。');
  try{
   const r=await this.transport('https://api.buffer.com',{
    method:'POST',headers:{Authorization:'Bearer '+this.key,'Content-Type':'application/json'},
    body:JSON.stringify({query,variables}),cache:'no-store',signal:AbortSignal.timeout(20000),
   });
   if(!r.ok)throw new BufferFailure(
    r.status===401||r.status===403?'Bufferの接続キーと権限を確認してください。':
    r.status===429?'Bufferの利用上限です。時間をおいてください。':'Bufferへの接続に失敗しました。',
    mutation && ![401,403,429].includes(r.status));
   const body=await r.json();
   if(body.errors?.length||!body.data)throw new BufferFailure('Bufferから正常な結果を取得できませんでした。',mutation);
   return body.data as T;
  }catch(e){
   if(e instanceof BufferFailure)throw e;
   throw new BufferFailure('Bufferの応答を確認できませんでした。',mutation);
  }
 }
 async channels():Promise<SocialChannel[]>{
  const data=await this.query<{account:{organizations:{id:string;name:string}[]}}>('{account{organizations{id name}}}');
  const result:SocialChannel[]=[];
  for(const org of data.account.organizations){
   const data=await this.query<{channels:Omit<SocialChannel,'organizationName'>[]}>(
    'query Channels($input:ChannelsInput!){channels(input:$input){id name service isDisconnected isLocked isQueuePaused timezone}}',
    {input:{organizationId:org.id}});
   for(const c of data.channels)if(c.service==='instagram'||c.service==='threads')result.push({...c,organizationName:org.name,organizationId:org.id});
  }
  return result;
 }
 async post(id:string):Promise<BufferPost>{
  const data=await this.query<{post:BufferPost}>('query Post($input:PostInput!){post(input:$input){id status channelId text dueAt sentAt externalLink}}',{input:{id}});
  if(!data.post?.id)throw new BufferFailure('投稿結果を確認できませんでした。');
  return data.post;
 }
 async recentPosts(organizationId:string,channelIds:string[],since:string):Promise<BufferPost[]>{
  const result:BufferPost[]=[];let after:string|null=null;
  for(let page=0;page<5;page++){
   const data: {posts:{edges:{node:BufferPost}[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}=await this.query(
    'query Posts($input:PostsInput!,$after:String){posts(input:$input,first:100,after:$after){edges{node{id status channelId text dueAt sentAt externalLink}}pageInfo{hasNextPage endCursor}}}',
    {input:{organizationId,filter:{channelIds,startDate:since}},after});
   result.push(...data.posts.edges.map(e=>e.node));
   if(!data.posts.pageInfo.hasNextPage)return result;
   after=data.posts.pageInfo.endCursor;
   if(!after)break;
  }
  throw new BufferFailure('投稿履歴をすべて確認できないため自動予約を停止しました。');
 }
 async schedule(input:{channelId:string;service:SocialService;text:string;imageUrl:string;dueAt:string}){
  const payload={
   channelId:input.channelId,text:input.text,assets:[{image:{url:input.imageUrl}}],
   schedulingType:'automatic',mode:'customScheduled',dueAt:input.dueAt,
   needsApproval:false,saveToDraft:false,
   ...(input.service==='instagram'?{metadata:{instagram:{type:'post',shouldShareToFeed:true}}}:{}),
  };
  const data=await this.query<{createPost:{__typename:string;post?:{id:string;dueAt:string};message?:string}}>(
   'mutation Schedule($input:CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{id dueAt}} ... on MutationError{message}}}',
   {input:payload},true);
  if(data.createPost.__typename!=='PostActionSuccess'){
   if(!data.createPost.message)throw new BufferFailure('Bufferの予約結果を確認できませんでした。',true);
   throw new BufferFailure('Bufferが予約を受け付けませんでした。接続・予約上限・画像条件をBufferで確認してください。');
  }
  if(!data.createPost.post?.id)throw new BufferFailure('Bufferの予約IDを確認できませんでした。',true);
  return data.createPost.post;
 }
}
