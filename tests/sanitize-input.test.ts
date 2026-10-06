import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeInput} from '../lib/sanitize-input';

test('sanitizeInput removes PostgreSQL-incompatible NUL characters recursively', () => {
  const input = {
    property: {insurance: '保\u0000険', description: 'line 1\nline 2'},
    source: {notes: 'A\u0000B'},
    tags: ['garage\u0000house'],
  };

  assert.deepEqual(sanitizeInput(input), {
    property: {insurance: '保険', description: 'line 1\nline 2'},
    source: {notes: 'AB'},
    tags: ['garagehouse'],
  });
});

test('sanitizeInput preserves JSON primitives and empty values', () => {
  assert.deepEqual(sanitizeInput({empty: '', value: 0, enabled: false, absent: null}), {
    empty: '', value: 0, enabled: false, absent: null,
  });
});
