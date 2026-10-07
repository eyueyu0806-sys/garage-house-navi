import {z} from 'zod';

export const LEAD_PAGE_SIZE = 20;
export type LeadTable = 'inquiries' | 'property_requests';
export type LeadKind = 'all' | 'inquiry' | 'request';
export type LeadRow = {id:string;created_at:string;table:LeadTable};
const cursorSchema = z.object({
 created_at:z.iso.datetime({offset:true}),
 id:z.uuid(),
 table:z.enum(['inquiries','property_requests']),
}).strict();

export function parseLeadCursor(value?:string):LeadRow|null{
 if(!value||value.length>512)return null;
 try{return cursorSchema.parse(JSON.parse(Buffer.from(value,'base64url').toString('utf8')));}
 catch{return null;}
}
export function encodeLeadCursor(row:LeadRow){
 return Buffer.from(JSON.stringify({created_at:row.created_at,id:row.id,table:row.table})).toString('base64url');
}
export function leadCursorFilter(cursor:LeadRow,table:LeadTable){
 const beforeId=`and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
 const sameId=table<cursor.table?`,and(created_at.eq.${cursor.created_at},id.eq.${cursor.id})`:'';
 return `created_at.lt.${cursor.created_at},${beforeId}${sameId}`;
}
export function mergeLeadRows<T extends LeadRow>(rows:T[]){
 // PostgreSQL timestamps have microseconds; Date.parse alone loses their order.
 const micros=(value:string)=>BigInt(Math.floor(Date.parse(value)/1000))*BigInt(1000000)+
  BigInt(((value.match(/\.(\d+)/)?.[1]||'')+'000000').slice(0,6));
 return rows.map(row=>({row,time:micros(row.created_at)})).sort((left,right)=>{
  if(left.time!==right.time)return left.time<right.time?1:-1;
  const a=left.row,b=right.row;
  return (a.id===b.id?0:a.id<b.id?1:-1)||(a.table===b.table?0:a.table<b.table?1:-1);
 }).map(item=>item.row);
}
export function leadListUrl({kind='all',status,cursor}:{kind?:LeadKind;status?:string;cursor?:string}={}){
 const params=new URLSearchParams();
 if(kind!=='all')params.set('kind',kind);
 if(status)params.set('status',status);
 if(cursor)params.set('cursor',cursor);
 return '/admin/leads'+(params.size?'?'+params.toString():'');
}
