-- Increase the per-image limit to 50 MiB (Supabase Free plan maximum).
-- The application uploads directly to Supabase Storage, bypassing Vercel's
-- serverless request-body limit.
begin;
do $$
declare updated_count integer;
begin
  update storage.buckets
  set file_size_limit = 52428800,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
  where id = 'property-images';
  get diagnostics updated_count = row_count;
  if updated_count = 0 then
    raise exception 'PROPERTY_IMAGES_BUCKET_MISSING';
  end if;
end;
$$;
commit;
