import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('social migration restricts access and reserves all destinations atomically once',async()=>{
 const db=new PGlite();
 try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create table public.properties(id uuid primary key);create table public.admin_profiles(id uuid primary key);create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
 await db.exec("create function public.is_admin() returns boolean language sql stable as $$select exists(select 1 from public.admin_profiles where id=nullif(current_setting('request.jwt.claim.sub',true),'')::uuid)$$;grant select on public.admin_profiles to authenticated,service_role;create function public.touch_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;grant usage on schema public,auth to service_role,authenticated,anon;");
 await db.exec(await readFile('supabase/migrations/20261010143257_social_composer.sql','utf8'));
 const admin='00000000-0000-4000-8000-000000000001',normal='00000000-0000-4000-8000-000000000002';
 const prop='00000000-0000-4000-8000-000000000003',draft='00000000-0000-4000-8000-000000000004';
 await db.exec("insert into auth.users values('"+admin+"'),('"+normal+"');insert into admin_profiles values('"+admin+"');insert into properties values('"+prop+"');");
 await db.query("insert into social_drafts(id,property_id,property_version,property_name,instagram_text,threads_text,image_path) values($1,$2,$3,'House','IG','Threads','draft/cover.jpg')",[draft,prop,'a'.repeat(64)]);
 assert.equal((await db.query<{public:boolean}>("select public from storage.buckets where id='social-assets'")).rows[0].public,false);
 await db.exec("set role anon");
 await assert.rejects(()=>db.query('select * from social_drafts'),/permission denied/);
 await db.exec("reset role;set role authenticated;set request.jwt.claim.sub='"+normal+"'");
 assert.equal((await db.query('select * from social_drafts')).rows.length,0);
 await db.exec("set request.jwt.claim.sub='"+admin+"'");
 assert.equal((await db.query('select * from social_drafts')).rows.length,1);
 await assert.rejects(()=>db.query("update social_drafts set status='locked'"),/permission denied/);
 const query='select reserve_social_draft($1,$2,$3,now()+interval \'1 day\',$4::jsonb,$5)';
 const args=[draft,'IG text','Threads text',JSON.stringify([{id:'ig',name:'garagehouse_navi',service:'instagram'},{id:'th',name:'garagehouse_navi',service:'threads'}]),admin];
 await assert.rejects(()=>db.query(query,args),/permission denied/);
 await db.exec('reset role;set role service_role');
 assert.equal((await db.query<{reserve_social_draft:boolean}>(query,args)).rows[0].reserve_social_draft,true);
 assert.equal((await db.query<{reserve_social_draft:boolean}>(query,args)).rows[0].reserve_social_draft,false);
 assert.equal((await db.query('select * from social_deliveries')).rows.length,2);
 await assert.rejects(()=>db.query("insert into social_deliveries(draft_id,channel_id,channel_name,service,due_at) values($1,'ig','x','instagram',now())",[draft]),/unique/);
 const other='00000000-0000-4000-8000-000000000005';
 await db.query("insert into social_drafts(id,property_id,property_version,property_name,instagram_text,threads_text,image_path) values($1,$2,$3,'House','IG','Threads','other/cover.jpg')",[other,prop,'b'.repeat(64)]);
 await assert.rejects(()=>db.query(query,[other,'IG','Threads',JSON.stringify([{id:'bad',name:'bad',service:'unsupported'}]),admin]),/check constraint/);
 assert.equal((await db.query<{status:string}>('select status from social_drafts where id=$1',[other])).rows[0].status,'draft');
 }finally{await db.close();}
});
