import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const output=process.env.JOURNAL_QA_DIR||'/tmp/garage-journal-qa';
await mkdir(output,{recursive:true});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3111';
const slug=process.env.JOURNAL_SLUG||'osaka-garage-house-initial-costs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const list=await page.goto(base+'/journal',{waitUntil:'domcontentloaded'});assert.equal(list.status(),200);
  const articleLink=page.locator(`a[href="/journal/${slug}"]`).filter({hasText:'記事を読む'});
  assert.equal(await articleLink.count(),1);
  await articleLink.click();
  await page.waitForURL(`**/journal/${slug}`);
  assert.equal(await page.locator('article h1').count(),1);
  assert.ok(await page.locator('article section').count()>=5);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),`https://garagehouse-navi.com/journal/${slug}`);
  assert.ok(!(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
  const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());assert.equal(graph['@graph'][0]['@type'],'BlogPosting');
  assert.equal(graph['@graph'][0].mainEntityOfPage,`https://garagehouse-navi.com/journal/${slug}`);
  const hero=page.locator('.journal-hero img');
  await hero.scrollIntoViewIfNeeded();
  await hero.evaluate(img=>img.decode());
  assert.ok(await hero.evaluate(img=>img.complete&&img.naturalWidth>0));
  assert.ok(await hero.getAttribute('alt'));
  assert.ok(await page.locator('.journal-hero figcaption').textContent());
  if(slug==='osaka-garage-house-initial-costs'){
    assert.equal(await page.locator('.journal-checklist li').count(),9);
    assert.equal(await page.locator('.journal-table tbody tr').count(),7);
    assert.equal(await page.locator('.journal-sources li').count(),4);
    assert.equal(await page.locator('.journal-related a').count(),2);
    assert.ok((await page.locator('#article-checklist-heading').textContent()).includes('見積もり'));
    assert.ok(!(await page.locator('.journal-sources').textContent()).includes('2026年10月13日'));
    assert.equal(await page.locator('meta[property="article:published_time"]').getAttribute('content'),'2026-10-16');
  }
  if(slug==='osaka-garage-house-rental-process'){
    assert.equal(await page.locator('.journal-checklist li').count(),8);
    assert.equal(await page.locator('.journal-sources li').count(),3);
    assert.equal(await page.locator('.journal-related a').count(),2);
    assert.ok((await page.locator('#article-checklist-heading').textContent()).includes('申込み・契約'));
    assert.ok((await page.locator('article').textContent()).includes('預り金'));
    assert.ok((await page.locator('article').textContent()).includes('契約は成立していない'));
    assert.equal(await page.locator('meta[property="article:published_time"]').getAttribute('content'),'2026-10-19');
  }
  if(slug==='osaka-garage-house-ordinary-fixed-term-lease'){
    assert.equal(await page.locator('.journal-checklist li').count(),9);
    assert.equal(await page.locator('.journal-table tbody tr').count(),5);
    assert.equal(await page.locator('.journal-sources li').count(),3);
    assert.equal(await page.locator('.journal-related a').count(),2);
    assert.ok((await page.locator('#article-checklist-heading').textContent()).includes('契約期間'));
    assert.ok((await page.locator('article').textContent()).includes('再契約は自動的な更新ではなく'));
    assert.equal(await page.locator('meta[property="article:published_time"]').getAttribute('content'),'2026-10-22');
  }
  if(slug==='osaka-garage-house-parking-certificate'){
    assert.equal(await page.locator('.journal-checklist li').count(),10);
    assert.equal(await page.locator('.journal-table tbody tr').count(),5);
    assert.equal(await page.locator('.journal-sources li').count(),4);
    assert.equal(await page.locator('.journal-related a').count(),2);
    assert.ok((await page.locator('#article-checklist-heading').textContent()).includes('車庫証明'));
    assert.ok((await page.locator('article').textContent()).includes('申請結果を保証するものではありません'));
    assert.equal(await page.locator('meta[property="article:published_time"]').getAttribute('content'),'2026-10-25');
  }
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
 const sitemap=await (await fetch(base+'/sitemap.xml')).text();assert.ok(sitemap.includes(`/journal/${slug}`));assert.ok(!sitemap.includes('does-not-exist'));
 console.log('PASS unknown article not-found/noindex and article sitemap entry');
}finally{await browser.close();}
