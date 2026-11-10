// Arnés: sirve docs/ en local, abre un navegador y simula Supabase. Nada sale a la nube.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(RAIZ, 'docs');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webmanifest': 'application/json', '.png': 'image/png' };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };

export async function servir() {
  const srv = http.createServer((q, r) => {
    const n = q.url.split('?')[0].replace(/^\/+/, '') || 'index.html', f = path.join(DIR, n);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('content-type', TIPOS[path.extname(f)] || 'application/octet-stream');
    r.end(fs.readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  return { srv, base: 'http://127.0.0.1:' + srv.address().port };
}

// Página vacía sobre el servidor local, para probar módulos que usan APIs del navegador.
export async function pagina() {
  const { srv, base } = await servir();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route(base + '/vacia', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>x</title>' }));
  await page.goto(base + '/vacia');
  return { page, ctx, base, cerrar: async () => { await browser.close(); srv.close(); } };
}

export const nubeNueva = () => ({ med_trabajos: [], med_fichas: [], med_adjuntos: [], archivos: new Map(), sinRed: false, caducada: false, reloj: 0 });

const sello = n => new Date(1800000000000 + (++n.reloj) * 1000).toISOString().replace('Z', '+00:00');
const b64url = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = () => b64url({ alg: 'HS256' }) + '.' + b64url({ sub: 'U1', exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, role: 'authenticated' }) + '.x';

function atenderRest(route, q, u, n, tabla) {
  const responder = (status, cuerpo) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(cuerpo) }).catch(() => {});
  if (n.caducada) return responder(401, { code: 'PGRST303', message: 'JWT expired' });
  const filas = n[tabla], p = u.searchParams, un = (q.headers()['accept'] || '').includes('vnd.pgrst.object');
  const pasa = f => [...p.entries()].every(([k, v]) => {
    if (['select', 'order', 'offset', 'limit', 'columns'].includes(k)) return true;
    const [op, ...r] = v.split('.'), val = r.join('.');
    return op === 'eq' ? String(f[k]) === val : op === 'gte' ? Date.parse(f[k]) >= Date.parse(val) : true;
  });
  const salida = l => {
    if (!un) return responder(200, l);
    return l.length === 1 ? responder(200, l[0]) : responder(406, { code: 'PGRST116', details: 'The result contains ' + l.length + ' rows', message: 'x' });
  };
  if (q.method() === 'GET') {
    const l = filas.filter(pasa).sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
    const ini = Number(p.get('offset') || 0);
    return salida(l.slice(ini, p.get('limit') ? ini + Number(p.get('limit')) : undefined));
  }
  const cuerpo = JSON.parse(q.postData());
  if (q.method() === 'POST') {
    if (filas.some(f => f.id === cuerpo.id)) return responder(409, { code: '23505', message: 'duplicada' });
    const f = Object.assign({ borrado_at: null }, cuerpo, { user_id: 'U1', updated_at: sello(n) });
    filas.push(f);
    return un ? responder(201, f) : responder(201, [f]);
  }
  if (q.method() === 'PATCH') {
    const l = filas.filter(pasa);
    l.forEach(f => Object.assign(f, cuerpo, { updated_at: sello(n) }));
    return salida(l);
  }
  return responder(405, {});
}

// supabase-js sube un Blob como formulario multipart, como espera Supabase: aquí se saca el archivo.
function archivoDe(q) {
  const buf = q.postDataBuffer(), m = /boundary=(.+)$/.exec(q.headers()['content-type'] || '');
  if (!m) return buf;
  const sep = Buffer.from('--' + m[1]);
  let i = buf.indexOf(sep);
  while (i >= 0) {
    const sig = buf.indexOf(sep, i + sep.length);
    if (sig < 0) break;
    const parte = buf.subarray(i + sep.length + 2, sig - 2), fin = parte.indexOf('\r\n\r\n');
    if (/content-type:\s*image\//i.test(parte.subarray(0, fin).toString())) return parte.subarray(fin + 4);
    i = sig;
  }
  return buf;
}

// op: { nube, ancho, ctx (para compartir sesión) }
export async function abrir(op = {}) {
  const { srv, base } = await servir();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: op.ancho || 1000, height: 800 }, serviceWorkers: 'block', hasTouch: !!op.tactil });
  const page = await ctx.newPage();
  const nube = op.nube || nubeNueva(), errores = [], estado = { aceptar: true, dialogos: [] };
  page.on('pageerror', e => errores.push(String(e)));
  page.on('dialog', d => { estado.dialogos.push(d.type() + ':' + d.message()); return estado.aceptar || d.type() === 'alert' ? d.accept() : d.dismiss(); });
  await page.route(u => !u.href.startsWith(base), route => {
    const q = route.request(), u = new URL(q.url());
    if (u.hostname === 'cdn.jsdelivr.net') return route.fulfill({ status: 200, headers: CORS, contentType: 'text/javascript', body: fs.readFileSync(path.join(RAIZ, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js')) });
    if (!/supabase\.co$/.test(u.hostname)) return route.abort().catch(() => {});
    if (q.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    if (nube.sinRed) return route.abort().catch(() => {});
    if (u.pathname === '/auth/v1/token') return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ access_token: TOKEN(), refresh_token: 'R1', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, user: { id: 'U1', email: 'a@b.c', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: 'x' } }) });
    if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS, body: '' });
    const m = /^\/rest\/v1\/(med_\w+)$/.exec(u.pathname);
    if (m) return atenderRest(route, q, u, nube, m[1]);
    const s = /^\/storage\/v1\/object\/(?:authenticated\/)?medidas\/(.+)$/.exec(u.pathname);
    if (s && q.method() === 'GET') {
      const a = nube.archivos.get(decodeURIComponent(s[1]));
      return a ? route.fulfill({ status: 200, headers: CORS, contentType: 'image/jpeg', body: a }) : route.fulfill({ status: 404, headers: CORS, contentType: 'application/json', body: '{"message":"no"}' });
    }
    if (s) {
      nube.archivos.set(decodeURIComponent(s[1]), archivoDe(q));
      return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ Key: s[1], Id: 'x' }) });
    }
    return route.fulfill({ status: 404, headers: CORS, body: '' });
  });
  await page.goto(base + '/index.html');
  return { page, ctx, base, nube, errores, estado, cerrar: async () => { await browser.close(); srv.close(); } };
}

export const hasta = async (c, q) => { for (let i = 0; i < 150; i++) { if (await c()) return; await new Promise(r => setTimeout(r, 40)); } throw new Error('no llegó: ' + (q || c)); };

export async function entrar(a) {
  await a.page.waitForSelector('[data-acc="email"]');
  await a.page.fill('[data-acc="email"]', 'a@b.c');
  await a.page.fill('[data-acc="pass"]', 'clave');
  await a.page.click('[data-acc="entrar"]');
  await a.page.waitForSelector('[data-pantalla="inicio"]');
}

export const crearTrabajo = async (a, nombre) => {
  await a.page.click('[data-acc="nuevo-trabajo"]');
  await a.page.fill('[data-acc="trabajo-nombre"]', nombre);
  await a.page.click('[data-acc="trabajo-crear"]');
  await a.page.waitForSelector('[data-pantalla="trabajo"]');
};
