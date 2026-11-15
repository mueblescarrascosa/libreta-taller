// 1.23.0: consejos de diseño de cocina y guía de medidas.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { consejosDiseno } from '../docs/js/consejos.js';
import { alturaEncimera } from '../docs/js/pantallas/guia.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, o) => Object.assign(moduloNuevo(tipo), { ancho }, o);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, extra);
const textos = f => consejosDiseno(f).map(c => c.texto);
function cocina(paredes, extra = {}) { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; Object.assign(f.datos, extra); return f; }

prueba('una cocina bien planteada no da consejos', () => {
  const f = cocina([pared('A', 3600, { bajos: [mod('columna_frigo', 600), mod('bajo', 600), mod('fregadero', 800), mod('lavavajillas', 600), mod('placa', 600), mod('bajo', 400)], altos: [mod('alto', 600), mod('alto', 800), mod('alto', 600), mod('alto_campana', 600)] })]);
  igual(textos(f), []);
});
prueba('placa: pegada a la columna, junto al fregadero, frigo al lado, bajo la ventana y campana estrecha', () => {
  const f = cocina([pared('A', 3600, { elementos: [{ id: 'v', tipo: 'ventana', ref: 'izq', distancia: 700, ancho: 600, altura: 1000, alto: 1000 }],
    bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto_campana', 600)] })]);
  const t = textos(f);
  afirma(t.includes('Placa pegada a la columna frigo por la izquierda (pared A): deja al menos 30 cm de encimera'), t.join(' | '));
  afirma(t.includes('Placa y fregadero juntos (pared A)'), t.join(' | '));
  afirma(t.includes('El frigo está pegado a la placa (pared A)'), t.join(' | '));
  afirma(t.includes('Placa debajo de la ventana (pared A)'), t.join(' | '));
  afirma(t.includes('Campana de 60 cm sobre una placa de 90 cm (pared A)'), t.join(' | '));
  afirma(consejosDiseno(f).every(c => c.porque && c.campo), 'cada consejo lleva su porqué');
});
prueba('placa pegada a la pared, poca encimera entre fregadero y placa, campana fuera de la placa', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 600), mod('bajo', 400), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto_campana', 600, {}), mod('alto', 600)] })]);
  f.datos.paredes[0].altos = [mod('alto', 600), mod('alto_campana', 600)];
  const t = textos(f);
  afirma(t.includes('Placa pegada a la pared por la izquierda (pared A): deja al menos 30 cm de encimera'), t.join(' | '));
  afirma(t.includes('Solo 40 cm entre el fregadero y la placa (pared A)'), t.join(' | '));
  afirma(t.includes('El alto de la campana no está encima de la placa (pared A)'), t.join(' | '));
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
  afirma(t.includes('Entre los muebles de A y C quedan unos 80 cm de paso'), t.join(' | '));
  afirma(t.includes('Entre la isla y los muebles de la pared A quedan 80 cm de paso'), t.join(' | '));
});
prueba('solo en cocinas; altura de encimera según la estatura', () => {
  igual(consejosDiseno(fichaNueva('puerta', null, 't')), []);
  igual(alturaEncimera(160), 86); igual(alturaEncimera(175), 95); igual(alturaEncimera(200), 100); igual(alturaEncimera(''), null);
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
    await a.page.fill('[data-acc="estatura"]', '175');
    afirma((await a.page.innerText('[data-res="encimera"]')).startsWith('Encimera a unos 95 cm del suelo.'));
    afirma((await a.page.innerText('main')).includes('Paso entre muebles enfrentados'));
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
fin();
