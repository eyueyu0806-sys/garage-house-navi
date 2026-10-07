"use client";
import {useState} from 'react';
export function EmailTest({enabled}:{enabled:boolean}){
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<{ok:boolean;message:string;emailId?:string}|null>(null);
 async function send(){
  if(busy)return;
  setBusy(true);setResult(null);
  try{
   const response=await fetch('/api/admin/email-test',{method:'POST'});
   const body=await response.json();
   setResult({ok:response.ok,message:body.message||'送信結果を確認できませんでした。',emailId:response.ok?body.emailId:undefined});
  }catch{setResult({ok:false,message:'通信に失敗しました。ログイン状態を確認して、再度お試しください。'});}
  finally{setBusy(false);}
 }
 return <div>
  <button type="button" className="button" onClick={send} disabled={!enabled||busy}>{busy?'送信を確認中…':'通知先にテストメールを送る'}</button>
  <p className="small muted">登録済みの通知先だけに送ります。問い合わせ件数には加算されません。</p>
  <div role="status" aria-live="polite">{result?<div className={result.ok?'notice':'error-message'}><p>{result.message}</p>{result.emailId?<p className="small">送信ID：{result.emailId}</p>:null}</div>:null}</div>
 </div>;
}
