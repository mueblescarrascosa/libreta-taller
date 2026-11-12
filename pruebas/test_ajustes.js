import { prueba, afirma, igual, fin } from './mini.js';
import { AJUSTES_FABRICA, mezclarAjustes, claveDe, nombreElemento, avisos, fichaNueva } from '../docs/js/modelo.js';
import { comprobar } from '../docs/js/plano-geo.js';
import { crearNubeFalsa, crearAlmacenFalso } from './nube_falsa.js';
import { crearSincro } from '../docs/js/sincro.js';

prueba('valores de fábrica', () => {
  igual(AJUSTES_FABRICA.puerta_anchos, [920, 820, 720, 620]); igual(AJUSTES_FABRICA.puerta_altos, [2030, 2110]); igual(AJUSTES_FABRICA.puerta_tabiques, [70, 90, 110]);
  igual(AJUSTES_FABRICA.modulo_anchos, [300, 400, 450, 500, 600, 800, 900, 1000, 1200]);
  igual(AJUSTES_FABRICA.usos_toma.map(u => u[0]), ['agua', 'termo', 'gas']);
  igual(AJUSTES_FABRICA.usos_enchufe.map(u => u[0]), ['general', 'hmo', 'placa', 'campana', 'frigo', 'lavavajillas', 'lavadora', 'termo']);
  igual(AJUSTES_FABRICA.lineales.map(u => u[0]), ['zocalo', 'cornisa', 'moldura', 'led', 'tapajuntas']);
  igual(AJUSTES_FABRICA.interiores.map(u => u[0]), ['barra', 'doble_barra', 'estantes', 'cajonera', 'zapatero', 'pantalonero', 'pantalonero_doble']);
  igual([AJUSTES_FABRICA.margen, AJUSTES_FABRICA.paredes_m, AJUSTES_FABRICA.unidad], [10, true, 'mm']);
});
prueba('mezclar: lo guardado manda y lo que falta o está mal sale de fábrica', () => {
  const a = mezclarAjustes({ puerta_anchos: [850, 920], margen: 20, unidad: 'cm', usos_toma: 'roto', paredes_m: false });
  igual(a.puerta_anchos, [850, 920]); igual(a.margen, 20); igual(a.unidad, 'cm'); igual(a.paredes_m, false);
  igual(a.usos_toma, AJUSTES_FABRICA.usos_toma); igual(a.puerta_altos, AJUSTES_FABRICA.puerta_altos);
  igual(mezclarAjustes(null).margen, 10); igual(mezclarAjustes({ margen: -3 }).margen, 10); igual(mezclarAjustes({ unidad: 'pulgadas' }).unidad, 'mm');
  a.puerta_anchos.push(1); igual(AJUSTES_FABRICA.puerta_anchos.length, 4, 'tocó los de fábrica');
});
prueba('clave de un texto nuevo', () => { igual(claveDe('Secadora'), 'secadora'); igual(claveDe(' Vitrocerámica  grande '), 'vitroceramica_grande'); igual(claveDe('¿?'), 'x'); });
prueba('el nombre de un uso añadido se guarda en el elemento', () => {
  igual(nombreElemento({ tipo: 'enchufe', para: 'secadora', para_nombre: 'Secadora' }), 'Enchufe Secadora');
  igual(nombreElemento({ tipo: 'toma', para: 'osmosis', para_nombre: 'Ósmosis' }), 'Toma de ósmosis');
  igual(nombreElemento({ tipo: 'enchufe', para: 'hmo' }), 'Enchufe H/MO (columna)');
});
prueba('el margen de aviso es configurable', () => {
  const f = fichaNueva('armario', 'corredera', 't'); Object.assign(f.datos, { ancho_arriba: 2000, ancho_abajo: 2015 });
  igual(avisos(f, 'mm').length, 1); igual(avisos(f, 'mm', { margen: 20 }).length, 0);
  const p = { vertices: [[0, 0], [300, 0], [300, 200], [0, 200]].map(([x, y]) => ({ x, y })), cerrada: true, largos: [3000, 2000, 3015, 2000], esquinas: [], diagonales: [] };
  igual(comprobar(p).cierre, 'falla'); igual(comprobar(p, 20).cierre, 'ok');
});
prueba('los ajustes viajan entre dispositivos', async () => {
  const n = crearNubeFalsa(), A = crearAlmacenFalso(), B = crearAlmacenFalso();
  const sa = crearSincro({ almacen: A, nube: n }), sb = crearSincro({ almacen: B, nube: n });
  await A.guardar('ajustes', { id: 'U1', datos: { margen: 25 }, updated_at: null, borrado_at: null });
  await sa.sincronizar(); await sb.sincronizar();
  igual((await B.leer('ajustes', 'U1')).datos.margen, 25); igual(await sa.pendientes(), 0);
});
fin();
