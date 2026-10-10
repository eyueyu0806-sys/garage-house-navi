// Runs the actual Next editor/API with a local Supabase HTTP fixture; no live writes.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4131',dbUrl='http://127.0.0.1:4132';
const adminId='00000000-0000-4000-8000-000000000099',id='00000000-0000-4000-8000-000000000001';
let saved=null,source=null,calls=0;
const db=createServer(async(req,res)=>{
 const url=new URL(req.url,dbUrl);res.setHeader('Content-Type','application/json');
 if(url.pathname==='/auth/v1/user'){
  try{const token=(req.headers.authorization||'').split(' ')[1],sub=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
   res.end(JSON.stringify({id:sub,aud:'authenticated',role:'authenticated',email:'fixture@example.jp',created_at:new Date().toISOString()}));return;
  }catch{res.statusCode=401;res.end('{}');return;}
 }
 const table=url.pathname.split('/').pop();
 if(table==='admin_profiles'){res.end(JSON.stringify(url.searchParams.get('id')==='eq.'+adminId?[{id:adminId}]:[]));return;}
 if(table==='save_property'){
  let raw='';for await(const chunk of req)raw+=chunk;
  const b=JSON.parse(raw);calls++;assert.equal(b.p_id,saved?id:null);
  saved={...b.p_property,id,property_images:[],created_at:new Date().toISOString(),updated_at:new Date().toISOString()};source={...b.p_source,property_id:id};
  res.end(JSON.stringify(id));return;
 }
 if(table==='properties'){res.end(JSON.stringify(saved?[saved]:[]));return;}
 if(table==='property_sources'){res.end(JSON.stringify(source?[source]:[]));return;}
 res.statusCode=404;res.end('{}');
});
await new Promise(resolve=>db.listen(4132,'127.0.0.1',resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','4131'],{cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:dbUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',NEXT_PUBLIC_SITE_URL:base,DEMO_MODE:'false'},stdio:['ignore','pipe','pipe']});
let logs='',browser;app.stdout.on('data',v=>logs+=v);app.stderr.on('data',v=>logs+=v);
try{
 for(let n=0;n<100;n++){try{if((await fetch(base+'/login')).ok)break;}catch{}if(app.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,200));if(n===99)throw Error('Startup timeout');}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await context.request.post(base+'/api/admin/properties',{headers:{Origin:base},data:{}})).status(),401);
 const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:adminId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'fixture-signature'].join('.');
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:adminId,email:'fixture@example.jp'}})).toString('base64url'),url:base}]);
 assert.equal((await context.request.post(base+'/api/admin/properties',{headers:{Origin:'https://untrusted.example'},data:{}})).status(),403);
 await page.goto(base+'/admin/properties/new');await page.getByRole('heading',{name:'物件の新規登録'}).waitFor();
 for(const name of ['prefecture','city','city_slug','town','full_address','slug','property_code','garage_type','description','other_features','transaction_type','source_contact_email','source_ad_fee','source_original_url','source_brokerage_terms','source_internal_notes'])assert.equal(await page.locator('form [name="'+name+'"]').count(),0,name);
 await page.getByLabel('物件名 *',{exact:true}).fill('動作確認用物件');
 await page.getByLabel('物件住所（都道府県から） *',{exact:true}).fill('大阪府大阪市北区梅田1丁目1-1');
 await page.getByLabel('月額賃料（円） *',{exact:true}).fill('150000');
 await page.getByRole('button',{name:'物件を保存する',exact:true}).click();
 await page.waitForURL('**/admin/properties/'+id);await page.getByRole('heading',{name:'物件を編集'}).waitFor();
 assert.equal(calls,1);assert.equal(saved.city,'大阪市');assert.equal(saved.city_slug,'osaka-city');assert.equal(saved.full_address,'北区梅田1丁目1-1');assert.equal(saved.transaction_type,'媒介');assert.match(saved.slug,/^ghn-[a-f0-9]{12}$/);
 const slug=saved.slug,code=saved.property_code;
 // Legacy hidden fields must survive the next real API save.
 saved.description='既存の紹介文';saved.garage_type='既存タイプ';saved.other_features='既存設備';saved.transaction_type='一般媒介';source.contact_email='source@example.jp';source.ad_fee=123;source.original_url='https://example.jp/property';source.brokerage_terms='既存条件';source.internal_notes='既存メモ';
 await page.reload();
 assert.equal(await page.getByLabel('物件住所（都道府県から） *',{exact:true}).inputValue(),'大阪府大阪市北区梅田1丁目1-1');
 await page.getByLabel('物件住所（都道府県から） *',{exact:true}).fill('兵庫県川西市栄町1丁目');
 await page.getByRole('button',{name:'物件を保存する',exact:true}).click();await page.getByRole('status').getByText('保存しました。',{exact:true}).waitFor();
 assert.equal(saved.slug,slug);assert.equal(saved.property_code,code);assert.equal(saved.city,'川西市');assert.equal(saved.prefecture,'hyogo');assert.equal(saved.city_slug,null);assert.equal(saved.town,null);assert.equal(saved.transaction_type,'一般媒介');assert.equal(saved.description,'既存の紹介文');assert.equal(source.contact_email,'source@example.jp');assert.equal(source.ad_fee,123);assert.equal(source.internal_notes,'既存メモ');
 await page.getByLabel('物件住所（都道府県から） *',{exact:true}).fill('川西市栄町');
 await page.getByRole('button',{name:'物件を保存する',exact:true}).click();await page.getByRole('status').getByText(/都道府県から入力/).waitFor();assert.equal(calls,2);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'../property-editor-simple-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: actual editor -> API -> local save RPC -> edit; auto identifiers, single address, removed inputs, preservation of legacy fields/URL, invalid-address feedback, auth/CSRF, mobile. No production writes.');
}catch(error){console.error(logs.slice(-6000));throw error;}
finally{if(browser)await browser.close();app.kill('SIGTERM');await Promise.race([once(app,'exit'),new Promise(r=>setTimeout(r,1000))]);if(app.exitCode===null)app.kill('SIGKILL');await new Promise(resolve=>db.close(resolve));}
