import {NextResponse} from 'next/server';
import {leadFormsEnabled} from '@/lib/config';
import {inquirySchema,requestSchema} from '@/lib/validation';
import {sameOrigin,validFormToken,rateLimit,readJson,sanitizedSource} from '@/lib/security';
import {serviceDb} from '@/lib/supabase';
import {sendLeadEmails} from '@/lib/lead-email';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'このページから送信してください。'},{status:403});
 if(!leadFormsEnabled())return NextResponse.json({error:'現在、受付準備中です。送信内容は保存されていません。'},{status:503});
 try {
 const raw=await readJson(request,24000);const kind=raw.kind==='inquiry'?'inquiry':raw.kind==='request'?'request':null;
 if(!kind)return NextResponse.json({error:'送信内容を確認してください。'},{status:400});
 const parsed=(kind==='inquiry'?inquirySchema:requestSchema).safeParse(raw);
 if(!parsed.success)return NextResponse.json({error:'入力内容を確認してください。',fields:parsed.error.flatten().fieldErrors},{status:422});
 if(!validFormToken(parsed.data.form_token))return NextResponse.json({error:'ページを再読み込みして、もう一度入力・送信してください。'},{status:422});
 if(!await rateLimit(request,'leads'))return NextResponse.json({error:'送信回数が上限に達しました。時間をおいてお試しください。'},{status:429});
 const {consent,website,form_token,...data}=parsed.data;void consent;void website;void form_token;
 const db=serviceDb();let record:Record<string,unknown>={...data,source_url:sanitizedSource(data.source_url)};
 if(kind==='inquiry'){
 const {data:property,error}=await db.from('properties').select('id,property_name').eq('id',raw.property_id).eq('status','published').maybeSingle();
 if(error)throw error;if(!property)return NextResponse.json({error:'この物件の募集は終了しています。希望条件リクエストをご利用ください。'},{status:409});
 record={...record,property_name_snapshot:property.property_name};
 }
 const {error}=await db.from(kind==='inquiry'?'inquiries':'property_requests').insert(record);
 if(error && error.code!=='23505')throw error;
 if(!error){
  await sendLeadEmails({
   kind,
   submissionId:data.submission_id,
   propertyName:kind==='inquiry'?String(record.property_name_snapshot):undefined,
   inquiryType:kind==='inquiry'&&'inquiry_type' in data?String(data.inquiry_type):undefined,
   prefecture:kind==='request'&&'prefecture' in data?String(data.prefecture||''):undefined,
   city:kind==='request'&&'city' in data?String(data.city||''):undefined,
  },data.email||null);
 }
 return NextResponse.json({ok:true},{status:200});
 }catch{return NextResponse.json({error:'送信できませんでした。入力内容を残したまま、しばらくしてからお試しください。'},{status:500});}
}
