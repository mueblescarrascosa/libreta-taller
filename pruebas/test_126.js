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

prueba('campana piramidal sobre la placa sin alto encima y alto abierto sin puerta', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js');
  const { moduloNuevo, TIPOS_MODULO } = await import('../docs/js/modulos.js');
  const { campanasPared, geometriaAlzado } = await import('../docs/js/alzado.js');
  const { frenteModulo } = await import('../docs/js/frentes.js');
  const { articulo } = await import('../docs/js/presupuesto.js');
  const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
  const f = fichaNueva('cocina', null, 't'), A = Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [],
    bajos: [mod('bajo', 600), mod('placa', 800), mod('fregadero', 800)], altos: [mod('alto_abierto', 600), mod('hueco', 800), mod('alto', 800)] });
  f.datos.paredes = [A];
  const c = campanasPared(A, f.datos);
  igual(c.map(x => [x.desde, x.hasta, x.ancho]), [[600, 1400, 800]], 'campana del ancho de la placa, centrada');
  const g = geometriaAlzado(f.datos, A);
  afirma(g.piezas.some(p => p.tipo === 'campana' && p.trap), 'la pirámide en el alzado');
  A.altos[1] = mod('alto', 800);
  igual(campanasPared(A, f.datos), [], 'con un alto encima, no');
  A.altos[1] = mod('hueco', 800); f.datos.electro = [{ id: 'e', clave: 'campana', tipo: 'extraible', ancho: 600 }];
  igual(campanasPared(A, f.datos), [], 'extraíble: va en el alto de campana');
  f.datos.electro[0].tipo = 'decorativa';
  igual(campanasPared(A, f.datos)[0].ancho, 600, 'decorativa con su ancho');
  afirma(TIPOS_MODULO.altos.includes('alto_abierto'), 'alto abierto en la lista');
  const fr = frenteModulo('alto_abierto', 600, 1450, 2350);
  afirma(fr.length === 2 && fr.every(q => q.k === 'tablero'), 'sin puertas, dos baldas: ' + JSON.stringify(fr));
  igual(articulo(mod('alto_abierto', 600), f.datos).mo, '2 ESTANTES DECORATIVO');
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
  // Planta: símbolo de la placa con sus fuegos y del fregadero (dos senos en uno de 80).
  const planta = await a.page.evaluate(async () => {
    const { fichaNueva, paredNueva } = await import('./js/modelo.js'), { moduloNuevo } = await import('./js/modulos.js'), { geometriaPlanta, svgPlanta } = await import('./js/plano-vista.js');
    const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
    const f = fichaNueva('cocina', null, 't');
    f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [], bajos: [mod('placa', 600), mod('bajo', 600), mod('fregadero', 800)], altos: [] })];
    const svg = svgPlanta(geometriaPlanta(f.datos));
    const pl = svg.querySelector('[data-simbolo="placa"]'), fr = svg.querySelector('[data-simbolo="fregadero"]');
    return { placa: pl ? pl.querySelectorAll('circle').length : -1, senos: fr ? fr.querySelectorAll('polygon').length - 1 : -1, grifo: fr ? fr.querySelectorAll('circle').length : -1, otros: svg.querySelectorAll('[data-simbolo]').length };
  });
  igual(planta, { placa: 4, senos: 2, grifo: 3, otros: 2 }, 'símbolos en la planta');
  const tipo = await a.page.innerText('[data-apartado="1"]');
  afirma(/Gola en C \(entre cajones\)\s+7,3 cm/.test(tipo) && /Gola vertical \(columnas\)\s+4,7 cm/.test(tipo), 'gola en C y vertical: ' + tipo);
}));

await fin();
