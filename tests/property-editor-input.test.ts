import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePropertyAddress,prepareEditorInput} from '../lib/property-editor-input';
import {propertyAddress} from '../lib/property-address';
import {propertySchema,sourceSchema} from '../lib/validation';
import {demoProperties} from '../lib/demo';
import municipalities from '../lib/data/municipalities.json';

const token='12345678-1234-4000-8000-000000000001';
test('one address retains prefecture, municipality, ward, street and building without external calls',()=>{
 assert.deepEqual(parsePropertyAddress('大阪府大阪市北区梅田1丁目1-1 テストビル101'),{prefecture:'osaka',city:'大阪市',city_slug:'osaka-city',town:null,full_address:'北区梅田1丁目1-1 テストビル101'});
 assert.equal(parsePropertyAddress('兵庫県神戸市中央区港島1丁目').city_slug,'kobe');
 assert.equal(parsePropertyAddress('大阪府箕面市船場東1丁目').city_slug,'minoh');
 assert.equal(parsePropertyAddress('大阪府島本町水無瀬1丁目').city,'三島郡島本町');
 assert.equal(parsePropertyAddress('東京都新宿区新宿1丁目').city,'新宿区');
 for(const [pref,names] of Object.entries(municipalities))for(const city of names){
  const parsed=parsePropertyAddress(pref+city+'テスト町1-1');assert.equal(parsed.city,city);assert.equal(parsed.full_address,'テスト町1-1');
 }
 for(const address of ['',null,'大阪市北区梅田','大阪府存在しない市1丁目'])assert.throws(()=>parsePropertyAddress(address));
});
test('legacy address parts combine without repeating prefecture or town',()=>{
 const p={...demoProperties[0],prefecture:'osaka',city:'大阪府豊中市',town:'庄内西町',full_address:'庄内西町1丁目1-1'};
 assert.equal(propertyAddress(p),'大阪府豊中市庄内西町1丁目1-1');
 assert.equal(propertyAddress({...p,full_address:'大阪府豊中市庄内西町1丁目1-1'}),'大阪府豊中市庄内西町1丁目1-1');
 assert.equal(propertyAddress({...p,city:'豊中市',full_address:'豊中市庄内西町1丁目1-1'}),'大阪府豊中市庄内西町1丁目1-1');
 assert.equal(propertyAddress({...p,prefecture:'kanagawa',city:'大和市',town:null,full_address:'市場1丁目'}),'神奈川県大和市市場1丁目');
});
test('new editor creates identifiers and brokerage type server-side; empty removed fields remain null',()=>{
 const input=prepareEditorInput({property_name:'新しい物件',address:'大阪府豊中市庄内西町1丁目',rent:'150000',status:'draft',featured:false,slug:'untrusted',property_code:'untrusted',transaction_type:'untrusted',description:'untrusted'},{advertising_permission:false,contact_email:'untrusted'},null,null,token);
 const p=propertySchema.parse(input.property),s=sourceSchema.parse(input.source);
 assert.equal(p.slug,'ghn-123456781234');assert.equal(p.property_code,'GHN-123456781234');assert.equal(p.transaction_type,'媒介');
 assert.equal(p.description,null);assert.equal(p.garage_type,null);assert.equal(p.other_features,null);assert.equal(s.contact_email,null);
});
test('editing preserves removed data and live URL, but correctly replaces an address on relocation',()=>{
 const p={...demoProperties[0],city:'大阪府箕面市',town:'船場東',full_address:'1丁目',transaction_type:'一般媒介'};
 const source={contact_email:'source@example.jp',ad_fee:50000,original_url:'https://example.jp/property',brokerage_terms:'既存条件',internal_notes:'既存メモ'};
 const raw={...p,address:propertyAddress(p),rent:170000};
 const kept=prepareEditorInput(raw,{advertising_permission:true},p,source,token);
 assert.equal(kept.property.slug,p.slug);assert.equal(kept.property.property_code,p.property_code);assert.equal(kept.property.city,p.city);
 assert.equal(kept.property.description,p.description);assert.equal(kept.property.transaction_type,'一般媒介');assert.equal(kept.source.internal_notes,'既存メモ');
 propertySchema.parse(kept.property);sourceSchema.parse(kept.source);
 const moved=prepareEditorInput({...raw,address:'兵庫県西宮市甲風園1丁目'},{advertising_permission:true},p,source,token);
 assert.equal(moved.property.prefecture,'hyogo');assert.equal(moved.property.city,'西宮市');assert.equal(moved.property.city_slug,null);assert.equal(moved.property.town,null);
 assert.equal(propertyAddress(propertySchema.parse(moved.property)),'兵庫県西宮市甲風園1丁目');
});
