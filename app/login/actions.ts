"use server";
import {redirect} from 'next/navigation';import {supabase,serviceDb} from '@/lib/supabase';import {configured} from '@/lib/config';import {headers} from 'next/headers';import {rateLimit} from '@/lib/security';
export async function login(form:FormData){
 if(!configured())redirect('/login?error=setup');
 const email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
 if(email.length>254||password.length>1024||!email||!password)redirect('/login?error=invalid');
 try {serviceDb();const h=await headers();if(!await rateLimit(new Request('http://localhost',{headers:h}),'login',20))redirect('/login?error=rate');}catch(error){if(error instanceof Error&&error.message==='NEXT_REDIRECT')throw error;redirect('/login?error=setup');}
 const db=await supabase();const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error||!data.user)redirect('/login?error=invalid');
 const {data:profile}=await db.from('admin_profiles').select('id').eq('id',data.user.id).maybeSingle();
 if(!profile){await db.auth.signOut();redirect('/login?error=invalid');}
 redirect('/admin');
}
export async function logout(){const db=await supabase();await db.auth.signOut();redirect('/login');}
