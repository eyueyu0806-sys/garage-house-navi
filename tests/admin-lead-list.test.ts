import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeLeadCursor,parseLeadCursor,mergeLeadRows,leadCursorFilter,leadListUrl,type LeadRow} from '../lib/admin-lead-list';

const row:LeadRow={id:'00000000-0000-4000-8000-000000000002',created_at:'2026-10-07T12:00:00+00:00',table:'property_requests'};
test('unified list interleaves both sources by actual time and deterministic ID/table ties',()=>{
 const rows:LeadRow[]=[{...row,table:'inquiries'},{...row,id:'00000000-0000-4000-8000-000000000001'},row,{...row,created_at:'2026-10-07T22:00:00+09:00'}];
 const sorted=mergeLeadRows(rows);
 assert.equal(sorted[0].created_at,'2026-10-07T22:00:00+09:00');
 assert.equal(sorted[1].table,'property_requests');
 assert.equal(sorted[2].table,'inquiries');
 assert.equal(sorted[3].id,'00000000-0000-4000-8000-000000000001');
 assert.equal(rows[0].table,'inquiries');
});
test('pagination includes the other table when the timestamp and ID match',()=>{
 assert.match(leadCursorFilter(row,'inquiries'),/id.eq.00000000-0000-4000-8000-000000000002/);
 assert.doesNotMatch(leadCursorFilter(row,'property_requests'),/id.eq/);
 assert.match(leadCursorFilter(row,'property_requests'),/id.lt/);
});

test('microsecond ordering agrees with PostgreSQL even within the same millisecond',()=>{
 const newer={...row,id:'00000000-0000-4000-8000-000000000001',created_at:'2026-10-07T21:00:00.123999+09:00'};
 const older={...row,id:'00000000-0000-4000-8000-000000000002',created_at:'2026-10-07T12:00:00.123001Z'};
 assert.equal(Date.parse(newer.created_at),Date.parse(older.created_at));
 assert.deepEqual(mergeLeadRows([older,newer]),[newer,older]);
});
test('cursor rejects injected filters, bad dates and unexpected keys',()=>{
 assert.deepEqual(parseLeadCursor(encodeLeadCursor(row)),row);
 for(const invalid of ['not-json',Buffer.from(JSON.stringify({...row,id:'x),id.gt.0'})).toString('base64url'),Buffer.from(JSON.stringify({...row,created_at:'tomorrow'})).toString('base64url'),Buffer.from(JSON.stringify({...row,extra:true})).toString('base64url'),'x'.repeat(513)])assert.equal(parseLeadCursor(invalid),null);
});
test('filters survive next-page URLs and cleared filters reset pagination',()=>{
 const url=leadListUrl({kind:'request',status:'new',cursor:encodeLeadCursor(row)});
 const params=new URL(url,'https://example.jp').searchParams;
 assert.equal(params.get('kind'),'request');assert.equal(params.get('status'),'new');
 assert.deepEqual(parseLeadCursor(params.get('cursor')!),row);
 assert.equal(leadListUrl(),'/admin/leads');
 assert.equal(leadListUrl({kind:'inquiry'}),'/admin/leads?kind=inquiry');
});
