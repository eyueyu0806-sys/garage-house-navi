// Isolated browser verification: no production credentials or real emails are used.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4111',dbUrl='http://127.0.0.1:4112';
const adminId='00000000-0000-4000-8000-000000000099';
const normalId='00000000-0000-4000-8000-000000000098';
const now=Date.now();
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const rows={inquiries:[],property_requests:[],properties:[{id:uuid(500),status:'published'}]};
for(let i=0;i<25;i++)for(const [table,n] of [['inquiries',i*2+1],['property_requests',i*2+2]]){
 rows[table].push({id:uuid(n),name:'確認 '+n,created_at:new Date(now-n*1000).toISOString(),status:i===24?'viewing':'new',email:'fixture@example.jp',phone:null,internal_notes:null,property_name_snapshot:'確認物件',property_id:uuid(500),inquiry_type:'内見したい',prefecture:'osaka',city:'箕面市',consent_at:new Date(now).toISOString()});
}
const requests=[];
const db=createServer((req,res)=>{
 const url=new URL(req.url,dbUrl);
 res.setHeader('Content-Type','application/json');
 if(url.pathname==='/auth/v1/user'){
  try{
   const token=(req.headers.authorization||'').split(' ')[1];
   const sub=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
   res.end(JSON.stringify({id:sub,aud:'authenticated',role:'authenticated',email:'fixture@example.jp',created_at:new Date(now).toISOString()}));return;
  }catch{res.statusCode=401;res.end(JSON.stringify({message:'No session'}));return;}
 }
 const table=url.pathname.split('/').pop();
 if(table==='admin_profiles'){
  res.end(JSON.stringify(url.searchParams.get('id')==='eq.'+adminId?[{id:adminId,display_name:'確認用管理者'}]:[]));return;
 }
 if(!Object.hasOwn(rows,table)){res.statusCode=404;res.end('{"message":"Unknown fixture"}');return;}
 requests.push({table,limit:url.searchParams.get('limit')});
 let data=[...rows[table]];
 for(const field of ['status','created_at']){
  const filter=url.searchParams.get(field);
  if(filter?.startsWith('eq.'))data=data.filter(r=>r[field]===filter.slice(3));
  if(filter?.startsWith('gte.'))data=data.filter(r=>Date.parse(r[field])>=Date.parse(filter.slice(4)));
 }
 const cursor=url.searchParams.get('or');
 if(cursor){
  const time=cursor.match(/created_at\.lt\.([^,]+)/)?.[1];
  const id=cursor.match(/id\.lt\.([a-f0-9-]+)/)?.[1];
  const equal=cursor.includes('id.eq.');
  data=data.filter(r=>Date.parse(r.created_at)<Date.parse(time)||(Date.parse(r.created_at)===Date.parse(time)&&(r.id<id||(equal&&r.id===id))));
 }
 data.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id.localeCompare(a.id));
 const count=data.length;
 if(url.searchParams.get('limit'))data=data.slice(0,Number(url.searchParams.get('limit')));
 res.setHeader('Content-Range','0-'+Math.max(0,data.length-1)+'/'+count);
 if(req.method==='HEAD')res.end();else res.end(JSON.stringify(data));
});
await new Promise(resolve=>db.listen(4112,'127.0.0.1',resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4111'],{
 cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:dbUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',RESEND_API_KEY:'fixture-email-key',LEAD_EMAIL_FROM:'GARAGE HOUSE NAVI <no-reply@example.jp>',LEAD_NOTIFICATION_EMAIL:'asc.yw1233@gmail.com',OPERATOR_NAME:'ASC',OPERATOR_EMAIL:'fixture@example.jp',NEXT_PUBLIC_SITE_URL:base,DEMO_MODE:'false',LEAD_FORMS_ENABLED:'true'},stdio:['ignore','pipe','pipe']
});
let logs='';app.stdout.on('data',v=>logs+=v);app.stderr.on('data',v=>logs+=v);
let browser;
try{
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/login');if(r.ok)break;}catch{}if(app.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,200));if(i===99)throw Error('Startup timeout\n'+logs);}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/admin/settings');await page.waitForURL('**/login');assert.match(page.url(),/\/login/);
 const unauth=await context.request.post(base+'/api/admin/email-test',{headers:{Origin:base}});
 assert.equal(unauth.status(),401,await unauth.text());
 const cookie=sub=>{
  const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'fixture-signature'].join('.');
  return {name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:sub,email:'fixture@example.jp'}})).toString('base64url'),url:base};
 };
 await context.addCookies([cookie(normalId)]);
 assert.equal((await context.request.post(base+'/api/admin/email-test',{headers:{Origin:base}})).status(),401);
 await context.addCookies([cookie(adminId)]);
 const cross=await context.request.post(base+'/api/admin/email-test',{headers:{Origin:'https://untrusted.example'}});
 assert.equal(cross.status(),403);
 await page.goto(base+'/admin');
 await page.getByRole('heading',{name:'管理画面ホーム'}).waitFor();
 assert.equal(await page.locator('.stat').filter({hasText:'新規の反響'}).locator('strong').textContent(),'48');
 await page.getByRole('link',{name:'届いた反響を見る',exact:true}).click();
 await page.getByRole('heading',{name:'反響一覧',exact:true}).waitFor();
 await page.locator('.lead-record').first().waitFor();
 assert.equal(await page.locator('.lead-record').count(),20);
 assert.equal(await page.locator('.lead-kind').filter({hasText:'物件問い合わせ'}).count(),10);
 assert.equal(await page.locator('.lead-kind').filter({hasText:'希望条件リクエスト'}).count(),10);
 const first=await page.locator('.lead-record summary strong').allTextContents();
 await page.getByRole('link',{name:'次の20件 →'}).click();
 await page.getByText(first[0],{exact:true}).waitFor({state:'hidden'});
 await page.locator('.lead-record').first().waitFor();
 const second=await page.locator('.lead-record summary strong').allTextContents();
 assert.equal(second.length,20);assert.equal(first.some(x=>second.includes(x)),false);
 await page.goto(base+'/admin/leads?kind=request&status=viewing');
 await page.locator('.lead-record').first().waitFor();
 assert.equal(await page.locator('.lead-record').count(),1);
 assert.equal(await page.locator('.lead-kind').textContent(),'希望条件リクエスト');
 await page.goto(base+'/admin/requests?status=new');
 await page.waitForURL('**/admin/leads?kind=request&status=new');
 assert.match(page.url(),/\/admin\/leads\?kind=request&status=new/);
 await page.goto(base+'/admin/settings');
 await page.getByRole('heading',{name:'設定・動作確認',exact:true}).waitFor();
 assert.ok((await page.locator('body').textContent()).includes('asc.yw1233@gmail.com'));
 assert.equal((await page.locator('body').textContent()).includes('fixture-email-key'),false);
 assert.equal((await page.content()).includes('fixture-service-key'),false);
 await page.route('**/api/admin/email-test',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({message:'送信元ドメインの認証が完了していません。'})}));
 await page.getByRole('button',{name:'通知先にテストメールを送る'}).click();
 await page.getByRole('status').getByText('送信元ドメインの認証が完了していません。',{exact:true}).waitFor();
 await page.route('**/api/admin/email-test',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message:'メール送信サービスが受け付けました。受信箱をご確認ください。',emailId:'fixture-message-id'})}));
 await page.getByRole('button',{name:'通知先にテストメールを送る'}).click();
 await page.getByText('送信ID：fixture-message-id').waitFor();
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/admin','/admin/leads','/admin/settings']){
  await page.goto(base+path);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path);
 }
 await page.screenshot({path:'../admin-settings-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 assert.ok(requests.filter(r=>r.table!=='properties'&&r.limit).every(r=>Number(r.limit)<=21));
 console.log('PASS: admin/regular-user access, CSRF, combined counts/list, pagination, filters, legacy links, secret exclusion, email status UI and mobile layout. Supabase fixtures and mocked mail responses; no real mail sent.');
}catch(error){console.error(logs.slice(-6000));throw error;}
finally{
 if(browser)await browser.close();
 app.kill('SIGTERM');
 await Promise.race([once(app,'exit'),new Promise(r=>setTimeout(r,1000))]);
 if(app.exitCode===null)app.kill('SIGKILL');
 await new Promise(resolve=>db.close(resolve));
}
