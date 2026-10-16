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
