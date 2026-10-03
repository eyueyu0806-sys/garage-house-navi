export const dynamic='force-dynamic';
import {operator} from '@/lib/config';import {Breadcrumb} from '@/components/site-shell';
export const metadata={title:'運営会社',alternates:{canonical:'/company'}};
export default function Company(){const o=operator();return <div className="page-wrap legal-page"><Breadcrumb items={[{label:'運営会社'}]}/><div className="page-heading"><p className="eyebrow">COMPANY</p><h1>運営会社</h1></div>{!o.name&&<p className="notice">サービス公開に向け、運営情報を準備しています。</p>}<dl className="facts-grid">{[['会社名',o.name],['代表者',o.representative],['所在地',o.address],['電話番号',o.phone],['メールアドレス',o.email],['宅地建物取引業免許',o.license]].map(([l,v])=><div key={l}><dt>{l}</dt><dd>{v||'公開準備中'}</dd></div>)}</dl></div>}
