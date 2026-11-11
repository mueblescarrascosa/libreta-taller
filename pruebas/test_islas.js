import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, islaNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });
function cocina() {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = ['A', 'B'].map(l => Object.assign(paredNueva([]), { letra: l, largo: 4000, elementos: [] }));
  return f;
}
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

prueba('isla: paralela a su pared, separada y desde la esquina, con dos cotas al suelo', () => {
  const f = cocina(); f.datos.islas = [Object.assign(islaNueva('isla', 'A'), { largo: 2400, fondo: 1000, separacion: 1000, distancia: 800 })];
  const g = geometriaPlanta(f.datos, { unidad: 'cm' }), x = g.islas[0], A = g.paredes.find(p => p.letra === 'A'), k = dist(A.a, A.b) / 4000;
  igual(x.nombre, 'Isla 240×100');
  afirma(Math.abs(dist(x.rect[0], x.rect[1]) / k - 2400) < 1 && Math.abs(dist(x.rect[1], x.rect[2]) / k - 1000) < 1, 'tamaño');
  igual(x.cotas.map(c => c.texto), ['80', '100']);
  afirma(Math.abs(dist(x.cotas[1].a, x.cotas[1].b) / k - 1000) < 1, 'separación');
  const t = textoResumen({ ficha: f, trabajo: null, ajustes: AJ });
  afirma(t.includes('- Isla: 240 × 100 cm, paralela a la pared A, separada 100 cm, a 80 cm desde la izquierda'), t);
});
prueba('península: sale de su pared, pegada a ella, desde la derecha', () => {
  const f = cocina(); f.datos.islas = [Object.assign(islaNueva('peninsula', 'B'), { largo: 1800, fondo: 900, distancia: 1200, ref: 'der' })];
  const g = geometriaPlanta(f.datos, { unidad: 'cm' }), x = g.islas[0], B = g.paredes.find(p => p.letra === 'B');
  igual(x.cotas.map(c => c.texto), ['120']);
  const k = dist(B.a, B.b) / 4000;
  afirma(Math.abs(dist(x.rect[0], B.a) / k - (4000 - 1200 - 900)) < 1, 'no arranca donde toca');
  afirma(textoResumen({ ficha: f, trabajo: null, ajustes: AJ }).includes('- Península: 180 × 90 cm, sale de la pared B, a 120 cm desde la derecha'));
});
prueba('sin medidas suficientes queda «sin situar»', () => {
  const f = cocina(); f.datos.islas = [Object.assign(islaNueva('isla', 'A'), { largo: 2400 })];
  const g = geometriaPlanta(f.datos, { unidad: 'cm' });
  igual(g.islas.length, 0); igual(g.sinSituar.map(e => e.etiqueta), ['Isla']);
});
prueba('en la ficha: añadir una isla y verla en la planta', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa');
    await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(50);
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '4');
    await a.page.click('[data-acc="anadir-isla"]');
    const I = '[data-isla="isla"] ';
    for (const [k, v] of [['largo', '240'], ['fondo', '100'], ['separacion', '100'], ['distancia', '80']]) await a.page.fill(I + '[data-acc="' + k + '"]', v);
    await a.page.press(I + '[data-acc="distancia"]', 'Tab');
    await a.page.waitForSelector('[data-acc="planta"] [data-isla="isla"]');
    igual((await a.page.$$('[data-acc="planta"] [data-cota-suelo]')).length, 2);
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
fin();
