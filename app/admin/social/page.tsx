import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {SocialComposer} from '@/components/social-composer';
import type {SocialDraft} from '@/lib/social-content';

export default async function SocialPage({searchParams}:{searchParams:Promise<{property?:string}>}){
 const admin=await getAdmin();if(!admin)redirect('/login');
 const q=await searchParams;
 const [properties,history]=await Promise.all([
  admin.db.from('properties').select('id,property_name,property_code').eq('status','published').order('updated_at',{ascending:false}).limit(500),
  admin.db.from('social_drafts').select('*').order('created_at',{ascending:false}).limit(30),
 ]);
 if(properties.error)throw new Error('物件を読み込めませんでした。');
 return <><div className="admin-heading"><h1>SNS投稿</h1><a className="button secondary" href="https://publish.buffer.com/" target="_blank" rel="noopener noreferrer">Bufferを開く ↗</a></div>
 <p>物件を選ぶ → 文章・画像を確認 → 日本時間で予約。投稿の公開はBufferが行います。</p>
 {history.error?<p role="alert" className="error-message">SNS投稿の保存先が未設定です。管理者向けの設定手順を確認してください。</p>:
 <SocialComposer properties={properties.data||[]} history={(history.data||[]) as SocialDraft[]} initialProperty={q.property} configured={Boolean(process.env.BUFFER_API_KEY)}/>}
 </>;
}
