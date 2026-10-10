/** Database amounts remain whole yen; the editor accepts multiples of monthly rent. */
export function rentMonths(amount:number|null|undefined,rent:number){
 if(amount==null)return '';
 if(amount===0)return '0';
 return rent>0?String(amount/rent):'';
}

export function monthlyFees(property:Record<string,unknown>,existing:{rent:number;deposit:number|null;key_money:number|null}|null){
 const fees:Record<string,number|null>={};
 for(const [key,label] of [['deposit','敷金'],['key_money','礼金']] as const){
  const input=key+'_months';
  // Older editors still submit yen. Do not convert those payloads twice.
  if(!Object.hasOwn(property,input))continue;
  const value=property[input],rent=Number(property.rent);
  if(value==null||value===''){
   // A legacy fixed fee with zero rent cannot be expressed in months.
   fees[key]=existing?.rent===0&&(existing[key]??0)>0?existing[key]:null;
   continue;
  }
  if((typeof value!=='string'&&typeof value!=='number')||String(value).trim()==='')throw new Error(`${label}は0以上の月数を入力してください。`);
  const months=Number(value);
  if(!Number.isFinite(months)||months<0)throw new Error(`${label}は0以上の月数を入力してください。`);
  if(!Number.isFinite(rent)||rent<0||(months>0&&rent===0))throw new Error(`${label}を月数で登録するには月額賃料を入力してください。`);
  const amount=Math.round(months*rent);
  if(!Number.isSafeInteger(amount)||amount>100000000)throw new Error(`${label}の金額が上限を超えています。月数と賃料を確認してください。`);
  fees[key]=amount;
 }
 return fees;
}
