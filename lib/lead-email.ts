import 'server-only';
import {randomUUID} from 'node:crypto';
import {operator,siteUrl} from './config';
import {buildLeadNotification,buildLeadReceipt,resolveLeadNotificationRecipient,type LeadEmailSummary} from './lead-email-content';
import {deliverEmail,type EmailConfig,type EmailResult} from './email-transport';

export function leadEmailConfiguration():EmailConfig{
 return {apiKey:process.env.RESEND_API_KEY,from:process.env.LEAD_EMAIL_FROM,
  recipient:resolveLeadNotificationRecipient(process.env.LEAD_NOTIFICATION_EMAIL,operator().email)};
}
export async function sendTestLeadEmail():Promise<EmailResult>{
 const config=leadEmailConfiguration();
 return deliverEmail(config,{
  to:config.recipient||'',
  subject:'【GARAGE HOUSE NAVI】通知メールの動作確認',
  text:'管理画面から送信したテストメールです。実際の問い合わせではありません。\nこのメールの受信が確認できれば、通知先への到着確認が完了です。',
  html:'<p>管理画面から送信したテストメールです。実際の問い合わせではありません。</p><p>このメールの受信が確認できれば、通知先への到着確認が完了です。</p>',
  idempotencyKey:`notification-test-${randomUUID()}`,
 });
}
export async function sendLeadEmails(summary:LeadEmailSummary,email?:string|null):Promise<void>{
 const company=operator(),config=leadEmailConfiguration();
 const notification=buildLeadNotification(summary,`${siteUrl()}/admin/leads?kind=${summary.kind}`);
 const result=await deliverEmail(config,{...notification,to:config.recipient||'',replyTo:company.email,idempotencyKey:`lead-${summary.submissionId}-admin`});
 if(!result.ok){console.error('Lead email notification failed:',result.code,'submission:',summary.submissionId);return;}
 if(email){
  const receipt=buildLeadReceipt(summary.kind,company.name||'株式会社ASC');
  const result=await deliverEmail(config,{...receipt,to:email,replyTo:company.email,idempotencyKey:`lead-${summary.submissionId}-receipt`});
  if(!result.ok)console.error('Lead receipt email failed:',result.code,'submission:',summary.submissionId);
 }
}
