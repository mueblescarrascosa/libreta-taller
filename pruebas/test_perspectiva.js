import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { escenaPerspectiva, vistaPorDefecto, vistaDe, proyectar, ordenCajas } from '../docs/js/perspectiva.js';
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
  igual(e.cajas.length, 6); // 5 muebles y la encimera de fregadero + bajo, de una pieza
  const col = e.cajas.find(c => c.texto && /Columna frigo/.test(c.texto.texto));
  igual(Math.max(...col.caras.flatMap(c => c.pts.map(p => p[2]))), 1850);
  igual(e.sobre.filter(c => c.fill === '#bae6fd').length, 1);
});

prueba('sin largos no hay perspectiva', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [pared('A', null), pared('B', null)];
  igual(escenaPerspectiva(f.datos), null);
});

prueba('vista inicial: desde dentro de la habitación, la que enseña más muebles', () => {
  const e = escenaPerspectiva(cocina().datos), v = vistaPorDefecto(e);
  afirma(v.x > 0 && v.x < 3000 && v.y > 0 && v.y < 2500, JSON.stringify(v));
  const vistos = proyectar(e, v).textos.filter(t => t.clase === 'mueble').map(t => t.texto);
  ['Fregadero 80', 'Bajo 60', 'Columna frigo 60'].forEach(t => afirma(vistos.includes(t), t + ' no se ve: ' + vistos.join('|')));
  // Sin muebles, frente a la pared más larga.
  const vacia = fichaNueva('cocina', null, 't'); vacia.datos.paredes = [pared('A', 3000), pared('B', 2000), pared('C', 3000), pared('D', 2000)];
  igual(Math.round(vistaPorDefecto(escenaPerspectiva(vacia.datos)).ang), -90);
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

prueba('esquina con rinconero: nada se pisa, la encimera va seguida hasta la columna y con vuelo', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.alto_techo = 2400;
  const rin = Object.assign(mod('rinconero', 930), { gira: 'der', forma: 'L', lado2: 930 });
  f.datos.paredes = [pared('B', 2580, { bajos: [mod('bajo', 500), mod('placa', 800), rin] }), pared('C', 4020, { bajos: [mod('cajonero', 450), mod('fregadero', 800), mod('columna_hmo', 600)] })];
  const e = escenaPerspectiva(f.datos), bajas = e.cajas.filter(c => c.z0 < 10 && c.color !== 'pilar');
  const area = r => Math.abs(r.reduce((s, p, i) => s + p.x * r[(i + 1) % 4].y - r[(i + 1) % 4].x * p.y, 0)) / 2;
  // Recorte por SAT: ningún par de muebles del suelo se pisa más de 1 mm.
  const pisan = (A, B) => { for (const R of [A, B]) for (let i = 0; i < 4; i++) { const p = R[i], q = R[(i + 1) % 4], n = { x: -(q.y - p.y), y: q.x - p.x }, l = Math.hypot(n.x, n.y);
    const a = A.map(v => (v.x * n.x + v.y * n.y) / l), b = B.map(v => (v.x * n.x + v.y * n.y) / l);
    if (Math.max(...a) <= Math.min(...b) + 1 || Math.max(...b) <= Math.min(...a) + 1) return false; } return true; };
  for (let i = 0; i < bajas.length; i++) for (let j = i + 1; j < bajas.length; j++) afirma(!pisan(bajas[i].huella, bajas[j].huella), 'se pisan ' + i + ' y ' + j);
  const losas = e.cajas.filter(c => c.color === 'encimera');
  igual(losas.length, 2);
  // 62 de fondo (2 de vuelo); la de C empieza en el canto de la de B y acaba en la columna.
  igual(losas.map(l => Math.round(area(l.huella) / 620)).sort((a, b) => a - b), [1560, 2230]); // B: 50+80+93; C: de 62 (canto de B) a 218
  afirma(losas.every(l => l.z1 === 850 && l.z0 === 820), 'encimera de 3 cm a 85');
});

prueba('pilar: los muebles y la encimera se cajean alrededor, sin meterse en él', () => {
  const f = fichaNueva('cocina', null, 't');
  f.datos.alto_techo = 2400;
  f.datos.paredes = [pared('A', 3000, { bajos: [mod('bajo', 600), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto', 800)],
    elementos: [Object.assign(elementoNuevo('pilar'), { ref: 'izq', distancia: 700, ancho: 300, fondo: 250 })] }), pared('B', 2000)];
  const e = escenaPerspectiva(f.datos), pil = e.cajas.find(c => c.color === 'pilar'), resto = e.cajas.filter(c => c !== pil);
  afirma(pil, 'hay pilar');
  const pisan = (A, B) => { for (const R of [A, B]) for (let i = 0; i < 4; i++) { const p = R[i], q = R[(i + 1) % 4], n = { x: -(q.y - p.y), y: q.x - p.x }, l = Math.hypot(n.x, n.y);
    const a = A.map(v => (v.x * n.x + v.y * n.y) / l), b = B.map(v => (v.x * n.x + v.y * n.y) / l);
    if (Math.max(...a) <= Math.min(...b) + 1 || Math.max(...b) <= Math.min(...a) + 1) return false; } return true; };
  resto.forEach(c => afirma(!pisan(c.huella, pil.huella), c.color + ' se mete en el pilar'));
  // El fregadero (60-140) queda en 3 trozos: antes, después y delante del pilar; solo uno lleva el rótulo.
  afirma(e.cajas.filter(c => c.texto && /Fregadero/.test(c.texto.texto)).length === 1, 'un rótulo');
  afirma(e.cajas.filter(c => c.color === 'encimera').length >= 3, 'encimera cajeada en trozos');
});

prueba('orden de dibujo: lo de delante después, aunque sea más grande', () => {
  const caja = (x0, y0, x1, y1, z0, z1, color = 'bajo') => ({ huella: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], z0, z1, color, centro: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
  const C = [500, 3000, 1750];
  const columna = caja(-2000, 0, 2000, 600, 0, 2150), bajo = caja(0, 600, 600, 1200, 0, 820), alto = caja(-2000, 0, 2000, 350, 1450, 2150), pilar = caja(0, 0, 300, 900, 0, 2400, 'pilar');
  const o = ordenCajas([bajo, columna, alto, pilar], C);
  afirma(o.indexOf(columna) < o.indexOf(bajo), 'la columna de detrás antes que el bajo de delante');
  afirma(o.indexOf(pilar) < o.indexOf(bajo), 'el mueble metido en el pilar va por delante');
});

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
  // Qué dibujos van: se quita la perspectiva, se recuerda y se vuelve a poner.
  igual(await a.page.$$eval('[data-acc="parte-resumen"]', b => b.map(x => x.dataset.v)), ['planta', 'frente', 'perspectiva', 'instalaciones']);
  await a.page.click('[data-acc="parte-resumen"][data-v="perspectiva"]');
  await a.page.waitForFunction(() => !document.querySelector('.perspectiva-resumen'));
  afirma(await a.page.$('.planta-resumen'), 'la planta sigue');
  igual(await a.page.evaluate(() => localStorage.getItem('med-resumen-quitar')), '["perspectiva"]');
  await a.page.click('[data-acc="parte-resumen"][data-v="perspectiva"]');
  await a.page.waitForSelector('.perspectiva-resumen svg.perspectiva');
}));
fin();
