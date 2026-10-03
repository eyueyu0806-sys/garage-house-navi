import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSearch,filterDemo} from '../lib/search';
import {demoProperties} from '../lib/demo';
import {inquirySchema,requestSchema,propertySchema} from '../lib/validation';

test('dimension search excludes unknown dimensions and respects all five dimensions',()=>{
 const unknown={...demoProperties[0],id:'unknown',garage_width_mm:null};
 assert.equal(filterDemo([...demoProperties,unknown],parseSearch({garage_width_mm:'5000',entrance_height_mm:'2300'})).length,3);
 assert.equal(filterDemo(demoProperties,parseSearch({entrance_height_mm:'2400'})).length,0);
});
test('filters combine AND; sorting and nationwide prefectures are supported',()=>{
 assert.deepEqual(filterDemo(demoProperties,parseSearch({prefecture:'osaka',garage_count:'2',ev_charger:'1'})).map(p=>p.prefecture),['osaka']);
 assert.equal(filterDemo(demoProperties,parseSearch({sort:'rent_asc'}))[0].prefecture,'nara');
 assert.equal(parseSearch({prefecture:'okinawa'}).prefecture,'okinawa');
 assert.equal(parseSearch({max_rent:'-1',garage_count:'junk',page:'-4'}).page,'1');
});
const contact={name:'テスト',email:'test@example.com',phone:'',consent:true,website:'',submission_id:'00000000-0000-4000-8000-000000000100',form_token:'token',source_url:'/request'};
test('lead validation accepts either contact method and rejects contactless/spam/nonconsent',()=>{
 const raw={...contact,property_id:demoProperties[0].id,inquiry_type:'内見したい',message:'内見を希望します。'};
 assert.ok(inquirySchema.safeParse(raw).success);
 assert.ok(inquirySchema.safeParse({...raw,email:'',phone:'090-1234-5678'}).success);
 for(const patch of [{email:'',phone:''},{email:'invalid'},{website:'spam'},{consent:false},{message:''},{car_count:-1},{property_id:'invalid'}])assert.equal(inquirySchema.safeParse({...raw,...patch}).success,false);
 assert.ok(requestSchema.safeParse({...contact,prefecture:'osaka',budget:'180000'}).success);
});
test('numeric empty input is null, not misleading zero; admin fields cannot elevate roles',()=>{
 const parsed=propertySchema.parse({...demoProperties[0],garage_width_mm:'',management_fee:'',is_admin:true});
 assert.equal(parsed.garage_width_mm,null);assert.equal(parsed.management_fee,null);assert.ok(!('is_admin' in parsed));
 assert.equal(propertySchema.safeParse({...demoProperties[0],garage_width_mm:0}).success,false);
});
