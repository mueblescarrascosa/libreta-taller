-- Libreta Taller 1.6: teléfono y estado del trabajo.
-- Solo AÑADE una columna con valor por defecto '{}': no cambia ni borra ningún dato existente.
-- Después de aplicarla, poner TRABAJO_DATOS = true en docs/js/config.js y publicar.
alter table public.med_trabajos add column if not exists datos jsonb not null default '{}'::jsonb;
