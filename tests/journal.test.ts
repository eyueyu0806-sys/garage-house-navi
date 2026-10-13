import test from 'node:test';
import assert from 'node:assert/strict';
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
