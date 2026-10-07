import {z} from 'zod';

export type EmailConfig = {apiKey?:string;from?:string|null;recipient?:string|null};
export type EmailResult = {ok:true;emailId:string}|{ok:false;code:string;message:string};
export type SendParams = {to:string;subject:string;html:string;text:string;replyTo?:string;idempotencyKey:string};

const email=z.email();
export function emailConfigProblem(config:EmailConfig):Extract<EmailResult,{ok:false}>|null{
 if(!config.apiKey?.trim())return {ok:false,code:'missing_api_key',message:'メール送信の鍵が未設定です。VercelのRESEND_API_KEYを保存して、再デプロイしてください。'};
 const from=config.from?.trim()||'';
 const address=from.includes('<')?from.match(/^[^<>\r\n]+<([^<>]+)>$/)?.[1]:from;
 if(!address||!email.safeParse(address).success)return {ok:false,code:'invalid_sender',message:'送信元が未設定か、形式が違います。LEAD_EMAIL_FROMを確認して、再デプロイしてください。'};
 if(!email.safeParse(config.recipient?.trim()).success)return {ok:false,code:'invalid_recipient',message:'通知先が未設定か、形式が違います。LEAD_NOTIFICATION_EMAILに受信先を設定して、再デプロイしてください。'};
 return null;
}

export function emailProviderProblem(status:number,body:unknown):Extract<EmailResult,{ok:false}>{
 const detail=body&&typeof body==='object'?'message' in body?String(body.message):'':'';
 // Return only fixed descriptions. Provider responses can contain private values.
 if(/domain.{0,40}(not verified|is not verified)|verify.{0,100}(domain|from)/i.test(detail))
  return {ok:false,code:'domain_not_verified',message:'送信元ドメインの認証が完了していません。ResendのDomainsで送信元を開き、未認証のDNSレコードをお名前.comで確認してください。'};
 if(status===401)return {ok:false,code:'invalid_api_key',message:'メール送信の鍵が認証されません。RESEND_API_KEYを確認してください。'};
 if(status===403)return {ok:false,code:'forbidden',message:'メール送信が許可されませんでした。Resendで送信元ドメインの認証とAPIキーの送信権限を確認してください。'};
 if(status===429)return {ok:false,code:'rate_limited',message:'メールの送信回数が上限に達しています。時間をおいて再度お試しください。'};
 if(status>=500)return {ok:false,code:'provider_unavailable',message:'メール送信サービスが応答できません。時間をおいて再度お試しください。'};
 return {ok:false,code:'send_rejected',message:'メール送信が受け付けられませんでした。送信元と通知先の形式を確認してください。'};
}

export async function deliverEmail(config:EmailConfig,params:SendParams,request:typeof fetch=fetch):Promise<EmailResult>{
 const problem=emailConfigProblem({...config,recipient:params.to});
 if(problem)return problem;
 try{
  const response=await request('https://api.resend.com/emails',{
   method:'POST',
   headers:{Authorization:`Bearer ${config.apiKey!.trim()}`,'Content-Type':'application/json','Idempotency-Key':params.idempotencyKey},
   body:JSON.stringify({from:config.from!.trim(),to:[params.to.trim()],subject:params.subject,html:params.html,text:params.text,reply_to:params.replyTo}),
   signal:AbortSignal.timeout(8000),
  });
  const body:unknown=await response.json().catch(()=>null);
  if(!response.ok)return emailProviderProblem(response.status,body);
  if(!body||typeof body!=='object'||!('id' in body)||typeof body.id!=='string'||!body.id)
   return {ok:false,code:'invalid_response',message:'送信結果を確認できませんでした。Resendの送信履歴をご確認ください。'};
  return {ok:true,emailId:body.id};
 }catch{
  return {ok:false,code:'network_error',message:'メール送信サービスに接続できませんでした。時間をおいて再度お試しください。'};
 }
}
