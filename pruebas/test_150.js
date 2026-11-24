// 1.50.0: relleno con medidas de 5 en 5 (sin cajoneras de 30 ni huecos sueltos), nada delante de una ventana (tampoco la
// campana), altos en todas las propuestas (cocina La Iruela), placa en la junta de dos cajoneras, isla y península con
// paso, interior de armarios y vestidores con sus consejos, y colores y tendencias (el archivo que leen las dos apps).
import fs from 'fs';
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { situarMuebles, moduloNuevo } from '../docs/js/modulos.js';
import { placasPared } from '../docs/js/alzado.js';
import { avisosObra } from '../docs/js/avisos-obra.js';
import { disenarCocina, aplicarDiseno, electroDeFicha } from '../docs/js/disenar.js';
import { mejorCocina, aplicarCambios } from '../docs/js/puntuacion.js';
import { rellenar, parejasEstrechas } from '../docs/js/relleno.js';
import { propuestasIsla, aplicarIsla } from '../docs/js/isla.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';
import { proponerInterior } from '../docs/js/interior.js';
import { consejosDiseno } from '../docs/js/consejos.js';
import { TENDENCIAS_BASE } from '../docs/js/tendencias.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const el = (tipo, distancia, extra) => Object.assign({ id: tipo + distancia, tipo, para: null, nombre: '', distancia, ref: 'izq', altura: 500, ancho: null, alto: null }, extra || {});
const mod = (tipo, ancho, extra) => Object.assign(moduloNuevo(tipo), { ancho }, extra || {});
const iruela = () => { const g = fichaNueva('cocina', null, 't'); g.datos = JSON.parse(fs.readFileSync(new URL('./datos_cocina_iruela.json', import.meta.url), 'utf8')); return g; };
const puesta = (f, pr) => { const d = JSON.parse(JSON.stringify(f.datos)); aplicarDiseno(d, pr, []); return d; };
const sala = (largos, elementos = {}) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = largos.map(([l, L]) => Object.assign(paredNueva([]), { letra: l, largo: L, elementos: elementos[l] || [], bajos: [], altos: [] })); return f; };

prueba('relleno: de 5 en 5, cajoneras de 40 o más, y 30 + 40 es una de 70', () => {
  igual(rellenar(700, 'cajonero').piezas, [{ tipo: 'cajonero', ancho: 700 }]);
  igual(rellenar(300, 'cajonero').piezas, [{ tipo: 'bajo', ancho: 300 }], 'con 30, de puertas');
  [550, 1250, 1830, 2400, 3010].forEach(L => {
    const r = rellenar(L, 'cajonero');
    afirma(r.piezas.every(p => p.ancho % 50 === 0 && (p.tipo !== 'cajonero' || p.ancho >= 400) && p.ancho <= 900), L + ': ' + JSON.stringify(r.piezas));
    afirma(r.sobra < 50, 'sobra menos de 5 cm: ' + r.sobra);
  });
  igual(parejasEstrechas([mod('cajonero', 300), mod('cajonero', 400), mod('placa', 600)]).map(x => [x.i, x.ancho, x.tipo]), [[0, 700, 'cajonero']]);
  igual(parejasEstrechas([mod('bajo', 300), mod('fregadero', 800)]), [], 'un bajo de 30 solo, bien');
});
prueba('la mejor combinación junta una cajonera de 30 con la de 40', () => {
  const f = sala([['A', 3000]]); f.datos.paredes[0].bajos = [mod('placa', 600), mod('cajonero', 300), mod('cajonero', 400), mod('fregadero', 800)];
  const r = mejorCocina(f), x = r.pasos.find(q => q.op.op === 'juntar');
  afirma(x && /juntar el cajonero de 30 y el cajonero de 40 en un cajonero de 70/.test(x.texto), JSON.stringify(r.pasos.map(q => q.texto)));
  igual(aplicarCambios(f, [x.op]).datos.paredes[0].bajos.map(m => m.tipo + m.ancho), ['placa600', 'cajonero700', 'fregadero800']);
});
prueba('la campana delante de una ventana es un choque (la placa nunca bajo la ventana)', () => {
  const f = sala([['A', 3000]], { A: [el('ventana', 900, { ancho: 1000, alto: 1000, altura: 1000 })] });
  f.datos.paredes[0].bajos = [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)]; f.datos.paredes[0].altos = [mod('alto', 600)];
  afirma(avisosObra(f, 'mm').some(a => /La campana de la pared A tapa la ventana/.test(a.texto)), JSON.stringify(avisosObra(f, 'mm').map(a => a.texto)));
});
prueba('cocina La Iruela: todas con altos, ninguna tapa la ventana, sin cajoneras de 30 ni huecos sueltos', () => {
  const g = iruela(), r = disenarCocina(g, [{ pared: 'A' }], electroDeFicha(g.datos));
  igual(r.propuestas.length, 3);
  r.propuestas.forEach(pr => {
    const d = puesta(g, pr), p = d.paredes[0], s = situarMuebles(p, d), f = { tipo: 'cocina', datos: d };
    afirma(s.altos.some(a => a.m.tipo === 'alto'), 'con altos: ' + pr.texto);
    afirma(!avisosObra(f, 'mm').some(a => /tapa la ventana/.test(a.texto)), 'no tapa la ventana: ' + pr.texto);
    afirma(p.bajos.every(m => m.tipo !== 'cajonero' || m.ancho >= 400), 'cajoneras de 40 o más: ' + pr.texto);
    afirma(p.bajos.every(m => m.tipo !== 'hueco'), 'sin huecos: ' + pr.texto);
    afirma(p.bajos.every(m => m.ancho % 50 === 0), 'de 5 en 5: ' + pr.texto);
    // El frigorífico de libre instalación lleva su alto encima
    afirma(s.altos.some(a => a.m.tipo === 'alto_frigo'), 'alto sobre el frigo: ' + JSON.stringify(s.altos.map(a => a.m.tipo)));
    // Ningún alto en la ventana (de 3,00 a 4,50) ni encima de la campana
    afirma(s.altos.filter(a => a.m.tipo !== 'hueco').every(a => a.hasta <= 3000 + 1 || a.desde >= 4500 - 1), JSON.stringify(s.altos.map(a => [a.m.tipo, a.desde, a.hasta])));
  });
});
prueba('placa en la junta de dos cajoneras: centrada bajo los humos y con su campana', () => {
  const f = sala([['A', 4000]], { A: [el('desague', 1000), el('humos', 3200, { altura: null })] });
  const r = disenarCocina(f, [{ pared: f.datos.paredes[0].id }], ['placa', 'campana', 'lavavajillas'], { soloJunta: true });
  const pr = r.propuestas.find(x => !x.reforma); afirma(pr, 'una que respeta');
  afirma(/placa en la junta de dos cajoneras/.test(pr.texto.join(' ')), pr.texto.join(' '));
  const d = puesta(f, pr), pl = placasPared(d.paredes[0], d)[0];
  afirma(pl && Math.abs((pl.desde + pl.hasta) / 2 - 3200) <= 60, 'placa bajo los humos: ' + JSON.stringify(pl));
  const s = situarMuebles(d.paredes[0], d), junta = s.bajos.find(b => b.m.tipo === 'cajonero' && Math.abs(b.hasta - (pl.desde + pl.hasta) / 2) <= 1);
  afirma(junta, 'en la junta de dos cajoneras: ' + JSON.stringify(s.bajos.map(b => [b.m.tipo, b.desde, b.hasta])));
  afirma(d.paredes[0].altos.some(a => a.tipo === 'campana_deco'), 'con su campana');
});
prueba('isla: solo con 90 o más de paso alrededor y nunca delante de la puerta; península al final de la cocina', () => {
  const puerta = { C: [el('puerta', 1500, { ancho: 800, alto: 2030, altura: 0 })] };
  const f = sala([['A', 4000], ['B', 3500], ['C', 4000], ['D', 3500]], puerta);
  const r = disenarCocina(f, [{ pared: f.datos.paredes[0].id }], ['frigo', 'horno', 'placa', 'campana', 'lavavajillas']);
  const o = r.propuestas[0].islas.opciones.find(x => x.tipo === 'isla');
  afirma(o && o.paso >= 900 && o.largo >= 1200, JSON.stringify(r.propuestas[0].islas));
  // Detrás de la isla hasta la pared C: al menos 90
  afirma(3500 - (o.separacion + o.fondo + o.vuelo) >= 900, 'paso por detrás');
  const d = puesta(f, r.propuestas[0]); aplicarIsla(d, o);
  igual(d.islas.length, 1); afirma(geometriaPlanta(d).islas.length === 1, 'se dibuja en la planta');
  // Sala estrecha: no cabe
  const g = sala([['A', 4000], ['B', 2600], ['C', 4000], ['D', 2600]]);
  const rg = disenarCocina(g, [{ pared: g.datos.paredes[0].id }], ['frigo', 'placa', 'lavavajillas']);
  afirma(!rg.propuestas[0].islas.opciones.some(x => x.tipo === 'isla'), 'sin isla en 2,60');
  // Cocina en un tramo de la pared (hasta 3,30): península al final, con paso por delante
  const h = sala([['A', 4500], ['B', 3600], ['C', 4500], ['D', 3600]]);
  const rh = disenarCocina(h, [{ pared: h.datos.paredes[0].id, desde: null, hasta: 3300 }], ["frigo", "placa", "lavavajillas"]);
  const pen = rh.propuestas.flatMap(p => p.islas.opciones).find(x => x.tipo === 'peninsula');
  afirma(pen && pen.paso >= 900 && pen.distancia >= 3200, JSON.stringify(rh.propuestas.map(p => p.islas)));
  // Sin planta que cierre (una pared sola): lo dice
  const sola = sala([['A', 4000]]), rs = disenarCocina(sola, [{ pared: sola.datos.paredes[0].id }], ['placa', 'lavavajillas']);
  igual(rs.propuestas[0].islas.opciones, []);
});
prueba('proponer el interior: cuerpos de 45 a 90 de 5 en 5, con sitio para colgar y para doblar', () => {
  const r = proponerInterior({ ancho: 2600, alto: 2500, fondo: 600 });
  igual(r.cuerpos.length, 3); afirma(r.cuerpos.every(c => c.ancho % 50 === 0 && c.ancho >= 450 && c.ancho <= 900), JSON.stringify(r.cuerpos.map(c => c.ancho)));
  igual(r.cuerpos.reduce((s, c) => s + c.ancho, 0), 2600);
  afirma(r.cuerpos.some(c => c.interior === 'barra' && !c.interior2), 'colgar largo');
  afirma(r.cuerpos.some(c => [c.interior, c.interior2].includes('cajonera')), 'cajonera');
  afirma(r.texto.some(t => /altillo/.test(t)), 'altillo con 2,50');
  const bajo = proponerInterior({ ancho: 1800, alto: 1900, fondo: 600 });
  afirma(!bajo.cuerpos.some(c => c.interior === 'doble_barra'), 'sin doble barra con 1,90');
  const poco = proponerInterior({ ancho: 1600, alto: 2400, fondo: 600, corredera: true });
  afirma(poco.cuerpos.every(c => !/barra/.test(c.interior)), 'con correderas y 60 de fondo no cabe la percha: ' + JSON.stringify(poco.cuerpos));
});
prueba('consejos de interior: doble barra sin altura, barra en cuerpo estrecho, baldas largas y todo para colgar', () => {
  const f = fichaNueva('armario', 'abatible', 't'); Object.assign(f.datos, { ancho_medio: 2400, alto_izq: 1900, alto_der: 1900, fondo: 600,
    cuerpos: [{ id: 'c1', ancho: 400, interior: 'barra' }, { id: 'c2', ancho: 1000, interior: 'doble_barra' }, { id: 'c3', ancho: 1000, interior: 'barra' }] });
  const t = consejosDiseno(f).map(c => c.texto).join(' | ');
  afirma(/Cuerpo 2: doble barra con 190 cm de alto/.test(t), t);
  afirma(/Cuerpo 1: barra en un cuerpo de 40 cm/.test(t), t);
  afirma(/Todo es para colgar/.test(t), t);
  f.datos.cuerpos = [{ id: 'c1', ancho: 1000, interior: 'estantes', interior2: 'cajonera' }];
  afirma(/baldas de 100 cm/.test(consejosDiseno(f).map(c => c.texto).join(' ')), 'baldas largas');
});
prueba('tendencias: el archivo y la copia de reserva son iguales y las combinaciones valen para Presupuestos', () => {
  const j = JSON.parse(fs.readFileSync(new URL('../docs/api/tendencias.json', import.meta.url), 'utf8'));
  igual(j, TENDENCIAS_BASE, 'tendencias.js lleva la misma copia que api/tendencias.json');
  const FAM = ['blanco', 'crema', 'gris_claro', 'gris', 'oscuro', 'negro', 'madera_clara', 'madera_media', 'madera_oscura', 'verde', 'azul', 'terracota', 'marmol', 'piedra'];
  j.combinaciones.forEach(c => {
    afirma(c.b.f.every(x => FAM.includes(x)) && (c.a === '=' || c.a === 'claro' || c.a.f.every(x => FAM.includes(x))) && c.e.every(x => FAM.includes(x)), 'familias de Presupuestos: ' + c.id);
    afirma(c.muestras.length === 3 && c.muestras.every(x => /^#[0-9a-f]{6}$/i.test(x)), 'muestras: ' + c.id);
  });
  afirma(j.fuentes.length >= 5 && j.fuentes.every(f => /^https:\/\//.test(f.url)), 'con sus fuentes');
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: proponer el interior de un armario y ponerlo; la guía con normas y tendencias', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="abatible"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.fill('[data-acc="ancho_medio"]', '2000');
  await a.page.click('[data-acc="proponer-interior"]');
  await a.page.waitForSelector('[data-acc="interior-propuesto"] li');
  await a.page.click('[data-acc="poner-interior"]');
  await a.page.waitForFunction(() => document.querySelectorAll('[data-cuerpo]').length >= 3);
  await a.page.evaluate(() => { location.hash = '#/guia'; }); await a.page.waitForSelector('[data-acc="tendencias"] [data-acc="combinacion-tendencia"]');
  const g = await a.page.evaluate(() => [...document.querySelectorAll('.guia-apartado h2')].map(x => x.textContent));
  afirma(g.some(t => /Normas de diseño/.test(t)) && g.some(t => /Colores y tendencias/.test(t)), g.join(' | '));
}));
prueba('app: diseñar con isla y aplicarla', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  // Cuatro paredes: A 4 m, B 3,5, C 4, D 3,5 (en escuadra)
  const largos = [['A', '4'], ['B', '3,5'], ['C', '4'], ['D', '3,5']];
  for (let i = 0; i < largos.length; i++) {
    if (i > 0) await a.page.click('[data-acc="anadir-pared"]');
    await a.page.fill('[data-pared="' + largos[i][0] + '"] > .fila-largo > [data-c="largo"] input', largos[i][1]);
  }
  await a.page.waitForSelector('[data-acc="disenar-pared"][data-v="D"]');
  for (const l of ['B', 'C', 'D']) if (await a.page.isChecked('[data-acc="disenar-pared"][data-v="' + l + '"]')) await a.page.uncheck('[data-acc="disenar-pared"][data-v="' + l + '"]');
  if (!(await a.page.isChecked('[data-acc="disenar-pared"][data-v="A"]'))) await a.page.check('[data-acc="disenar-pared"][data-v="A"]');
  await a.page.click('[data-acc="disenar"]');
  await a.page.waitForSelector('[data-acc="isla-diseno"]');
  await a.page.check('[data-acc="isla-diseno"][data-v="0-0"]');
  await a.page.click('[data-acc="aplicar-diseno"][data-v="0"]');
  await a.page.waitForFunction(() => !document.querySelector('[data-acc="propuesta-diseno"]'));
  await a.page.waitForSelector('[data-isla="isla"]', { state: 'attached' });
}));
fin();
