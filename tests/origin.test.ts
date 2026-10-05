import test from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin} from '../lib/origin';

test('same-origin guard uses the actual request host and still rejects cross-site requests',()=>{
  assert.equal(sameOrigin(new Request('https://garagehouse-navi.com/api/admin/properties',{
    method:'POST',headers:{origin:'https://garagehouse-navi.com'}
  })),true);
  assert.equal(sameOrigin(new Request('https://garage-house-navi.vercel.app/api/admin/properties',{
    method:'POST',headers:{origin:'https://garage-house-navi.vercel.app'}
  })),true);
  assert.equal(sameOrigin(new Request('https://garagehouse-navi.com/api/admin/properties',{
    method:'POST',headers:{origin:'https://attacker.example'}
  })),false);
  assert.equal(sameOrigin(new Request('https://garagehouse-navi.com/api/admin/properties',{method:'POST'})),false);
});
