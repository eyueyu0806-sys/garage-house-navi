import {redirect} from 'next/navigation';
import {leadListUrl} from '@/lib/admin-lead-list';
import {LEAD_STATUSES} from '@/lib/constants';
export default async function Page({searchParams}:{searchParams:Promise<{status?:string}>}){
 const q=await searchParams;
 const status=q.status&&Object.hasOwn(LEAD_STATUSES,q.status)?q.status:undefined;
 redirect(leadListUrl({kind:'request',status}));
}
