// 1.26: consejos para armarios, Ajustes en pestañas, índice y números seguidos en la guía, y textos más claros
// («por subir», botones del resumen).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva } from '../docs/js/modelo.js';
import { consejosDiseno } from '../docs/js/consejos.js';
import { abrir, entrar } from './arnes.js';

prueba('armario: fondo para colgar, barra larga y puertas u hojas demasiado anchas', () => {
  const c = fichaNueva('armario', 'corredera', 't'), t = f => consejosDiseno(f).map(x => x.texto);
  Object.assign(c.datos, { ancho_medio: 2400, fondo: 600, hojas: 2, cuerpos: [{ id: 'a', ancho: 1200, interior: 'barra' }] });
  igual(t(c), ['Con 60 cm de fondo y puertas correderas la percha no cabe de frente', 'Cuerpo 1: barra de 120 cm sin apoyo', 'Hojas correderas de unos 120 cm']);
  Object.assign(c.datos, { fondo: 650, hojas: 3, cuerpos: [{ id: 'a', ancho: 900, interior: 'barra' }] });
  igual(t(c), [], 'con 65 de fondo y tres hojas, bien');
  const b = fichaNueva('armario', 'abatible', 't');
  Object.assign(b.datos, { ancho_medio: 1500, fondo: 500, puertas: 2, cuerpos: [{ id: 'x', ancho: 700, interior: 'cajonera' }] });
  igual(t(b), ['Puertas de unos 75 cm de ancho'], 'sin barra, el fondo no avisa; dos puertas para 150, sí');
  igual(consejosDiseno(b)[0].grupo, 'armario');
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('ajustes en pestañas e índice de la guía', con(async a => {
  await a.page.click('[data-acc="ajustes"]'); await a.page.waitForSelector('[data-pantalla="ajustes"]');
  const general = await a.page.evaluate(() => ({ on: document.querySelector('[data-acc="pestana"].on').dataset.v, unidad: !!document.querySelector('[data-acc="unidad-pred"]'),
    listas: document.querySelectorAll('[data-lista]').length, copia: !!document.querySelector('[data-acc="copia-seguridad"]') }));
  igual(general, { on: 'general', unidad: true, listas: 0, copia: true }, 'General: lo básico, sin las listas');
  await a.page.click('[data-acc="pestana"][data-v="puertas"]'); await a.page.waitForSelector('[data-acc="pestana"][data-v="puertas"].on');
  const puertas = await a.page.evaluate(() => ({ anchos: !!document.querySelector('[data-lista="puerta_anchos"]'), modulos: !!document.querySelector('[data-lista="modulo_anchos"]'), unidad: !!document.querySelector('[data-acc="unidad-pred"]') }));
  igual(puertas, { anchos: true, modulos: false, unidad: false });
  await a.page.click('[data-acc="pestana"][data-v="todo"]'); await a.page.waitForSelector('[data-acc="pestana"][data-v="todo"].on');
  afirma(await a.page.evaluate(() => !!document.querySelector('[data-lista="modulo_anchos"]') && !!document.querySelector('[data-lista="puerta_anchos"]') && !!document.querySelector('[data-acc="unidad-pred"]')), 'ver todo');
  await a.page.evaluate(() => { location.hash = '#/guia'; }); await a.page.waitForSelector('[data-acc="indice-guia"]');
  const g = await a.page.evaluate(() => ({ titulos: [...document.querySelectorAll('.guia-apartado h2')].map(x => x.textContent), indice: document.querySelectorAll('[data-acc="ir-apartado"]').length }));
  afirma(g.titulos[0] === '1. Reglas de prioridad' && g.titulos.every((t, i) => t.startsWith((i + 1) + '. ')), 'números seguidos: ' + g.titulos.join(' | '));
  igual(g.indice, g.titulos.length, 'un enlace por apartado');
}));

await fin();
