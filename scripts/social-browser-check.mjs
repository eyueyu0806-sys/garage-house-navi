// Local Supabase fixtures and mocked Buffer outcomes. Never posts to real SNS.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4121',dbUrl='http://127.0.0.1:4122';
const adminId='00000000-0000-4000-8000-000000000099';
const normalId='00000000-0000-4000-8000-000000000098';
const propertyId='00000000-0000-4000-8000-000000000001';
const draftId='00000000-0000-4000-8000-000000000002';
const property={id:propertyId,property_name:'確認用ガレージハウス',property_code:'TEST-001'};
const draft={id:draftId,property_id:propertyId,property_name:property.property_name,property_version:'a'.repeat(64),instagram_text:'大阪のガレージハウス。賃料 150,000円。',threads_text:'愛車と暮らす住まい。https://example.com/properties/test',image_path:'fixture/cover.jpg',status:'draft',due_at:null,created_at:new Date().toISOString()};
let result={draft,imageUrl:'/social/01-intro.jpg',deliveries:[]};
const db=createServer((req,res)=>{
 const url=new URL(req.url,dbUrl);res.setHeader('Content-Type','application/json');
 if(url.pathname==='/auth/v1/user'){
  try{const token=(req.headers.authorization||'').split(' ')[1];const sub=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
   res.end(JSON.stringify({id:sub,aud:'authenticated',role:'authenticated',email:'fixture@example.jp',created_at:new Date().toISOString()}));return;
  }catch{res.statusCode=401;res.end('{}');return;}
 }
 const table=url.pathname.split('/').pop();
 if(table==='admin_profiles'){res.end(JSON.stringify(url.searchParams.get('id')==='eq.'+adminId?[{id:adminId}]:[]));return;}
 if(table==='properties'){res.end(JSON.stringify([property]));return;}
 if(table==='social_drafts'){res.end(JSON.stringify([result.draft]));return;}
 res.statusCode=404;res.end('{}');
});
await new Promise(resolve=>db.listen(4122,'127.0.0.1',resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4121'],{
 cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:dbUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',BUFFER_API_KEY:'fixture-buffer-secret',NEXT_PUBLIC_SITE_URL:base,DEMO_MODE:'false'},stdio:['ignore','pipe','pipe']
});
let logs='',browser;app.stdout.on('data',v=>logs+=v);app.stderr.on('data',v=>logs+=v);
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}if(app.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,200));if(i===99)throw Error('Startup timeout');}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/admin/social');await page.waitForURL('**/login');
 assert.equal((await context.request.get(base+'/api/admin/social')).status(),401);
 assert.equal((await context.request.post(base+'/api/admin/social',{headers:{Origin:base}})).status(),401);
 const cookie=sub=>{const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'fixture-signature'].join('.');return {name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:sub,email:'fixture@example.jp'}})).toString('base64url'),url:base};};
 await context.addCookies([cookie(normalId)]);
 assert.equal((await context.request.get(base+'/api/admin/social')).status(),401);
 await context.addCookies([cookie(adminId)]);
 assert.equal((await context.request.post(base+'/api/admin/social',{headers:{Origin:'https://untrusted.example'}})).status(),403);
 assert.equal((await context.request.post(base+'/api/admin/social',{headers:{Origin:base},data:{action:'schedule',id:draftId,confirmed:false}})).status(),422);
 const submissions=[];
 await page.route('**/api/admin/social*',async route=>{
  const req=route.request(),url=new URL(req.url());let payload=result;
  if(req.method()==='GET'&&!url.searchParams.has('id'))payload={channels:['instagram','threads'].map(service=>({id:service,name:'garagehouse_navi',service,organizationName:'確認用',isDisconnected:false,isLocked:false,isQueuePaused:false,timezone:'America/Los_Angeles'}))};
  if(req.method()==='POST'){
   const body=req.postDataJSON();submissions.push(body);
   if(body.action==='save')result={...result,draft:{...result.draft,instagram_text:body.instagram_text,threads_text:body.threads_text}};
   if(body.action==='schedule')result={...result,draft:{...result.draft,status:'locked'},deliveries:body.channel_ids.map((service,i)=>({id:service,draft_id:draftId,channel_id:service,channel_name:'garagehouse_navi',service,status:i?'uncertain':'scheduled',buffer_post_id:i?null:'buffer-fixture-id',error_message:i?'結果が不明です。Bufferで確認してください。':null,due_at:new Date(body.scheduled_jst+':00+09:00').toISOString()}))};
   payload=result;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
 });
 await page.goto(base+'/admin/social?property='+propertyId);
 await page.getByRole('heading',{name:'SNS投稿',exact:true}).waitFor();
 assert.doesNotMatch(await page.content(),/fixture-buffer-secret|fixture-service-key/);
 await page.getByRole('button',{name:'投稿案と画像を作る'}).click();
 await page.getByRole('textbox',{name:'Instagramの文章',exact:true}).waitFor();
 await page.getByRole('textbox',{name:'Instagramの文章',exact:true}).fill('確認済みの物件情報です。');
 await page.getByRole('button',{name:'下書きを保存',exact:true}).click();
 await page.getByRole('status').filter({hasText:'下書きを保存しました。'}).waitFor();
 assert.equal(result.draft.instagram_text,'確認済みの物件情報です。');
 await page.getByRole('button',{name:'Bufferの投稿先を読み込む'}).click();
 await page.getByRole('checkbox',{name:/Instagram ·/}).check();
 await page.getByRole('checkbox',{name:/Threads ·/}).check();
 const date=new Date(Date.now()+86400000+9*3600000).toISOString().slice(0,16);
 await page.getByLabel('投稿日時（日本時間）').fill(date);
 const submit=page.getByRole('button',{name:'確認した内容で予約する'});
 assert.equal(await submit.isDisabled(),true);
 await page.getByRole('checkbox',{name:/募集状況・文章・写真/}).check();
 assert.equal(await submit.isEnabled(),true);
 await page.screenshot({path:'../social-composer-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'../social-composer-mobile.png',fullPage:true});
 await submit.click();await page.getByRole('heading',{name:'予約の送信結果',exact:true}).waitFor();
 assert.equal(submissions.filter(s=>s.action==='schedule').length,1);
 assert.equal(submissions.find(s=>s.action==='schedule').scheduled_jst,date);
 await page.getByText('予約ID：buffer-fixture-id').waitFor();
 assert.equal(await page.getByRole('button',{name:'未送信・失敗した分だけ再試行'}).count(),0);
 await page.getByRole('button',{name:'結果を再読み込み'}).click();
 await page.getByText('予約ID：buffer-fixture-id').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: real route auth/non-admin/CSRF/validation; UI prepare/edit/save/account/date/confirmation/receipt/uncertain-no-retry, desktop and mobile. Local DB fixtures and mocked posting responses; no real SNS sent.');
}catch(error){console.error(logs.slice(-5000));throw error;}
finally{
 if(browser)await browser.close();app.kill('SIGTERM');
 await Promise.race([once(app,'exit'),new Promise(r=>setTimeout(r,1000))]);if(app.exitCode===null)app.kill('SIGKILL');
 await new Promise(resolve=>db.close(resolve));
}
