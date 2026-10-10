import {z} from 'zod';
import {FEATURES, money, prefectureName} from './constants';
import type {Property} from './types';

export type SocialService = 'instagram' | 'threads';
export const SOCIAL_LABELS = {instagram:'Instagram', threads:'Threads'} as const;
export const DELIVERY_LABELS: Record<string,string> = {
 pending:'送信待ち', sending:'結果を確認中', scheduled:'Buffer予約済み',
 failed:'予約できませんでした', uncertain:'Bufferで確認が必要',
};
export type SocialDraft = {
 id:string; property_id:string|null; property_version:string; property_name:string;
 instagram_text:string; threads_text:string; image_path:string;
 status:'draft'|'locked'; due_at:string|null; created_at:string;
};
export type SocialDelivery = {
 id:string; draft_id:string; channel_id:string; channel_name:string; service:SocialService;
 status:string; buffer_post_id:string|null; error_message:string|null; due_at:string;
};
export type SocialChannel = {
 id:string; name:string; service:SocialService; organizationName:string;
 isDisconnected:boolean; isLocked:boolean; isQueuePaused:boolean; timezone:string;
};
const clean = (s:string|null|undefined) => (s||'').replace(/[\r\n\t]+/g,' ').trim();
export function socialCopy(p:Property, baseUrl:string) {
 const pref=prefectureName(p.prefecture), city=clean(p.city);
 const location=city.startsWith(pref)?city:pref+city;
 const facts=[
  location,
  '賃料 '+money(p.rent)+'／月・管理費 '+money(p.management_fee),
  [p.layout,p.floor_area!=null?p.floor_area+'㎡':null,p.garage_count!=null?'ガレージ'+p.garage_count+'台':null].filter(Boolean).join(' / '),
  FEATURES.filter(([key])=>p[key]===true).slice(0,4).map(([,label])=>label).join(' / '),
 ].filter(Boolean).join('\n');
 const url=new URL('/properties/'+encodeURIComponent(p.slug),baseUrl);
 url.searchParams.set('utm_medium','organic_social');
 url.searchParams.set('utm_campaign','property');
 url.searchParams.set('utm_content',p.slug);
 url.searchParams.set('utm_source','threads');
 const heading=clean(p.catch_copy)||'愛車と暮らす、理想の住まいを。';
 const footer='募集状況・諸条件はお問い合わせください。\n運営：ASC不動産';
 const instagram=[
  heading,clean(p.property_name),facts,
  '詳細・お問い合わせはプロフィールのサイトへ。\n物件名をお伝えいただくとスムーズです。',
  footer,'#ガレージハウス #ガレージ付き賃貸 #ガレージハウスナビ',
 ].join('\n\n');
 const tail='\n\n詳細・お問い合わせ\n'+url+'\n\n'+footer;
 const intro=[heading,clean(p.property_name),facts].join('\n\n');
 const available=500-Array.from(tail).length;
 const threads=Array.from(intro).length>available
  ?Array.from(intro).slice(0,Math.max(0,available-1)).join('')+'…'+tail:intro+tail;
 return {instagram,threads};
}
export function jstToIso(value:string) {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('日本時間の予約日時を入力してください。');
 const d=new Date(value+':00+09:00');
 if(!Number.isFinite(d.getTime())||new Date(d.getTime()+9*3600000).toISOString().slice(0,16)!==value)
  throw new Error('予約日時を確認してください。');
 return d.toISOString();
}
export function checkSchedule(value:string,now=Date.now()) {
 const iso=jstToIso(value), at=Date.parse(iso);
 if(at<now+5*60000)throw new Error('予約は現在から5分以上先にしてください。');
 if(at>now+30*86400000)throw new Error('予約は30日以内にしてください。');
 return iso;
}
export function assertPublishable(p:Property,now=Date.now(),dueAt?:string) {
 if(p.status!=='published')throw new Error('公開中の物件だけ投稿を作れます。');
 if(!p.property_images?.length)throw new Error('メイン写真を登録してください。');
 const until=new Date((dueAt?Date.parse(dueAt):now)+9*3600000).toISOString().slice(0,10);
 if(!p.next_update_at||p.next_update_at<until)throw new Error('物件の次回更新予定日を確認してください。予約日まで有効な募集情報が必要です。');
}
export const socialTextsSchema=z.object({
 instagram_text:z.string().trim().min(1).refine(v=>Array.from(v).length<=2200,'Instagramは2,200文字以内です。'),
 threads_text:z.string().trim().min(1).refine(v=>Array.from(v).length<=500,'Threadsは500文字以内です。'),
});
