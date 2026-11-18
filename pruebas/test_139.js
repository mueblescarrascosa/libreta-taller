// 1.39: el rinconero gira hacia la pared de su punta (el primero, a la izquierda; el último, a la derecha) y los muebles
// nuevos van al catálogo de Presupuestos con su nombre (alto puente, desayunador, columna con electro, semicolumna).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo, situarMuebles, MICRO_INTEGRABLE, electrosDeMuebles } from '../docs/js/modulos.js';
import { articulo, articuloPuente } from '../docs/js/presupuesto.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';
import { rematesCocina } from '../docs/js/material.js';

const mod = (tipo, ancho, x = {}) => Object.assign(moduloNuevo(tipo), { ancho }, x);
const pared = (letra, largo, bajos) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos, altos: [] });

prueba('rinconero el primero de la fila: gira hacia la pared de la izquierda (nada suelto en la de la derecha)', () => {
  const f = fichaNueva('cocina', null, 't'), d = f.datos;
  // Como la cocina del usuario: el rinconero recto, primero en la C, con «sigue a la derecha» por defecto
  d.paredes = [pared('B', 2050, [mod('bajo', 600), mod('placa', 800)]), pared('C', 2600, [mod('rinconero', 1000, { forma: 'recto', gira: 'der' }), mod('bajo', 200), mod('fregadero', 800), mod('lavavajillas', 600)]), pared('D', 250, [])];
  igual(situarMuebles(d.paredes[3 - 1], d).entran, { izq: 0, der: 0 }, 'en la D no entra nada');
  igual(d.paredes[1].bajos[0].gira, 'izq');
  igual(situarMuebles(d.paredes[0], d).entran.der, 600, 'en la B, el fondo del rinconero (60)');
  afirma(geometriaPlanta(d).modulos.filter(m => m.tipo === 'rinconero' && m.pared === 'D').length === 0, 'ningún trozo en la D');
  // Si va solo en la pared, manda lo elegido
  const s = pared('A', 1000, [mod('rinconero', 930, { gira: 'der', forma: 'L', lado2: 930 })]);
  situarMuebles(s, { paredes: [s] });
  igual(s.bajos[0].gira, 'der');
});

prueba('artículos del catálogo: alto puente por altura, desayunador, columna con electro y semicolumna', () => {
  const d = { alto_techo: 2600, paredes: [], electro: [] };
  igual(articuloPuente(mod('alto', 900), d).texto, 'ALTO PUENTE 50-60 · 2 PUERTAS · 90');
  igual(articuloPuente(mod('alto', 600), { alto_techo: 2800 }).texto, 'ALTO PUENTE 70-80 · 1 PUERTA · 60');
  igual(articulo(mod('columna_desayuno', 800), d).texto, 'COLUMNA 220-240 · DESAYUNADOR PUERTAS · 80');
  igual(articulo(mod('columna_electro', 600, { abajo: 'lavadora', arriba: 'hmo' }), d).texto, 'COLUMNA 220-240 · ELECTRO + H/MO · 60');
  igual(articulo(mod('semicolumna', 600, { variante: '4-5 CACEROLEROS' }), d).mo, '4 - 5 CACEROLEROS');
});

prueba('microondas integrable: 60 × 38', () => {
  const d = { paredes: [pared('A', 3000, [mod('columna_hmo', 600)])] };
  igual(electrosDeMuebles(d).get('microondas'), { tipo: 'integrable', ancho: MICRO_INTEGRABLE.ancho, alto: MICRO_INTEGRABLE.alto });
});

prueba('costado de 1,6: su grueso de verdad en el material', () => {
  const p = pared('A', 3000, [mod('bajo', 600)]);
  const r = rematesCocina({ paredes: [p], remates: { costado_mm: 16 } }).filter(x => x.tipo === 'costados');
  afirma(r.length && r.every(x => /\(1,6 cm\)/.test(x.pieza)), JSON.stringify(r.map(x => x.pieza)));
});

const con = fn => async () => { const a = await abrir({ ancho: 390, tactil: true }); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: el pilar no escribe «null» y nada se sale a 390 px', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="pilar"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-elemento"][data-v="humos"]');
  const t = await a.page.$eval('[data-pantalla="ficha"]', n => n.textContent);
  afirma(!/null|undefined/.test(t), 'texto con null/undefined');
  afirma(await a.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'scroll lateral');
}));

await fin();
