// 1.33: remates de la cocina (costados vistos, regletas y cierres a techo): salen de las medidas, se elige si van y de
// qué material (como los frentes, como el casco u otro), y cuentan en los tableros y en las hojas de pedido.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { fijarCocinaTipo } from '../docs/js/alzado.js';
import { rematesCocina, materialCocina, textoMaterial } from '../docs/js/material.js';
import { pedidoFrentes, pedidoCascos, pedidoJuntos } from '../docs/js/pedido.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const cocina = (paredes, x) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; Object.assign(f.datos, x || {}); return f; };

prueba('regleta si sobran hasta 15 cm; costado visto si queda abierto; cierre a techo solo si se pide', () => {
  fijarCocinaTipo(AJUSTES_FABRICA.cocina_tipo);
  const a = cocina([pared('A', 2460, { bajos: [mod('bajo', 600), mod('placa', 900), mod('cajonero', 900)], altos: [mod('alto', 600), mod('alto', 900), mod('alto', 900)] })], { alto_techo: 2600 });
  const r = rematesCocina(a.datos);
  // 1.34: regleta de 4 cm a la pared en cada punta (la de la derecha, con lo que sobre)
  igual(r.filter(x => x.tipo === 'regletas').map(x => [x.pieza, x.ancho]), [['Regleta de bajo', 40], ['Regleta de bajo', 20], ['Regleta de alto', 40], ['Regleta de alto', 20]]);
  igual(r.filter(x => x.tipo === 'techo').length, 0, 'el cierre a techo no va si no se pide');
  a.datos.remates = { techo: { usar: true } };
  const t = rematesCocina(a.datos).filter(x => x.tipo === 'techo');
  igual(t.map(x => [x.alto, x.ancho]), [[2600 - 2150, 2460]], 'de punta a punta, con las regletas');
  // Pared más larga: ya no es regleta, se ve el costado del último mueble
  const b = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 900)], altos: [mod('alto', 600)] })]);
  igual(rematesCocina(b.datos).filter(x => x.tipo === 'costados').map(x => x.pieza), ['Costado de bajo (2 cm)', 'Costado de alto (2 cm)']);
  // Isla: dos costados y la trasera
  const c = cocina([], { islas: [{ tipo: 'isla', largo: 1800, fondo: 900 }] });
  igual(rematesCocina(c.datos).map(x => x.pieza), ['Costado de isla', 'Costado de isla', 'Trasera de isla']);
});

prueba('el material manda: frentes (tablero de frentes), casco (con los cascos) u otro (aparte)', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 900)], altos: [mod('alto', 600)] })]);
  const m0 = materialCocina(f.datos);
  const costados = m => m.rematesFrentes.filter(q => q.remate === 'costados').length;
  igual(costados(m0), 2, 'dos costados como los frentes');
  f.datos.remates = { costados: { usar: false } };
  const m1 = materialCocina(f.datos);
  igual([costados(m1), m1.frentes.length], [0, m0.frentes.length], 'sin costados: los frentes son los mismos y no hay costados');
  f.datos.remates = { costados: { material: 'casco' } };
  afirma(pedidoCascos([f], AJUSTES_FABRICA).some(x => x.grupo === 'Remates'), 'como el casco: en la hoja de cascos');
  afirma(!pedidoFrentes([f], AJUSTES_FABRICA).some(x => /Costado/.test(x.pieza)), 'y no en la de frentes');
  f.datos.remates = { costados: { material: 'otro', otro: 'Roble macizo' } };
  afirma(pedidoFrentes([f], AJUSTES_FABRICA).some(x => x.acabado === 'Roble macizo' && /Costado/.test(x.pieza)));
  afirma(textoMaterial(f, 'cm').some(t => /Remates en Roble macizo/.test(t)), textoMaterial(f, 'cm').join(' | '));
  afirma(pedidoJuntos([f], AJUSTES_FABRICA).some(x => x.grupo === 'Remates'));
});

const con = fn => async () => { const a = await abrir({ conRemates: true }); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('ficha: «Remates» en Acabados, con su material', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ', ab = A + '[data-fila="bajos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]'); await a.page.click(ab + '[data-acc="rapido"][data-v="600"]');
  await a.page.click('[data-acc="abrir-acabados"]');
  await a.page.waitForFunction(() => /costado visto/.test(document.querySelector('[data-acc="remates-info"]')?.textContent || ''));
  await a.page.click('[data-remate="techo"] [data-acc="remate-usar"][data-v="true"]');
  await a.page.click('[data-remate="techo"] [data-acc="remate-material"][data-v="otro"]');
  await a.page.fill('[data-remate="techo"] [data-acc="remate-otro"]', 'DM lacado');
  await a.page.waitForTimeout(300);
  afirma(await a.page.isVisible('[data-remate="techo"] [data-acc="remate-otro"]'));
}));

await fin();
