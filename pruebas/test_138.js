// 1.38: cocina puente (altos de arriba de fondo 60 desde 195 hasta el techo menos el cierre, columnas también),
// columna desayunador (bajo + encimera + hueco de 70/80 + alto de fondo 60), vuelo para sentarse en islas y penínsulas,
// y la placa extractora: sin mueble de campana; con recirculación, sin horno (cajón ciego arriba y dos caceroleros).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, islaNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo, situarMuebles, cuadreAltillos, placaConHorno, PUENTE } from '../docs/js/modulos.js';
import { geometriaAlzado, ALTURAS, fijarCocinaTipo, alturasCocina } from '../docs/js/alzado.js';
import { frenteModulo } from '../docs/js/frentes.js';
import { articulo, variantesDe, varianteHabitual, paquetePresupuesto } from '../docs/js/presupuesto.js';
import { materialCocina, piezasCascoCocina, rematesCocina } from '../docs/js/material.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { escenaPerspectiva } from '../docs/js/perspectiva.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, x = {}) => Object.assign(moduloNuevo(tipo), { ancho }, x);
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const cocina = (paredes, x = {}) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; Object.assign(f.datos, x); fijarCocinaTipo(alturasCocina(f.datos, null)); return f; };

prueba('cocina puente: altos hasta 195, los de arriba (fondo 60) y las columnas hasta el techo menos el cierre', () => {
  const p = pared('A', 3080, { puente: true, bajos: [mod('columna_hmo', 600), mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('columna_frigo', 600)],
    altos: [mod('alto', 600), mod('alto', 600), mod('alto', 600)], altillos: [mod('alto', 600), mod('alto', 600), mod('alto', 600)] });
  const f = cocina([p], { alto_techo: 2800 }), d = f.datos, s = situarMuebles(p, d);
  igual(s.altillos.map(a => a.desde), s.altos.map(a => a.desde), 'entre las columnas, encima de los altos');
  const g = geometriaAlzado(d, p), altos = g.piezas.filter(q => q.clase === 'alto'), cols = g.piezas.filter(q => q.clase === 'columna');
  igual(altos.filter(q => q.y === ALTURAS.altos_desde).map(q => q.y + q.h), [1950, 1950, 1950]);
  igual(altos.filter(q => q.y === PUENTE.desde).map(q => q.y + q.h), [2775, 2775, 2775]);
  afirma(cols.every(q => q.h === 2775), JSON.stringify(cols.map(q => q.h)));
  igual(cuadreAltillos(p, d).resto, 0);
  // Material: cascos de fondo 60 arriba, cierre de 2,5 cm encima; presupuesto: los de arriba a mano
  afirma(piezasCascoCocina(d).some(q => q.al === 825 || q.an === 825), 'costados de los de arriba (2775 − 1950)');
  afirma(rematesCocina(d, { todos: true }).some(r => r.tipo === 'techo' && r.alto === 25), 'cierre a techo de 2,5');
  afirma(paquetePresupuesto(f).grupos.find(g => g.tipo === 'revisar').lineas.some(t => /alto de arriba \(puente/.test(t)), 'revisar los de arriba');
  igual(articulo(p.altos[0], d).med, '60');
  // Planta: no se dibujan (taparían los otros), pero la perspectiva sí los tiene
  afirma(geometriaPlanta(d).modulos.filter(m => m.altillo).length === 3);
  afirma(escenaPerspectiva(d).cajas.length > 0);
  afirma(/Altos de arriba/.test(textoResumen({ ficha: f, trabajo: { nombre: 'Casa' }, ajustes: AJUSTES_FABRICA })), 'en el resumen');
});

prueba('columna desayunador: bajo, encimera, hueco de 70 u 80 y alto de fondo 60 hasta arriba', () => {
  const m = mod('columna_desayuno', 600, { variante: '2 CACEROLEROS' }), f = () => frenteModulo('columna_desayuno', 600, 0, 2150, { columna: true, modulo: m, variante: m.variante, zocalo: 150, encimera: 890, grueso: 40 });
  const hueco = f().find(q => q.k === 'hueco');
  igual([hueco.z0, hueco.z1], [890, 1590]);
  igual(f().filter(q => q.k === 'tablero').length, 1, 'encimera');
  afirma(f().filter(q => q.k === 'hoja' && q.z1 <= 850).length === 2, 'dos caceroleros abajo');
  m.hueco = 800; igual(f().find(q => q.k === 'hueco').z1, 1690);
  const d = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), m] })]).datos;
  afirma(articulo(m, d).revisar && /hueco de 80/.test(articulo(m, d).revisar), articulo(m, d).revisar);
  afirma(materialCocina(d).piezas.some(q => /desayunador/.test(q.nota)), 'su trozo de encimera');
  afirma(geometriaAlzado(d, d.paredes[0]).piezas.some(q => q.clase === 'f_hueco'), 'el hueco dibujado');
});

prueba('vuelo para sentarse: la encimera sale por detrás (isla) y cuenta en el material', () => {
  const A = pared('A', 4000, { bajos: [mod('bajo', 600)] }), f = cocina([A]), d = f.datos;
  d.islas = [Object.assign(islaNueva('isla', 'A'), { largo: 1800, fondo: 900, separacion: 1000, distancia: 1000, vuelo: 300 })];
  const g = geometriaPlanta(d);
  afirma(g.islas[0].vuelo && g.islas[0].vuelo.length === 4, 'vuelo en la planta');
  igual(materialCocina(d).piezas.find(q => /isla/.test(q.pared)).fondo, 900 + 20 + 300);
  afirma(/vuelo de .* para sentarse \(3 personas\)/.test(textoResumen({ ficha: f, trabajo: { nombre: 'Casa' }, ajustes: AJUSTES_FABRICA })), textoResumen({ ficha: f, trabajo: { nombre: 'Casa' }, ajustes: AJUSTES_FABRICA }));
  d.islas[0].tipo = 'peninsula';
  afirma(geometriaPlanta(d).islas[0].vuelo, 'también en la península');
});

prueba('placa extractora con recirculación: sin horno, cajón ciego y dos caceroleros', () => {
  const m = mod('placa', 600, { extractor: 'recirculacion', horno: true, variante: 'SOPORTE HORNO Y 1 GAVETERO' });
  igual(placaConHorno(m), false);
  igual([variantesDe(m), varianteHabitual(m, {})], [['2 CACEROLEROS'], '2 CACEROLEROS']);
  const fr = frenteModulo('placa', 600, 150, 850, { modulo: m, variante: m.variante }), hojas = fr.filter(q => q.k === 'hoja');
  igual([hojas.length, hojas.filter(q => q.ciego).length, fr.filter(q => q.k === 'tirador').length], [3, 1, 2]);
  afirma(hojas.find(q => q.ciego).z0 > hojas.filter(q => !q.ciego)[1].z0, 'el ciego, arriba');
});

const con = fn => async () => { const a = await abrir({ ancho: 412, tactil: true }); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: placa extractora quita el mueble de la campana; cocina puente; desayunador; vuelo', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]');
  await a.page.fill('[data-pared="A"] > .fila-largo [data-c="largo"] input', '3'); await a.page.keyboard.press('Tab');
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="placa"]');
  await a.page.click('[data-acc="campana-forma"][data-v="mueble"]');
  await a.page.waitForSelector('[data-pared="A"] [data-fila="altos"] [data-modulo="alto_campana"]');
  await a.page.click('[data-acc="placa-extractor"][data-v="recirculacion"]');
  await a.page.waitForTimeout(200);
  igual(await a.page.$('[data-pared="A"] [data-fila="altos"] [data-modulo="alto_campana"]'), null, 'fuera el mueble de la campana');
  afirma(await a.page.$('[data-acc="extractor-sin-horno"]'), 'aviso: sin horno');
  igual(await a.page.$$eval('[data-acc="variante"]', l => l.length), 0, 'sin soportes de horno');
  // Cocina puente: aparece la fila de arriba
  await a.page.click('[data-pared="A"] [data-acc="puente"][data-v="true"]');
  await a.page.waitForSelector('[data-pared="A"] [data-fila="altillos"]');
  await a.page.click('[data-pared="A"] [data-fila="altillos"] [data-acc="anadir-modulo"][data-v="alto"]');
  // Desayunador
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="columna_desayuno"]');
  await a.page.click('[data-acc="hueco-desayuno"][data-v="800"]');
  afirma(/fondo 60/.test(await a.page.$eval('[data-acc="desayuno-alto"]', n => n.textContent)), 'el alto de arriba');
  // Isla con vuelo
  await a.page.click('[data-acc="anadir-isla"]');
  await a.page.click('[data-acc="isla-vuelo"][data-v="300"]');
  await a.page.waitForSelector('[data-acc="vuelo-personas"]');
}));

await fin();
