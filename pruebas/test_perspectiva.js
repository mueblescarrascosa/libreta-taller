import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { escenaPerspectiva, vistaPorDefecto, vistaDe, proyectar } from '../docs/js/perspectiva.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [] }, extra);
function cocina() {
  const f = fichaNueva('cocina', null, 't');
  f.datos.alto_techo = 2600;
  f.datos.paredes = [pared('A', 3000, { bajos: [mod('columna_frigo', 600), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto_frigo', 600), mod('alto', 800)] }),
    pared('B', 2500, { elementos: [Object.assign(elementoNuevo('ventana', 'izq'), { distancia: 800, ancho: 1000, altura: 1000, alto: 1100 })] }),
    pared('C', 3000), pared('D', 2500)];
  return f;
}

prueba('escena: paredes, muebles en caja, ventana sobre su pared y el frigo con su alto encima', () => {
  const e = escenaPerspectiva(cocina().datos);
  igual([e.k, e.techo, e.paredes.length], [1, 2600, 4]);
  igual(e.cajas.length, 5);
  const col = e.cajas.find(c => c.texto && /Columna frigo/.test(c.texto.texto));
  igual(Math.max(...col.caras.flatMap(c => c.pts.map(p => p[2]))), 1850);
  igual(e.sobre.filter(c => c.fill === '#bae6fd').length, 1);
});

prueba('sin largos no hay perspectiva', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [pared('A', null), pared('B', null)];
  igual(escenaPerspectiva(f.datos), null);
});

prueba('vista inicial: frente a la pared con más muebles, dentro de la habitación y mirándola', () => {
  const e = escenaPerspectiva(cocina().datos), v = vistaPorDefecto(e);
  afirma(v.x > 0 && v.x < 3000 && v.y > 1200 && v.y < 2500, JSON.stringify(v));
  igual(Math.round(v.ang), -90);
  // Una vista guardada fuera de la habitación no vale.
  igual(vistaDe(e, { x: 99999, y: 0, ang: 0 }).ang, v.ang);
  igual(vistaDe(e, { x: 100, y: 100, ang: 45 }).ang, 45);
});

prueba('proyección: se ven los muebles de A con su rótulo; mirando al otro lado, no', () => {
  const e = escenaPerspectiva(cocina().datos), v = vistaPorDefecto(e);
  const r = proyectar(e, v);
  afirma(r.textos.some(t => t.texto === 'Fregadero 80'), r.textos.map(t => t.texto).join('|'));
  afirma(r.poligonos.length > 10);
  const otra = proyectar(e, Object.assign({}, v, { ang: 90 }));
  afirma(!otra.textos.some(t => t.texto === 'Fregadero 80'));
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const ficha = a => a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });

prueba('en la ficha: tocar y arrastrar en la planta pequeña guarda dónde estás; pantalla completa; sale en el resumen', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  for (let i = 0; i < 4; i++) await a.page.click('[data-acc="anadir-pared"]');
  for (const [l, v] of [['A', '3'], ['B', '2,5'], ['C', '3'], ['D', '2,5']]) {
    await a.page.fill(`[data-pared="${l}"] > .fila-largo [data-c="largo"] input`, v); await a.page.keyboard.press('Tab');
  }
  await a.page.waitForSelector('[data-acc="vista-3d"] svg.perspectiva');
  await a.page.$eval('[data-acc="planta-vista"]', n => n.scrollIntoView({ block: 'center' }));
  const p = await (await a.page.$('[data-acc="planta-vista"]')).boundingBox();
  await a.page.mouse.move(p.x + p.width * 0.3, p.y + p.height * 0.3); await a.page.mouse.down();
  await a.page.mouse.move(p.x + p.width * 0.7, p.y + p.height * 0.3, { steps: 6 }); await a.page.mouse.up();
  await a.page.waitForTimeout(1200);
  const f = await ficha(a);
  afirma(f.datos.vista && Math.abs(f.datos.vista.ang) < 15, JSON.stringify(f.datos.vista));
  await a.page.click('[data-acc="perspectiva-grande"]');
  await a.page.waitForSelector('[data-acc="capa-perspectiva"] svg.perspectiva');
  await a.page.screenshot({ path: process.env.CAPTURA || (await import('node:os')).tmpdir() + '/perspectiva_grande.png' });
  await a.page.click('[data-acc="cerrar-perspectiva"]');
  igual(await a.page.$('[data-acc="capa-perspectiva"]'), null);
  await a.page.click('[data-acc="terminar"]'); await a.page.waitForSelector('.perspectiva-resumen svg.perspectiva');
}));
fin();
