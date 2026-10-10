import {prefectureName} from './constants';
import type {Property} from './types';

// Existing rows may repeat the prefecture, municipality or town in later fields.
export function propertyAddress(p:Pick<Property,'prefecture'|'city'|'town'|'full_address'>){
 let address='';let suffixes:string[]=[];
 for(const value of [prefectureName(p.prefecture),p.city,p.town,p.full_address]){
  const part=value?.trim();if(!part)continue;
  // Remove only complete known components, never a coincidental single 市/町.
  const prefix=suffixes.find(s=>part.startsWith(s));
  const addition=prefix?part.slice(prefix.length):part;
  address+=addition;suffixes=suffixes.map(s=>s+addition);
  if(addition)suffixes.push(addition);
 }
 return address;
}
