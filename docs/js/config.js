// Datos públicos de conexión (la clave publicable no da acceso sin sesión: lo protege RLS).
export const SUPABASE_URL = 'https://ezbzllaowdcouwtretdg.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_JJZfWMU1LL8oXEgkmoZHvw_qv-SEYZh';
export const VERSION = '1.12.0';
// Nombre que sale en los resúmenes y PDF (se le pasan a albañiles, fontaneros, electricistas…).
export const EMPRESA = 'Muebles Carrascosa';
export const COPYRIGHT = '© 2026 Alfonso Carrascosa Martínez';
export const CREDITO = 'Hecha con Claude';
export const BUCKET = 'medidas';
// Teléfono y estado del trabajo: necesitan la columna med_trabajos.datos (supabase/2026-11-11-trabajos-datos.sql).
// Mientras no exista, se quedan apagados para no enviar a la nube un campo que rechazaría.
export const TRABAJO_DATOS = true;
