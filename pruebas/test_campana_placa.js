// 1.29: placa y campana de 60 si no se dice otra (con botones para cambiarlas), placa dibujada debajo de la campana
// aunque no haya mueble de placa (encima de dos cajoneras), centro de la campana desde la pared más cercana y notas
// que crecen con el texto.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { campanasPared, placasPared, centrosCampana, textoCentroCampana, anchoPlaca, anchoCampana, geometriaAlzado } from '../docs/js/alzado.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, x) => Object.assign(moduloNuevo(tipo), { ancho }, x || {});
const cocina = (paredes, cerrada = false) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; if (cerrada) f.datos.plano = { cerrada: true }; return f; };
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);

prueba('placa y campana: 60 si no se dice; lo del mueble manda sobre Electrodomésticos', () => {
  igual([anchoPlaca(null, {}), anchoCampana(null, {})], [600, 600]);
  const d = { electro: [{ clave: 'placa', ancho: 800 }, { clave: 'campana', ancho: 900 }] };
  igual([anchoPlaca(null, d), anchoCampana(null, d)], [800, 900], 'los de Electrodomésticos');
  igual([anchoPlaca({ placa_ancho: 700 }, d), anchoCampana({ campana_ancho: 1200 }, d)], [700, 1200], 'los del mueble');
  // Mueble de placa de 90 sin nada dicho: placa de 60 y campana de 60, centradas.
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)] }), f = cocina([A]);
  igual(placasPared(A, f.datos).map(p => [p.desde, p.hasta]), [[750, 1350]]);
  igual(campanasPared(A, f.datos).map(c => [c.desde, c.hasta]), [[750, 1350]]);
  A.bajos[1].placa_ancho = 900; A.bajos[1].campana_ancho = 900;
  igual(placasPared(A, f.datos)[0].ancho, 900, 'la elegida, sin salirse del mueble');
  igual(campanasPared(A, f.datos)[0].ancho, 900);
  // Hueco de campana decorativa de 90: campana de 60 (antes se ponía la más grande que cupiera).
  A.bajos[1].campana_ancho = null; A.altos = [mod('alto', 600), mod('campana_deco', 900), mod('alto', 600)];
  igual(campanasPared(A, f.datos).map(c => c.ancho), [600]);
});

prueba('campana sobre dos cajoneras: se dibuja la placa centrada debajo', () => {
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('cajonero', 600), mod('cajonero', 600)], altos: [mod('alto', 900), mod('campana_deco', 600), mod('alto', 600)] }), f = cocina([A]);
  igual(placasPared(A, f.datos).map(p => [p.desde, p.hasta, !!p.campana]), [[900, 1500, true]], 'centrada con la campana, sobre la junta de las cajoneras');
  A.altos[1].placa_ancho = 800;
  igual(placasPared(A, f.datos).map(p => [p.desde, p.hasta]), [[800, 1600]], 'con su tamaño');
  // Alto campana (extraíble o integrada) también.
  A.altos[1] = mod('alto_campana', 600);
  igual(placasPared(A, f.datos).map(p => [p.desde, p.hasta]), [[900, 1500]], 'debajo del alto campana');
  // Si ya hay un mueble de placa debajo, no se pone otra.
  A.bajos = [mod('bajo', 900), mod('placa', 600), mod('bajo', 600)];
  igual(placasPared(A, f.datos).map(p => !!p.mueble), [true], 'solo la del mueble');
  // Sin bajos debajo (columna o nada), no hay placa.
  A.bajos = [mod('columna_hmo', 600), mod('columna_frigo', 600)]; A.altos = [mod('campana_deco', 600)];
  igual(placasPared(A, f.datos), [], 'sobre columnas, no');
  A.bajos = [mod('bajo', 600), mod('fregadero', 800)]; A.altos = [mod('alto', 600), mod('campana_deco', 600)];
  igual(placasPared(A, f.datos), [], 'sobre el fregadero, no');
});

prueba('centro de la campana desde la punta de la pared más cercana, con la letra de la pared de al lado', () => {
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 600), mod('bajo', 600)] }), B = pared('B', 2000), f = cocina([A, B]);
  let c = centrosCampana(A, f.datos);
  igual(c.map(x => [x.lado, x.dist, x.letra]), [['izq', 900, null]], 'a la izquierda no hay pared');
  igual(textoCentroCampana(c[0]), 'Centro de la campana a 90 cm del lado izquierdo');
  A.bajos = [mod('bajo', 1800), mod('placa', 600)];
  c = centrosCampana(A, f.datos);
  igual(c.map(x => [x.lado, x.dist, x.letra]), [['der', 900, 'B']], 'más cerca de la derecha, donde está B');
  igual(textoCentroCampana(c[0]), 'Centro de la campana a 90 cm de la pared B (derecha)');
  // Cocina cerrada: la izquierda de A es la última pared.
  const g = cocina([pared('A', 3000, { bajos: [mod('bajo', 300), mod('placa', 600)] }), pared('B', 2000), pared('C', 3000), pared('D', 2000)], true);
  igual(centrosCampana(g.datos.paredes[0], g.datos).map(x => [x.lado, x.dist, x.letra]), [['izq', 600, 'D']]);
  // El alto campana y la decorativa en su hueco también.
  A.bajos = [mod('bajo', 600), mod('cajonero', 1200)]; A.altos = [mod('alto', 900), mod('alto_campana', 600)];
  igual(centrosCampana(A, f.datos).map(x => x.dist), [1200]);
  A.altos = [mod('alto', 600), mod('campana_deco', 900)];
  igual(centrosCampana(A, f.datos).map(x => x.dist), [1050]);
  // En el alzado, la cota; en el texto del resumen, la línea.
  const z = geometriaAlzado(f.datos, A);
  igual(z.centrosCampana.map(x => [x.x, x.desde, x.texto]), [[1050, 0, 'centro a 105']]);
  afirma(textoResumen({ ficha: f, trabajo: null, ajustes: AJUSTES_FABRICA }).includes('Centro de la campana a 105 cm del lado izquierdo'), textoResumen({ ficha: f, trabajo: null, ajustes: AJUSTES_FABRICA }));
});

prueba('consejos: usan el tamaño de placa del mueble y avisan si la campana es más estrecha que la placa', async () => {
  const { consejosDiseno } = await import('../docs/js/consejos.js'), t = f => consejosDiseno(f).map(c => c.texto);
  const A = pared('A', 3600, { bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 900), mod('alto', 600)] }), f = cocina([A]);
  A.altos[1] = mod('alto_campana', 600);
  afirma(t(f).includes('Mueble de placa de 90 cm con campana de 60 cm (pared A)'), 'sin decir la placa: ' + t(f).join(' | '));
  A.bajos[1].placa_ancho = 600;
  afirma(!t(f).some(x => /campana/i.test(x)), 'placa de 60 dicha en el mueble: bien. ' + t(f).join(' | '));
  A.bajos[1].placa_ancho = 900;
  afirma(t(f).includes('Campana de 60 cm para una placa de 90 cm (pared A)'), t(f).join(' | '));
  // Decorativa sobre dos cajoneras con placa de 80 debajo.
  A.bajos = [mod('bajo', 600), mod('cajonero', 600), mod('cajonero', 600)]; A.altos = [mod('alto', 900), mod('campana_deco', 600, { placa_ancho: 800 })];
  afirma(t(f).includes('Campana de 60 cm para una placa de 80 cm (pared A)'), t(f).join(' | '));
  A.altos[1].placa_ancho = null;
  afirma(!t(f).some(x => /Campana de/.test(x)), 'de 60 y 60, bien');
  // La placa sobre cajoneras cuenta para el sitio a los lados: pegada a la columna, avisa.
  A.bajos = [mod('columna_frigo', 600), mod('cajonero', 600), mod('cajonero', 600), mod('bajo', 600)]; A.altos = [mod('campana_deco', 600)];
  afirma(t(f).some(x => /^Placa junto a la columna frigo por la izquierda/.test(x)), t(f).join(' | '));
  A.altos = [mod('alto', 600), mod('campana_deco', 600)];
  afirma(!t(f).some(x => /^Placa junto/.test(x)), 'con 60 de encimera a la izquierda, bien: ' + t(f).join(' | '));
});

prueba('tubo de humos: metros y codos hasta la salida, cajear si queda a un lado (más de 10 cm)', async () => {
  const { consejosDiseno } = await import('../docs/js/consejos.js'), { textoTubo } = await import('../docs/js/alzado.js');
  const humos = (distancia, x) => Object.assign({ id: 'h' + distancia, tipo: 'humos', ref: 'izq', distancia, altura: 2200 }, x || {});
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('placa', 600), mod('bajo', 600)], elementos: [humos(900)] }), f = cocina([A]);
  const tubos = () => geometriaAlzado(f.datos, A).tubos;
  // Campana sobre los 150 (154 con la encimera a 89) y 30 de alto: el tubo empieza a 184; la salida a 220 encima.
  igual(tubos().map(t => [t.de, t.tubo, t.codos, t.cajear]), [['campana', 360, 1, false]]);
  igual(textoTubo(tubos()[0]), 'Tubo de la campana: unos 0,4 m y 1 codo.');
  A.elementos = [humos(1400)];
  igual(tubos().map(t => [t.tubo, t.codos, t.cajear, t.dx]), [[860, 2, true, 500]]);
  igual(textoTubo(tubos()[0]), 'Tubo de la campana: unos 0,9 m y 2 codos. Hay que cajearlo: la salida queda 50 cm a la derecha del centro.');
  afirma(consejosDiseno(f).some(c => c.texto === 'Hay que cajear el tubo de la campana (pared A): unos 0,9 m y 2 codos' && /50 cm a la derecha/.test(c.porque)), consejosDiseno(f).map(c => c.texto).join(' | '));
  A.elementos = [humos(980)];
  igual(tubos()[0].cajear, false, '8 cm de lado: vale');
  A.elementos = [humos(900, { humos_sale: 'techo', altura: null })];
  igual(textoTubo(tubos()[0]), 'Tubo de la campana: unos 0,7 m y sin codos (sale por el techo).');
  A.elementos = [];
  igual(textoTubo(tubos()[0]), 'Tubo de la campana: falta apuntar la salida de humos en esta pared.');
  afirma(geometriaAlzado(f.datos, A).piezas.filter(p => p.clase === 'f_placa').length === 1, 'la placa en el alzado');
  // Placa extractora a la calle: sin campana; el tubo a ras de suelo hasta la salida.
  A.bajos[1].extractor = 'exterior'; A.elementos = [humos(1500, { altura: 100 })];
  igual(campanasPared(A, f.datos), [], 'sin campana encima');
  igual(tubos().map(t => [t.de, t.tubo, t.codos, t.cajear]), [['placa', 900, 2, true]]);
  igual(textoTubo(tubos()[0]), 'Tubo de la placa extractora (a ras de suelo, por detrás del zócalo): unos 0,9 m y 2 codos. La salida queda 60 cm a la derecha del centro.');
  A.elementos = [humos(900)];
  afirma(consejosDiseno(f).some(c => c.texto === 'Salida de humos alta para una placa extractora (pared A)'), 'salida a 2,20 para una placa extractora');
  A.elementos = [];
  afirma(consejosDiseno(f).some(c => c.texto === 'Falta la salida de humos de la placa extractora (pared A)'));
  // Recirculación: sin tubo.
  A.bajos[1].extractor = 'recirculacion';
  igual([campanasPared(A, f.datos).length, tubos().length], [0, 0]);
  const txt = textoResumen({ ficha: f, trabajo: null, ajustes: AJUSTES_FABRICA });
  afirma(txt.includes('Placa extractora 60') && txt.includes('Placa extractora con recirculación: sin salida de humos'), txt);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };

prueba('planta y perspectiva: placa de 60 en un mueble de 90 y placa bajo la campana sobre cajoneras', con(async a => {
  const r = await a.page.evaluate(async () => {
    const { fichaNueva, paredNueva } = await import('./js/modelo.js'), { moduloNuevo } = await import('./js/modulos.js'), { geometriaPlanta, svgPlanta } = await import('./js/plano-vista.js');
    const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
    const f = fichaNueva('cocina', null, 't');
    f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 4000, elementos: [], bajos: [mod('placa', 900), mod('bajo', 600), mod('cajonero', 600), mod('cajonero', 600)], altos: [mod('alto', 900), mod('alto', 900), mod('campana_deco', 600)] })];
    const geo = geometriaPlanta(f.datos), svg = svgPlanta(geo);
    const largo = r => Math.hypot(r[1].x - r[0].x, r[1].y - r[0].y);
    return { placas: geo.placas.map(p => Math.round(largo(p.rect) / largo(geo.paredes[0] ? [geo.paredes[0].a, geo.paredes[0].b] : p.rect) * 4000)), simbolos: svg.querySelectorAll('[data-simbolo="placa"]').length };
  });
  igual(r, { placas: [600, 600], simbolos: 2 });
}));

prueba('ficha: botones de tamaño de placa y campana, centro de la campana y notas que crecen', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  for (const [v, w] of [['bajo', '600'], ['cajonero', '600'], ['cajonero', '600']]) { await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="' + v + '"]'); await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="' + w + '"]'); }
  await a.page.click(A + '[data-fila="altos"] [data-acc="anadir-modulo"][data-v="alto"]'); await a.page.click(A + '[data-fila="altos"] [data-modulo].abierto [data-acc="rapido"][data-v="900"]');
  await a.page.click(A + '[data-fila="altos"] [data-acc="anadir-modulo"][data-v="campana_deco"]'); await a.page.click(A + '[data-fila="altos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  const abierto = A + '[data-fila="altos"] [data-modulo].abierto ';
  await a.page.waitForSelector(abierto + '[data-acc="placa-ancho"]');
  afirma(/sin marcar: 60/.test(await a.page.innerText(abierto)), 'dice que sin marcar es 60');
  igual(await a.page.innerText(abierto + '[data-acc="centro-campana"]'), 'Centro de la campana a 120 cm del lado izquierdo.');
  await a.page.click(abierto + '[data-acc="placa-ancho"][data-v="800"]');
  await a.page.waitForSelector(abierto + '[data-acc="placa-ancho"][data-v="800"].on');
  await a.page.waitForSelector('[data-acc="alzado"] [data-cota-campana]');
  igual(await a.page.$eval('[data-acc="alzado"] [data-cota-campana]', t => t.textContent), 'centro a 120');
  afirma(/falta apuntar la salida de humos/.test(await a.page.innerText(abierto + '[data-acc="tubo-humos"]')), 'el tubo pide la salida');
  // Notas: del alto del texto y un renglón más.
  await a.page.click('[data-acc="anadir-nota"]');
  const t = '[data-acc="nota"]';
  const alto0 = await a.page.$eval(t, e => e.getBoundingClientRect().height);
  await a.page.fill(t, 'una\ndos\ntres\ncuatro\ncinco\nseis\nsiete');
  await a.page.dispatchEvent(t, 'input');
  const m = await a.page.$eval(t, e => ({ alto: e.getBoundingClientRect().height, cabe: e.scrollHeight <= e.clientHeight, renglon: parseFloat(getComputedStyle(e).lineHeight) }));
  afirma(m.alto > alto0 + 3 * m.renglon && m.cabe, 'crece con el texto: ' + JSON.stringify({ alto0, ...m }));
  afirma(m.alto >= 7 * m.renglon + m.renglon, 'y un renglón más: ' + JSON.stringify(m));
}));

await fin();
