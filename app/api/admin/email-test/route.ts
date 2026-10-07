import {NextResponse} from 'next/server';
import {getAdmin} from '@/lib/supabase';
import {sameOrigin,rateLimit} from '@/lib/security';
import {leadEmailConfiguration,sendTestLeadEmail} from '@/lib/lead-email';
import {emailConfigProblem} from '@/lib/email-transport';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({message:'管理画面から操作してください。'},{status:403});
 const admin=await getAdmin();
 if(!admin)return NextResponse.json({message:'管理者でログインしてください。'},{status:401});
 const problem=emailConfigProblem(leadEmailConfiguration());
 if(problem)return NextResponse.json(problem,{status:422});
 try{
  if(!await rateLimit(request,'email-test',10,admin.user.id))
   return NextResponse.json({message:'テストは1時間に10回までです。時間をおいてお試しください。'},{status:429});
 }catch{return NextResponse.json({message:'送信回数を確認できません。問い合わせ保存用の接続設定をご確認ください。'},{status:503});}
 const result=await sendTestLeadEmail();
 if(!result.ok)return NextResponse.json(result,{status:502});
 return NextResponse.json({...result,message:'メール送信サービスが受け付けました。通知先の受信箱・迷惑メールで、テストメールの到着を確認してください。'});
}
