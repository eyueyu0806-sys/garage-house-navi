import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {siteUrl} from './config';
import {serviceDb} from './supabase';
export {sameOrigin} from './origin';
function secret(){return process.env.SUPABASE_SERVICE_ROLE_KEY||'';}
export function issueFormToken(){const t=String(Date.now());return `${t}.${createHmac('sha256',secret()).update(t).digest('hex')}`;}
export function validFormToken(token:string){
 const [t,sig]=token.split('.');if(!/^\d{13}$/.test(t||'')||!/^[a-f0-9]{64}$/.test(sig||''))return false;
 const age=Date.now()-Number(t);if(age<1500||age>2*3600*1000)return false;
 return timingSafeEqual(Buffer.from(sig),Buffer.from(createHmac('sha256',secret()).update(t).digest('hex')));
}
export async function rateLimit(request:Request,scope:string,limit=5,identity?:string){
 // Vercel overwrites x-vercel-forwarded-for; never trust arbitrary X-Forwarded-For.
 const ip=process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown' : 'local';
 // Login attempts are keyed by account identity so one person on a shared office/home
 // network cannot lock out every other administrator. Other scopes remain IP-based.
 const key=createHmac('sha256',secret()).update(identity?`${scope}:identity:${identity}`:`${scope}:${ip}`).digest('hex');
 const {data,error}=await serviceDb().rpc('consume_rate_limit',{p_key:key,p_limit:limit});
 if(error)throw new Error('RATE_LIMIT_UNAVAILABLE');return data===true;
}
export function sanitizedSource(value:string){try{const url=new URL(value,siteUrl());if(url.origin!==new URL(siteUrl()).origin)return siteUrl();return `${url.origin}${url.pathname}${url.search}`.slice(0,2000);}catch{return siteUrl();}}
export async function readJson(request:Request,max=32000){
 if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('JSON_REQUIRED');
 if(Number(request.headers.get('content-length'))>max)throw new Error('BODY_TOO_LARGE');
 const reader=request.body?.getReader(); if(!reader)throw new Error('EMPTY_BODY');
 let bytes=0; const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
