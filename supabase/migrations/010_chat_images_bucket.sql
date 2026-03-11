-- ============================================
-- Storage bucket voor chatafbeeldingen
-- ============================================
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Iedereen kan chatafbeeldingen zien"
  on storage.objects for select
  using (bucket_id = 'chat-images');

create policy "Ingelogde gebruikers kunnen afbeeldingen uploaden"
  on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.uid() is not null);

create policy "Gebruikers kunnen eigen afbeeldingen verwijderen"
  on storage.objects for delete
  using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);
