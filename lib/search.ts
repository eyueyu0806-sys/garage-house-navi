import {z} from 'zod';
import {FEATURES,PREFECTURES,LAYOUTS} from './constants';
import type {Property,Query} from './types';
export const numericFilters = ['min_rent','max_rent','min_area','max_area','built_after','walking_minutes','garage_count','garage_width_mm','garage_depth_mm','garage_height_mm','entrance_width_mm','entrance_height_mm'] as const;
export function parseSearch(raw: Query) {
 const flat=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Array.isArray(v)?v[0]:v]));
 const result: Record<string,string>={};
 if(PREFECTURES.some(p=>p.slug===flat.prefecture)) result.prefecture=flat.prefecture!;
 for(const key of ['city','city_slug']) if(flat[key]) result[key]=flat[key]!.trim().slice(0,80);
 if(LAYOUTS.includes(flat.layout||'')) result.layout=flat.layout!;
 for(const key of numericFilters) if(flat[key] && z.coerce.number().finite().nonnegative().max(100000000).safeParse(flat[key]).success) result[key]=String(Number(flat[key]));
 if(result.built_after)result.built_after=String(Math.max(1800,Math.min(2200,Math.floor(Number(result.built_after)))));
 for(const [key] of FEATURES) if(flat[key]==='1') result[key]='1';
 if(['newest','rent_asc','rent_desc','area_desc'].includes(flat.sort||'')) result.sort=flat.sort!;
 result.page=String(Math.max(1,Math.min(10000,Math.floor(Number(flat.page)||1))));
 return result;
}
export function filterDemo(properties:Property[],q:Record<string,string>) {
 const minimums={min_rent:'rent',min_area:'floor_area',garage_count:'garage_count',garage_width_mm:'garage_width_mm',garage_depth_mm:'garage_depth_mm',garage_height_mm:'garage_height_mm',entrance_width_mm:'entrance_width_mm',entrance_height_mm:'entrance_height_mm'} as const;
 const maximums={max_rent:'rent',max_area:'floor_area',walking_minutes:'walking_minutes'} as const;
 let filtered=properties.filter(p=>p.status==='published'&&(!q.prefecture||p.prefecture===q.prefecture)&&(!q.city||p.city===q.city)&&(!q.city_slug||p.city_slug===q.city_slug)&&(!q.layout||p.layout===q.layout)&&(!q.built_after||(p.built_at&&p.built_at>=`${q.built_after}-01-01`))&&Object.entries(minimums).every(([k,col])=>!q[k]||(p[col]!=null&&Number(p[col])>=Number(q[k])))&&Object.entries(maximums).every(([k,col])=>!q[k]||(p[col]!=null&&Number(p[col])<=Number(q[k])))&&FEATURES.every(([k])=>q[k]!=='1'||p[k]===true));
 filtered=filtered.sort((a,b)=>q.sort==='rent_asc'?a.rent-b.rent:q.sort==='rent_desc'?b.rent-a.rent:q.sort==='area_desc'?(b.floor_area??-1)-(a.floor_area??-1):(b.published_at||'').localeCompare(a.published_at||'')||a.id.localeCompare(b.id));
 return filtered;
}
export function queryString(q:Record<string,string>,patch:Record<string,string>={}) {return new URLSearchParams({...q,...patch}).toString();}
