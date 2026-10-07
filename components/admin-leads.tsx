import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {LEAD_STATUSES,prefectureName} from '@/lib/constants';
import {LeadUpdate} from './lead-update';
import {encodeLeadCursor,leadCursorFilter,leadListUrl,mergeLeadRows,parseLeadCursor,LEAD_PAGE_SIZE,type LeadRow,type LeadTable,type LeadKind} from '@/lib/admin-lead-list';

type Lead = LeadRow & {
 name:string;status:keyof typeof LEAD_STATUSES;email:string|null;phone:string|null;
 property_name_snapshot?:string|null;property_id?:string|null;inquiry_type?:string|null;
 prefecture?:string|null;city?:string|null;move_in?:string|null;car_model?:string|null;
 car_count?:number|null;garage_count?:number|null;motorcycle_count?:number|null;
 budget?:number|null;layout?:string|null;must_haves?:string|null;source_url?:string|null;
 consent_at?:string|null;message?:string|null;other_wishes?:string|null;internal_notes:string|null;
};
export async function AdminLeads({q}:{q:{status?:string;kind?:string;cursor?:string}}){
 const admin=await getAdmin();if(!admin)redirect('/login');
 const kind:LeadKind=q.kind==='inquiry'||q.kind==='request'?q.kind:'all';
 const status=q.status&&Object.hasOwn(LEAD_STATUSES,q.status)?q.status:undefined;
 const cursor=parseLeadCursor(q.cursor);
 const tables:LeadTable[]=kind==='inquiry'?['inquiries']:kind==='request'?['property_requests']:['inquiries','property_requests'];
 const results=await Promise.all(tables.map(async table=>{
  let query=admin.db.from(table).select('*').order('created_at',{ascending:false}).order('id',{ascending:false});
  if(status)query=query.eq('status',status);
  if(cursor)query=query.or(leadCursorFilter(cursor,table));
  const {data,error}=await query.limit(LEAD_PAGE_SIZE+1);
  if(error)throw new Error('Leads unavailable');
  return (data||[]).map(row=>({...row,table})) as Lead[];
 }));
 const merged=mergeLeadRows(results.flat()),leads=merged.slice(0,LEAD_PAGE_SIZE);
 const next=merged.length>LEAD_PAGE_SIZE?encodeLeadCursor(leads[leads.length-1]):undefined;
 return <>
  <div className="admin-heading"><div><p className="eyebrow">CONTACTS</p><h1>反響一覧</h1></div><Link className="button secondary" href="/admin/settings">メールを確認する</Link></div>
  <p className="small muted">物件へのお問い合わせと、希望条件リクエストを新しい順に表示します。メールが届かないときも、保存済みの反響をここで確認できます。</p>
  <nav className="status-tabs" aria-label="問い合わせの種類">{([['all','すべて'],['inquiry','物件への問い合わせ'],['request','希望条件リクエスト']] as const).map(([value,label])=><Link className={kind===value?'active':''} aria-current={kind===value?'page':undefined} href={leadListUrl({kind:value,status})} key={value}>{label}</Link>)}</nav>
  <nav className="status-tabs" aria-label="対応状況"><Link href={leadListUrl({kind})} className={!status?'active':''} aria-current={!status?'page':undefined}>すべての状況</Link>{Object.entries(LEAD_STATUSES).map(([value,label])=><Link className={status===value?'active':''} aria-current={status===value?'page':undefined} href={leadListUrl({kind,status:value})} key={value}>{label}</Link>)}</nav>
  {!leads.length?<p className="notice">この条件の反響はありません。</p>:null}
  {leads.map(lead=>{
   const isInquiry=lead.table==='inquiries';
   return <details className="lead-record" key={lead.table+lead.id}>
    <summary><span className="lead-kind">{isInquiry?'物件問い合わせ':'希望条件リクエスト'}</span><strong>{lead.name}</strong><span>{new Date(lead.created_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})} ・ {LEAD_STATUSES[lead.status]}</span><span>{isInquiry?lead.property_name_snapshot:[prefectureName(lead.prefecture||''),lead.city].filter(Boolean).join(' ')||'エリア指定なし'}</span><span>{lead.email||lead.phone}</span></summary>
    <dl className="facts-table"><div><dt>受付ID</dt><dd>{lead.id}</dd></div><div><dt>メール / 電話</dt><dd>{lead.email||'未入力'} / {lead.phone||'未入力'}</dd></div>
     {isInquiry?<div><dt>問い合わせ理由</dt><dd>{lead.inquiry_type||'未入力'}</dd></div>:null}
     <div><dt>入居時期 / 車種</dt><dd>{lead.move_in||'未入力'} / {lead.car_model||'未入力'}</dd></div>
     <div><dt>車 / バイク台数</dt><dd>{lead.car_count??lead.garage_count??'未入力'} / {lead.motorcycle_count??'未入力'}</dd></div>
     {!isInquiry?<><div><dt>希望賃料 / 間取り</dt><dd>{lead.budget!=null?lead.budget.toLocaleString('ja-JP')+'円':'未入力'} / {lead.layout||'未入力'}</dd></div><div><dt>必須条件</dt><dd className="preserve-lines">{lead.must_haves||'未入力'}</dd></div></>:null}
     <div><dt>送信元URL</dt><dd>{lead.source_url}</dd></div><div><dt>同意日時</dt><dd>{lead.consent_at?new Date(lead.consent_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'確認中'}</dd></div>
    </dl>
    <p className="preserve-lines">{lead.message||lead.other_wishes||'追加の内容はありません。'}</p>
    {isInquiry&&lead.property_id?<p><Link className="text-link" href={'/admin/properties/'+lead.property_id}>物件を確認する</Link></p>:null}
    <LeadUpdate table={lead.table} id={lead.id} status={lead.status} notes={lead.internal_notes}/>
   </details>;
  })}
  <nav className="pagination" aria-label="反響一覧のページ">{cursor?<Link href={leadListUrl({kind,status})}>最新の反響に戻る</Link>:null}{next?<Link href={leadListUrl({kind,status,cursor:next})}>次の20件 →</Link>:null}</nav>
 </>;
}
