-- Deshace supabase/schema.sql. Borra solo lo creado para la app de medidas.
-- Los archivos del almacén "medidas" hay que vaciarlos antes desde el panel de Supabase.

drop policy if exists med_archivos_ver on storage.objects;
drop policy if exists med_archivos_crear on storage.objects;
drop policy if exists med_archivos_cambiar on storage.objects;
delete from storage.buckets where id = 'medidas';

drop table if exists public.med_adjuntos;
drop table if exists public.med_fichas;
drop table if exists public.med_trabajos;
drop function if exists public.med_poner_updated_at();
