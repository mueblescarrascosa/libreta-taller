import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA, avisos } from '../docs/js/modelo.js';
import { cuerposQueEntran, situarCuerpos, cuadreCuerposPared, textoCuadre, textoRincon } from '../docs/js/modulos.js';
import { geometriaAlzado } from '../docs/js/alzado.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });
const pared = (letra, largo, cuerpos) => Object.assign(paredNueva([]), { letra, largo, elementos: [], cuerpos });
function vestidor(rincon) {
  const f = fichaNueva('armario', 'vestidor', 't');
  f.datos.paredes = [pared('A', 2000, [{ id: '1', ancho: 500, interior: 'barra' }, Object.assign({ id: '2', ancho: 1000, interior: 'estantes', gira: 'der' }, rincon)]),
    pared('B', 2400, [{ id: '3', ancho: 800, interior: 'barra', interior2: 'cajonera' }])];
  return f;
}

prueba('rincón en L: ocupa su ancho aquí y «lado2» en la pared de al lado', () => {
  const f = vestidor({ rincon: 'L', lado2: 1000 }), [A, B] = f.datos.paredes;
  const e = cuerposQueEntran(f.datos, B);
  igual([e.izq, e.der, e.cIzq.id], [1000, 0, '2']);
  igual(situarCuerpos(B, f.datos).cuerpos.map(x => [x.desde, x.hasta]), [[1000, 1800]]);
  igual(cuadreCuerposPared(B, f.datos).resto, 600);
  igual(cuadreCuerposPared(A, f.datos).resto, 500);
  igual(textoRincon(A.cuerpos[1]), 'rincón en L 100×100');
});

prueba('rincón recto (ciego): en la otra pared ocupa su fondo (60)', () => {
  const f = vestidor({ rincon: 'recto' }), B = f.datos.paredes[1];
  igual(cuerposQueEntran(f.datos, B).izq, 600);
  igual(situarCuerpos(B, f.datos).cuerpos[0].desde, 600);
});

prueba('si los rincones no caben, el aviso lo dice en la otra pared', () => {
  const f = vestidor({ rincon: 'L', lado2: 1700 });
  const t = avisos(f, 'cm').map(a => a.texto);
  afirma(t.some(x => /Cuerpos de la pared B: te pasas 10 cm/.test(x)), t.join(' | '));
  igual(textoCuadre(cuadreCuerposPared(f.datos.paredes[1], f.datos), 'cm'), 'Te pasas 10 cm');
});

prueba('alzado, planta y resumen: el rincón se ve en las dos paredes', () => {
  const f = vestidor({ rincon: 'L', lado2: 1000 }), [A, B] = f.datos.paredes;
  const gb = geometriaAlzado(f.datos, B, AJ), cuerposB = gb.piezas.filter(p => p.clase === 'cuerpo');
  igual(cuerposB.map(p => [p.x, p.w, p.texto]), [[0, 1000, ''], [1000, 800, 'C1 barra + cajonera']]);
  afirma(gb.piezas.some(p => p.clase === 'int_estante' && p.x < 1000), 'el trozo del rincón lleva sus estantes');
  igual(geometriaAlzado(f.datos, A, AJ).piezas.filter(p => p.clase === 'cuerpo').map(p => p.texto), ['C1 barra', 'C2 rincón estantes']);
  const g = geometriaPlanta(f.datos, {});
  igual(g.modulos.filter(m => m.tipo === 'cuerpo').map(m => [m.pared, m.ancho, !!m.sinTexto]), [['A', 500, false], ['A', 1000, false], ['B', 1000, true], ['B', 800, false]]);
  const t = textoResumen({ ficha: f, trabajo: { unidad: 'cm' }, ajustes: AJ });
  afirma(t.includes('- Cuerpos: 50 barra, rincón en L 100×100 estantes (sigue en B) (quedan 50 cm)'), t);
  afirma(t.includes('- Cuerpos: 80 barra + cajonera (quedan 60 cm)'), t);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });

prueba('en la ficha: un cuerpo de rincón en L hacia la pared B, con interior de estantes o barra', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="armario"]');
  await a.page.click('[data-acc="subtipo"][data-v="vestidor"]').catch(() => {});
  await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]'); await a.page.click('[data-acc="anadir-pared"]'); await a.page.waitForSelector('[data-pared="B"]');
  await a.page.click('[data-pared="A"] [data-acc="anadir-cuerpo"]');
  await a.page.click('[data-pared="A"] [data-acc="interior"][data-v="cajonera"]');
  await a.page.click('[data-pared="A"] [data-acc="rincon"] [data-v="L"], [data-pared="A"] [data-acc="rincon"][data-v="L"]');
  igual(await a.page.$$eval('[data-pared="A"] [data-acc="interior"]', b => b.map(x => x.dataset.v)), ['barra', 'estantes', 'otro']);
  await a.page.click('[data-pared="A"] [data-acc="interior"][data-v="barra"]');
  await a.page.fill('[data-pared="A"] [data-c="lado2"] input', '100'); await a.page.keyboard.press('Tab');
  await a.page.waitForTimeout(1200);
  const c = (await ficha(a)).datos.paredes[0].cuerpos[0];
  igual([c.rincon, c.gira, c.lado2, c.interior, c.interior2], ['L', 'der', 1000, 'barra', null]);
  igual(await a.page.$$eval('[data-pared="A"] [data-acc="interior"].on', b => b.map(x => x.dataset.v)), ['barra']);
  await a.page.setViewportSize({ width: 390, height: 844 }); await a.page.$eval('[data-pared="A"] [data-acc="rincon"]', n => n.scrollIntoView({ block: 'start' }));
  await a.page.screenshot({ path: process.env.CAPTURA || (await import('node:os')).tmpdir() + '/rincon.png' });
}));
fin();
