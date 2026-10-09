import type {Metadata} from 'next';
import Link from 'next/link';
import {Breadcrumb, RequestCTA} from '@/components/site-shell';
import {demoMode} from '@/lib/config';
import {publishedArticles} from '@/lib/journal';

export const metadata: Metadata = {
  title: 'GARAGE LIFE ガレージのある暮らしの読みもの',
  description: 'ガレージハウスの探し方や内見で確認したいことなど、愛車と暮らす住まい選びに役立つ読みもの。',
  alternates: {canonical: '/journal'},
  robots: {index: !demoMode() && publishedArticles().length > 0, follow: !demoMode()},
};
export default function Journal() {
  const articles = publishedArticles();
  return <div className="page-wrap">
    <Breadcrumb items={[{label: 'GARAGE LIFE'}]}/>
    <div className="page-heading"><p className="eyebrow">STORIES FOR YOUR NEXT CHAPTER</p>
      <h1>GARAGE LIFE</h1><p>ガレージの先に、広がる暮らし。</p></div>
    <div className="journal-list">
      {articles.map(article => <article key={article.slug} className="journal-summary">
        <p className="eyebrow">住まいの選び方</p>
        <h2><Link href={`/journal/${article.slug}`}>{article.title}</Link></h2>
        <p>{article.description}</p>
        <p className="small muted"><time dateTime={article.publishedAt}>{article.publishedAt.replaceAll('-', '.')}</time> ／ ASC不動産</p>
        <Link className="text-link" href={`/journal/${article.slug}`}>記事を読む</Link>
      </article>)}
      {articles.length === 0 && <p>読みものを準備中です。</p>}
    </div><RequestCTA/>
  </div>;
}
