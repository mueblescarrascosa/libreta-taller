-- App de medidas y notas de taller. Solo crea objetos nuevos (prefijo med_ y almacén "medidas").

create table public.med_trabajos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  nombre text not null default '',
  cliente text not null default '',
  direccion text not null default '',
  unidad text not null default 'mm' check (unidad in ('mm', 'cm')),
  creado_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  borrado_at timestamptz
);

create table public.med_fichas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  trabajo_id uuid references public.med_trabajos (id),
  tipo text not null check (tipo in ('puerta', 'cocina', 'armario', 'nota')),
  subtipo text check (subtipo in ('vestidor', 'corredera', 'abatible')),
  nombre text not null default '',
  datos jsonb not null default '{}'::jsonb,
  creado_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  borrado_at timestamptz
);

create table public.med_adjuntos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  ficha_id uuid not null references public.med_fichas (id),
  ruta text not null,
  tipo text not null check (tipo in ('foto', 'croquis')),
  creado_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  borrado_at timestamptz
);

create index med_trabajos_sync on public.med_trabajos (user_id, updated_at);
create index med_fichas_sync on public.med_fichas (user_id, updated_at);
create index med_fichas_trabajo on public.med_fichas (trabajo_id);
create index med_adjuntos_sync on public.med_adjuntos (user_id, updated_at);
create index med_adjuntos_ficha on public.med_adjuntos (ficha_id);

-- La fecha la pone siempre la base de datos: de ella depende detectar cambios en otro dispositivo.
create function public.med_poner_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

create trigger med_trabajos_fecha before insert or update on public.med_trabajos for each row execute function public.med_poner_updated_at();
create trigger med_fichas_fecha before insert or update on public.med_fichas for each row execute function public.med_poner_updated_at();
create trigger med_adjuntos_fecha before insert or update on public.med_adjuntos for each row execute function public.med_poner_updated_at();

alter table public.med_trabajos enable row level security;
alter table public.med_fichas enable row level security;
alter table public.med_adjuntos enable row level security;

revoke all on public.med_trabajos, public.med_fichas, public.med_adjuntos from anon;
grant select, insert, update on public.med_trabajos, public.med_fichas, public.med_adjuntos to authenticated;

-- Sin política de borrado: en la app borrar es marcar borrado_at.
create policy med_trabajos_ver on public.med_trabajos for select to authenticated using (user_id = (select auth.uid()));
create policy med_trabajos_crear on public.med_trabajos for insert to authenticated with check (user_id = (select auth.uid()));
create policy med_trabajos_cambiar on public.med_trabajos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy med_fichas_ver on public.med_fichas for select to authenticated using (user_id = (select auth.uid()));
create policy med_fichas_crear on public.med_fichas for insert to authenticated with check (user_id = (select auth.uid()));
create policy med_fichas_cambiar on public.med_fichas for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy med_adjuntos_ver on public.med_adjuntos for select to authenticated using (user_id = (select auth.uid()));
create policy med_adjuntos_crear on public.med_adjuntos for insert to authenticated with check (user_id = (select auth.uid()));
create policy med_adjuntos_cambiar on public.med_adjuntos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Almacén privado de fotos y croquis, con una carpeta por usuario.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medidas', 'medidas', false, 5242880, array['image/jpeg', 'image/png']);

create policy med_archivos_ver on storage.objects for select to authenticated
  using (bucket_id = 'medidas' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy med_archivos_crear on storage.objects for insert to authenticated
  with check (bucket_id = 'medidas' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy med_archivos_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'medidas' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'medidas' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Ajustes compartidos entre dispositivos (añadido el 10/11/2026): una fila por cuenta.
create table public.med_ajustes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  datos jsonb not null default '{}'::jsonb,
  creado_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  borrado_at timestamptz
);
create index med_ajustes_sync on public.med_ajustes (user_id, updated_at);
create trigger med_ajustes_fecha before insert or update on public.med_ajustes
  for each row execute function public.med_poner_updated_at();
alter table public.med_ajustes enable row level security;
revoke all on public.med_ajustes from anon;
grant select, insert, update on public.med_ajustes to authenticated;
create policy med_ajustes_ver on public.med_ajustes for select to authenticated using (user_id = (select auth.uid()));
create policy med_ajustes_crear on public.med_ajustes for insert to authenticated with check (user_id = (select auth.uid()));
create policy med_ajustes_cambiar on public.med_ajustes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
