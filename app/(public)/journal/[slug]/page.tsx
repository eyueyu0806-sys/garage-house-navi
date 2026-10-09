import {structuredDataJson} from '@/lib/structured-data';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Breadcrumb} from '@/components/site-shell';
import {demoMode, siteUrl} from '@/lib/config';
import {findPublishedArticle, publishedArticles} from '@/lib/journal';

type Props = {params: Promise<{slug: string}>};
export function generateStaticParams() {
  return publishedArticles().map(({slug}) => ({slug}));
}
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const article = findPublishedArticle((await params).slug);
  if (!article) notFound();
  const url = `/journal/${article.slug}`;
  return {title: article.title, description: article.description,
    alternates: {canonical: url}, robots: {index: !demoMode(), follow: !demoMode()},
    openGraph: {type: 'article', title: article.title, description: article.description,
      url, siteName: 'GARAGE HOUSE NAVI', locale: 'ja_JP',
      images: article.image ? [{url: article.image, width: 1200, height: 630, alt: article.title}] : [],
      publishedTime: article.publishedAt, modifiedTime: article.updatedAt},
    twitter: {card: 'summary_large_image', title: article.title, description: article.description,
      images: article.image ? [article.image] : []}};
}
export default async function Article({params}: Props) {
  const article = findPublishedArticle((await params).slug);
  if (!article) notFound();
  const base = siteUrl();
  const url = `${base}/journal/${article.slug}`;
  const schema = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'BlogPosting', headline: article.title, description: article.description,
      datePublished: article.publishedAt, dateModified: article.updatedAt,
      mainEntityOfPage: url, inLanguage: 'ja',
      ...(article.image ? {image: `${base}${article.image}`} : {}),
      author: {'@type': 'Organization', name: 'ASC不動産', url: `${base}/company`},
      publisher: {'@type': 'Organization', name: 'GARAGE HOUSE NAVI', url: base}},
    {'@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'HOME', item: base},
      {'@type': 'ListItem', position: 2, name: 'GARAGE LIFE', item: `${base}/journal`},
      {'@type': 'ListItem', position: 3, name: article.title, item: url},
    ]},
  ]};
  return <div className="page-wrap">
    <Breadcrumb items={[{label: 'GARAGE LIFE', href: '/journal'}, {label: article.title}]}/>
    <article className="journal-article">
      <header className="page-heading"><p className="eyebrow">GARAGE LIFE / 住まいの選び方</p>
        <h1>{article.title}</h1>
        <p className="small muted">公開 <time dateTime={article.publishedAt}>{article.publishedAt}</time> ／ 更新 <time dateTime={article.updatedAt}>{article.updatedAt}</time> ／ ASC不動産</p>
      </header>
      <p className="journal-intro">{article.introduction}</p>
      <nav className="journal-contents" aria-label="記事の目次"><p>この記事でわかること</p>
        <ol>{article.sections.map((section, i) => <li key={section.heading}>
          <a href={`#section-${i + 1}`}>{section.heading.replace(/^\d+ /, '')}</a>
        </li>)}</ol>
      </nav>
      {article.sections.map((section, i) => <section key={section.heading} id={`section-${i + 1}`}>
        <h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <aside className="journal-next" aria-label="物件探しのご案内">
        <h2>大阪で、愛車と暮らす住まいを探す</h2>
        <p>現在の募集条件は、各物件ページとお問い合わせ時にご確認ください。</p>
        <div className="journal-actions">
          <Link className="button" href="/properties?prefecture=osaka">大阪の物件を見る</Link>
          <Link className="button secondary" href="/request?prefecture=osaka">希望条件を相談する</Link>
        </div>
      </aside><Link className="text-link" href="/journal">GARAGE LIFE 一覧へ</Link>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: structuredDataJson(schema)}}/>
  </div>;
}
