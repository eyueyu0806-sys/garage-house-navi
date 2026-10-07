import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverEmail,emailConfigProblem,emailProviderProblem} from '../lib/email-transport';

const config={apiKey:'test-only-key',from:'GARAGE HOUSE NAVI <no-reply@example.jp>',recipient:'asc.yw1233@gmail.com'};
const params={to:config.recipient,subject:'TEST',html:'<p>TEST</p>',text:'TEST',idempotencyKey:'test-id'};
test('missing/invalid settings fail before making an external request',async()=>{
 for(const invalid of [{...config,apiKey:''},{...config,from:'invalid'},{...config,recipient:'invalid'}])assert.ok(emailConfigProblem(invalid));
 let called=false;
 const result=await deliverEmail({...config,apiKey:''},params,async()=>{called=true;throw Error('must not call');});
 assert.equal(called,false);assert.equal(result.ok,false);
});
test('domain verification 403 is distinct from permission failure and private data is not returned',async()=>{
 const result=await deliverEmail(config,params,async()=>Response.json({message:'Domain not verified: Verify example.jp or update your from domain. private-key',name:'validation_error'},{status:403}));
 assert.equal(result.ok,false);
 if(!result.ok){assert.equal(result.code,'domain_not_verified');assert.doesNotMatch(result.message,/private-key|example.jp/);}
 assert.equal(emailProviderProblem(403,{message:'Access denied'}).code,'forbidden');
});
test('successful send preserves server-only configuration, reply address and idempotency',async()=>{
 const result=await deliverEmail(config,{...params,replyTo:'operator@example.jp'},async(url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');
  const headers=options?.headers as Record<string,string>;
  assert.equal(headers.Authorization,'Bearer test-only-key');
  assert.equal(headers['Idempotency-Key'],'test-id');
  assert.deepEqual(JSON.parse(String(options?.body)),{from:config.from,to:[config.recipient],subject:'TEST',html:'<p>TEST</p>',text:'TEST',reply_to:'operator@example.jp'});
  return Response.json({id:'provider-id'});
 });
 assert.deepEqual(result,{ok:true,emailId:'provider-id'});
});
test('timeout, provider failure, malformed response and authentication failure produce useful results',async()=>{
 const cases:[number,unknown,string][]=[[401,{message:'Bad key'},'invalid_api_key'],[429,{},'rate_limited'],[503,{},'provider_unavailable'],[422,{},'send_rejected'],[200,{},'invalid_response']];
 for(const [status,body,code] of cases){
  const result=await deliverEmail(config,params,async()=>Response.json(body,{status}));
  assert.equal(result.ok,false);if(!result.ok)assert.equal(result.code,code);
 }
 const network=await deliverEmail(config,params,async()=>{throw new DOMException('timeout','TimeoutError');});
 assert.equal(network.ok,false);if(!network.ok)assert.equal(network.code,'network_error');
});
