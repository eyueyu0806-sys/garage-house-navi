export type JournalArticle = {
  slug: string; title: string; description: string; status: 'draft' | 'published';
  publishedAt: string; updatedAt: string; introduction: string;
  sections: {heading: string; paragraphs: string[]}[];
};
// Public routes and sitemap must use these selectors, never the raw collection.
const articles: JournalArticle[] = [{
  slug: 'osaka-garage-house-guide',
  title: '大阪でガレージハウスを探すときに確認したい5つのこと',
  description: '大阪でガレージ付き賃貸を探す方へ。エリア、毎月の総額、ガレージの使い方、内見、問い合わせ前に整理したい希望条件を紹介します。',
  status: 'published', publishedAt: '2026-10-08', updatedAt: '2026-10-08',
  introduction: '愛車を身近に置ける住まいに惹かれても、写真だけで暮らしやすさを判断するのは難しいものです。大阪でガレージハウスを探すなら、ガレージで過ごす時間と、普段の生活の両方を思い描いてみてください。候補を比較しやすくするために、物件探しの順番に沿って確認したいことをまとめました。',
  sections: [
    {heading: '1 希望エリアは通勤と車移動の両方で考える', paragraphs: [
      '最初に、通勤先やよく訪れる場所までの移動を整理しましょう。電車を使う日が多いなら駅までの道のり、車で移動することが多いなら普段使う道路への出入りも確認したいポイントです。',
      '「大阪府内」だけでは候補を絞りにくいため、第一希望の市区町村と、その周辺で検討できる地域を分けておくと比較しやすくなります。掲載件数や募集状況は変わるので、希望エリアに物件がない場合は、入居時期とあわせて相談してください。',
    ]},
    {heading: '2 賃料だけでなく毎月の総額と初期費用を見る', paragraphs: [
      '比較するときは、賃料に管理費・共益費や別途必要な駐車場代などを加え、毎月の支払額をそろえて確認しましょう。「駐車場付き」と書かれていても、何台分が賃料に含まれるかは物件ごとの確認が必要です。',
      '入居時には、敷金・礼金・保証会社の費用・保険料など、条件に応じた費用が発生する場合があります。具体的な金額は募集資料と見積もりで確認し、未記載の項目を無料と判断しないようにしましょう。問い合わせの際に「初期費用の総額を知りたい」と添えると、比較に必要な情報を集めやすくなります。',
    ]},
    {heading: '3 ガレージでしたいことを具体的に伝える', paragraphs: [
      '車を保管する、バイクを置く、工具を使う、仕事の拠点にする。ガレージの使い方は人によって異なります。車・バイクの台数と、住まいで実現したいことを先にまとめておきましょう。',
      'DIY可・SOHO可などの表示があっても、すべての作業や営業が認められるとは限りません。作業内容、音が出る時間帯、来客の有無などを具体的に伝え、契約上認められる使い方を確認してください。設備や利用条件が「確認中」の場合も、利用できると決めつけずに相談しましょう。',
    ]},
    {heading: '4 内見では車と人の動きを確認する', paragraphs: [
      '内見できる場合は、建物の前の道路、駐車時の切り返し、シャッターの操作、荷物を持ったときの室内への移動を確認します。可能であれば、普段利用する車での確認ができるか事前に相談してください。',
      '居室の日当たりや収納、洗濯物を干す場所など、毎日の暮らしにも目を向けましょう。ガレージの写真が魅力的でも、居住部分で無理がないかまで確認することで、入居後の生活を具体的に想像できます。',
    ]},
    {heading: '5 問い合わせには希望条件の優先順位を添える', paragraphs: [
      '相談前に、希望市区町村、毎月の予算、車種と台数、入居希望時期、外せない条件を整理します。全部を必須にするより、「必須」と「できれば希望」に分けると、候補を比較する基準が明確になります。',
      '気になる物件がある場合は、その物件のページから空室状況や内見、初期費用についてお問い合わせください。希望に合う掲載物件が見つからない場合は、物件リクエストから条件をお送りいただけます。お問い合わせはGARAGE HOUSE NAVIの運営会社、ASC不動産が受け付けます。',
    ]},
  ],
}];
export function publishedArticles(): JournalArticle[] {
  return articles.filter(article => article.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export function findPublishedArticle(slug: string): JournalArticle | undefined {
  return publishedArticles().find(article => article.slug === slug);
}
