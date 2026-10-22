import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {findPublishedArticle, publishedArticles} from '../lib/journal';

test('published journal is newest first with complete, safe metadata', () => {
  const articles = publishedArticles();
  assert.ok(articles.length >= 2);
  assert.deepEqual(articles.map(article => article.publishedAt),
    articles.map(article => article.publishedAt).toSorted().reverse());
  for (const article of articles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(article.title.length > 10 && article.description.length > 40);
    assert.ok(article.sections.length >= 5);
    if (article.image) assert.ok(article.imageAlt);
  }
});

test('initial costs article has usable checklist, comparison table, sources and related articles', () => {
  const article = findPublishedArticle('osaka-garage-house-initial-costs');
  assert.ok(article);
  assert.equal(article.publishedAt, '2026-10-16');
  assert.ok(article.checklistHeading?.includes('見積もり'));
  assert.equal(article.checklist?.length, 9);
  assert.ok(article.image && existsSync(`public${article.image}`));
  assert.ok(article.imageCaption?.includes('実在物件の写真・見積書ではなく'));
  const png = readFileSync(`public${article.image}`);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 150_000);
  const table = article.sections[0].table;
  assert.ok(table);
  assert.equal(table.rows.length, 7);
  for (const row of table.rows) assert.equal(row.length, table.headers.length);
  for (const source of article.sources ?? []) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['www.pref.osaka.lg.jp', 'www.mlit.go.jp'].includes(url.hostname));
    assert.equal(source.checkedAt, article.updatedAt);
  }
  assert.equal(article.relatedSlugs?.length, 2);
  for (const slug of article.relatedSlugs ?? []) {
    assert.notEqual(slug, article.slug);
    assert.ok(findPublishedArticle(slug));
  }
});

test('viewing checklist article links only to HTTPS public sources', () => {
  const article = findPublishedArticle('osaka-garage-house-viewing-checklist');
  assert.ok(article);
  assert.equal(article.status, 'published');
  assert.equal(article.publishedAt, '2026-10-13');
  assert.ok((article.checklist?.length ?? 0) >= 8);
  assert.ok((article.sources?.length ?? 0) >= 3);
  for (const source of article.sources ?? []) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.equal(source.checkedAt, article.updatedAt);
  }
});

test('rental process article includes safe application guidance, official sources and original image', () => {
  const article = findPublishedArticle('osaka-garage-house-rental-process');
  assert.ok(article);
  assert.equal(article.publishedAt, '2026-10-19');
  assert.ok(article.title.includes('問い合わせから契約前'));
  assert.equal(article.checklist?.length, 8);
  assert.ok(article.sections.length >= 6);
  assert.ok(article.sections.some(section => section.heading.includes('申込みは')));
  assert.ok(article.sections.some(section => section.paragraphs.some(text => text.includes('契約は成立していない'))));
  assert.ok(article.image && existsSync(`public${article.image}`));
  assert.ok(article.imageCaption?.includes('特定の物件'));
  const png = readFileSync(`public${article.image}`);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 150_000);
  assert.equal(article.sources?.length, 3);
  for (const source of article.sources ?? []) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.ok(['www.pref.osaka.lg.jp', 'www.mlit.go.jp'].includes(new URL(source.url).hostname));
    assert.equal(source.checkedAt, article.updatedAt);
  }
  assert.equal(article.relatedSlugs?.length, 2);
  for (const slug of article.relatedSlugs ?? []) assert.ok(findPublishedArticle(slug));
});

test('lease types article compares renewal and re-contract without promising availability', () => {
  const article = findPublishedArticle('osaka-garage-house-ordinary-fixed-term-lease');
  assert.ok(article);
  assert.equal(article.publishedAt, '2026-10-22');
  assert.ok(article.title.includes('普通借家と定期借家'));
  assert.equal(article.checklist?.length, 9);
  assert.ok(article.sections.length >= 6);
  const table = article.sections[0].table;
  assert.ok(table);
  assert.equal(table.rows.length, 5);
  for (const row of table.rows) assert.equal(row.length, table.headers.length);
  assert.ok(article.sections.some(section => section.paragraphs.some(text => text.includes('再契約は自動的な更新ではなく'))));
  assert.ok(article.sections.some(section => section.paragraphs.some(text => text.includes('将来の再契約が確約'))));
  assert.ok(article.image && existsSync(`public${article.image}`));
  assert.ok(article.imageCaption?.includes('特定の物件・契約'));
  const png = readFileSync(`public${article.image}`);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 150_000);
  assert.equal(article.sources?.length, 3);
  for (const source of article.sources ?? []) {
    assert.equal(new URL(source.url).hostname, 'www.mlit.go.jp');
    assert.equal(source.checkedAt, article.updatedAt);
  }
  for (const slug of article.relatedSlugs ?? []) assert.ok(findPublishedArticle(slug));
});
