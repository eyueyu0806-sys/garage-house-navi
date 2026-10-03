export const dynamic='force-dynamic';
import Link from 'next/link';import {operator} from '@/lib/config';import {Breadcrumb} from '@/components/site-shell';
export const metadata={title:'お問い合わせ',alternates:{canonical:'/contact'}};
export default function Contact(){const o=operator();return <div className="page-wrap legal-page"><Breadcrumb items={[{label:'お問い合わせ'}]}/><div className="page-heading"><p className="eyebrow">CONTACT</p><h1>お問い合わせ</h1><p>GARAGE HOUSE NAVI運営窓口</p></div><p>物件についてのお問い合わせは各物件ページから、ご希望条件のご相談は物件リクエストからお送りください。</p><Link className="button" href="/request">物件リクエスト</Link><h2>運営に関するお問い合わせ</h2>{o.email?<p><a className="text-link" href={`mailto:${o.email}`}>{o.email}</a></p>:<p className="notice">お問い合わせ窓口は公開準備中です。</p>}</div>}
