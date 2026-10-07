import Link from 'next/link';
import {getAdmin} from '@/lib/supabase';
import {redirect} from 'next/navigation';

export default async function Dashboard(){
 const admin=await getAdmin();if(!admin)redirect('/login');
 const db=admin.db,jst=new Date(Date.now()+9*3600000);
 const monthStart=new Date(Date.UTC(jst.getUTCFullYear(),jst.getUTCMonth(),1)-9*3600000).toISOString();
 const [properties,inquiries,requests]=await Promise.all([
  Promise.all([db.from('properties').select('id',{count:'exact',head:true}),...['published','draft','closed'].map(status=>db.from('properties').select('id',{count:'exact',head:true}).eq('status',status))]),
  Promise.all([db.from('inquiries').select('id',{count:'exact',head:true}).gte('created_at',monthStart),...['new','viewing','closed_won'].map(status=>db.from('inquiries').select('id',{count:'exact',head:true}).eq('status',status))]),
  Promise.all([db.from('property_requests').select('id',{count:'exact',head:true}).gte('created_at',monthStart),...['new','viewing','closed_won'].map(status=>db.from('property_requests').select('id',{count:'exact',head:true}).eq('status',status))]),
 ]);
 if([...properties,...inquiries,...requests].some(result=>result.error))throw new Error('Dashboard unavailable');
 const counts=[...properties.map(result=>result.count||0),...inquiries.map((result,i)=>(result.count||0)+(requests[i].count||0))];
 const labels=['全物件','公開中','下書き','募集終了','今月の反響','新規の反響','内見予定','成約'];
 const hrefs=['/admin/properties','/admin/properties?status=published','/admin/properties?status=draft','/admin/properties?status=closed','/admin/leads','/admin/leads?status=new','/admin/leads?status=viewing','/admin/leads?status=closed_won'];
 return <>
  <div className="admin-heading"><div><p className="eyebrow">OVERVIEW</p><h1>管理画面ホーム</h1></div><Link className="button" href="/admin/properties/new">物件を登録する</Link></div>
  <div className="stats-grid">{labels.map((label,i)=><Link className="stat" href={hrefs[i]} key={label}><span>{label}</span><strong>{counts[i]}</strong></Link>)}</div>
  <p className="small muted">反響の件数は「物件への問い合わせ」と「希望条件リクエスト」の合計です。今月の集計は日本時間が基準です。</p>
  <div className="admin-shortcuts"><Link className="button" href="/admin/leads">届いた反響を見る</Link><Link className="button secondary" href="/admin/settings">設定・メールを確認する</Link></div>
 </>;
}
