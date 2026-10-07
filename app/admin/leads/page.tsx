import {AdminLeads} from '@/components/admin-leads';
export default async function Page({searchParams}:{searchParams:Promise<{status?:string;kind?:string;cursor?:string}>}){
 return <AdminLeads q={await searchParams}/>;
}
