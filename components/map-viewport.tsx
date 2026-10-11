'use client';

import {useId,useState,useRef,useLayoutEffect,type ReactNode} from 'react';

export function MapViewport({children}:{children:ReactNode}){
 const [zoom,setZoom]=useState(1);
 const id=useId();
 const viewport=useRef<HTMLDivElement>(null);
 const previousCenter=useRef<{x:number;y:number;zoom:number}|null>(null);
 function changeZoom(next:number){
  const element=viewport.current;
  if(element)previousCenter.current={x:element.scrollLeft+element.clientWidth/2,y:element.scrollTop+element.clientHeight/2,zoom};
  setZoom(next);
 }
 useLayoutEffect(()=>{
  const element=viewport.current,center=previousCenter.current;
  if(element&&center){
   element.scrollLeft=center.x*zoom/center.zoom-element.clientWidth/2;
   element.scrollTop=center.y*zoom/center.zoom-element.clientHeight/2;
   previousCenter.current=null;
  }
 },[zoom]);
 return <>
  <div className="map-zoom-controls">
   <span id={`${id}-hint`}>拡大後は地図を動かせます</span>
   <div><button type="button" aria-label="地図を縮小" aria-controls={id} disabled={zoom===1} onClick={()=>changeZoom(Math.max(1,zoom-.5))}>−</button><output aria-live="polite">{zoom*100}%</output><button type="button" aria-label="地図を拡大" aria-controls={id} disabled={zoom===2.5} onClick={()=>changeZoom(Math.min(2.5,zoom+.5))}>＋</button></div>
  </div>
  <div id={id} ref={viewport} className="map-viewport" tabIndex={0} role="region" aria-label="大阪府の地図。拡大時は縦横にスクロールできます" aria-describedby={`${id}-hint`}>
   <div className="map-zoom-canvas" style={{width:`${zoom*100}%`,maxWidth:`${zoom*560}px`}}>{children}</div>
  </div>
 </>;
}
