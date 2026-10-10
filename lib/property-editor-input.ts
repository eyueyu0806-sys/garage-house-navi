import municipalities from './data/municipalities.json';
import {PREFECTURES} from './constants';
import {regions} from './regions';
import {propertyAddress} from './property-address';
import type {Property,Source} from './types';

// Bundled municipality names: no geocoding service, API key or external request on save.
export function parsePropertyAddress(value:unknown){
 if(typeof value!=='string'||!value.trim()||value.length>500)throw new Error('物件住所を都道府県から500文字以内で入力してください。');
 const address=value.trim().replace(/[\s　]+/g,' ');
 const pref=PREFECTURES.find(p=>address.startsWith(p.name));
 if(!pref)throw new Error('物件住所を「大阪府大阪市…」のように都道府県から入力してください。');
 const rest=address.slice(pref.name.length).trimStart();
 const names=(municipalities as Record<string,string[]>)[pref.name]||[];
 let city=names.find(name=>rest.startsWith(name)),matched=city;
 if(!city){
  const aliases=names.filter(name=>name.includes('郡')&&rest.startsWith(name.split('郡')[1]));
  if(aliases.length===1){city=aliases[0];matched=city.split('郡')[1];}
 }
 if(!city||!matched)throw new Error('住所の市区町村名を確認してください。例：大阪府豊中市庄内西町1丁目');
 const detail=rest.slice(matched.length).trimStart();
 return {prefecture:pref.slug,city,city_slug:Object.entries(regions[pref.slug]?.cities||{}).find(([,r])=>r.name===city)?.[0]||null,town:null,full_address:detail||null};
}

const removedSourceFields=['contact_email','ad_fee','original_url','brokerage_terms','internal_notes'] as const;
export function prepareEditorInput(property:Record<string,unknown>,source:Record<string,unknown>,existing:Property|null,existingSource:Source|null,token:string){
 const generated='GHN-'+token.replace(/-/g,'').slice(0,12).toUpperCase();
 // Keep a legacy split address intact when the combined value is unchanged.
 const sameAddress=existing&&property.address===propertyAddress(existing);
 const location=sameAddress?{prefecture:existing.prefecture,city:existing.city,city_slug:existing.city_slug,town:existing.town,full_address:existing.full_address}:parsePropertyAddress(property.address);
 const fields={...property,...location,property_code:existing?.property_code||generated,slug:existing?.slug||generated.toLowerCase(),transaction_type:existing?.transaction_type||'媒介',garage_type:existing?.garage_type??null,description:existing?.description??null,other_features:existing?.other_features??null};
 const sources={...source};
 for(const key of removedSourceFields)sources[key]=existingSource?.[key]??null;
 return {property:fields,source:sources};
}
