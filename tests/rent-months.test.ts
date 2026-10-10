import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthlyFees,rentMonths} from '../lib/rent-months';
import {prepareEditorInput} from '../lib/property-editor-input';
import {propertySchema} from '../lib/validation';
test('editor months become whole yen, including decimal months, blank and zero',()=>{
 const raw={property_name:'月数テスト',address:'大阪府大阪市北区梅田1丁目',rent:'150000',status:'draft',featured:false,deposit_months:'2',key_money_months:'0.5'};
 const parsed=propertySchema.parse(prepareEditorInput(raw,{},null,null,'123456781234').property);
 assert.equal(parsed.deposit,300000);assert.equal(parsed.key_money,75000);
 assert.deepEqual(monthlyFees({...raw,rent:160000},null),{deposit:320000,key_money:80000});
 assert.deepEqual(monthlyFees({rent:150000,deposit_months:'',key_money_months:'0'},null),{deposit:null,key_money:0});
 assert.equal(rentMonths(null,150000),'');assert.equal(rentMonths(0,0),'0');
 assert.equal(monthlyFees({rent:153999,deposit_months:'0.5'},null).deposit,77000);
});
test('existing yen amounts round trip without drift, and old payloads keep yen units',()=>{
 for(const rent of [1,3,99999,153999,100000000])for(const amount of [0,1,50000,199999,100000000]){
  assert.equal(monthlyFees({rent,deposit_months:rentMonths(amount,rent)},null).deposit,amount);
 }
 assert.deepEqual(monthlyFees({rent:150000,deposit:300000,key_money:75000},null),{});
 const existing={rent:0,deposit:50000,key_money:null};
 assert.equal(rentMonths(50000,0),'');
 assert.equal(monthlyFees({rent:0,deposit_months:''},existing).deposit,50000);
 assert.equal(monthlyFees({rent:0,deposit_months:'0'},existing).deposit,0);
});
test('invalid monthly fees are rejected before saving',()=>{
 for(const value of [-1,'NaN','Infinity',' ',true,{},[],1e100])assert.throws(()=>monthlyFees({rent:150000,deposit_months:value},null),/敷金/);
 assert.throws(()=>monthlyFees({rent:0,key_money_months:1},null),/月額賃料/);
 assert.throws(()=>monthlyFees({rent:100000000,key_money_months:2},null),/上限/);
});
