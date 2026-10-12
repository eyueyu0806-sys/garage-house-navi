import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {SocialComposer} from '@/components/social-composer';
import type {SocialDraft} from '@/lib/social-content';

export default async function SocialPage({searchParams}:{searchParams:Promise<{property?:string}>}){
 const admin=await getAdmin();if(!admin)redirect('/login');
 const q=await searchParams;
 const [properties,history,automation,latestRun]=await Promise.all([
  admin.db.from('properties').select('id,property_name,property_code').eq('status','published').order('updated_at',{ascending:false}).limit(500),
  admin.db.from('social_drafts').select('*').order('created_at',{ascending:false}).limit(30),
  admin.db.from('social_autopilot_settings').select('enabled').eq('id',true).maybeSingle(),
  admin.db.from('social_autopilot_runs').select('status,finished_at,report').order('started_at',{ascending:false}).limit(1).maybeSingle(),
 ]);
 if(properties.error)throw new Error('物件を読み込めませんでした。');
 return <><div className="admin-heading"><h1>SNS投稿</h1><a className="button secondary" href="https://publish.buffer.com/" target="_blank" rel="noopener noreferrer">Bufferを開く ↗</a></div>
 {automation.data?.enabled?<div className="card"><h2>SNSの自動運転：稼働中</h2><p>水・金・日20時に、未投稿の公開物件をInstagram・Threadsへ予約します。掲載承諾・写真・更新期限を確認できる物件が対象です。</p>
 <p>朝6時ごろに予約と結果確認、夜19時ごろに結果確認。予約受付と公開完了は分けて記録します。</p>
 {latestRun.data?.finished_at&&<p>最終確認：{new Date(latestRun.data.finished_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}／{latestRun.data.status==='ok'?'正常':latestRun.data.status==='running'?'確認中':'要確認'}</p>}
 {latestRun.data?.report?.error&&<p role="alert">{String(latestRun.data.report.error)}</p>}</div>:<p>物件を選ぶ → 文章・画像を確認 → 日本時間で予約。投稿の公開はBufferが行います。</p>}
 {history.error?<p role="alert" className="error-message">SNS投稿の保存先が未設定です。管理者向けの設定手順を確認してください。</p>:
 <SocialComposer properties={properties.data||[]} history={(history.data||[]) as SocialDraft[]} initialProperty={q.property} configured={Boolean(process.env.BUFFER_API_KEY)}/>}
 </>;
}
