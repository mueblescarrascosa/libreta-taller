import { prueba, afirma, igual, fin } from './mini.js';
import { crearNubeFalsa, crearAlmacenFalso } from './nube_falsa.js';
import { crearSincro } from '../docs/js/sincro.js';
import { fichaNueva, trabajoNuevo, paredNueva } from '../docs/js/modelo.js';
import { trabajosARecuperar } from '../docs/js/trabajos.js';
import { aplicarPlano } from '../docs/js/plano-vista.js';

const disp = nube => { const al = crearAlmacenFalso(); return { al, s: crearSincro({ almacen: al, nube }) }; };
const dos = () => { const n = crearNubeFalsa(); return { n, A: disp(n), B: disp(n) }; };

// ── 1: cambios que la nube rechaza ──
prueba('un cambio rechazado queda marcado con su motivo', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null);
  const orig = n.crear; n.crear = async (t, x) => { if (x.id === f.id) { const e = new Error('valor no válido'); e.tipo = 'datos'; throw e; } return orig(t, x); };
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  igual((await A.s.rechazadas()).map(e => [e.clave, e.rechazo]), [['fichas:' + f.id, 'valor no válido']]);
  n.crear = orig; await A.s.reintentar('fichas:' + f.id);
  igual(await A.s.rechazadas(), []); igual(await A.s.pendientes(), 0); igual(n.t.fichas.size, 1);
});
prueba('descartar un cambio rechazado deja lo de la nube', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null); f.nombre = 'Bien';
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  const x = await A.al.leer('fichas', f.id); x.nombre = 'Mal'; await A.al.guardar('fichas', x);
  n.actualizar = async () => { const e = new Error('no'); e.tipo = 'datos'; throw e; };
  await A.s.sincronizar(); igual((await A.s.rechazadas()).length, 1);
  await A.s.descartar('fichas:' + f.id);
  igual((await A.al.leer('fichas', f.id)).nombre, 'Bien'); igual(await A.s.pendientes(), 0); igual(await A.s.rechazadas(), []);
});
prueba('descartar algo nuevo que nunca llegó a la nube lo quita', async () => {
  const { n, A } = dos(), f = fichaNueva('nota', null, null);
  n.crear = async () => { const e = new Error('no'); e.tipo = 'datos'; throw e; };
  await A.al.guardar('fichas', f); await A.s.sincronizar();
  await A.s.descartar('fichas:' + f.id);
  igual(await A.al.leer('fichas', f.id), null); igual(await A.s.pendientes(), 0);
});

// ── 2: trabajo cambiado en dos móviles ──
const trabajoEnDos = async () => {
  const d = dos(), t = trabajoNuevo('Casa', 'mm');
  await d.A.al.guardar('trabajos', t); await d.A.s.sincronizar(); await d.B.s.sincronizar();
  return Object.assign(d, { t });
};
prueba('datos distintos cambiados en cada móvil: se juntan los dos', async () => {
  const { n, A, B, t } = await trabajoEnDos();
  const a = await A.al.leer('trabajos', t.id); a.cliente = 'Pepe'; a.datos = { telefono: '600' }; await A.al.guardar('trabajos', a); await A.s.sincronizar();
  const b = await B.al.leer('trabajos', t.id); b.direccion = 'Calle Mayor'; b.datos = { estado: 'medido' }; await B.al.guardar('trabajos', b); await B.s.sincronizar();
  await A.s.sincronizar();
  for (const d of [A, B]) {
    const x = await d.al.leer('trabajos', t.id);
    igual([x.cliente, x.direccion, x.datos.estado, x.datos.telefono], ['Pepe', 'Calle Mayor', 'medido', '600']);
  }
  igual(await B.s.pendientes(), 0); igual(n.t.fichas.size, 0, 'no hace falta nota');
});
prueba('el mismo dato cambiado en los dos: se queda el de la nube y el otro va a una nota del trabajo', async () => {
  const { n, A, B, t } = await trabajoEnDos();
  const a = await A.al.leer('trabajos', t.id); a.cliente = 'Pepe'; await A.al.guardar('trabajos', a); await A.s.sincronizar();
  const b = await B.al.leer('trabajos', t.id); b.cliente = 'José'; b.direccion = 'Calle Mayor'; await B.al.guardar('trabajos', b); await B.s.sincronizar();
  const x = await B.al.leer('trabajos', t.id); igual([x.cliente, x.direccion], ['Pepe', 'Calle Mayor']);
  const notas = (await B.al.todos('fichas')).filter(f => f.trabajo_id === t.id);
  igual(notas.length, 1); igual(notas[0].tipo, 'nota');
  afirma(/Cliente/.test(notas[0].datos.notas[0].texto) && /José/.test(notas[0].datos.notas[0].texto) && /Pepe/.test(notas[0].datos.notas[0].texto), notas[0].datos.notas[0].texto);
  igual(await B.s.pendientes(), 0); igual(n.t.fichas.size, 1);
});

// ── 3: trabajo borrado con fichas vivas ──
prueba('un trabajo borrado que tiene fichas vivas se recupera', () => {
  const t1 = Object.assign(trabajoNuevo('Uno', 'mm'), { borrado_at: '2026-11-11T10:00:00Z' });
  const t2 = Object.assign(trabajoNuevo('Dos', 'mm'), { borrado_at: '2026-11-11T10:00:00Z' });
  const t3 = trabajoNuevo('Tres', 'mm');
  const viva = fichaNueva('nota', null, t1.id), muerta = Object.assign(fichaNueva('nota', null, t2.id), { borrado_at: '2026-11-11T10:00:00Z' });
  igual(trabajosARecuperar([t1, t2, t3], [viva, muerta, fichaNueva('nota', null, t3.id)]).map(t => t.nombre), ['Uno']);
});

// ── 5: un largo borrado en el editor se borra ──
prueba('aplicar un plano con un largo borrado lo deja vacío', () => {
  const d = { paredes: [Object.assign(paredNueva([]), { largo: 3000 })] };
  const n = aplicarPlano(d, { vertices: [{ x: 0, y: 0 }, { x: 3, y: 0 }], cerrada: false, largos: [null], esquinas: [], diagonales: [] });
  igual(n.paredes[0].largo, null);
});

fin();
