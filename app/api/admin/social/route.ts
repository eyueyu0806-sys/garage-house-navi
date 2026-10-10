import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getAdmin,serviceDb} from '@/lib/supabase';
import {sameOrigin,readJson,rateLimit} from '@/lib/security';
import {prepareSocial,bufferClient,draftResponse,loadSocialProperty,propertyVersion,SOCIAL_BUCKET} from '@/lib/social-server';
import {assertPublishable,checkSchedule,socialTextsSchema} from '@/lib/social-content';
import {deliverSocial,selectedChannels} from '@/lib/social-schedule';
import type {SocialDraft,SocialDelivery} from '@/lib/social-content';

export const runtime='nodejs';
export const maxDuration=60;
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepare'),property_id:z.uuid()}),
 z.object({action:z.literal('save'),id:z.uuid(),...socialTextsSchema.shape}),
 z.object({action:z.literal('schedule'),id:z.uuid(),...socialTextsSchema.shape,channel_ids:z.array(z.string().min(1).max(200)).min(1).max(2),scheduled_jst:z.string(),confirmed:z.literal(true)}),
 z.object({action:z.literal('retry'),id:z.uuid(),confirmed:z.literal(true)}),
]);
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function GET(request:Request){
 const admin=await getAdmin();if(!admin)return json({error:'管理者ログインが必要です。'},401);
 try{
  const id=new URL(request.url).searchParams.get('id');
  if(id){
   if(!z.uuid().safeParse(id).success)return json({error:'投稿IDを確認してください。'},422);
   const {data,error}=await admin.db.from('social_drafts').select('*').eq('id',id).maybeSingle();
   if(error||!data)return json({error:'投稿案が見つかりません。'},404);
   return json(await draftResponse(data as SocialDraft));
  }
  if(!process.env.BUFFER_API_KEY)return json({configured:false,channels:[]});
  return json({configured:true,channels:await bufferClient().channels()});
 }catch{return json({error:'Bufferへの接続に失敗しました。接続キーと権限を確認してください。'},502);}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'不正なリクエストです。'},403);
 const admin=await getAdmin();if(!admin)return json({error:'管理者ログインが必要です。'},401);
 try{
  const parsed=schema.safeParse(await readJson(request,16000));
  if(!parsed.success)return json({error:'入力内容・文字数・確認欄を確認してください。'},422);
  const body=parsed.data,db=serviceDb();
  if(body.action==='prepare'){
   if(!await rateLimit(request,'social-prepare',40,admin.user.id))return json({error:'画像作成の回数が多いため、時間をおいてください。'},429);
   return json(await prepareSocial(body.property_id,admin.user.id));
  }
  const {data:loaded,error:readError}=await db.from('social_drafts').select('*').eq('id',body.id).maybeSingle();
  if(readError||!loaded)return json({error:'投稿案が見つかりません。'},404);
  let draft=loaded as SocialDraft;
  if(body.action==='save'){
   const {data,error}=await db.from('social_drafts').update({instagram_text:body.instagram_text,threads_text:body.threads_text})
    .eq('id',body.id).eq('status','draft').select('*').maybeSingle();
   if(error||!data)return json({error:'予約処理済みの投稿はBufferで編集してください。'},409);
   return json(await draftResponse(data as SocialDraft));
  }
  if(!process.env.BUFFER_API_KEY)return json({error:'Bufferの接続キーが未設定です。下書きは保存できます。'},503);
  if(!draft.property_id)return json({error:'元の物件が削除されています。'},409);
  const property=await loadSocialProperty(draft.property_id);
  if(propertyVersion(property)!==draft.property_version)return json({error:'物件情報が更新されています。最新の物件から投稿案を作り直してください。'},409);
  const client=bufferClient();
  if(body.action==='schedule'&&draft.status==='draft'){
   const dueAt=checkSchedule(body.scheduled_jst);
   assertPublishable(property,Date.now(),dueAt);
   const channels=await client.channels();
   selectedChannels(channels,body.channel_ids);
   const targets=body.channel_ids.map(id=>channels.find(c=>c.id===id)!);
   const {error}=await db.rpc('reserve_social_draft',{
    p_id:draft.id,p_instagram:body.instagram_text,p_threads:body.threads_text,p_due_at:dueAt,
    p_channels:targets.map(c=>({id:c.id,name:c.name,service:c.service})),p_admin:admin.user.id,
   });
   if(error)return json({error:'予約を保存できませんでした。再読み込みして状態を確認してください。'},409);
   const {data:locked,error:lockRead}=await db.from('social_drafts').select('*').eq('id',draft.id).single();
   if(lockRead||!locked)return json({error:'予約処理の状態を再読み込みしてください。'},503);
   draft=locked as SocialDraft;
  }else if(body.action==='schedule'){
   // Same submit after a lost HTTP response is read-only, not a second send.
   return json(await draftResponse(draft));
  }
  if(draft.status!=='locked'||!draft.due_at)return json({error:'予約日時を設定してください。'},422);
  if(Date.parse(draft.due_at)<Date.now()+60000)return json({error:'予約時刻が近すぎるか過ぎています。Bufferで予約状況を確認してください。'},409);
  assertPublishable(property,Date.now(),draft.due_at);
  const {data:rows,error:deliveryError}=await db.from('social_deliveries').select('*').eq('draft_id',draft.id);
  if(deliveryError)throw new Error('予約履歴を確認できませんでした。');
  if(body.action==='retry'){
   const channels=await client.channels();
   selectedChannels(channels,(rows as SocialDelivery[]).filter(r=>['pending','failed'].includes(r.status)).map(r=>r.channel_id));
  }
  const {data:signed,error:signError}=await db.storage.from(SOCIAL_BUCKET).createSignedUrl(draft.image_path,35*86400);
  if(signError||!signed)throw new Error('投稿画像を取得できませんでした。');
  await deliverSocial(rows as SocialDelivery[],{
   claim:async id=>{
    const {data,error}=await db.from('social_deliveries').update({status:'sending',error_message:null})
     .eq('id',id).in('status',['pending','failed']).select('id').maybeSingle();
    if(error)throw new Error('予約処理を開始できませんでした。');return Boolean(data);
   },
   finish:async(id,result)=>{
    const {error}=await db.from('social_deliveries').update(result).eq('id',id).eq('status','sending');
    if(error)throw new Error('結果を保存できませんでした。Bufferで予約一覧を確認してください。');
   },
  },row=>client.schedule({channelId:row.channel_id,service:row.service,
   text:row.service==='instagram'?draft.instagram_text:draft.threads_text,imageUrl:signed.signedUrl,dueAt:draft.due_at!}));
  return json(await draftResponse(draft));
 }catch(e){
  // Our own Japanese messages are safe for display. Never forward DB/provider objects.
  const message=e instanceof Error&&/^[ぁ-んァ-ヶ一-龠A-Za-z]/.test(e.message)&&/[ぁ-ん]/.test(e.message)?e.message:'処理できませんでした。再読み込みして状態を確認してください。';
  return json({error:message},422);
 }
}
