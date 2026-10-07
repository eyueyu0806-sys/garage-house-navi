import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {leadFormsEnabled,siteUrl,operator} from '@/lib/config';
import {leadEmailConfiguration} from '@/lib/lead-email';
import {emailConfigProblem} from '@/lib/email-transport';
import {EmailTest} from '@/components/email-test';
export default async function Settings(){
 const admin=await getAdmin();if(!admin)redirect('/login');
 const config=leadEmailConfiguration(),problem=emailConfigProblem(config),accepting=leadFormsEnabled();
 return <>
  <div className="admin-heading"><div><p className="eyebrow">SETTINGS</p><h1>設定・動作確認</h1></div></div>
  <div className="notice">普段は「物件管理」「反響一覧」を使います。この画面は設定やメールを確認したいときに開いてください。</div>
  <section className="editor-section"><h2>サイトの状態</h2><dl className="facts-table">
   <div><dt>管理者ログイン</dt><dd>確認済み</dd></div>
   <div><dt>問い合わせ受付</dt><dd>{accepting?'受付中':'停止中'}</dd></div>
   <div><dt>運営会社</dt><dd>{operator().name||'未設定'}</dd></div>
   <div><dt>公式URL</dt><dd>{siteUrl()}</dd></div>
  </dl>{!accepting?<p className="error-message">問い合わせ受付が停止しています。デモ設定をオフにし、運営会社情報・保存用の接続設定・受付設定をご確認ください。</p>:null}</section>
  <section className="editor-section"><h2>メール通知</h2><dl className="facts-table">
   <div><dt>通知先</dt><dd>{config.recipient||'未設定'}</dd></div>
   <div><dt>送信元</dt><dd>{config.from||'未設定'}</dd></div>
   <div><dt>送信の鍵</dt><dd>{config.apiKey?.trim()?'設定あり':'未設定'}</dd></div>
  </dl>
  {problem?<p className="error-message">{problem.message}</p>:<p className="small">設定は入力済みです。送信元ドメインの認証と、メールの到着は下のテストで確認します。</p>}
  <EmailTest enabled={!problem}/>
  <details className="settings-help"><summary>うまく届かないとき</summary><ol>
   <li>上の「通知先」が受信したいアドレスになっているか確認します。</li>
   <li>テストを送って、表示された理由を確認します。「ドメインの認証」が原因ならResendのDomainsと、お名前.comのDNS設定を確認します。</li>
   <li>「受け付けました」と表示されたら、受信箱と迷惑メールを確認します。送信IDをResendの履歴と照合できます。</li>
   <li>Vercelの設定を変更した場合だけ、Save → Redeploy → Readyの順に反映します。</li>
  </ol><p className="small">メール通知に失敗しても、保存済みの反響は<Link className="text-link" href="/admin/leads">反響一覧</Link>で確認できます。過去のメールは設定変更だけでは再送されません。</p></details>
  </section>
  <section className="editor-section"><h2>Google検索の確認</h2><p>検索への登録や順位は、Google Search Consoleで確認します。</p>
   <div className="admin-shortcuts"><a className="button secondary" href="/sitemap.xml" target="_blank" rel="noopener noreferrer">サイトマップを開く</a><a className="button secondary" href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Search Consoleを開く</a></div>
  </section>
 </>;
}
