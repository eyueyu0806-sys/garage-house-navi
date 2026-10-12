import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsAllowed, analyticsPage, analyticsCampaign, startAnalyticsPage, trackSavedLead} from '../lib/analytics';

test('only production public pages are measured', () => {
  for (const path of ['/', '/properties', '/properties/008', '/osaka', '/request'])
    assert.equal(analyticsAllowed(new URL(path, 'https://garagehouse-navi.com')), true);
  for (const url of ['https://garage-house-navi.vercel.app/', 'http://localhost:3000/', 'https://garagehouse-navi.com/admin', 'https://garagehouse-navi.com/admin/leads', 'https://garagehouse-navi.com/api/leads', 'https://garagehouse-navi.com/auth/callback', 'https://garagehouse-navi.com/login'])
    assert.equal(analyticsAllowed(new URL(url)), false, url);
});

test('PII queries, fragments, external referrer paths and unknown campaigns are removed', () => {
  const url = new URL('https://garagehouse-navi.com/request?email=private@example.com&message=secret#phone');
  const page = analyticsPage(url, 'https://example.com/private/name?email=secret');
  assert.deepEqual(page, {page_location:'https://garagehouse-navi.com/request', page_title:'GARAGE HOUSE NAVI', page_referrer:'https://example.com/'});
  assert.equal(analyticsPage(url, 'https://garagehouse-navi.com/admin/leads').page_referrer, '');
  assert.deepEqual(analyticsCampaign(new URL('https://garagehouse-navi.com/?utm_source=private@example.com&utm_campaign=customer-name')), {});
  assert.deepEqual(analyticsCampaign(new URL('https://garagehouse-navi.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch_202610')), {campaign_source:'instagram',campaign_medium:'organic_social',campaign_name:'launch_202610'});
});

test('page views, lead deduplication, admin exclusion and analytics failures', () => {
  const original = {window:globalThis.window,document:globalThis.document,sessionStorage:globalThis.sessionStorage};
  const storage = new Map<string,string>();
  const fake = {location:{href:'https://garagehouse-navi.com/properties/008'}} as unknown as Window;
  Object.assign(globalThis, {window:fake,document:{referrer:''},sessionStorage:{getItem:(k:string)=>storage.get(k),setItem:(k:string,v:string)=>storage.set(k,v)}});
  try {
    assert.equal(startAnalyticsPage(), true);
    startAnalyticsPage();
    const commands = () => fake.dataLayer!.map(value => Array.from(value as ArrayLike<unknown>));
    assert.equal(commands().filter(c => c[1] === 'page_view').length, 1);
    trackSavedLead('inquiry', 'local-only-id');
    trackSavedLead('inquiry', 'local-only-id');
    assert.equal(commands().filter(c => c[1] === 'generate_lead').length, 1);
    assert.equal(JSON.stringify(commands()).includes('local-only-id'), false);
    fake.location.href = 'https://garagehouse-navi.com/request';
    startAnalyticsPage();
    assert.equal(commands().filter(c => c[1] === 'page_view').length, 2);
    fake.location.href = 'https://garagehouse-navi.com/admin/leads';
    assert.equal(startAnalyticsPage(), false);
    trackSavedLead('request', 'admin');
    assert.equal(commands().filter(c => c[1] === 'generate_lead').length, 1);
    fake.location.href = 'https://garagehouse-navi.com/request?analytics_test=1';
    assert.equal(startAnalyticsPage(), false);
    fake.location.href = 'https://garagehouse-navi.com/request';
    assert.equal(startAnalyticsPage(), false);
    trackSavedLead('request', 'test');
    assert.equal(commands().filter(c => c[1] === 'generate_lead').length, 1);
    storage.clear(); startAnalyticsPage();
    fake.gtag = () => { throw new Error('Analytics unavailable'); };
    assert.doesNotThrow(() => trackSavedLead('request', 'blocked'));
  } finally { Object.assign(globalThis, original); }
});

test('social property and weekly links retain attribution without accepting arbitrary content', () => {
  for (const slug of ['005', '008', 'ghn-8e308a30c781']) {
    for (const campaign of ['property', '202610_week2']) {
      const result = analyticsCampaign(new URL(`https://garagehouse-navi.com/properties/${slug}?utm_source=threads&utm_medium=organic_social&utm_campaign=${campaign}&utm_content=${slug}`));
      assert.deepEqual(result, {campaign_source:'threads', campaign_medium:'organic_social', campaign_name:campaign, campaign_content:slug});
    }
  }
  for (const content of ['private@example.com', '09012345678', 'customer-name', '008']) {
    const result = analyticsCampaign(new URL(`https://garagehouse-navi.com/properties/005?utm_campaign=property&utm_content=${content}`));
    assert.equal(result.campaign_content, undefined);
  }
  assert.equal(analyticsCampaign(new URL('https://garagehouse-navi.com/?utm_campaign=property&utm_content=005')).campaign_content, undefined);
  assert.equal(analyticsCampaign(new URL('https://garagehouse-navi.com/?utm_campaign=202610_week2&utm_content=introduction')).campaign_content, 'introduction');
});
