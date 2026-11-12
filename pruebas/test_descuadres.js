import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo, esquinaDe, textoDescuadre, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });
const pared = (letra, largo) => Object.assign(paredNueva([]), { letra, largo, elementos: [] });
function cocina() {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [pared('A', 3000), pared('B', 2000), pared('C', 3000)];
  return f;
}

prueba('descuadre: texto de abre y cierra', () => {
  igual(textoDescuadre({ estado: 'descuadrada', sentido: 'abierta', mm: 5, en: 1000 }), 'abre 5 mm en 100 cm');
  igual(textoDescuadre({ estado: 'descuadrada', sentido: 'cerrada', mm: 3, en: null }), 'cierra 3 mm');
  igual(textoDescuadre({ estado: 'escuadra', sentido: 'cerrada', mm: 3 }), null);
});

prueba('una esquina se ve desde las dos paredes; la primera no tiene esquina a la izquierda si no está cerrada', () => {
  const f = cocina(), [A, B, C] = f.datos.paredes;
  igual(esquinaDe(f.datos, A, 'izq'), null);
  igual(esquinaDe(f.datos, C, 'der'), null);
  esquinaDe(f.datos, A, 'der').poner({ estado: 'descuadrada', sentido: 'cerrada', mm: 8, en: 1000 });
  const q = esquinaDe(f.datos, B, 'izq');
  igual([q.con, q.valor.sentido, q.valor.mm], ['A', 'cerrada', 8]);
  igual(B.esquina.mm, 8);
});

prueba('con forma dibujada se guarda también en el plano (lo que usa el editor)', () => {
  const f = cocina();
  f.datos.plano = { cerrada: true, vertices: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 2 }], esquinas: [], diagonales: [] };
  const [A, , C] = f.datos.paredes;
  const q = esquinaDe(f.datos, A, 'izq');
  igual(q.con, 'C');
  esquinaDe(f.datos, C, 'der').poner({ estado: 'descuadrada', sentido: 'abierta', mm: 4, en: 500 });
  igual(f.datos.plano.esquinas[0].mm, 4);
  igual(esquinaDe(f.datos, A, 'izq').valor.mm, 4);
});

prueba('resumen y planta: la esquina descuadrada y el pilar descuadrado', () => {
  const f = cocina(), [A, B] = f.datos.paredes;
  esquinaDe(f.datos, A, 'der').poner({ estado: 'descuadrada', sentido: 'abierta', mm: 5, en: 1000 });
  B.elementos.push(Object.assign(elementoNuevo('pilar', 'izq'), { distancia: 500, ancho: 300, fondo: 200, esquina: { estado: 'descuadrada', sentido: 'cerrada', mm: 3 } }));
  const t = textoResumen({ ficha: f, trabajo: { unidad: 'cm' }, ajustes: AJ });
  afirma(t.includes('- ⚠ Esquina con B (dcha.): abre 5 mm en 100 cm'), t);
  afirma(t.includes('- ⚠ Esquina con A (izq.): abre 5 mm en 100 cm'), t);
  afirma(/Mocheta \(pilar\)[^\n]*descuadrado: cierra 3 mm/.test(t), t);
  const g = geometriaPlanta(f.datos, {});
  igual(g.esquinas.map(e => [e.letra, e.texto]), [['B', '∠ abre 5 mm en 100 cm']]);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });

prueba('en la ficha: «∠ Esquinas» y el descuadre del pilar se guardan y se dibujan', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]'); await a.page.click('[data-acc="anadir-pared"]'); await a.page.waitForSelector('[data-pared="B"]');
  igual(await a.page.$('[data-pared="A"] [data-acc="esquinas"]') !== null, true);
  await a.page.click('[data-pared="A"] [data-acc="esquinas"]');
  await a.page.click('[data-pared="A"] [data-acc="esquina-der"] [data-v="abierta"]');
  await a.page.fill('[data-pared="A"] [data-acc="esquina-der"] input[data-acc="desvio"]', '6'); await a.page.keyboard.press('Tab');
  await a.page.click('[data-pared="B"] [data-acc="pilares"]');
  await a.page.click('[data-pared="B"] [data-acc="descuadre-pilar"] [data-v="cerrada"]');
  await a.page.waitForTimeout(1200);
  const f = await ficha(a);
  igual([f.datos.paredes[1].esquina.estado, f.datos.paredes[1].esquina.sentido, f.datos.paredes[1].esquina.mm], ['descuadrada', 'abierta', 6]);
  igual(f.datos.paredes[1].elementos.find(e => e.tipo === 'pilar').esquina.sentido, 'cerrada');
  afirma(await a.page.$('[data-acc="planta"] [data-esquina-descuadrada="B"]') !== null, 'punto rojo en la planta');
  await a.page.screenshot({ path: (await import('node:os')).tmpdir() + '/descuadres.png', fullPage: true });
}));
fin();
