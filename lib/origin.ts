/**
 * Use the received Host rather than Next's internal URL hostname.
 * Browsers cannot forge Host. Do not accept arbitrary forwarded host headers.
 */
export function sameOrigin(request:Pick<Request,'headers'|'url'>){
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try{
  const received=new URL(request.url);
  if(received.protocol!=='http:'&&received.protocol!=='https:')return false;
  const host=request.headers.get('host');
  const target=host?new URL(received.protocol+'//'+host):received;
  if(host&&(target.username||target.password||target.pathname!=='/'||target.search||target.hash))return false;
  return origin===target.origin;
 }catch{return false;}
}
