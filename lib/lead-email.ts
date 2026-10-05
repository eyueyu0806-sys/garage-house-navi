import 'server-only';
import {operator, siteUrl} from './config';
import {buildLeadNotification, buildLeadReceipt, resolveLeadNotificationRecipient, type LeadEmailSummary} from './lead-email-content';

type SendParams = {to:string;subject:string;html:string;text:string;replyTo?:string;idempotencyKey:string};

async function sendEmail(params:SendParams):Promise<void>{
 const apiKey=process.env.RESEND_API_KEY;
 const from=process.env.LEAD_EMAIL_FROM;
 if(!apiKey||!from)throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':params.idempotencyKey},
  body:JSON.stringify({from,to:[params.to],subject:params.subject,html:params.html,text:params.text,reply_to:params.replyTo}),
  signal:AbortSignal.timeout(8000),
 });
 if(!response.ok)throw new Error(`EMAIL_PROVIDER_HTTP_${response.status}`);
}

export async function sendLeadEmails(summary:LeadEmailSummary,email?:string|null):Promise<void>{
 const company=operator();
 const notificationRecipient=resolveLeadNotificationRecipient(process.env.LEAD_NOTIFICATION_EMAIL,company.email);
 const from=process.env.LEAD_EMAIL_FROM;
 if(!process.env.RESEND_API_KEY||!from||!notificationRecipient)return;
 const adminPath=summary.kind==='inquiry'?'/admin/leads':'/admin/requests';
 const adminUrl=`${siteUrl()}${adminPath}`;
 const notification=buildLeadNotification(summary,adminUrl);
 try{
  await sendEmail({...notification,to:notificationRecipient,replyTo:company.email,idempotencyKey:`lead-${summary.submissionId}-admin`});
 }catch(error){
  console.error('Lead email notification failed:',error instanceof Error?error.message:'unknown error');
  return;
 }
 if(email){
  const receipt=buildLeadReceipt(summary.kind,company.name||'株式会社ASC');
  try{
   await sendEmail({...receipt,to:email,replyTo:company.email,idempotencyKey:`lead-${summary.submissionId}-receipt`});
  }catch(error){
   console.error('Lead receipt email failed:',error instanceof Error?error.message:'unknown error');
  }
 }
}
