// 1.23.0: consejos de diseño de cocina y guía de medidas.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { consejosDiseno } from '../docs/js/consejos.js';
import { alturaEncimera, opcionesEncimera, altosPara, electroPara } from '../docs/js/pantallas/guia.js';
import { mezclarAjustes } from '../docs/js/modelo.js';
import { ALTURAS, fijarCocinaTipo } from '../docs/js/alzado.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

import { REMATES } from '../docs/js/modulos.js';
REMATES.porDefecto = false;   // pensada antes de 1.34: sin regletas ni costados en la medida

const mod = (tipo, ancho, o) => Object.assign(moduloNuevo(tipo), { ancho }, o);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, extra);
const textos = f => consejosDiseno(f).map(c => c.texto);
function cocina(paredes, extra = {}) { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; Object.assign(f.datos, extra); return f; }

prueba('una cocina bien planteada no da consejos', () => {
  const f = cocina([pared('A', 3600, { bajos: [mod('columna_frigo', 600), mod('bajo', 600), mod('fregadero', 800), mod('lavavajillas', 600), mod('placa', 600), mod('bajo', 400)], altos: [mod('alto', 600), mod('alto', 800), mod('alto', 600), mod('alto_campana', 600)] })]);
  igual(textos(f), []);
});
prueba('placa en mueble de 90 (aparato de 60): columna, fregadero, frigo, ventana y campana como consejo suave', () => {
  const f = cocina([pared('A', 3600, { elementos: [{ id: 'v', tipo: 'ventana', ref: 'izq', distancia: 700, ancho: 600, altura: 1000, alto: 1000 }],
    bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto_campana', 600)] })]);
  const t = textos(f);
  afirma(t.includes('Placa junto a la columna frigo por la izquierda: solo 15 cm de encimera (pared A)'), t.join(' | '));
  afirma(t.includes('Placa y fregadero juntos (pared A)'), t.join(' | '));
  afirma(t.includes('Frigorífico a 15 cm de la placa (pared A)'), t.join(' | '));
  afirma(t.includes('Placa debajo de la ventana (pared A)'), t.join(' | '));
  afirma(t.includes('Mueble de placa de 90 cm con campana de 60 cm (pared A)'), t.join(' | '));
  // Con la placa puesta en Electrodomésticos se compara el aparato: de 60, la campana de 60 vale; de 90, no.
  f.datos.electro = [{ id: 'e', clave: 'placa', tipo: 'induccion', ancho: 600 }];
  afirma(!textos(f).some(x => /campana/i.test(x)), textos(f).join(' | '));
  f.datos.electro[0].ancho = 900;
  afirma(textos(f).includes('Campana de 60 cm para una placa de 90 cm (pared A)'), textos(f).join(' | '));
  igual(consejosDiseno(f).map(c => c.grupo).filter((g, i, a) => a.indexOf(g) === i), ['placa', 'agua', 'frio', 'encimera'], 'ordenados por grupo');
  afirma(consejosDiseno(f).every(c => c.porque && c.campo), 'cada consejo lleva su porqué');
});
prueba('placa pegada a la pared, poca encimera entre fregadero y placa, campana fuera de la placa', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 600), mod('bajo', 400), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto_campana', 600, {}), mod('alto', 600)] })]);
  f.datos.paredes[0].altos = [mod('alto', 600), mod('alto_campana', 600)];
  const t = textos(f);
  afirma(t.includes('Placa junto a la pared por la izquierda: nada de encimera (pared A)'), t.join(' | '));
  afirma(t.includes('Solo 40 cm de encimera entre el fregadero y la placa (pared A)'), t.join(' | '));
  // 1.37: el alto campana se pone solo centrado con la placa: ya no puede quedar fuera
  afirma(!t.includes('El alto de la campana no está encima de la placa (pared A)'), t.join(' | '));
});
prueba('lavavajillas: lejos del fregadero, en otra pared o pegado al rincón', () => {
  let t = textos(cocina([pared('A', 3600, { bajos: [mod('fregadero', 800), mod('bajo', 600), mod('bajo', 600), mod('lavavajillas', 600)] })]));
  afirma(t.includes('Lavavajillas a 120 cm del fregadero (pared A)'), t.join(' | '));
  const A = pared('A', 3000, { bajos: [mod('fregadero', 800), mod('bajo', 600)] }), B = Object.assign(paredNueva([A]), { letra: 'B', largo: 2500, elementos: [], altos: [], bajos: [mod('lavavajillas', 600)] });
  t = textos(cocina([A, B]));
  afirma(t.includes('Lavavajillas en la pared B y fregadero en la A'), t.join(' | '));
  t = textos(cocina([pared('A', 3000, { bajos: [mod('fregadero', 800), mod('lavavajillas', 600), mod('rinconero', 1000, { forma: 'L', lado2: 950, gira: 'der' })] })]));
  afirma(t.includes('Lavavajillas pegado al rincón (pared A)'), t.join(' | '));
});
prueba('columna en medio de la encimera, paso estrecho entre paredes enfrentadas y hasta la isla', () => {
  const A = pared('A', 3000, { bajos: [mod('bajo', 600), mod('columna_hmo', 600), mod('bajo', 600)] });
  const B = Object.assign(paredNueva([A]), { letra: 'B', largo: 2000, elementos: [], bajos: [], altos: [] });
  const C = Object.assign(paredNueva([A, B]), { letra: 'C', largo: 3000, elementos: [], bajos: [mod('bajo', 600)], altos: [] });
  const t = textos(cocina([A, B, C], { islas: [{ id: 'i', tipo: 'isla', pared: 'A', separacion: 1400 }] }));
  afirma(t.includes('Columna H/MO en medio de la encimera (pared A)'), t.join(' | '));
  afirma(t.includes('Entre las encimeras de A y C quedan unos 76 cm de paso'), t.join(' | '));
  afirma(t.includes('Entre la isla y la encimera de la pared A quedan 78 cm de paso'), t.join(' | '));
});
prueba('solo en cocinas; altura de encimera según la estatura', () => {
  igual(consejosDiseno(fichaNueva('puerta', null, 't')), []);
  // Mitad de la estatura + 3 (170 → 88, 176 → 91); con gas, 3 menos; normal 85–95, hasta 100 solo pasado 1,85.
  igual(alturaEncimera(160), 85); igual(alturaEncimera(170), 88); igual(alturaEncimera(176), 91); igual(alturaEncimera(176, true), 88);
  igual(alturaEncimera(184), 95); igual(alturaEncimera(220), 100); igual(alturaEncimera(''), null);
  // Mandan zócalo 10 o 15 y encimera 4 o 2, con un margen de ±2 cm sobre la altura ideal.
  const o = opcionesEncimera(93), sum = x => [x.zocalo, x.mueble, x.grueso].join('+');
  igual(o.map(sum), ['100+800+20', '100+800+40', '150+700+40'], 'las de siempre, la más baja primero, sin zócalo de 6 ni encimera de 3 o 1,2');
  igual(sum(opcionesEncimera(91)[0]), '150+700+40', '176 cm: la estándar (89) está a 2 cm');
  igual(sum(opcionesEncimera(96)[0]), '100+800+40', 'pasarse cuesta más que quedarse corto: 94 antes que 97');
  igual(sum(opcionesEncimera(89)[0]), '150+700+40', 'la estándar');
  igual(sum(opcionesEncimera(90)[0]), '150+700+40', 'dentro del margen de 2 cm, la estándar');
  igual(opcionesEncimera(89)[0].clase, 'estandar');
  // El hueco del lavavajillas no mueve la cocina: con gola se avisa, pero el orden es el mismo.
  const og = opcionesEncimera(93, 3, true);
  igual([sum(og[0]), og[0].lavaOk, og[0].libre], ['100+800+20', false, 844]);
  const al = altosPara({ zocalo: 100, mueble: 800, grueso: 40, altura: 940 }, 2500);
  igual([al.desde, al.alto, al.hasta, al.columna, al.sobraTecho], [1500, 900, 2400, 2300, 100], 'altos de 90 y columna enrasada');
  igual(altosPara({ altura: 940, zocalo: 100 }, 2300).alto, 800, 'techo de 230: altos de 80'); igual(altosPara({ altura: 940, zocalo: 100 }, 2250).alto, 700, 'techo de 225: altos de 70');
  const e = electroPara(176, o[0], al);
  igual([e.horno, e.micro, e.frigo, e.lavavajillas, e.lavaTipo], [860, 1310, 1940, 900, 'bien']);
  igual(electroPara(176, o[0], al, true).lavaTipo, 'corto', '10 + 80 con gola: 84,4, menos de 85');
  igual(electroPara(170, { zocalo: 150, mueble: 700, grueso: 40, altura: 890 }, al, true).lavaTipo, 'corto', '15 + 70 con gola: 79,4');
  igual(electroPara(176, { zocalo: 150, mueble: 800, grueso: 20, altura: 970 }, al, true).lavaTipo, 'bien', '15 + 80 con gola: 89,4');
});
prueba('electrodomésticos: frigo que no cabe y lavavajillas con puertas de 80', () => {
  const A = pared('A', 3600, { bajos: [mod('columna_frigo', 600), mod('bajo', 600), mod('fregadero', 800), mod('lavavajillas', 600), mod('placa', 600), mod('bajo', 400)] });
  const f = cocina([A], { electro: [{ id: 'f', clave: 'frigo', tipo: 'integrable', ancho: 600, alto: 2010 }] });
  afirma(textos(f).some(x => /^Frigo integrable de 201 cm: no cabe/.test(x)), textos(f).join(' | '));
  f.datos.electro[0].alto = 1780;
  igual(textos(f), [], 'el de 178 cabe en la columna de la cocina tipo y con puertas de 70 no hay aviso de lavavajillas');
  fijarCocinaTipo({ zocalo: 100, mueble: 800, grueso: 40, alto_alto: 900, separacion: 560 });
  igual(textos(f), [], '10 + 80 sin gola: 90 libres, bien');
  f.datos.acabados = { tirador: 'gola' };
  afirma(textos(f).includes('Para el lavavajillas quedan 84,4 cm libres (10 cm + 80 cm − gola 5,6 cm): menos de 85'), textos(f).join(' | '));
  afirma(consejosDiseno(f).some(c => /zócalo 15 cm y mueble 80 cm \(quedan 89,4 cm\)/.test(c.porque) && /sin gola en ese frente/.test(c.porque)), 'opciones coherentes');
  fijarCocinaTipo(mezclarAjustes(null).cocina_tipo);
  afirma(textos(f).includes('Para el lavavajillas quedan 79,4 cm libres (15 cm + 70 cm − gola 5,6 cm): menos de 85'), textos(f).join(' | '));
  f.datos.electro.push({ id: 'w', clave: 'lavadora', tipo: 'integrable', ancho: 600 });
  afirma(textos(f).some(x => /^Para el lavavajillas y la lavadora quedan 79,4/.test(x)), textos(f).join(' | '));
  f.datos.electro = f.datos.electro.filter(e => e.clave !== 'lavadora');
  f.datos.acabados = {};
  fijarCocinaTipo({ zocalo: 100, mueble: 800, grueso: 40, alto_alto: 900, separacion: 560 }); f.datos.electro.push({ id: 'l', clave: 'lavavajillas', tipo: 'integrable', ancho: 600, alto: 950 });
  f.datos.electro.push({ id: 'l', clave: 'lavavajillas', tipo: 'integrable', ancho: 600, alto: 950 });
  afirma(textos(f).some(x => /^El lavavajillas de 95 cm no cabe: quedan 90 cm/.test(x)), textos(f).join(' | '));
  fijarCocinaTipo(mezclarAjustes(null).cocina_tipo);
});
prueba('vestidor: paso entre cuerpos enfrentados y barra larga sin apoyo', () => {
  const f = fichaNueva('armario', 'vestidor', 't'), A = f.datos.paredes[0];
  Object.assign(A, { largo: 2000, cuerpos: [{ id: 'c1', ancho: 1200, interior: 'barra' }] });
  const B = Object.assign(paredNueva([A]), { letra: 'B', largo: 1900, elementos: [], cuerpos: [] });
  const C = Object.assign(paredNueva([A, B]), { letra: 'C', largo: 2000, elementos: [], cuerpos: [{ id: 'c2', ancho: 800, interior: 'cajones' }] });
  f.datos.paredes = [A, B, C];
  const t = consejosDiseno(f).map(c => c.texto);
  afirma(t.includes('Entre los cuerpos de A y C quedan unos 70 cm de paso'), t.join(' | '));
  afirma(t.includes('Cuerpo 1 de la pared A: barra de 120 cm sin apoyo'), t.join(' | '));
  B.largo = 2300;
  afirma(!consejosDiseno(f).some(c => /paso/.test(c.texto)), 'con 110 de paso, bien');
});
prueba('cocina tipo de los ajustes: dibujos y consejos la siguen', () => {
  igual(mezclarAjustes(null).cocina_tipo, { zocalo: 150, mueble: 700, grueso: 40, alto_alto: 700, separacion: 560 });
  igual(mezclarAjustes({ cocina_tipo: { zocalo: 5, mueble: 800, grueso: 40, alto_alto: 900, separacion: 560 } }).cocina_tipo.zocalo, 150, 'valores raros no se aceptan');
  const ct = mezclarAjustes({ cocina_tipo: { zocalo: 100, mueble: 800, grueso: 40, alto_alto: 900, separacion: 560 } }).cocina_tipo;
  fijarCocinaTipo(ct);
  igual([ALTURAS.zocalo, ALTURAS.encimera, ALTURAS.altos_desde, ALTURAS.altos_hasta, ALTURAS.columna], [100, 940, 1500, 2400, 2400]);
  fijarCocinaTipo(mezclarAjustes(null).cocina_tipo);
  igual([ALTURAS.encimera, ALTURAS.altos_hasta], [890, 2150]);
});
prueba('app: tarjeta de consejos en la ficha de cocina y guía de medidas con su calculadora', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa');
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    igual(await a.page.innerText('.tarjeta-consejos .ayuda'), 'Nada que mejorar con lo que hay puesto.');
    await a.page.evaluate(async () => {
      const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); const al = await abrirAlmacen();
      const f = await al.leer('fichas', id), m = (tipo, ancho) => ({ id: Math.random().toString(36).slice(2), tipo, ancho, nombre: '' });
      Object.assign(f.datos.paredes[0], { largo: 3000, bajos: [m('placa', 600), m('fregadero', 800), m('bajo', 600)] });
      await al.guardar('fichas', f);
      location.hash = '#/'; await new Promise(r => setTimeout(r, 100)); location.hash = '#/ficha/' + id;
    });
    await a.page.waitForSelector('.tarjeta-consejos .consejos li');
    const li = await a.page.$$eval('.tarjeta-consejos .consejos li b', bs => bs.map(b => b.textContent));
    afirma(li.includes('Placa y fregadero juntos (pared A)'), li.join(' | '));
    afirma((await a.page.innerText('.tarjeta-consejos > b')).startsWith('Consejos de diseño ('));
    await a.page.click('[data-acc="ver-guia"]'); await a.page.waitForSelector('[data-pantalla="guia"]');
    afirma((await a.page.innerText('[data-apartado="1"]')).includes('15 cm + 70 cm + 4 cm'));
    await a.page.fill('[data-acc="estatura"]', '176'); await a.page.fill('[data-acc="techo"]', '250');
    const res = await a.page.innerText('[data-res="encimera"]');
    afirma(res.startsWith('Encimera a unos 91 cm.') && res.includes('15 cm + 70 cm + 4 cm') && res.includes('La estándar') && res.includes('lavavajillas: 85 cm libres') && !res.includes('null'), res);
    afirma((await a.page.innerText('[data-res="electro"]')).includes('Lavavajillas y lavadora: quedan 85 cm libres'), await a.page.innerText('[data-res="electro"]'));
    await a.page.click('[data-acc="gola"][data-v="true"]');
    const conGola = await a.page.innerText('[data-res="encimera"]');
    afirma(conGola.includes('15 cm + 70 cm + 4 cm') && conGola.includes('No se sube la cocina por eso') && conGola.includes('quitan unos 3 cm para meter la mano'), conGola);
    await a.page.click('[data-acc="gola"][data-v="false"]');
    await a.page.click('[data-acc="placa-gas"][data-v="true"]');
    afirma((await a.page.innerText('[data-res="encimera"]')).startsWith('Encimera a unos 88 cm (3 cm menos'), 'con gas, 3 menos');
    await a.page.click('[data-acc="placa-gas"][data-v="false"]');
    await a.page.click('[data-acc="opcion-encimera"][data-v="1"]'); await a.page.click('[data-acc="usar-cocina-tipo"]');
    await a.page.waitForFunction(() => /Es tu cocina tipo/.test(document.querySelector('[data-acc="usar-cocina-tipo"]').textContent));
    afirma(!(await a.page.innerText('[data-apartado="1"]')).includes('15 cm + 70 cm + 4 cm'), 'la cocina tipo ha cambiado');
    afirma((await a.page.innerText('[data-apartado="1"]')).includes('10 cm + 80 cm + 2 cm'), await a.page.innerText('[data-apartado="1"]'));
    afirma((await a.page.innerText('[data-apartado="0"]')).includes('más bajo antes que más alto'), 'reglas de prioridad');
    afirma((await a.page.innerText('[data-apartado="11"]')).includes('Alrededor de la isla'), 'vestidores con isla');
    afirma((await a.page.innerText('main')).includes('Entre encimeras enfrentadas'));
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
fin();
