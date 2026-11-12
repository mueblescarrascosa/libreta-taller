// PDF de muestra de un trabajo grande (puertas y cocina) desde un móvil: node pruebas/pdf_muestra.js (deja pruebas/pdf_muestra_N.jpg).
import { abrir, entrar, crearTrabajo } from './arnes.js';
import { writeFileSync } from 'node:fs';
const a = await abrir();
try {
  await entrar(a); await a.page.setViewportSize({ width: 390, height: 844 }); await crearTrabajo(a, 'Piso calle Real');
  await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(50);
  await a.page.click('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.evaluate(async () => {
    const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); const al = await abrirAlmacen();
    const f = await al.leer('fichas', id), r = () => Math.random().toString(36).slice(2);
    f.nombre = 'Piso 1';
    f.datos.puertas = ['Entrada', 'Salón', 'Cocina', 'Habitación 1', 'Habitación 2', 'Habitación 3', 'Baño', 'Aseo', 'Despacho', 'Terraza']
      .map((n, i) => ({ id: r(), nombre: n, ancho: [960, 860, 850, 860, 840, 860, 760, 760, 860, 960][i], alto: [2060, 2060, 2050, 2040, 2060, 2060, 2060, 2050, 2060, 2140][i], tabique: 90, mano: i % 2 ? 'der' : 'izq', condena: n === 'Baño' || n === 'Aseo', vidriera: n === 'Salón' || n === 'Cocina' }));
    await al.guardar('fichas', f);
    const m = (tipo, ancho, o) => Object.assign({ id: r(), tipo, ancho, nombre: '' }, o);
    const c = { id: r(), trabajo_id: f.trabajo_id, tipo: 'cocina', subtipo: null, nombre: '', creado_at: new Date(Date.now() + 1000).toISOString(), updated_at: null, borrado_at: null,
      datos: { libres: [], notas: [{ id: r(), texto: 'Ojo con el radiador bajo la ventana.' }], ref_ultima: 'izq', alto_techo: 2600, acabados: { lineales: [], encimera: {} }, paredes: [
        { id: 'a', letra: 'A', largo: 3600, azulejo: 'franja', azulejo_desde: 850, azulejo_hasta: 1450, elementos: [
          { id: 'e1', tipo: 'ventana', ref: 'izq', distancia: 1500, ancho: 1200, altura: 1100, alto: 1100 },
          { id: 'e2', tipo: 'enchufe', ref: 'izq', distancia: 1100, altura: 1100, para: 'general' },
          { id: 'e3', tipo: 'desague', ref: 'izq', distancia: 1800, altura: 450 },
          { id: 'e4', tipo: 'toma', ref: 'izq', distancia: 1950, altura: 500, para: 'agua' }],
          bajos: [m('columna_frigo', 600), m('bajo', 600), m('fregadero', 800), m('lavavajillas', 600), m('rinconero', 1000, { forma: 'L', lado2: 950, gira: 'der' })],
          altos: [m('alto_frigo', 600), m('alto', 600), m('hueco', 1200), m('alto', 600)] },
        { id: 'b', letra: 'B', largo: 3200, elementos: [{ id: 'e6', tipo: 'humos', ref: 'izq', distancia: 1400, altura: 2300, humos_forma: 'redonda', diametro: 150 }],
          bajos: [m('placa', 900, { horno: true }), m('cajonero', 600), m('columna_hmo', 600)], altos: [m('alto_campana', 900), m('alto', 600)] }] } };
    await al.guardar('fichas', c);
  });
  await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await a.page.click('[data-acc="abrir-trabajo"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="resumen-trabajo"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
  const imgs = await a.page.evaluate(async () => {
    const { generarPdf, LIB_JSPDF, LIB_H2C } = await import('./js/pdf.js');
    const doc = document.querySelector('.resumen-doc');
    await generarPdf(doc); // carga las librerías
    const fuera = [], orig = window.jspdf.jsPDF.API.addImage;
    window.jspdf.jsPDF.API.addImage = function (d, ...r) { fuera.push(d); return orig.call(this, d, ...r); };
    await generarPdf(doc);
    return fuera;
  });
  imgs.forEach((d, i) => writeFileSync('pruebas/pdf_muestra_' + (i + 1) + '.jpg', Buffer.from(d.split(',')[1], 'base64')));
  console.log('páginas', imgs.length, 'errores', JSON.stringify(a.errores));
} finally { await a.cerrar(); }
