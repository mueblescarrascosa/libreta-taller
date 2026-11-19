// 1.40: avisa de la toma, el enchufe o el desagüe que falta para un mueble o electrodoméstico, y por dónde ponerlo.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo, avisos } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { instalacionesQueFaltan } from '../docs/js/avisos-obra.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';
import os from 'node:os';
import path from 'node:path';

const mod = (tipo, ancho, x = {}) => Object.assign(moduloNuevo(tipo), { ancho }, x);
const el = (tipo, x) => Object.assign(elementoNuevo(tipo, 'izq'), x);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, extra);
const faltan = f => avisos(f, 'cm').map(a => a.texto).filter(t => t.startsWith('Falta'));
const cocina = paredes => { const f = fichaNueva('cocina', null, 't'); f.datos.alto_techo = 2600; f.datos.paredes = paredes; return f; };

prueba('una cocina con todas sus tomas no avisa de nada', () => {
  const f = cocina([pared('A', 3600, {
    bajos: [mod('bajo', 600), mod('fregadero', 800), mod('lavavajillas', 600), mod('placa', 600), mod('columna_frigo', 600)],
    elementos: [el('desague', { distancia: 1000, altura: 400 }), el('toma', { para: 'agua', distancia: 1100, altura: 500 }),
      el('enchufe', { para: 'lavavajillas', distancia: 1300, altura: 500 }), el('enchufe', { para: 'placa', distancia: 2300, altura: 500 }),
      el('enchufe', { para: 'campana', distancia: 2300, altura: 2100 }), el('humos', { distancia: 2300, altura: 2300 }),
      el('enchufe', { para: 'frigo', distancia: 2900, altura: 2000 })] })]);
  igual(faltan(f), []);
});

prueba('fregadero sin desagüe ni agua: avisa con la pared, el tramo y la altura', () => {
  const f = cocina([pared('A', 1000), pared('B', 3000, { bajos: [mod('bajo', 600), mod('fregadero', 800)] }), pared('C', 1000)]);
  const t = faltan(f);
  afirma(t.some(x => /^Falta el desagüe del fregadero: pared B, entre 64 y 144 cm de A, a unos 40 cm del suelo/.test(x)), t.join(' | '));
  afirma(t.some(x => /^Falta la toma de agua del fregadero: pared B/.test(x)), t.join(' | '));
});

prueba('el tramo se cuenta desde la esquina más cercana', () => {
  const f = cocina([pared('A', 1000), pared('B', 3000, { bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('fregadero', 800)] }), pared('C', 1000)]);
  afirma(faltan(f).some(x => /desagüe del fregadero: pared B, entre 36 y 116 cm de C/.test(x)), faltan(f).join(' | '));
});

prueba('el lavavajillas junto al fregadero usa su agua y desagüe; solo pide su enchufe, en el mueble de al lado', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('fregadero', 800), mod('lavavajillas', 600), mod('bajo', 600)],
    elementos: [el('desague', { distancia: 400, altura: 400 }), el('toma', { para: 'agua', distancia: 500, altura: 500 })] })]);
  const t = faltan(f);
  igual(t.length, 1, t.join(' | '));
  afirma(/^Falta el enchufe del lavavajillas: pared A, entre 4 y 144 cm de la izq., a unos 50 cm del suelo \(mejor en el mueble de al lado\)/.test(t[0]), t[0]);
});

prueba('un enchufe de otro aparato no vale; uno sin uso o «general» sí', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 600)], elementos: [el('enchufe', { para: 'frigo', distancia: 900, altura: 500 })] })]);
  afirma(faltan(f).some(x => x.startsWith('Falta el enchufe de la placa')), faltan(f).join(' | '));
  f.datos.paredes[0].elementos[0].para = 'general';
  afirma(!faltan(f).some(x => x.startsWith('Falta el enchufe de la placa')), 'el general vale');
});

prueba('usos propios de Ajustes («Placa y horno») cuentan por su nombre', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 800)],
    elementos: [el('enchufe', { para: 'placa_y_horno', para_nombre: 'Placa y horno', distancia: 1000, altura: 500 }), el('humos', { distancia: 1000, altura: 2300 }), el('enchufe', { para: 'campana', distancia: 1000, altura: 2100 })] })]);
  igual(faltan(f), []);
});

prueba('placa de gas: pide la toma de gas (si no va con bombona)', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 800, { placa_tipo: 'gas' })], elementos: [el('humos', { distancia: 400, altura: 2300 }), el('enchufe', { para: 'campana', distancia: 400, altura: 2100 })] })]);
  afirma(faltan(f).some(x => /^Falta la toma de gas de la placa \(si no va con bombona\)/.test(x)), faltan(f).join(' | '));
  afirma(!faltan(f).some(x => x.startsWith('Falta el enchufe de la placa')), 'la de gas no pide enchufe de placa');
});

prueba('campana: enchufe y salida de humos, salvo recirculación (que solo pide enchufe)', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 600)], elementos: [el('enchufe', { para: 'placa', distancia: 300, altura: 500 })] })]);
  const t = faltan(f);
  afirma(t.some(x => /^Falta el enchufe de la campana: pared A, .*a unos 2,10 m del suelo/.test(x)), t.join(' | '));
  afirma(t.some(x => /^Falta la salida de humos de la campana/.test(x)), t.join(' | '));
  f.datos.paredes[0].bajos[0].campana_salida = 'recirculacion';
  afirma(!faltan(f).some(x => /salida de humos/.test(x)), 'recirculación sin humos');
});

prueba('columnas: frigo, horno y micro piden su enchufe; la lavadora, agua, desagüe y enchufe', () => {
  const f = cocina([pared('A', 4000, { bajos: [mod('columna_frigo', 600), mod('columna_hmo', 600), mod('bajo', 600), mod('lavadora', 600)], altos: [] })]);
  const t = faltan(f).join(' | ');
  ['enchufe del frigo', 'enchufe del horno', 'desagüe de la lavadora', 'toma de agua de la lavadora', 'enchufe de la lavadora'].forEach(x => afirma(t.includes('Falta el ' + x) || t.includes('Falta la ' + x), x + ' en: ' + t));
});

prueba('una toma en la pared de al lado, junto a la esquina, también vale', () => {
  const f = cocina([pared('A', 2000, { elementos: [el('desague', { ref: 'der', distancia: 300, altura: 400 }), el('toma', { ref: 'der', para: 'agua', distancia: 300, altura: 500 })] }),
    pared('B', 3000, { bajos: [mod('fregadero', 800)] })]);
  igual(faltan(f), []);
});

prueba('la cocina «COCINA CASA» del usuario: le faltan la toma de gas de la placa y el enchufe de la campana', () => {
  const f = cocina([pared('A', 2600), pared('B', 2050, { bajos: [mod('bajo', 600), mod('placa', 800, { placa_tipo: 'gas', placa_ancho: 600, campana_ancho: 600, campana_salida: 'exterior' })],
    elementos: [el('humos', { distancia: 1000, humos_sale: 'techo', separacion: 10, humos_forma: 'redonda', diametro: 150 }), el('enchufe', { para: 'placa_y_horno', para_nombre: 'Placa y horno', distancia: 1000, altura: 500 })] }),
  pared('C', 2600, { bajos: [mod('rinconero', 1000, { forma: 'recto', gira: 'izq' }), mod('bajo', 200), mod('fregadero', 800), mod('lavavajillas', 600)],
    elementos: [el('desague', { distancia: 1600, altura: 500 }), el('toma', { para: 'agua', para_nombre: 'Agua', distancia: 1700, altura: 500 }), el('enchufe', { para: 'lavavajillas', distancia: 1900, altura: 500 })] }),
  pared('D', 250), pared('E', 3000, { bajos: [mod('columna_frigo', 700)], elementos: [el('enchufe', { para: 'frigo', distancia: 400, altura: 500 })] })]);
  const t = instalacionesQueFaltan(f.datos).map(x => x.que);
  igual(t, ['la toma de gas de la placa (si no va con bombona)', 'el enchufe de la campana']);
});

prueba('app: la ficha avisa y el resumen pone en rojo lo que falta (sin salirse a 390 px)', async () => {
  const a = await abrir({});
  try {
    await a.page.setViewportSize({ width: 390, height: 844 });
    await entrar(a); await crearTrabajo(a, 'Prueba tomas');
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3');
    await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="fregadero"]');
    await a.page.click('[data-pared="A"] [data-modulo].abierto [data-acc="rapido"][data-v="800"]');
    const t = await a.page.$eval('[data-pantalla="ficha"]', n => n.textContent);
    afirma(/Falta el desagüe del fregadero: pared A/.test(t), 'aviso en la ficha');
    await a.page.click('[data-acc="terminar"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    const filas = await a.page.$$eval('.resumen-doc .instalaciones tr.falta', r => r.map(x => x.textContent));
    afirma(filas.some(x => /FALTA el desagüe del fregadero/.test(x)) && filas.some(x => /FALTA la toma de agua del fregadero/.test(x)), filas.join(' | '));
    afirma(await a.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'scroll lateral');
    const tabla = await a.page.$('.resumen-doc .instalaciones');
    await tabla.screenshot({ path: path.join(os.tmpdir(), 'faltan_resumen.png') });
    igual(a.errores, [], 'errores de página');
  } finally { await a.cerrar(); }
});

await fin();
