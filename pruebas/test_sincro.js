import { prueba, afirma, igual, fin } from './mini.js';
import { crearNubeFalsa, crearAlmacenFalso } from './nube_falsa.js';
import { crearSincro } from '../docs/js/sincro.js';
import { fichaNueva, trabajoNuevo } from '../docs/js/modelo.js';

const disp = nube => { const al = crearAlmacenFalso(); return { al, s: crearSincro({ almacen: al, nube }) }; };
const dos = () => { const n = crearNubeFalsa(); return { n, A: disp(n), B: disp(n) }; };
const SUF = '(versión de este dispositivo)';
const vivas = async d => (await d.al.todos('fichas'));

prueba('crear en A llega a B y A queda sin pendientes', async () => {
  const { A, B } = dos(), t = trabajoNuevo('Casa', 'mm');
  await A.al.guardar('trabajos', t); await A.s.sincronizar(); await B.s.sincronizar();
  igual((await B.al.leer('trabajos', t.id)).nombre, 'Casa'); igual(await A.s.pendientes(), 0);
});
prueba('sin red no se pierde nada y sigue pendiente', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null);
  await A.al.guardar('fichas', f); n.sinRed = true; await A.s.sincronizar();
  igual(await A.s.pendientes(), 1); igual(A.s.ultimoError(), 'red'); afirma(await A.al.leer('fichas', f.id));
  n.sinRed = false; await A.s.sincronizar(); igual(await A.s.pendientes(), 0); igual(A.s.ultimoError(), null);
});
prueba('un cambio pendiente no se pisa al bajar', async () => {
  const { n, A, B } = dos(), f = fichaNueva('nota', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const fb = await B.al.leer('fichas', f.id); fb.nombre = 'B'; await B.al.guardar('fichas', fb); await B.s.sincronizar();
  const fa = await A.al.leer('fichas', f.id); fa.nombre = 'A local'; await A.al.guardar('fichas', fa);
  n.sinRed = false; await A.s.bajar();
  igual((await A.al.leer('fichas', f.id)).nombre, 'A local');
});
prueba('misma ficha en dos sitios: ambos acaban con las dos versiones', async () => {
  const { A, B } = dos(), f = fichaNueva('puerta', null, null);
  f.nombre = 'Baño'; await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const fa = await A.al.leer('fichas', f.id); fa.datos.ancho = 800; await A.al.guardar('fichas', fa);
  const fb = await B.al.leer('fichas', f.id); fb.datos.ancho = 825; await B.al.guardar('fichas', fb);
  await A.s.sincronizar(); await B.s.sincronizar(); await A.s.sincronizar();
  for (const d of [A, B]) {
    const l = await vivas(d); igual(l.length, 2);
    igual(l.find(x => x.id === f.id).datos.ancho, 800);
    const c = l.find(x => x.id !== f.id); igual(c.nombre, 'Baño ' + SUF); igual(c.datos.ancho, 825);
  }
  igual(await A.s.pendientes(), 0); igual(await B.s.pendientes(), 0);
});
prueba('respuesta perdida al crear: sin copia ni pendientes', async () => {
  const { n, A } = dos(), f = fichaNueva('puerta', null, null);
  f.datos.ancho = 800; await A.al.guardar('fichas', f); n.perderRespuesta = 1; await A.s.sincronizar(); igual(await A.s.pendientes(), 1);
  await A.s.sincronizar(); igual(await A.s.pendientes(), 0); igual((await vivas(A)).length, 1); igual(n.t.fichas.size, 1);
});
prueba('respuesta perdida al actualizar: sin conflicto falso', async () => {
  const { n, A } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  const x = await A.al.leer('fichas', f.id); x.datos.ancho = 700; await A.al.guardar('fichas', x);
  n.perderRespuesta = 1; await A.s.sincronizar(); await A.s.sincronizar();
  igual(await A.s.pendientes(), 0); igual((await vivas(A)).length, 1); igual(n.t.fichas.size, 1);
});
prueba('dos subidas seguidas de la misma ficha no dan conflicto', async () => {
  const { n, A } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  f.datos.ancho = 700; await A.al.guardar('fichas', f); await A.s.sincronizar();
  f.datos.ancho = 701; await A.al.guardar('fichas', f); await A.s.sincronizar();
  igual(n.t.fichas.size, 1); igual([...n.t.fichas.values()][0].datos.ancho, 701);
});
prueba('editar durante la subida no se pierde', async () => {
  const { n, A } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  const orig = n.actualizar; let hecho = false;
  n.actualizar = async (...p) => { const r = await orig(...p); if (!hecho) { hecho = true; f.datos.ancho = 999; await A.al.guardar('fichas', f); } return r; };
  f.datos.ancho = 500; await A.al.guardar('fichas', f); await A.s.sincronizar();
  igual((await A.al.leer('fichas', f.id)).datos.ancho, 999); igual(await A.s.pendientes(), 1);
  await A.s.sincronizar(); igual([...n.t.fichas.values()][0].datos.ancho, 999); igual((await vivas(A)).length, 1);
});
prueba('conflicto con edición durante la subida: no se pierde la versión del otro', async () => {
  const { n, A, B } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const fb = await B.al.leer('fichas', f.id); fb.datos.ancho = 825; await B.al.guardar('fichas', fb); await B.s.sincronizar();
  const fa = await A.al.leer('fichas', f.id); fa.datos.ancho = 800; await A.al.guardar('fichas', fa);
  const orig = n.leerFila; let hecho = false;
  n.leerFila = async (...p) => { const r = await orig(...p); if (!hecho) { hecho = true; fa.datos.alto = 2030; await A.al.guardar('fichas', fa); } return r; };
  await A.s.sincronizar(); await A.s.sincronizar(); await B.s.sincronizar(); await A.s.sincronizar();
  for (const d of [A, B]) {
    const l = await vivas(d), anchos = l.map(x => x.datos.ancho).sort();
    igual(anchos, [800, 825], 'anchos'); afirma(l.some(x => x.datos.ancho === 800 && x.datos.alto === 2030), 'perdió el alto');
  }
});
prueba('una pantalla con datos viejos no pisa lo llegado de otro dispositivo', async () => {
  const { A, B } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const pantallaA = await A.al.leer('fichas', f.id);
  const fb = await B.al.leer('fichas', f.id); fb.datos.alto = 2030; await B.al.guardar('fichas', fb); await B.s.sincronizar();
  await A.s.sincronizar(); igual((await A.al.leer('fichas', f.id)).datos.alto, 2030, 'no bajó');
  pantallaA.datos.ancho = 800; await A.al.guardar('fichas', pantallaA); await A.s.sincronizar(); await B.s.sincronizar();
  for (const d of [A, B]) { const l = await vivas(d); afirma(l.some(x => x.datos.alto === 2030), 'perdido el alto'); afirma(l.some(x => x.datos.ancho === 800), 'perdido el ancho'); }
});
prueba('una pantalla anterior a la propia subida no da conflicto', async () => {
  const { n, A } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  const pantalla = await A.al.leer('fichas', f.id);
  pantalla.datos.ancho = 1; await A.al.guardar('fichas', pantalla); await A.s.sincronizar();
  pantalla.datos.ancho = 2; await A.al.guardar('fichas', pantalla); await A.s.sincronizar();
  igual((await vivas(A)).length, 1); igual([...n.t.fichas.values()][0].datos.ancho, 2);
});
prueba('respuesta perdida y nueva edición antes de reintentar: sin conflicto falso', async () => {
  const { n, A } = dos(), f = fichaNueva('puerta', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  const x = await A.al.leer('fichas', f.id); x.datos.ancho = 700; await A.al.guardar('fichas', x);
  n.perderRespuesta = 1; await A.s.sincronizar();
  x.datos.ancho = 750; await A.al.guardar('fichas', x); await A.s.sincronizar();
  igual((await vivas(A)).length, 1); igual([...n.t.fichas.values()][0].datos.ancho, 750); igual(await A.s.pendientes(), 0);
});
prueba('una entrada cuya fila no está en la nube no se queda atascada', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); n.t.fichas.clear();
  const x = await A.al.leer('fichas', f.id); x.nombre = 'Otra'; await A.al.guardar('fichas', x); await A.s.sincronizar();
  igual(await A.s.pendientes(), 0); igual(n.t.fichas.size, 1);
});
prueba('trabajo editado en dos sitios: gana la nube, sin copia', async () => {
  const { A, B } = dos(), t = trabajoNuevo('Casa', 'mm');
  await A.al.guardar('trabajos', t); await A.s.sincronizar(); await B.s.sincronizar();
  const a = await A.al.leer('trabajos', t.id); a.nombre = 'De A'; await A.al.guardar('trabajos', a); await A.s.sincronizar();
  const b = await B.al.leer('trabajos', t.id); b.nombre = 'De B'; await B.al.guardar('trabajos', b); await B.s.sincronizar();
  igual((await B.al.todos('trabajos')).length, 1); igual((await B.al.leer('trabajos', t.id)).nombre, 'De A');
});
prueba('borrar llega al otro dispositivo como borrado_at', async () => {
  const { A, B } = dos(), f = fichaNueva('nota', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const x = await A.al.leer('fichas', f.id); x.borrado_at = new Date().toISOString(); await A.al.guardar('fichas', x); await A.s.sincronizar(); await B.s.sincronizar();
  afirma((await B.al.leer('fichas', f.id)).borrado_at);
});
prueba('borrar aquí lo que cambió allí no crea copia y conserva lo de la nube', async () => {
  const { A, B } = dos(), f = fichaNueva('nota', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const a = await A.al.leer('fichas', f.id); a.nombre = 'Buena'; await A.al.guardar('fichas', a); await A.s.sincronizar();
  const b = await B.al.leer('fichas', f.id); b.borrado_at = new Date().toISOString(); await B.al.guardar('fichas', b); await B.s.sincronizar();
  igual((await vivas(B)).length, 1); const r = await B.al.leer('fichas', f.id); igual(r.nombre, 'Buena'); igual(r.borrado_at, null);
});
prueba('bajar usa la marca menos 60 s y no duplica', async () => {
  const { n, A, B } = dos(), f = fichaNueva('nota', null, null);
  await A.al.guardar('fichas', f); await A.s.sincronizar(); await B.s.sincronizar();
  const ultima = [...n.t.fichas.values()][0].updated_at; n.marcas.length = 0; await B.s.sincronizar();
  const usadas = n.marcas.filter(Boolean);
  afirma(usadas.includes(new Date(Date.parse(ultima) - 60000).toISOString()), usadas.join()); igual((await vivas(B)).length, 1);
});
prueba('adjunto: sin subir el archivo no se crea su fila', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null), id = crypto.randomUUID();
  await A.al.guardar('fichas', f); await A.al.poner('blobs', { id, blob: 'BIN' });
  await A.al.guardar('adjuntos', { id, ficha_id: f.id, ruta: 'U1/x.jpg', tipo: 'foto', updated_at: null, borrado_at: null });
  n.fallarArchivo = true; await A.s.sincronizar(); igual(n.t.adjuntos.size, 0); igual(await A.s.pendientes(), 1);
  n.fallarArchivo = false; await A.s.sincronizar(); igual(n.t.adjuntos.size, 1); igual(n.archivos.get('U1/x.jpg'), 'BIN');
});
prueba('una fila rechazada no bloquea las demás', async () => {
  const { n, A } = dos(), f1 = fichaNueva('nota', null, null), f2 = fichaNueva('nota', null, null);
  const orig = n.crear; n.crear = async (t, x) => { if (x.id === f1.id) { const e = new Error('mala'); e.tipo = 'datos'; throw e; } return orig(t, x); };
  await A.al.guardar('fichas', f1); await A.al.guardar('fichas', f2); await A.s.sincronizar();
  igual(n.t.fichas.size, 1); igual(await A.s.pendientes(), 1);
});
prueba('sesión caducada se indica y no pierde nada', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null);
  n.crear = async () => { const e = new Error('jwt'); e.tipo = 'sesion'; throw e; };
  await A.al.guardar('fichas', f); await A.s.sincronizar(); igual(A.s.ultimoError(), 'sesion'); igual(await A.s.pendientes(), 1);
});
prueba('sincronizar no se solapa consigo misma', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null); let llamadas = 0;
  const orig = n.crear; n.crear = async (...p) => { llamadas++; await new Promise(r => setTimeout(r, 20)); return orig(...p); };
  await A.al.guardar('fichas', f); await Promise.all([A.s.sincronizar(), A.s.sincronizar()]);
  igual(llamadas, 1);
});
fin();
