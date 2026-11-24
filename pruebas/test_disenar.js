// 1.49.0: «Diseñar la cocina»: paredes y tramo, electrodomésticos (también termo) y mano; propuestas lineal, en L y en
// U con rinconero, respetando el desagüe y la salida de humos (y una de reforma), siempre con espacio de trabajo.
import fs from 'fs';
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { situarMuebles } from '../docs/js/modulos.js';
import { disenarCocina, aplicarDiseno, electroDeFicha } from '../docs/js/disenar.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const el = (tipo, distancia, extra) => Object.assign({ id: tipo + distancia, tipo, para: null, nombre: '', distancia, ref: 'izq', altura: 500, ancho: null, alto: null }, extra || {});
function cocina(largo, elementos = []) {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo, elementos, bajos: [], altos: [] })];
  return f;
}
// Cómo queda una propuesta puesta en la ficha: [tipo, desde, hasta] de los bajos de cada pared
function puesta(f, pr) { const d = JSON.parse(JSON.stringify(f.datos)); aplicarDiseno(d, pr, []); return { d, sit: d.paredes.map(p => situarMuebles(p, d)) }; }
const centro = b => (b.desde + b.hasta) / 2;

prueba('lineal de 3,60: tres propuestas distintas, que caben, con 60 cm o más entre el agua y la placa y el lavavajillas junto al fregadero', () => {
  const f = cocina(3600), r = disenarCocina(f, [{ pared: f.datos.paredes[0].id }], ['frigo', 'horno', 'placa', 'campana', 'lavavajillas']);
  igual(r.forma, 'Lineal'); igual(r.propuestas.length, 3);
  r.propuestas.forEach(pr => {
    const { sit } = puesta(f, pr), b = sit[0].bajos, fr = b.find(x => x.m.tipo === 'fregadero'), pl = b.find(x => x.m.tipo === 'placa'), lv = b.find(x => x.m.tipo === 'lavavajillas');
    afirma(b[b.length - 1].hasta <= 3600, 'se sale: ' + pr.texto);
    afirma(Math.min(Math.abs(lv.desde - fr.hasta), Math.abs(fr.desde - lv.hasta)) <= 1, 'lavavajillas pegado: ' + pr.texto);
    const entre = pl.desde >= fr.hasta ? pl.desde - Math.max(fr.hasta, lv.hasta) : Math.min(fr.desde, lv.desde) - pl.hasta;
    afirma(entre >= 590, 'encimera de trabajo: ' + entre + ' ' + pr.texto);
    const muebles = b.filter(x => x.m.tipo !== 'hueco');
    afirma(muebles[0].m.tipo === 'columna_frigo' || muebles[muebles.length - 1].m.tipo === 'columna_frigo', 'frigo en un extremo: ' + pr.texto);
    afirma(pr.paredes[0].altos.some(m => m.tipo === 'alto'), 'con altos');
  });
  afirma(r.propuestas[0].nota >= r.propuestas[2].nota);
});
prueba('respeta lo medido: fregadero sobre el desagüe y placa bajo la salida de humos; y una de reforma', () => {
  const f = cocina(4200, [el('desague', 1000), el('humos', 3400, { altura: null })]);
  const r = disenarCocina(f, [{ pared: f.datos.paredes[0].id }], ['placa', 'campana', 'lavavajillas']);
  afirma(r.desague && r.humos && !r.sinRespetar);
  const pr = r.propuestas.find(x => !x.reforma), { sit } = puesta(f, pr), b = sit[0].bajos;
  afirma(Math.abs(centro(b.find(x => x.m.tipo === 'fregadero')) - 1000) <= 60, JSON.stringify(b.map(x => [x.m.tipo, x.desde])));
  afirma(Math.abs(centro(b.find(x => x.m.tipo === 'placa')) - 3400) <= 60, JSON.stringify(b.map(x => [x.m.tipo, x.desde])));
  afirma(r.propuestas.some(x => x.reforma), 'y una de reforma');
  // Si respetando no queda espacio de trabajo (desagüe y humos demasiado cerca), lo dice y todas son de reforma
  const g = cocina(3600, [el('desague', 1000), el('humos', 2700, { altura: null })]), rg = disenarCocina(g, [{ pared: g.datos.paredes[0].id }], ['placa', 'campana', 'lavavajillas']);
  afirma(rg.sinRespetar && rg.propuestas.length && rg.propuestas.every(x => x.reforma), JSON.stringify(rg.propuestas.map(x => x.reforma)));
});
prueba('cocina en L (paredes B y C de una cocina real): rinconero en la esquina y la primera respeta desagüe y humos', () => {
  const g = fichaNueva('cocina', null, 't'); g.datos = JSON.parse(fs.readFileSync(new URL('./datos_cocina_esquina.json', import.meta.url), 'utf8'));
  const r = disenarCocina(g, [{ pared: 'B' }, { pared: 'C' }], ['horno', 'placa', 'campana', 'lavavajillas']);
  igual(r.forma, 'En L'); afirma(r.propuestas.length >= 2);
  const pr = r.propuestas[0]; afirma(!pr.reforma);
  const { sit } = puesta(g, pr);
  afirma(sit[1].bajos.concat(sit[2].bajos).some(x => x.m.tipo === 'rinconero'), 'rinconero');
  afirma(Math.abs(centro(sit[1].bajos.find(x => x.m.tipo === 'placa')) - 1000) <= 60, 'placa bajo los humos de B');
  afirma(Math.abs(centro(sit[2].bajos.find(x => x.m.tipo === 'fregadero')) - 1600) <= 60, 'fregadero sobre el desagüe de C');
  sit.forEach((s, i) => afirma(!s.bajos.length || s.bajos[s.bajos.length - 1].hasta <= g.datos.paredes[i].largo + 1, 'se sale de la pared ' + i));
});
prueba('en U y si no cabe, lo dice', () => {
  const g = fichaNueva('cocina', null, 't'); g.datos = JSON.parse(fs.readFileSync(new URL('./datos_cocina_esquina.json', import.meta.url), 'utf8'));
  const u = disenarCocina(g, ['A', 'B', 'C'].map(p => ({ pared: p })), ['frigo', 'placa', 'lavavajillas']);
  igual(u.forma, 'En U'); afirma(u.propuestas.length >= 1, u.aviso);
  const f = cocina(1500), r = disenarCocina(f, [{ pared: f.datos.paredes[0].id }], ['frigo', 'horno', 'placa', 'campana', 'lavavajillas', 'lavadora']);
  igual(r.propuestas, []); afirma(/^No cabe/.test(r.aviso), r.aviso);
});
prueba('termo y microondas en altos; diestro y zurdo; aplicar apunta los electrodomésticos', () => {
  // Sin horno en columna, el micro va en un alto
  const f = cocina(4200), r = disenarCocina(f, [{ pared: f.datos.paredes[0].id }], ['placa', 'campana', 'lavavajillas', 'microondas', 'termo'], { mano: 'diestro' });
  const altos = r.propuestas[0].paredes[0].altos;
  afirma(altos.some(m => m.tipo === 'otro' && m.nombre === 'Termo'), JSON.stringify(altos.map(m => [m.tipo, m.nombre])));
  afirma(altos.some(m => m.tipo === 'alto_micro'), 'micro en un alto');
  const d = JSON.parse(JSON.stringify(f.datos)); aplicarDiseno(d, r.propuestas[0], ['placa', 'campana', 'lavavajillas', 'microondas', 'termo', 'horno']);
  igual(d.paredes[0].bajos.map(m => m.tipo), r.propuestas[0].paredes[0].bajos.map(m => m.tipo));
  igual(d.electro.map(e => e.clave).sort(), ['campana', 'horno', 'lavavajillas', 'microondas', 'placa']);
  igual(electroDeFicha({ electro: [] }), ['frigo', 'horno', 'placa', 'campana', 'lavavajillas']);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: marcar paredes y electrodomésticos, diseñar, ver las propuestas y aplicar una', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3,6');
  await a.page.waitForSelector('[data-acc="tarjeta-disenar"] [data-acc="disenar-pared"][data-v="A"]');
  await a.page.check('[data-acc="disenar-pared"][data-v="A"]');
  await a.page.check('[data-acc="disenar-electro"][data-v="termo"]');
  await a.page.click('[data-acc="disenar-mano"][data-v="zurdo"]');
  await a.page.click('[data-acc="disenar"]');
  await a.page.waitForSelector('[data-acc="propuesta-diseno"]');
  igual((await a.page.$$('[data-acc="propuesta-diseno"]')).length, 3);
  afirma(await a.page.$('[data-acc="propuesta-diseno"] svg'), 'con su dibujo');
  await a.page.click('[data-acc="aplicar-diseno"][data-v="0"]');
  await a.page.waitForFunction(() => !document.querySelector('[data-acc="propuesta-diseno"]'));
  await a.page.waitForSelector('[data-pared="A"] [data-fila="bajos"] [data-modulo]');
  afirma((await a.page.$$('[data-pared="A"] [data-fila="bajos"] [data-modulo]')).length >= 4, 'los bajos puestos');
}));
fin();
