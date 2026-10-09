import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSitemapProperties} from '../lib/sitemap-properties';

test('sitemap includes properties beyond the API page limit', async () => {
  const rows = Array.from({length: 1001}, (_, i) => ({slug: `property-${i}`, updated_at: '2026-10-10T00:00:00Z'}));
  const ranges: number[][] = [];
  const result = await collectSitemapProperties(async (from, to) => {
    ranges.push([from, to]);
    return {data: rows.slice(from, to + 1), error: null};
  });
  assert.deepEqual(result, rows);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});

test('sitemap rejects partial results rather than caching incomplete output', async () => {
  const firstPage = Array.from({length: 1000}, () => ({slug: 'example', updated_at: '2026-10-10'}));
  await assert.rejects(collectSitemapProperties(async from => from === 0
    ? {data: firstPage, error: null} : {data: null, error: {code: 'timeout'}}), /SITEMAP_UNAVAILABLE/);
  await assert.rejects(collectSitemapProperties(async () => ({data: null, error: null})), /SITEMAP_UNAVAILABLE/);
  assert.deepEqual(await collectSitemapProperties(async () => ({data: [], error: null})), []);
});
