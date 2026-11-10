-- Deshace 2026-11-11-trabajos-datos.sql (se pierden los teléfonos y estados apuntados).
-- Antes, volver a poner TRABAJO_DATOS = false y publicar.
alter table public.med_trabajos drop column if exists datos;
