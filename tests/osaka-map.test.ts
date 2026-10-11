import test from 'node:test';
import assert from 'node:assert/strict';
import {osakaCities,osakaAreaGroups,osakaCityHref,citySearchValues} from '../lib/osaka';
import geometry from '../lib/data/osaka-map.json';
import municipalities from '../lib/data/municipalities.json';
import {filterDemo,parseSearch} from '../lib/search';
import {demoProperties} from '../lib/demo';

test('map and list cover every Osaka municipality once with shareable search URLs',()=>{
 assert.equal(osakaCities.length,43);
 assert.deepEqual(new Set(osakaCities.map(c=>c.name)),new Set(municipalities['大阪府']));
 const codes=osakaCities.map(c=>c.code).sort();
 assert.deepEqual(geometry.map(g=>g.code).sort(),codes);
 assert.deepEqual(osakaAreaGroups.flatMap(g=>g.codes).sort(),codes);
 for(const city of osakaCities){
  const query=Object.fromEntries(new URL(osakaCityHref(city.name),'https://example.test').searchParams);
  assert.equal(parseSearch(query).city,city.name);
  assert.ok(citySearchValues('osaka',city.label).includes(city.name));
 }
 for(const g of geometry){assert.match(g.path,/^M[\d.,LZM]+Z$/);assert.ok(g.x>0&&g.x<560&&g.y>0&&g.y<680);}
});
test('Osaka and Sakai include legacy wards without matching unrelated cities or drafts',()=>{
 const cities=['堺市','堺市東区','堺市北区','大阪市','大阪市北区','東大阪市','大阪狭山市','泉南郡熊取町','熊取町'];
 const rows=cities.map((city,i)=>({...demoProperties[0],id:String(i),prefecture:'osaka',city,status:'published' as const}));
 rows.push({...rows[0],id:'draft',status:'draft' as 'published'});
 const search=(city:string)=>filterDemo(rows,parseSearch({prefecture:'osaka',city})).map(p=>p.city).sort();
 assert.deepEqual(search('堺市'),['堺市','堺市北区','堺市東区']);
 assert.deepEqual(search('大阪市'),['大阪市','大阪市北区']);
 assert.deepEqual(search('泉南郡熊取町'),['泉南郡熊取町','熊取町']);
 assert.deepEqual(search('堺市東区'),['堺市東区']);
 assert.deepEqual(citySearchValues('hyogo','堺市'),['堺市']);
 assert.deepEqual(citySearchValues('osaka','%'),['%']);
});
