import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { articulo, paquetePresupuesto, varianteHabitual, alturaHabitual, CLAVE_PASO } from '../docs/js/presupuesto.js';
import { frenteModulo } from '../docs/js/frentes.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, extra = {}) => Object.assign(moduloNuevo(tipo), { ancho }, extra);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [] }, extra);
const art = (m, d = {}) => { const a = articulo(m, d); return a.revisar ? 'REVISAR' : [a.m, a.mo, a.med].join(' · '); };

prueba('cada mueble a su artículo: puertas por ancho, cajonero de 4, H/MO, frigo, altos de 90-100', () => {
  igual(art(mod('bajo', 600)), 'BAJO · 1 PUERTA · 60');
  igual(art(mod('fregadero', 800)), 'BAJO · 2 PUERTAS · 80');
  igual(art(mod('cajonero', 600)), 'BAJO · 4 GAVETEROS · 60');
  igual(art(mod('placa', 600, { horno: true })), 'BAJO · SOPORTE HORNO Y 1 GAVETERO · 60');
  igual(art(mod('lavavajillas', 600)), 'BAJO · LAVAVAJILLAS INTEGRABLE · 60');
  igual(art(mod('rinconero', 1000, { forma: 'recto' })), 'BAJO · RINCÓN CIEGO · 100');
  igual(art(mod('rinconero', 900, { forma: 'chaflan' })), 'REVISAR');
  igual(art(mod('columna_hmo', 600), { alto_techo: 2500 }), 'COLUMNA 220-240 · PUERTA + H/MO + 2 CACEROLEROS · 60');
  igual(art(mod('columna_frigo', 600), { alto_techo: 2300 }), 'COLUMNA 200-215 · FRIGORÍFICO INTEGRADO · 60');
  igual(art(mod('alto', 800)), 'ALTO 90-100 · 2 PUERTAS · 80');
  igual(art(mod('alto_campana', 600), { electro: [{ clave: 'campana', tipo: 'integrada' }] }), 'ALTO 90-100 · CAMPANA INTEGRABLE · 60');
  igual(art(mod('bajo', 455)), 'REVISAR');
});

prueba('lo elegido en la libreta manda: variante y altura', () => {
  igual(art(mod('bajo', 600, { variante: 'ESPECIERO' })), 'BAJO · ESPECIERO · 60');
  igual(art(mod('cajonero', 500, { variante: '2 CACEROLEROS' })), 'BAJO · 2 CACEROLEROS · 50');
  igual(art(mod('alto', 600, { altura: 'ALTO 70-80' })), 'ALTO 70-80 · 1 PUERTA · 60');
  igual([varianteHabitual(mod('cajonero', 800), {}), alturaHabitual(mod('escobero', 400), { alto_techo: 2300 })], ['1 GAVETERO 2 CACEROLEROS', 'COLUMNA 200-215']);
  // El dibujo sigue a la variante: 2 caceroleros son 2 cajones.
  igual(frenteModulo('cajonero', 500, 100, 820, { variante: '2 CACEROLEROS' }).filter(q => q.k === 'hoja').length, 2);
});

prueba('paquete: cliente, grupos en G2 con el casco, vestidor por paredes y lo que hay que revisar', () => {
  const f = fichaNueva('cocina', null, 't');
  f.nombre = 'Piso 1';
  f.datos.acabados.casco = 'Antracita'; f.datos.acabados.modelo = 'Alpha';
  f.datos.paredes = [pared('A', 3000, { bajos: [mod('bajo', 600), mod('fregadero', 800), mod('bajo', 455)], altos: [mod('alto', 600)] })];
  f.datos.electro = [{ id: 'e', clave: 'horno', tipo: 'columna', ancho: null, modelo: '', nombre: '' }];
  const p = paquetePresupuesto(f, { nombre: 'Casa', cliente: 'Juan', direccion: 'C/ Mayor 1', datos: { telefono: '600' } }, null);
  igual([p.cliente, p.direccion, p.telefono], ['Juan', 'C/ Mayor 1', '600']);
  igual(p.grupos.map(g => [g.tipo, g.nombre || '', g.cal || '', g.casco || '']), [['muebles', 'Bajos y columnas', 'BÁSICO', 'antracita 19'], ['muebles', 'Altos', 'BÁSICO', 'antracita 19'], ['revisar', '', '', '']]);
  afirma(p.grupos[2].lineas.some(t => /bajo de 45,5 cm/.test(t)) && p.grupos[2].lineas.some(t => /horno/.test(t)), p.grupos[2].lineas.join(' | '));
  afirma(p.notas.includes('Frentes: Alpha') && p.notas.includes('Cascos: Antracita'), p.notas);
  const v = fichaNueva('armario', 'vestidor', 't');
  v.datos.paredes = [pared('A', 3000, { cuerpos: [{ id: '1', ancho: 1000, interior: 'barra', interior2: 'cajonera', puertas: 'corredera' }] })];
  const pv = paquetePresupuesto(v, null, null);
  igual(pv.grupos[0].tramos, [{ nombre: 'Pared A', ancho: 100, alto: 250, cuerpos: [{ ancho: 100, barra: 1, cajones: 3, estantes: 0 }], puertas: 'corredera_tablero' }]);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('en la ficha: elegir el modelo de un mueble y pasar la cocina a presupuestos', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.fill('[data-pared="A"] > .fila-largo [data-c="largo"] input', '3'); await a.page.keyboard.press('Tab');
  await a.page.click('[data-pared="A"] [data-acc="anadir-modulo"][data-v="bajos"], [data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"]');
  await a.page.selectOption('[data-pared="A"] [data-modulo].abierto [data-acc="tipo-modulo"]', 'cajonero');
  await a.page.click('[data-pared="A"] [data-modulo].abierto [data-acc="rapido"][data-v="500"]');
  igual(await a.page.$$eval('[data-pared="A"] [data-modulo].abierto [data-acc="variante"].on', b => b.map(x => x.dataset.v)), ['4 GAVETEROS']);
  await a.page.click('[data-pared="A"] [data-modulo].abierto [data-acc="variante"][data-v="2 CACEROLEROS"]');
  igual(await a.page.innerText('[data-pared="A"] [data-modulo].abierto [data-acc="articulo"]'), 'BAJO · 2 CACEROLEROS · 50');
  await a.page.evaluate(() => { window.open = u => { window.__abierto = u; }; });
  await a.page.click('[data-acc="pasar-presupuesto"]');
  await a.page.waitForFunction(() => window.__abierto);
  const r = await a.page.evaluate(k => ({ url: window.__abierto, p: JSON.parse(localStorage.getItem(k)) }), CLAVE_PASO);
  afirma(/\/cocinas\/$/.test(r.url), r.url);
  igual(r.p.grupos[0].lineas.map(l => [l.m, l.mo, l.med]), [['BAJO', '2 CACEROLEROS', '50']]);
}));
fin();
