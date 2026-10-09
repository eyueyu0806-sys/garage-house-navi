// Original typography/vector assets. FONTCONFIG_FILE must register
// NotoSansCJKjp-Regular.otf (SIL OFL; see docs/SOCIAL_LAUNCH.md).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const out = path.resolve('public/social');
await fs.mkdir(out, {recursive:true});
const ink='#252823', paper='#f6f5f0', gray='#a9aaa3';
function text(x,y,value,size=30,color=ink,extra='') {return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${value}</text>`;}
function line(x1,y1,x2,y2,color=gray) {return `<path d="M${x1} ${y1}H${x2}" stroke="${color}" stroke-width="1.5"/>`;}
function shell(bg,body) {return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="${bg}"/><g font-family="Noto Sans CJK JP, sans-serif">${body}</g></svg>`;}
function brand(color,n){return text(76,102,'GARAGE HOUSE NAVI',28,color,'letter-spacing="3"')+text(1004,102,n,22,color,'text-anchor="end"')+line(76,140,1004,140,color);}
function footer(color){return line(76,1220,1004,1220,color)+text(76,1272,'garagehouse-navi.com',24,color)+text(1004,1272,'運営：ASC不動産',20,color,'text-anchor="end"');}
const intro=shell(ink,brand(paper,'01')+text(76,226,'A HOME FOR YOUR PASSION.',22,gray,'letter-spacing="2"')+text(76,360,'愛車と暮らす、',76,paper)+text(76,466,'理想の住まいを。',76,paper)+text(80,546,'ガレージハウス・ガレージ付き賃貸',28,paper)+`<g fill="none" stroke="${gray}" stroke-width="2"><path d="M100 980H980M155 980V760H485V670H919V980M485 980V760M522 708H881V849H522Z M542 850V708M760 850V708M191 980V817H441V980 M191 834H441M191 851H441M191 868H441"/><path d="M590 970V923L612 915L638 888H801L830 915L851 923V970M612 915H830M641 900H795"/><circle cx="637" cy="965" r="18"/><circle cx="801" cy="965" r="18"/></g>`+text(76,1090,'関西からはじまる、',32,paper)+text(76,1143,'ガレージのある暮らし。',32,paper)+footer(gray));
const items=[['毎月の支払総額','賃料だけでなく、管理費なども確認'],['車・バイクの台数','持っている車種と一緒に整理'],['ガレージの使い方','保管・作業など、希望を具体的に'],['普段の移動','通勤や買い物の道のりを確認'],['内見での動き','車の出し入れと室内への移動']];
const checklist=shell(paper,brand(ink,'02')+text(76,228,'BEFORE YOU CHOOSE',22,ink,'letter-spacing="2"')+text(76,332,'写真のほかに、',64)+text(76,418,'見ておきたい５つ。',64)+text(76,485,'ガレージハウス探しのチェックリスト',27)+items.map(([a,b],i)=>{let y=590+i*115;return text(76,y,`0${i+1}`,23)+text(158,y,a,34)+text(158,y+43,b,24,'#565a52')+line(158,y+67,1004,y+67,'#d4d5ce');}).join('')+text(76,1190,'利用条件は物件ごとに確認しましょう。',23,'#565a52')+footer(ink));
const request=shell(paper,brand(ink,'03')+text(76,230,'YOUR NEXT GARAGE',22,ink,'letter-spacing="2"')+text(76,330,'探している住まいが、',58)+text(76,413,'まだ見つからない方へ。',58)+text(76,485,'希望条件から、ASC不動産へご相談ください。',27)+`<rect x="76" y="552" width="928" height="442" fill="${ink}"/>`+text(117,622,'ご相談の前に、この４つを。',29,paper)+line(117,661,963,661,'#676c61')+text(117,738,'01  希望エリア',35,paper)+text(588,738,'02  毎月の予算',35,paper)+text(117,856,'03  車種・台数',35,paper)+text(588,856,'04  入居希望時期',35,paper)+text(117,949,'「必須」と「できれば」に分けると、相談がスムーズに。',23,paper)+text(76,1070,'プロフィールのリンクから',32)+text(76,1127,'「物件リクエスト」へ。',40)+text(76,1180,'ご紹介できる物件は募集状況によって異なります。',22,'#565a52')+footer(ink));
for(const [name,svg] of Object.entries({'01-intro':intro,'02-checklist':checklist,'03-request':request})){
 await fs.writeFile(path.join(out,name+'.svg'),svg);
 await sharp(Buffer.from(svg)).png().toFile(path.join(out,name+'.png'));
 await sharp(Buffer.from(svg)).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(path.join(out,name+'.jpg'));
 console.log(name);
}

const og=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${paper}"/><g font-family="Noto Sans CJK JP, sans-serif">${text(72,92,'GARAGE HOUSE NAVI',27,ink,'letter-spacing="3"')}${text(1128,92,'GARAGE LIFE',22,ink,'text-anchor="end"')}${line(72,128,1128,128)}${text(72,249,'大阪でガレージハウスを',61)}${text(72,337,'探すときに確認したい',61)}${text(72,425,'５つのこと',61)}${line(72,499,1128,499)}${text(72,563,'住まい選びのガイド / ASC不動産',24)}${text(1128,563,'garagehouse-navi.com',22,ink,'text-anchor="end"')}</g></svg>`;
await fs.writeFile(path.join(out,'osaka-guide-og.svg'),og);
await sharp(Buffer.from(og)).png().toFile(path.join(out,'osaka-guide-og.png'));
