import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {configured} from './config';
export async function supabase() {
 if (!configured()) throw new Error('DATABASE_NOT_CONFIGURED');
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:(items)=>{try {items.forEach(({name,value,options})=>jar.set(name,value,options));} catch { /* Server components cannot write; proxy refreshes cookies. */ }}}});
}
export function serviceDb() {
 if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('DATABASE_NOT_CONFIGURED');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function getAdmin() {
 if (!configured()) return null;
 const db=await supabase(); const {data:{user},error}=await db.auth.getUser();
 if(error || !user) return null;
 const {data:profile}=await db.from('admin_profiles').select('id,display_name').eq('id',user.id).maybeSingle();
 return profile ? {db,user,profile} : null;
}
