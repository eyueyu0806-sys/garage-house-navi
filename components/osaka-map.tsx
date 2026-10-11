import Link from 'next/link';
import geometry from '@/lib/data/osaka-map.json';
import {osakaCities,osakaAreaGroups,osakaCityHref} from '@/lib/osaka';
import {MapViewport} from './map-viewport';

// Label offsets avoid collisions in the densely populated coastal municipalities.
const offsets:Record<string,[number,number]>={
 '27203':[-5,4],'27205':[0,-5],'27206':[-36,-8],'27209':[-10,-5],
 '27211':[9,0],'27220':[-8,-5],'27223':[0,10],'27224':[0,-7],
 '27225':[-26,-6],'27226':[44,18],'27222':[-9,14],'27231':[-19,1],
 '27341':[-43,5],'27361':[29,-3],'27213':[-20,4],'27208':[4,12],
 '27218':[5,12],'27229':[38,0],
};

export function OsakaMap(){
 return <section className="osaka-explorer" id="osaka-map" aria-labelledby="osaka-map-heading">
  <div className="section-heading">
   <div><p className="eyebrow">EXPLORE OSAKA</p><h2 id="osaka-map-heading">大阪の地図から探す</h2><p>暮らしたい街を、地図から。</p></div>
   <Link className="text-link" href="/properties?prefecture=osaka">大阪府すべての物件 →</Link>
  </div>
  <div className="osaka-explorer-grid">
   <div className="osaka-map-panel">
    <div className="osaka-map-hint"><span>市町村を選ぶと物件が表示されます</span><a href="#osaka-city-list">一覧から選ぶ ↓</a></div>
    <MapViewport><svg viewBox="0 0 560 680" className="osaka-map" role="group" aria-label="大阪府の43市町村から物件を探す">
     <text x="60" y="305" className="osaka-bay" aria-hidden="true">OSAKA BAY</text>
     <g className="osaka-compass" aria-hidden="true"><text x="490" y="65">N</text><path d="M490 79v35m-6-27 6-8 6 8"/></g>
     {osakaCities.map(city=>{
      const shape=geometry.find(g=>g.code===city.code)!;
      return <a key={city.code} href={osakaCityHref(city.name)} aria-label={`${city.label}の物件を探す`} className="osaka-map-city">
       <title>{`${city.label}の物件を探す`}</title>
       <path d={shape.path} fillRule="evenodd" className="osaka-city-shape"/>
      </a>;
     })}
     {/* Labels are painted after all shapes so adjacent municipalities cannot hide them. */}
     {osakaCities.map(city=>{
      const shape=geometry.find(g=>g.code===city.code)!;
      const [dx,dy]=offsets[city.code]??[0,0];
      return <a key={city.code} href={osakaCityHref(city.name)} tabIndex={-1} aria-hidden="true" className="osaka-map-label-link">
       {(Math.abs(dx)>20||Math.abs(dy)>12)&&<path d={`M${shape.x},${shape.y}l${dx},${dy}`} className="osaka-label-line"/>}
       <text x={shape.x+dx} y={shape.y+dy} className="osaka-city-label">{city.label}</text>
      </a>;
     })}
    </svg></MapViewport>
    <p className="osaka-map-credit">出典：<a href="https://nlftp.mlit.go.jp/ksj/">国土交通省「国土数値情報（行政区域）」</a>（2021年）を加工。境界はエリア選択用の概略です。</p>
   </div>
   <nav className="osaka-city-list" id="osaka-city-list" aria-label="大阪の市町村一覧">
    <p className="osaka-list-intro">市町村名からも選べます。大阪市・堺市は全区を含みます。</p>
    {osakaAreaGroups.map(group=><div className="osaka-city-group" key={group.label}>
     <h3>{group.label}</h3><div>{group.codes.map(code=>{
      const city=osakaCities.find(c=>c.code===code)!;
      return <Link prefetch={false} href={osakaCityHref(city.name)} key={code}>{city.label}<span aria-hidden="true">↗</span></Link>;
     })}</div>
    </div>)}
   </nav>
  </div>
  <p className="osaka-map-help">希望の街に物件が見つからないときは、<Link href="/request?prefecture=osaka">希望条件をお送りください →</Link></p>
 </section>;
}
