import {cronAuthorized} from '@/lib/social-autopilot-policy';
import {runSocialAutopilot} from '@/lib/social-autopilot';
export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(!cronAuthorized(request.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorized'},{status:401,headers});
 if(process.env.VERCEL_ENV!=='production')return Response.json({error:'Production only'},{status:403,headers});
 try{
  const report=await runSocialAutopilot(new URL(request.url).searchParams.get('mode')==='monitor');
  return Response.json(report,{status:report.status==='error'?503:200,headers});
 }catch{return Response.json({error:'自動運転の実行記録を確認してください。'},{status:503,headers});}
}
