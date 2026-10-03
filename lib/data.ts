import 'server-only';
import {cache} from 'react';
import {supabase} from './supabase';
import {configured,demoMode} from './config';
import {demoProperties} from './demo';
import {FEATURES} from './constants';
import {parseSearch,filterDemo} from './search';
import type {Property,Query} from './types';
export async function attachImages(rows:Property[]) {
 if(!rows.length)return rows;
 const db=await supabase(); const paths=rows.flatMap(r=>r.property_images.map(i=>i.storage_path));
 if(!paths.length)return rows;
 const {data,error}=await db.storage.from('property-images').createSignedUrls(paths,3600);
 if(error) throw new Error('画像を取得できませんでした');
 const urls=new Map(data?.map(i=>[i.path,i.signedUrl]));
 return rows.map(r=>({...r,property_images:[...r.property_images].sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)).map(i=>({...i,url:urls.get(i.storage_path)??undefined}))}));
}
export async function getProperties(raw:Query={},options:{featured?:boolean;limit?:number}={}) {
 const q=parseSearch(raw),limit=options.limit??12,page=Number(q.page),start=(page-1)*limit;
 if(demoMode()) {let rows=filterDemo(demoProperties,q);if(options.featured)rows=rows.filter(p=>p.featured);return {items:rows.slice(start,start+limit),count:rows.length,query:q};}
 if(!configured())return {items:[] as Property[],count:0,query:q};
 const db=await supabase();
 let req=db.from('properties').select('*, property_images(*)',{count:'exact'}).eq('status','published');
 for(const key of ['prefecture','city','city_slug','layout'])if(q[key])req=req.eq(key,q[key]);
 for(const [key,col] of Object.entries({min_rent:'rent',min_area:'floor_area',garage_count:'garage_count'}))if(q[key])req=req.gte(col,Number(q[key]));
 for(const [key,col] of Object.entries({max_rent:'rent',max_area:'floor_area',walking_minutes:'walking_minutes'}))if(q[key])req=req.lte(col,Number(q[key]));
 if(q.built_after)req=req.gte('built_at',`${Math.max(1800,Math.min(2200,Number(q.built_after)))}-01-01`);
 for(const [key] of FEATURES)if(q[key]==='1')req=req.eq(key,true);
 if(options.featured)req=req.eq('featured',true);
 const sorting=q.sort==='rent_asc'?['rent',true]:q.sort==='rent_desc'?['rent',false]:q.sort==='area_desc'?['floor_area',false]:['published_at',false];
 const {data,count,error}=await req.order(sorting[0] as string,{ascending:sorting[1] as boolean,nullsFirst:false}).order('id').range(start,start+limit-1);
 if(error)throw new Error('物件を取得できませんでした。時間をおいてお試しください。');
 return {items:await attachImages((data??[]) as Property[]),count:count??0,query:q};
}
export const getProperty=cache(async(slug:string)=>{
 if(demoMode())return demoProperties.find(p=>p.slug===slug)??null;
 if(!configured())return null;
 const db=await supabase();const {data,error}=await db.from('properties').select('*,property_images(*)').eq('slug',slug).eq('status','published').maybeSingle();
 if(error)throw new Error('物件を取得できませんでした');
 return data?(await attachImages([data as Property]))[0]:null;
});
