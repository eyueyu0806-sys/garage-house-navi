'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {DELIVERY_LABELS,SOCIAL_LABELS} from '@/lib/social-content';
import type {SocialDraft,SocialDelivery,SocialChannel} from '@/lib/social-content';

type DraftResult={draft:SocialDraft;imageUrl:string;deliveries:SocialDelivery[]};
type PropertyOption={id:string;property_name:string;property_code?:string};
async function api(body:unknown):Promise<DraftResult>{
 const r=await fetch('/api/admin/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw new Error(data.error||'処理できませんでした。');return data;
}
export function SocialComposer({properties,initialProperty,history,configured}:{
 properties:PropertyOption[];initialProperty?:string;history:SocialDraft[];configured:boolean;
}){
 const router=useRouter();
 const [propertyId,setPropertyId]=useState(initialProperty||properties[0]?.id||'');
 const [current,setCurrent]=useState<DraftResult|null>(null);
 const [instagram,setInstagram]=useState(''),[threads,setThreads]=useState('');
 const [channels,setChannels]=useState<SocialChannel[]>([]),[channelIds,setChannelIds]=useState<string[]>([]);
 const [date,setDate]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[isError,setIsError]=useState(false);
 const locked=current?.draft.status==='locked';
 function show(data:DraftResult){
  setCurrent(data);setInstagram(data.draft.instagram_text);setThreads(data.draft.threads_text);setConfirmed(false);
 }
 async function run(fn:()=>Promise<void>){
  if(busy)return;setBusy(true);setMessage('');setIsError(false);
  try{await fn();}catch(e){setIsError(true);setMessage(e instanceof Error?e.message:'通信できませんでした。');}
  finally{setBusy(false);}
 }
 async function connect(){
  const r=await fetch('/api/admin/social',{cache:'no-store'});const data=await r.json();
  if(!r.ok)throw new Error(data.error);
  setChannels(data.channels||[]);setChannelIds([]);
  setMessage(data.channels?.length?'投稿先を選んでください。':'Bufferの接続キーとInstagram・Threadsの接続を確認してください。');
 }
 async function open(id:string){
  const r=await fetch('/api/admin/social?id='+id,{cache:'no-store'});const data=await r.json();
  if(!r.ok)throw new Error(data.error);show(data);
 }
 function showDeliveryResult(data:DraftResult){
  show(data);router.refresh();
  const ok=data.deliveries.length>0&&data.deliveries.every(d=>d.status==='scheduled');
  setIsError(!ok);setMessage(ok?'Bufferに予約しました。下の履歴とBufferの予約一覧を確認してください。':'投稿先ごとの結果を確認してください。結果不明の投稿は自動で再送しません。');
 }
 return <div className="social-composer">
  <section className="editor-section">
   <h2>1. 公開物件から投稿案を作る</h2>
   <p className="muted">登録情報から文章を作り、メイン写真をSNS用の縦長画像に整えます。ここではSNSへ送信されません。</p>
   <label>公開物件<select value={propertyId} disabled={busy} onChange={e=>setPropertyId(e.target.value)}>
    <option value="">物件を選んでください</option>
    {properties.map(p=><option key={p.id} value={p.id}>{p.property_name}</option>)}
   </select></label>
   <button type="button" className="button" disabled={busy||!propertyId} onClick={()=>run(async()=>{
    show(await api({action:'prepare',property_id:propertyId}));setMessage('投稿案を保存しました。文章・写真を確認してください。');router.refresh();
   })}>{busy?'処理中…':'投稿案と画像を作る'}</button>
   {!properties.length&&<p>まず物件管理から写真付きの物件を公開してください。</p>}
  </section>
  <div role={isError?'alert':'status'} aria-live="polite" className={isError?'error-message':'social-message'}>{message}</div>
  {current&&<>
   <section className="editor-section">
    <h2>2. 内容を確認する · {current.draft.property_name}</h2>
    <div className="social-preview-grid">
     <div>
      {/* Signed private preview. No Next image cache of private media. */}
      <img className="social-preview-image" src={current.imageUrl} alt={current.draft.property_name+'のSNS用画像'} width={1080} height={1350}/>
      <p className="muted small">1080 × 1350 / JPEG。写真全体を残して余白を加えています。</p>
      <a className="text-link" href={current.imageUrl} target="_blank" rel="noopener noreferrer">画像を開く・保存する ↗</a>
     </div>
     <div className="social-copy-fields">
      <label>Instagramの文章<textarea rows={12} value={instagram} disabled={busy||locked} onChange={e=>{setInstagram(e.target.value);setConfirmed(false);}}/></label>
      <small>{Array.from(instagram).length} / 2,200文字</small>
      <button type="button" className="text-link" onClick={()=>run(async()=>{await navigator.clipboard.writeText(instagram);setMessage('Instagramの文章をコピーしました。');})}>文章をコピー</button>
      <label>Threadsの文章<textarea rows={10} value={threads} disabled={busy||locked} onChange={e=>{setThreads(e.target.value);setConfirmed(false);}}/></label>
      <small>{Array.from(threads).length} / 500文字</small>
      <button type="button" className="text-link" onClick={()=>run(async()=>{await navigator.clipboard.writeText(threads);setMessage('Threadsの文章をコピーしました。');})}>文章をコピー</button>
     </div>
    </div>
    {!locked&&<button className="button secondary" disabled={busy} onClick={()=>run(async()=>{
     show(await api({action:'save',id:current.draft.id,instagram_text:instagram,threads_text:threads}));setMessage('下書きを保存しました。');router.refresh();
    })}>下書きを保存</button>}
   </section>
   {!locked&&<section className="editor-section">
    <h2>3. 投稿先・日時を決めて予約する</h2>
    {!configured?<div className="social-notice"><p>Bufferの接続キーを設定すると、この画面から予約できます。文章・画像の作成と下書き保存は利用できます。</p><a href="https://publish.buffer.com/settings/api" target="_blank" rel="noopener noreferrer">Bufferの接続キー設定を開く ↗</a><p className="small">設定名：BUFFER_API_KEY（Secret）。VercelのProductionに保存して再デプロイしてください。</p></div>:<>
     <button className="button secondary" disabled={busy} onClick={()=>run(connect)}>Bufferの投稿先を読み込む</button>
     <fieldset disabled={busy}><legend>投稿するアカウントを選択</legend>
      {channels.map(c=><label className="consent" key={c.id}>
       <input type="checkbox" checked={channelIds.includes(c.id)} disabled={c.isDisconnected||c.isLocked||c.isQueuePaused}
        onChange={e=>{setChannelIds(old=>e.target.checked?[...old.filter(id=>channels.find(x=>x.id===id)?.service!==c.service),c.id]:old.filter(id=>id!==c.id));setConfirmed(false);}}/>
       {SOCIAL_LABELS[c.service]} · {c.name} / {c.organizationName}
       {(c.isDisconnected||c.isLocked||c.isQueuePaused)&&'（Bufferで接続・停止状態を確認）'}
      </label>)}
     </fieldset>
     <label>投稿日時（日本時間）<input type="datetime-local" value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setConfirmed(false);}}/></label>
     <p className="small muted">5分以上先・30日以内。Buffer側の表示地域にかかわらず、日本時間で指定します。</p>
     <label className="consent"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>募集状況・文章・写真のSNS掲載許可・投稿先・日時を確認しました。</label>
     <p className="social-notice">予約後に募集終了・賃料変更があった場合は、Bufferで予約を取り消すか編集してください。物件の変更は予約済みの投稿には自動反映されません。</p>
     <button className="button" disabled={busy||!confirmed||!date||!channelIds.length||Array.from(threads).length>500||Array.from(instagram).length>2200}
      onClick={()=>run(async()=>showDeliveryResult(await api({action:'schedule',id:current.draft.id,instagram_text:instagram,threads_text:threads,channel_ids:channelIds,scheduled_jst:date,confirmed})))}>確認した内容で予約する</button>
    </>}
   </section>}
   {locked&&<section className="editor-section">
    <h2>予約の送信結果</h2>
    <p>予約内容は固定されています。変更・取り消し・公開後の確認は <a href="https://publish.buffer.com/" target="_blank" rel="noopener noreferrer">Bufferを開く ↗</a></p>
    {current.deliveries.map(d=><div className="social-delivery" key={d.id}>
     <strong>{SOCIAL_LABELS[d.service]} · {d.channel_name}</strong>
     <p>{DELIVERY_LABELS[d.status]||d.status} · {new Date(d.due_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}（日本時間）</p>
     {d.buffer_post_id&&<p className="small">予約ID：{d.buffer_post_id}</p>}
     {d.error_message&&<p className="error-message">{d.error_message}</p>}
     {d.status==='sending'&&<p>処理途中または結果が不明です。Bufferで確認してから対応してください。</p>}
    </div>)}
    <button className="button secondary" disabled={busy} onClick={()=>run(()=>open(current.draft.id))}>結果を再読み込み</button>
    {current.deliveries.some(d=>d.status==='failed'||d.status==='pending')&&<button className="button" disabled={busy} onClick={()=>run(async()=>{
     showDeliveryResult(await api({action:'retry',id:current.draft.id,confirmed:true}));
    })}>未送信・失敗した分だけ再試行</button>}
   </section>}
  </>}
  <section className="editor-section">
   <h2>保存した投稿案・予約履歴</h2>
   <p className="muted small">直近30件。同じ物件情報から作った投稿案は再利用し、重複作成を防ぎます。</p>
   {history.map(d=><button className="social-history-item" key={d.id} disabled={busy} onClick={()=>run(()=>open(d.id))}>
    <span>{d.property_name}</span><span>{d.status==='draft'?'下書き':'予約の送信結果を見る'}</span>
   </button>)}
   {!history.length&&<p>まだ投稿案はありません。</p>}
  </section>
 </div>;
}
