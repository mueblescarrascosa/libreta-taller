import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA, avisos } from '../docs/js/modelo.js';
import { elegirInterior, interioresDe, textoInteriores, piezasInterior } from '../docs/js/modulos.js';
import { geometriaAlzado } from '../docs/js/alzado.js';
import { escenaPerspectiva } from '../docs/js/perspectiva.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });

prueba('interiores: hasta dos, la doble barra va sola y un tercero cambia el segundo', () => {
  const c = {};
  elegirInterior(c, 'barra'); elegirInterior(c, 'cajonera');
  igual(interioresDe(c), ['barra', 'cajonera']);
  elegirInterior(c, 'estantes');
  igual(interioresDe(c), ['barra', 'estantes']);
  elegirInterior(c, 'doble_barra');
  igual(interioresDe(c), ['doble_barra']);
  elegirInterior(c, 'pantalonero');
  igual(interioresDe(c), ['pantalonero']);
  elegirInterior(c, 'pantalonero');
  igual(interioresDe(c), []);
  igual(textoInteriores({ interior: 'pantalonero', interior2: 'estantes' }, AJ), 'pantalonero + estantes');
  igual(textoInteriores({ interior: 'otro', nombre: 'Corbatero' }, AJ), 'Corbatero');
});

prueba('dibujo del interior: la cajonera abajo y la barra arriba, aunque se elija al revés', () => {
  const a = piezasInterior({ interior: 'cajonera', interior2: 'barra' }, 2150);
  igual(a.filter(q => q.tipo === 'cajon').length, 3);
  afirma(a.filter(q => q.tipo === 'cajon').every(q => q.z1 <= 1000));
  igual(a.find(q => q.tipo === 'barra').z, 2030);
  igual(piezasInterior({ interior: 'doble_barra' }, 2150).filter(q => q.tipo === 'barra').length, 2);
  igual(piezasInterior({}, 2150), []);
  // El pantalonero doble es uno más ancho, no dos uno encima de otro.
  igual(piezasInterior({ interior: 'pantalonero_doble' }, 2150).filter(q => q.tipo === 'pantalonero').length, 1);
  igual(piezasInterior({ interior: 'pantalonero_doble' }, 2150)[0].ancho, 800);
  igual(piezasInterior({ interior: 'pantalonero', interior2: 'estantes' }, 2150).find(q => q.tipo === 'pantalonero').ancho, 400);
});

prueba('pantalonero: en el alzado con su ancho y centrado; aviso si el cuerpo es más estrecho', () => {
  const f = fichaNueva('armario', 'vestidor', 't');
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 2000, elementos: [], cuerpos: [{ id: '1', ancho: 1000, interior: 'pantalonero' }, { id: '2', ancho: 600, interior: 'pantalonero_doble' }] })];
  const g = geometriaAlzado(f.datos, f.datos.paredes[0], AJ), pt = g.piezas.filter(p => p.clase === 'int_pantalonero');
  igual(pt.map(p => [p.x, p.w]), [[300, 400], [1020, 560]]);
  const av = avisos(f, 'cm').map(a => a.texto);
  afirma(av.some(t => t === 'Cuerpo 2 de la pared A: el pantalonero doble mide 80 cm y el cuerpo 60 cm'), av.join(' | '));
  afirma(!av.some(t => /Cuerpo 1/.test(t)));
});

function vestidor() {
  const f = fichaNueva('armario', 'vestidor', 't');
  f.datos.alto_techo = 2500;
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 2000, elementos: [],
    cuerpos: [{ id: '1', ancho: 500, interior: 'barra', interior2: 'cajonera' }, { id: '2', ancho: 1000, interior: 'doble_barra' }] }),
  Object.assign(paredNueva([]), { letra: 'B', largo: 2400, elementos: [], cuerpos: [] })];
  return f;
}

prueba('vestidor: cuerpos con su interior en el alzado, la perspectiva y el resumen', () => {
  const f = vestidor(), g = geometriaAlzado(f.datos, f.datos.paredes[0], AJ);
  igual(g.piezas.filter(p => p.clase === 'cuerpo').map(p => [p.x, p.w, p.texto]), [[0, 500, 'C1 barra + cajonera'], [500, 1000, 'C2 doble barra']]);
  igual(g.piezas.filter(p => p.clase === 'int_cajon').length, 3);
  igual(g.piezas.filter(p => p.clase === 'int_barra').length, 3);
  const e = escenaPerspectiva(f.datos, { ajustes: AJ });
  igual(e.cajas.map(c => c.texto && c.texto.texto), ['C1 barra + cajonera', 'C2 doble barra']);
  afirma(textoResumen({ ficha: f, trabajo: { unidad: 'cm' }, ajustes: AJ }).includes('50 barra + cajonera, 100 doble barra'));
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });

prueba('en la ficha del vestidor se marcan dos interiores', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="armario"]');
  await a.page.click('[data-acc="subtipo"][data-v="vestidor"]').catch(() => {});
  await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]'); await a.page.waitForSelector('[data-pared="A"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-cuerpo"]');
  await a.page.click('[data-pared="A"] [data-acc="interior"][data-v="barra"]');
  await a.page.click('[data-pared="A"] [data-acc="interior"][data-v="cajonera"]');
  await a.page.waitForTimeout(1200);
  const f = await ficha(a), c = f.datos.paredes[0].cuerpos[0];
  igual([c.interior, c.interior2], ['barra', 'cajonera']);
  igual(await a.page.$$eval('[data-pared="A"] [data-acc="interior"].on', b => b.map(x => x.dataset.v)), ['barra', 'cajonera']);
}));
fin();
