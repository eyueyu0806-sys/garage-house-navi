import 'server-only';
import {serviceDb} from './supabase';
import {bufferClient,prepareSocial,loadSocialProperty,propertyVersion,SOCIAL_BUCKET} from './social-server';
import {assertPublishable,socialTextsSchema} from './social-content';
import {deliverSocial,selectedChannels} from './social-schedule';
import {nextSocialSlot,alreadyMentioned,occupiedSlot,postObservation,jstDate} from './social-autopilot-policy';
import type {SocialDelivery,SocialChannel} from './social-content';
import type {BufferPost} from './buffer-api';

export async function runSocialAutopilot(monitorOnly=false){
 const db=serviceDb(),client=bufferClient(),now=Date.now();
 const {data:run,error:startError}=await db.from('social_autopilot_runs').insert({}).select('id').single();
 if(startError||!run)throw new Error('自動運転の実行記録を保存できませんでした。');
 const report:Record<string,unknown>={mode:monitorOnly?'monitor':'schedule',checked_at:new Date(now).toISOString()};
 let status:'ok'|'attention'|'error'='ok';
 try{
  const {data:settings,error:settingsError}=await db.from('social_autopilot_settings').select('*').eq('id',true).single();
  if(settingsError||!settings)throw new Error('自動運転の設定を確認できませんでした。');
  const channels=await client.channels();
  const configured=channels.filter(c=>(settings.channel_ids as string[]).includes(c.id));
  report.enabled=settings.enabled;
  report.channels=configured.map(c=>({id:c.id,name:c.name,service:c.service,isDisconnected:c.isDisconnected,isLocked:c.isLocked,isQueuePaused:c.isQueuePaused}));

  const {data:receipts,error:receiptError}=await db.from('social_deliveries').select('*').order('created_at',{ascending:false}).limit(100);
  if(receiptError)throw new Error('予約履歴を確認できませんでした。');
  const observations:Record<string,unknown>[]=[];
  const confirmedPosts:BufferPost[]=[];
  // Check all unsettled receipts and recent published receipts; keep the last known
  // observation on read failure, with a separate failure timestamp/message.
  const recentCutoff=new Date(now-30*86400000).toISOString();
  const rows=(receipts||[]).filter(r=>r.provider_status!=='sent'||r.due_at>=recentCutoff);
  let unavailable=false;
  for(let offset=0;offset<rows.length;offset+=4){
   const batch=await Promise.all(rows.slice(offset,offset+4).map(async(row)=>{
    if(!row.buffer_post_id)return {id:row.id,status:row.status,due_at:row.due_at,needs_attention:true};
    try{
     const post=await client.post(row.buffer_post_id);
     if(post.channelId!==row.channel_id)throw new Error('投稿先が一致しません。');
     confirmedPosts.push(post);
     const {error}=await db.from('social_deliveries').update(postObservation(post)).eq('id',row.id);
     if(error)throw new Error('結果を保存できませんでした。');
     return {id:row.id,buffer_post_id:post.id,service:row.service,status:post.status,due_at:post.dueAt,
      published_at:post.sentAt,published_url:post.externalLink,
      needs_attention:['error','draft','needs_approval'].includes(post.status)||(post.status!=='sent'&&Date.parse(row.due_at)<now-3600000)};
    }catch{
     unavailable=true;
     await db.from('social_deliveries').update({provider_check_error:'投稿結果の取得に失敗しました。',provider_checked_at:new Date().toISOString()}).eq('id',row.id);
     return {id:row.id,buffer_post_id:row.buffer_post_id,status:'unknown',needs_attention:true};
    }
   }));
   observations.push(...batch);
  }
  report.deliveries=observations;
  if(unavailable||observations.some(o=>o.needs_attention))status='attention';
  const dueAt=nextSocialSlot(now);
  report.next_slot=dueAt;
  if(configured.length!==2||new Set(configured.map(c=>c.service)).size!==2)throw new Error('自動投稿先のInstagram・Threadsを各1件設定してください。');
  selectedChannels(channels,settings.channel_ids);
  const history:BufferPost[]=[];
  for(const org of new Set(configured.map(c=>c.organizationId))){
   if(!org)throw new Error('投稿先の組織を確認できませんでした。');
   history.push(...await client.recentPosts(org,configured.filter(c=>c.organizationId===org).map(c=>c.id),recentCutoff));
  }
  const listedIds=new Set(history.map(p=>p.id));
  const missing=confirmedPosts.filter(p=>p.dueAt&&p.dueAt>=recentCutoff&&!listedIds.has(p.id));
  // A filtered list must include known posts in its own interval. An empty or
  // incomplete provider list is not evidence that the account has no posts.
  report.history_count=history.length;
  report.history_consistent=missing.length===0;
  for(const post of missing)history.push(post);
  report.upcoming=history.filter(p=>['scheduled','sending'].includes(p.status)).map(({id,channelId,dueAt,status})=>({id,channelId,dueAt,status}));
  if(missing.length){report.history_warning='投稿一覧と個別確認が一致しないため、新規予約を保留します。';status='attention';}
  const [{data:properties,error:pe},{data:used,error:ue},{data:slot,error:se}]=await Promise.all([
   db.from('properties').select('id,property_name,slug,next_update_at').eq('status','published').gte('next_update_at',jstDate(dueAt)).order('information_checked_at',{ascending:false}),
   db.from('social_drafts').select('property_id').eq('status','locked'),
   db.from('social_autopilot_slots').select('draft_id').eq('due_at',dueAt).maybeSingle(),
  ]);
  if(pe||ue||se)throw new Error('投稿候補を読み込めませんでした。');
  const usedIds=new Set((used||[]).map(p=>p.property_id));
  const candidates:typeof properties=[];
  for(const p of properties||[]){
   if(usedIds.has(p.id)||alreadyMentioned(history,p.property_name,p.slug))continue;
   try{assertPublishable(await loadSocialProperty(p.id),now,dueAt);candidates.push(p);}catch{/* Not eligible; never override facts or permissions. */}
  }
  report.candidates=candidates.map(p=>({id:p.id,name:p.property_name}));
  if(monitorOnly||!settings.enabled){report.action=monitorOnly?'monitor_only':'disabled';}
  else if(status==='attention'){report.action='held_for_delivery_check';}
  else if(slot||occupiedSlot(history,dueAt)){report.action='already_reserved';}
  else if(!candidates.length){report.action='no_eligible_property';status='attention';}
  else{
   const prepared=await prepareSocial(candidates[0].id,null),draft=prepared.draft;
   // Recheck immediately before reserving; use exactly the registered facts.
   const latest=await loadSocialProperty(candidates[0].id);
   assertPublishable(latest,Date.now(),dueAt);
   if(propertyVersion(latest)!==draft.property_version)throw new Error('物件情報が変わったため次回の自動運転で再確認します。');
   socialTextsSchema.parse(draft);
   const {data:reserved,error:reserveError}=await db.rpc('reserve_social_automatic',{
    p_id:draft.id,p_due_at:dueAt,p_channels:configured.map((c:SocialChannel)=>({id:c.id,name:c.name,service:c.service})),
   });
   if(reserveError)throw new Error('自動予約を保存できませんでした。');
   if(!reserved){report.action='already_reserved';}
   else{
    const {data:signed,error:signError}=await db.storage.from(SOCIAL_BUCKET).createSignedUrl(draft.image_path,35*86400);
    if(signError||!signed)throw new Error('投稿画像を読み込めませんでした。');
    const {data:deliveries,error:de}=await db.from('social_deliveries').select('*').eq('draft_id',draft.id);
    if(de)throw new Error('送信予定を読み込めませんでした。');
    await deliverSocial(deliveries as SocialDelivery[],{
     claim:async id=>{
      const {data,error}=await db.from('social_deliveries').update({status:'sending',error_message:null}).eq('id',id).eq('status','pending').select('id').maybeSingle();
      if(error)throw new Error('送信状態を保存できませんでした。');return Boolean(data);
     },
     finish:async(id,result)=>{
      const {error}=await db.from('social_deliveries').update(result).eq('id',id).eq('status','sending');
      if(error)throw new Error('予約結果を保存できませんでした。');
     },
    },row=>client.schedule({channelId:row.channel_id,service:row.service,text:row.service==='instagram'?draft.instagram_text:draft.threads_text,imageUrl:signed.signedUrl,dueAt}));
    const {data:out,error:oe}=await db.from('social_deliveries').select('id,service,status,buffer_post_id,error_message').eq('draft_id',draft.id);
    if(oe)throw new Error('予約結果を確認できませんでした。');
    report.reservation={property_name:draft.property_name,due_at:dueAt,deliveries:out};
    report.action='reserved';
    if(out?.length!==2||out.some(r=>r.status!=='scheduled')){status='attention';report.action='reservation_needs_attention';}
   }
  }
 }catch(e){
  status='error';
  // Only authored Japanese messages; no raw provider/DB payloads or secrets.
  report.error=e instanceof Error&&/[ぁ-ん]/.test(e.message)?e.message:'自動運転の接続を確認できませんでした。';
 }
 const {error:endError}=await db.from('social_autopilot_runs').update({status,report,finished_at:new Date().toISOString()}).eq('id',run.id);
 if(endError)throw new Error('自動運転の結果を保存できませんでした。');
 return {run_id:run.id,status,...report};
}
