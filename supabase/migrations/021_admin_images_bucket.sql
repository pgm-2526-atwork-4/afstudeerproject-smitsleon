-- ============================================
-- Storage bucket voor admin-afbeeldingen (artiesten, venues, events)
-- ============================================
insert into storage.buckets (id, name, public)
values ('admin-images', 'admin-images', true)
on conflict (id) do nothing;

create policy "Iedereen kan admin-afbeeldingen zien"
  on storage.objects for select
  using (bucket_id = 'admin-images');

create policy "Service-role kan admin-afbeeldingen uploaden"
  on storage.objects for insert
  with check (bucket_id = 'admin-images');

create policy "Service-role kan admin-afbeeldingen verwijderen"
  on storage.objects for delete
  using (bucket_id = 'admin-images');
