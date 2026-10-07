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

test('internal Next URL hostname does not reject the real received host',()=>{
 const request=(origin:string,host:string,extra:Record<string,string>={})=>new Request('http://localhost:4111/api/admin/email-test',{method:'POST',headers:{origin,host,...extra}});
 assert.equal(sameOrigin(request('http://127.0.0.1:4111','127.0.0.1:4111')),true);
 assert.equal(sameOrigin(request('http://localhost:4111','127.0.0.1:4111')),false);
 assert.equal(sameOrigin(request('https://attacker.example','127.0.0.1:4111',{'x-forwarded-host':'attacker.example','x-forwarded-proto':'https'})),false);
 for(const host of ['127.0.0.1:4111/path','person@127.0.0.1:4111','127.0.0.1:4111?x=1'])assert.equal(sameOrigin(request('http://127.0.0.1:4111',host)),false);
});
