import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {logout} from '@/app/login/actions';
export const metadata={title:'管理画面',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const admin=await getAdmin();if(!admin)redirect('/login');
 return <><header className="admin-header"><Link className="wordmark" href="/admin">GARAGE HOUSE NAVI<span>管理画面</span></Link><Link href="/" target="_blank" rel="noopener noreferrer">公開サイトを見る ↗</Link><form action={logout}><button className="text-link">ログアウト</button></form></header>
  <div className="admin-layout"><nav className="admin-nav" aria-label="管理画面"><Link href="/admin">ホーム</Link><Link href="/admin/properties">物件管理</Link><Link className="sub-link" href="/admin/properties?status=published">公開中</Link><Link className="sub-link" href="/admin/properties?status=draft">下書き</Link><Link className="sub-link" href="/admin/properties?status=closed">募集終了</Link><Link className="sub-link" href="/admin/properties/new">＋ 物件を登録</Link><Link href="/admin/leads">反響一覧</Link><Link href="/admin/social">SNS投稿</Link><Link href="/admin/settings">設定・動作確認</Link><Link href="/admin/sources">掲載元情報</Link></nav><main className="admin-main">{children}</main></div>
 </>;
}
