import {revalidatePath} from 'next/cache';
import {NextResponse} from 'next/server';import {z} from 'zod';import {getAdmin} from '@/lib/supabase';import {sameOrigin,readJson} from '@/lib/security';import {sanitizeInput} from '@/lib/sanitize-input';import {propertySchema,sourceSchema} from '@/lib/validation';
import {prepareEditorInput} from '@/lib/property-editor-input';
import type {Property,Source} from '@/lib/types';
const simpleEditorSchema=z.object({editor_version:z.literal(2),id:z.uuid().nullable().optional(),property:z.record(z.string(),z.unknown()),source:z.record(z.string(),z.unknown())});
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'不正なリクエストです。'},{status:403});
 const admin=await getAdmin();if(!admin)return NextResponse.json({error:'管理者ログインが必要です。'},{status:401});
 try{
  let raw=sanitizeInput(await readJson(request,70000));
  const id=raw.id?z.uuid().parse(raw.id):null;
  if(raw.editor_version===2){
   const input=simpleEditorSchema.parse(raw);
   let existing:Property|null=null,existingSource:Source|null=null;
   if(id){
    const [p,s]=await Promise.all([
     admin.db.from('properties').select('*').eq('id',id).maybeSingle(),
     admin.db.from('property_sources').select('*').eq('property_id',id).maybeSingle(),
    ]);
    if(p.error||s.error)return NextResponse.json({error:'保存済みの情報を読み込めませんでした。再試行してください。'},{status:503});
    if(!p.data)return NextResponse.json({error:'物件が見つかりません。'},{status:404});
    existing=p.data as Property;existingSource=s.data as Source|null;
   }
   try{raw={...raw,...prepareEditorInput(input.property,input.source,existing,existingSource,crypto.randomUUID())};}
   catch(e){return NextResponse.json({error:e instanceof Error?e.message:'物件住所を確認してください。'},{status:422});}
  }
  const p=propertySchema.safeParse(raw.property),s=sourceSchema.safeParse(raw.source);
  if(!p.success||!s.success){
   const errors=[...(!p.success?p.error.issues:[]),...(!s.success?s.error.issues:[])];
   return NextResponse.json({error:errors.map(x=>`${x.path.join('.')}: ${x.message}`).join(' / ')},{status:422});
  }
  if(p.data.status==='published'&&!id)return NextResponse.json({error:'下書き保存後に写真を追加してから公開してください。'},{status:422});
  const {data,error}=await admin.db.rpc('save_property',{p_id:id,p_property:p.data,p_source:s.data});
  if(error){
   console.error('[admin/property-save] database RPC failed',{code:error.code});const m=error.message;
   return NextResponse.json({error:error.code==='23505'?'物件URLが重複しています。もう一度保存してください。':m.includes('PUBLICATION_PERMISSION')?'広告掲載の承諾と確認日が必要です。':m.includes('PUBLICATION_IMAGE')?'写真を1枚以上追加してください。':m.includes('PUBLICATION_DISCLOSURES')?'情報確認日・有効な次回更新予定日を入力してください。':'保存に失敗しました。入力内容を確認して再試行してください。'},{status:error.code==='23505'?409:422});
  }
  refreshSitemap();return NextResponse.json({id:data});
 }catch(error){console.warn('[admin/property-save] request rejected',{reason:error instanceof Error?error.message:'unknown'});return NextResponse.json({error:'入力内容を確認してください。'},{status:400});}
}
export async function DELETE(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'不正なリクエストです。'},{status:403});const admin=await getAdmin();if(!admin)return NextResponse.json({error:'管理者ログインが必要です。'},{status:401});const id=new URL(request.url).searchParams.get('id');if(!z.uuid().safeParse(id).success)return NextResponse.json({error:'物件IDが不正です。'},{status:400});const {data:images,error:readError}=await admin.db.from('property_images').select('storage_path').eq('property_id',id);if(readError)return NextResponse.json({error:'削除できませんでした。'},{status:500});const {error}=await admin.db.from('properties').delete().eq('id',id);if(error)return NextResponse.json({error:'削除できませんでした。'},{status:500});if(images?.length)await admin.db.storage.from('property-images').remove(images.map(x=>x.storage_path));refreshSitemap();return NextResponse.json({ok:true});}

// A cache invalidation failure must not turn a saved property into a failed save.
function refreshSitemap(){try{revalidatePath('/sitemap.xml');}catch{console.warn('[sitemap] revalidation deferred to interval');}}
