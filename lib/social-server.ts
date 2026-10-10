import 'server-only';
import {createHash} from 'node:crypto';
import {serviceDb} from './supabase';
import {siteUrl} from './config';
import {assertPublishable,socialCopy} from './social-content';
import {makeSocialImage} from './social-image';
import {BufferClient} from './buffer-api';
import type {Property} from './types';
import type {SocialDraft,SocialDelivery} from './social-content';

export const SOCIAL_BUCKET='social-assets';
export const bufferClient=()=>new BufferClient(process.env.BUFFER_API_KEY||'');
export function propertyVersion(p:Property){
 const normalized={...p,property_images:[...p.property_images].sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)).map(({url,...i})=>i)};
 return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
export async function loadSocialProperty(id:string){
 const db=serviceDb();
 const [{data,error},{data:source,error:sourceError}]=await Promise.all([
  db.from('properties').select('*,property_images(*)').eq('id',id).maybeSingle(),
  db.from('property_sources').select('advertising_permission,permission_confirmed_at').eq('property_id',id).maybeSingle(),
 ]);
 if(error||sourceError)throw new Error('物件情報を読み込めませんでした。');
 if(!data)throw new Error('物件が見つかりません。');
 if(!source?.advertising_permission||!source.permission_confirmed_at)throw new Error('物件の掲載承諾を確認してください。');
 const p=data as Property;
 p.property_images.sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
 assertPublishable(p);
 return p;
}
export async function draftResponse(draft:SocialDraft){
 const db=serviceDb();
 const [{data:preview,error},{data:deliveries,error:de}]=await Promise.all([
  db.storage.from(SOCIAL_BUCKET).createSignedUrl(draft.image_path,1800),
  db.from('social_deliveries').select('*').eq('draft_id',draft.id).order('created_at'),
 ]);
 if(error||de)throw new Error('投稿案を読み込めませんでした。');
 return {draft,imageUrl:preview!.signedUrl,deliveries:deliveries as SocialDelivery[]};
}
export async function prepareSocial(id:string,adminId:string){
 const p=await loadSocialProperty(id),version=propertyVersion(p),db=serviceDb();
 const {data:existing,error:lookup}=await db.from('social_drafts').select('*').eq('property_id',id).eq('property_version',version).maybeSingle();
 if(lookup)throw new Error('SNS投稿の保存先を確認してください。');
 if(existing)return draftResponse(existing as SocialDraft);
 const {data:file,error}=await db.storage.from('property-images').download(p.property_images[0].storage_path);
 if(error||!file)throw new Error('メイン写真を読み込めませんでした。');
 const image=await makeSocialImage(new Uint8Array(await file.arrayBuffer()));
 const draftId=crypto.randomUUID(),path=draftId+'/cover.jpg';
 const {error:upload}=await db.storage.from(SOCIAL_BUCKET).upload(path,image,{contentType:'image/jpeg',upsert:false});
 if(upload)throw new Error('SNS用の画像を保存できませんでした。');
 const copy=socialCopy(p,siteUrl());
 const {data:draft,error:insert}=await db.from('social_drafts').insert({
  id:draftId,property_id:id,property_version:version,property_name:p.property_name,
  instagram_text:copy.instagram,threads_text:copy.threads,image_path:path,created_by:adminId,
 }).select('*').single();
 if(insert){
  await db.storage.from(SOCIAL_BUCKET).remove([path]);
  if(insert.code==='23505'){
   const {data:other}=await db.from('social_drafts').select('*').eq('property_id',id).eq('property_version',version).single();
   if(other)return draftResponse(other as SocialDraft);
  }
  throw new Error('投稿案を保存できませんでした。');
 }
 return draftResponse(draft as SocialDraft);
}
