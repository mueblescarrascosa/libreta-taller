// 1.36: el sitio de la campana en los altos se deja solo (centrado con la placa), campana de recirculación sin tubo,
// tipo y tamaño de la placa bajo una campana sin mueble de placa, «de la encimera a los altos» ⇄ «altos desde el suelo»,
// grupos al elegir muebles y la perspectiva que se maneja con el dedo en la ficha.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo, situarMuebles, cuadreAltos, electrosDeMuebles } from '../docs/js/modulos.js';
import { geometriaAlzado, salidaCampana, campanasPared, fijarCocinaTipo, alturasCocina } from '../docs/js/alzado.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, x = {}) => Object.assign(moduloNuevo(tipo), { ancho }, x);
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const solapa = (a, z) => a.desde < z[1] && a.hasta > z[0];

prueba('los altos dejan solos el sitio de la campana, centrado con la placa, con sus costados', () => {
  const p = pared('A', 3600, { bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 600), mod('alto', 600)] }), d = { paredes: [p] };
  const s = situarMuebles(p, d), z = [640 + 450 - 300 - 100, 640 + 450 + 300 + 100];   // placa de 64 a 154 (tras la regleta): centro 109
  afirma(s.altos.every(a => !solapa(a, z)), JSON.stringify(s.altos.map(a => [a.desde, a.hasta])));
  igual(s.remates.filter(r => r.fila === 'altos' && r.tipo === 'costado' && (Math.abs(r.hasta - z[0]) < 700 && r.desde < z[0] || r.desde === z[1])).length >= 1, true);
  igual(campanasPared(p, d)[0].pisan, [], 'nadie la pisa');
  afirma(/Quedan|te pasas|Cuadra/i.test(JSON.stringify(cuadreAltos(p, d))) || cuadreAltos(p, d).resto !== undefined);
  // Un hueco puesto a mano en ese sitio sobra: se quita (la campana ya tiene el suyo)
  p.altos = [mod('alto', 600), mod('hueco', 850), mod('alto', 300)];
  igual(situarMuebles(p, d).altos.map(a => a.m.tipo), ['alto', 'alto']);
  // Con «Campana decorativa» en los altos manda lo puesto a mano
  p.altos = [mod('alto', 600), mod('campana_deco', 800), mod('alto', 300)];
  igual(situarMuebles(p, d).altos.map(a => a.m.tipo), ['alto', 'campana_deco', 'alto']);
  // Placa extractora: no hay campana, los altos van seguidos
  p.altos = [mod('alto', 600), mod('alto', 600)]; p.bajos[1].extractor = 'recirculacion';
  igual(situarMuebles(p, d).altos.map(a => a.desde), [40, 640]);
});

prueba('campana de recirculación: sin tubo (por la salida de humos apuntada o elegida en el mueble)', () => {
  const placa = mod('placa', 600), p = pared('A', 3000, { bajos: [mod('bajo', 600), placa, mod('bajo', 600)], altos: [mod('alto', 600)],
    elementos: [{ id: 'h', tipo: 'humos', humos_forma: 'recirculacion', distancia: null, ref: 'der' }] }), d = { paredes: [p] };
  igual(salidaCampana(placa, p, d), 'recirculacion');
  igual(geometriaAlzado(d, p).tubos, [], 'sin tubo ni «falta apuntar la salida»');
  placa.campana_salida = 'exterior';
  afirma(geometriaAlzado(d, p).tubos.length === 1, 'a la calle: pide la salida');
  p.elementos = []; delete placa.campana_salida;
  igual(salidaCampana(placa, p, d), null);
});

prueba('campana sin mueble de placa: la placa de debajo con su tipo y tamaño pasa a Electrodomésticos', () => {
  const p = pared('A', 3000, { bajos: [mod('cajonero', 600), mod('cajonero', 600)], altos: [mod('alto', 300), mod('campana_deco', 900, { placa_tipo: 'induccion', placa_ancho: 800 })] });
  igual(electrosDeMuebles({ paredes: [p] }).get('placa'), { tipo: 'induccion', ancho: 800 });
  igual(electrosDeMuebles({ paredes: [Object.assign({}, p, { bajos: [mod('placa', 900, { placa_tipo: 'gas' })] })] }).get('placa').tipo, 'gas');
});

prueba('una cocina como la «Piso 1»: el hueco de la campana lo pone la placa, sin tubo (recirculación)', () => {
  const f = fichaNueva('cocina', null, 't'), d = f.datos;
  Object.assign(d, { alto_techo: 2870, alturas: { desde: 1420, grueso: 40, mueble: 700, zocalo: 150, alto_alto: 900 }, remates: { costado_columna: 'encimera' } });
  d.paredes = [pared('A', 3800, { bajos: [mod('escobero', 500), mod('lavadora', 600), mod('fregadero', 700), mod('bajo', 350), mod('placa', 600, { horno: true }), mod('bajo', 450), mod('columna_frigo', 600)],
    altos: [mod('alto', 600), mod('alto', 450), mod('alto_micro', 500), mod('hueco', 850), mod('alto', 300)],
    elementos: [{ id: 'h', tipo: 'humos', humos_forma: 'recirculacion', distancia: null, ref: 'der' }] })];
  fijarCocinaTipo(alturasCocina(d, null));
  const p = d.paredes[0], s = situarMuebles(p, d), pl = s.bajos.find(b => b.m.tipo === 'placa'), c = (pl.desde + pl.hasta) / 2;
  afirma(!s.altos.some(a => a.m.tipo === 'hueco'), 'el hueco a mano sobra');
  // El alto de 30 pasa al otro lado de la campana; el micro no cabe por 2 cm: lo dice el cuadre (te pasas)
  afirma(s.altos.find(a => a.m.tipo === 'alto' && a.m.ancho === 300).desde >= c + 400, JSON.stringify(s.altos.map(a => [a.m.tipo, a.desde, a.hasta])));
  afirma(cuadreAltos(p, d).resto < 0, JSON.stringify(cuadreAltos(p, d)));
  igual(geometriaAlzado(d, p).tubos, []);
  afirma(s.altos.every(a => a.hasta <= 3800), 'nada fuera de la pared');
});

const con = fn => async () => { const a = await abrir({ ancho: 412, tactil: true }); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: altos desde el suelo rellena «de la encimera a los altos»; grupos al añadir; perspectiva con el dedo', con(async a => {
  await crearTrabajo(a, 'Casa');
  await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.click('[data-acc="anadir-pared"]');
  await a.page.fill('[data-pared="A"] > .fila-largo [data-c="largo"] input', '3'); await a.page.keyboard.press('Tab');
  // Grupos: bajos, columnas y otros; los altos aparte
  igual(await a.page.$$eval('[data-pared="A"] [data-fila="bajos"] .et-grupo', l => l.map(x => x.textContent)), ['Bajos', 'Columnas', 'Semicolumnas', 'Otros']);
  afirma(await a.page.$('.fila-muebles.fila-altos'), 'los altos, separados');
  // Alturas: abrir Acabados si está plegado y poner «Altos desde el suelo»
  const desde = await a.page.$('input[data-acc="altura-desde"]');
  if (!(await desde.isVisible())) await a.page.$eval('input[data-acc="altura-desde"]', n => { const dt = n.closest('details'); if (dt) dt.open = true; });
  await a.page.fill('input[data-acc="altura-desde"]', '142'); await a.page.keyboard.press('Tab');
  await a.page.waitForTimeout(300);
  igual(await a.page.$eval('input[data-acc="altura-separacion"]', n => n.value), '53', 'se rellena: 142 − (15 + 70 + 4)');
  // Perspectiva: deslizar en horizontal sobre el dibujo gira la vista
  await a.page.waitForSelector('[data-acc="vista-3d"] svg.perspectiva');
  igual(await a.page.$eval('[data-acc="vista-3d"]', n => getComputedStyle(n).touchAction), 'pan-y');
  const ancho = await a.page.$eval('[data-acc="planta-vista"]', n => n.getBoundingClientRect().width);
  afirma(ancho > 300, 'en el móvil la planta pequeña es grande: ' + ancho);
}));

await fin();
