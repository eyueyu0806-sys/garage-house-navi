import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const output=process.env.JOURNAL_QA_DIR||'/tmp/garage-journal-qa';
await mkdir(output,{recursive:true});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3111';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const list=await page.goto(base+'/journal',{waitUntil:'domcontentloaded'});assert.equal(list.status(),200);
  await page.getByRole('link',{name:'記事を読む',exact:true}).click();
  await page.waitForURL('**/journal/osaka-garage-house-guide');
  assert.equal(await page.locator('article h1').count(),1);
  assert.equal(await page.locator('article section').count(),5);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://garagehouse-navi.com/journal/osaka-garage-house-guide');
  assert.ok(!(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
  const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());assert.equal(graph['@graph'][0]['@type'],'BlogPosting');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/journal-${viewport.width}.png`,fullPage:true});
  assert.equal(await page.getByRole('link',{name:'希望条件を相談する',exact:true}).getAttribute('href'),'/request?prefecture=osaka');
  await page.getByRole('link',{name:'希望条件を相談する',exact:true}).click();
  assert.equal(await page.locator('select[name="prefecture"]').inputValue(),'osaka');
  assert.deepEqual(errors,[]); await page.close();
  console.log(`PASS journal listing -> article -> Osaka request, ${viewport.width}px, metadata and no overflow`);
 }
 const missing=await fetch(base+'/journal/does-not-exist');
 // With the root loading boundary, Next.js may stream a 200 before notFound().
 const missingHtml=await missing.text();
 assert.ok([200,404].includes(missing.status));
 assert.match(missingHtml, /<meta name="robots" content="noindex"/);
 assert.ok(!missingHtml.includes('application/ld+json'));
 const notFoundPage=await browser.newPage();
 await notFoundPage.goto(base+'/journal/does-not-exist',{waitUntil:'domcontentloaded'});
 await notFoundPage.getByRole('heading',{name:'ページが見つかりませんでした。'}).waitFor();
 await notFoundPage.close();
 const sitemap=await (await fetch(base+'/sitemap.xml')).text();assert.ok(sitemap.includes('/journal/osaka-garage-house-guide'));assert.ok(!sitemap.includes('does-not-exist'));
 console.log('PASS unknown article not-found/noindex and article sitemap entry');
}finally{await browser.close();}
