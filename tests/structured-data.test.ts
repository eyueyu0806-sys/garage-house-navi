import test from 'node:test';
import assert from 'node:assert/strict';
import {structuredDataJson} from '../lib/structured-data';

test('listing text cannot terminate a JSON-LD script element', () => {
  const value = {description: '</script><img src=x onerror=alert(1)>', name: '愛車と暮らす住宅'};
  const json = structuredDataJson(value);
  assert.equal(json.includes('<'), false);
  assert.deepEqual(JSON.parse(json), value);
});
