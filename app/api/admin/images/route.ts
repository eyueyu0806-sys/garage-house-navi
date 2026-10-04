import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getAdmin} from '@/lib/supabase';
import {sameOrigin,readJson} from '@/lib/security';

const BUCKET='property-images';
const MAX_IMAGE_SIZE=50*1024*1024;
const IMAGE_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'} as const;
type ImageContentType=keyof typeof IMAGE_TYPES;

const uploadRequest=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepare'),property_id:z.uuid(),content_type:z.enum(Object.keys(IMAGE_TYPES) as [ImageContentType,...ImageContentType[]]),size:z.number().int().positive().max(MAX_IMAGE_SIZE)}),
 z.object({action:z.literal('complete'),property_id:z.uuid(),path:z.string().min(1).max(200),content_type:z.enum(Object.keys(IMAGE_TYPES) as [ImageContentType,...ImageContentType[]]),size:z.number().int().positive().max(MAX_IMAGE_SIZE)}),
]);

export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'不正なリクエストです。'},{status:403});
 const admin=await getAdmin();
 if(!admin)return NextResponse.json({error:'ログインが必要です。'},{status:401});
 try{
  const parsed=uploadRequest.safeParse(await readJson(request,8000));
  if(!parsed.success)return NextResponse.json({error:'JPEG / PNG / WebP / AVIF、50MB以内の写真を選んでください。'},{status:422});
  const body=parsed.data;
  const {data:property}=await admin.db.from('properties').select('id,property_name').eq('id',body.property_id).maybeSingle();
  if(!property)return NextResponse.json({error:'物件が見つかりません。'},{status:404});

  if(body.action==='prepare'){
   const {data:existing,error:readError}=await admin.db.from('property_images').select('id').eq('property_id',body.property_id);
   if(readError)throw readError;
   if((existing?.length??0)>=30)return NextResponse.json({error:'写真は30枚までです。'},{status:422});
   const extension=IMAGE_TYPES[body.content_type];
   const path=`${body.property_id}/${crypto.randomUUID()}.${extension}`;
   const {data:signed,error}=await admin.db.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});
   if(error||!signed)throw error||new Error('SIGNED_UPLOAD_URL_UNAVAILABLE');
   return NextResponse.json({path,token:signed.token});
  }

  const filename=body.path.slice(`${body.property_id}/`.length);
  const extension=IMAGE_TYPES[body.content_type];
  if(!body.path.startsWith(`${body.property_id}/`)||!new RegExp(`^[0-9a-f-]{36}\\.${extension}$`,'i').test(filename))
   return NextResponse.json({error:'画像の保存先を確認できません。再度お試しください。'},{status:422});

  const storage=admin.db.storage.from(BUCKET);
  const {data:stored,error:infoError}=await storage.info(body.path);
  if(infoError||!stored)return NextResponse.json({error:'写真のアップロードを確認できませんでした。もう一度お試しください。'},{status:422});
  if(stored.size!==body.size||stored.size>MAX_IMAGE_SIZE||stored.contentType!==body.content_type){
   await storage.remove([body.path]);
   return NextResponse.json({error:'写真の形式または容量を確認してください。'},{status:422});
  }
  const {data:existing,error:readError}=await admin.db.from('property_images').select('sort_order').eq('property_id',body.property_id).order('sort_order',{ascending:false});
  if(readError)throw readError;
  if((existing?.length??0)>=30){await storage.remove([body.path]);return NextResponse.json({error:'写真は30枚までです。'},{status:422});}
  const {data:image,error:insertError}=await admin.db.from('property_images').insert({property_id:body.property_id,storage_path:body.path,alt:property.property_name,sort_order:(existing?.[0]?.sort_order??-1)+1}).select().single();
  if(insertError){await storage.remove([body.path]);throw insertError;}
  const {data:signed,error:signedError}=await storage.createSignedUrl(body.path,3600);
  if(signedError||!signed)throw signedError||new Error('SIGNED_IMAGE_URL_UNAVAILABLE');
  return NextResponse.json({image:{...image,url:signed.signedUrl}});
 }catch{
  return NextResponse.json({error:'アップロードできませんでした。接続とファイルを確認してください。'},{status:500});
 }
}

export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'不正なリクエストです。'},{status:403});
 const admin=await getAdmin();
 if(!admin)return NextResponse.json({error:'ログインが必要です。'},{status:401});
 try{
  const schema=z.object({property_id:z.uuid(),id:z.uuid(),action:z.enum(['delete','reorder','alt']),order:z.array(z.uuid()).max(30).optional(),alt:z.string().max(300).optional()});
  const body=schema.parse(await readJson(request));
  const {data:images,error}=await admin.db.from('property_images').select('*').eq('property_id',body.property_id);
  if(error)throw error;
  const img=images?.find(x=>x.id===body.id);
  if(!img)return NextResponse.json({error:'画像が見つかりません。'},{status:404});
  if(body.action==='delete'){
   const {data:p}=await admin.db.from('properties').select('status').eq('id',body.property_id).single();
   if(p?.status==='published'&&images?.length===1)return NextResponse.json({error:'公開中の最後の写真は削除できません。先に下書きへ変更してください。'},{status:422});
   const {error:del}=await admin.db.from('property_images').delete().eq('id',img.id);
   if(del)throw del;
   await admin.db.storage.from(BUCKET).remove([img.storage_path]);
  }else if(body.action==='alt'){
   const {error:e}=await admin.db.from('property_images').update({alt:body.alt||''}).eq('id',img.id);
   if(e)throw e;
  }else{
   const order=body.order||[];
   if(order.length!==images?.length||new Set(order).size!==order.length||!order.every(id=>images.some(x=>x.id===id)))return NextResponse.json({error:'画像一覧が変更されました。再読み込みしてください。'},{status:409});
   const {error:e}=await admin.db.rpc('reorder_property_images',{p_property_id:body.property_id,p_ids:order});
   if(e)throw e;
  }
  return NextResponse.json({ok:true});
 }catch{
  return NextResponse.json({error:'画像を更新できませんでした。'},{status:400});
 }
}
