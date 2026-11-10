import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo, pagina, hasta } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
const nuevaNota = async a => { await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="nota"]'); await a.page.waitForSelector('[data-pantalla="ficha"]'); };
// Una foto JPEG de 1600×1200 con ruido, hecha en el navegador.
const fotoJpeg = async a => Buffer.from(await a.page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'), d = g.createImageData(1600, 1200);
  for (let i = 0; i < d.data.length; i++) d.data[i] = (i * 2654435761) % 255; g.putImageData(d, 0, 0);
  return c.toDataURL('image/jpeg', 0.95).split(',')[1];
}), 'base64');
// El editor coloca sus controles tras pedir pantalla completa: se espera a que esté listo.
const bocetoListo = a => a.page.waitForFunction(() => history.state && history.state.boceto && document.querySelector('.boceto canvas'));
const miniaturas = a => a.page.$$('[data-acc="ver-adjunto"]');
const cargada = a => a.page.waitForFunction(() => { const i = document.querySelector('[data-acc="ver-adjunto"] img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 });

prueba('una imagen grande queda en 300 KB o menos y lado mayor de 2000', async () => {
  const a = await pagina();
  try {
    const r = await a.page.evaluate(async () => {
      const { reducirFoto } = await import('/js/imagen.js');
      const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const g = c.getContext('2d'), d = g.createImageData(3000, 2000);
      for (let i = 0; i < d.data.length; i++) d.data[i] = Math.random() * 255; g.putImageData(d, 0, 0);
      const b = await new Promise(ok => c.toBlob(ok, 'image/png')), s = await reducirFoto(b), bm = await createImageBitmap(s);
      return { antes: b.size, tam: s.size, tipo: s.type, lado: Math.max(bm.width, bm.height) };
    });
    afirma(r.antes > 300 * 1024, 'la prueba no parte de una imagen grande'); afirma(r.tam <= 300 * 1024, 'pesa ' + r.tam); igual(r.tipo, 'image/jpeg'); afirma(r.lado <= 2000, 'lado ' + r.lado);
  } finally { await a.cerrar(); }
});
prueba('foto sin red: se ve al recargar y sube al volver la red', con({}, async a => {
  await nuevaNota(a); const id = await a.page.evaluate(() => location.hash.split('/')[2]);
  a.nube.sinRed = true;
  await a.page.setInputFiles('[data-acc="foto-input"]', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: await fotoJpeg(a) });
  await a.page.waitForSelector('[data-acc="ver-adjunto"]'); await a.page.waitForTimeout(300);
  await a.page.reload(); await a.page.waitForSelector('[data-pantalla="ficha"]'); await cargada(a);
  a.nube.sinRed = false; await a.page.evaluate(() => dispatchEvent(new Event('online')));
  await hasta(() => a.nube.med_adjuntos.length === 1, 'fila de adjunto');
  const ruta = a.nube.med_adjuntos[0].ruta;
  afirma(new RegExp('^U1/' + id + '/[0-9a-f-]{36}\\.jpg$').test(ruta), ruta); afirma(a.nube.archivos.has(ruta), 'sin archivo');
  afirma(a.nube.archivos.get(ruta).length <= 300 * 1024, 'archivo grande');
}));
prueba('otro dispositivo descarga la foto', async () => {
  const a = await abrir(); await entrar(a); await nuevaNota(a); const h = await a.page.evaluate(() => location.hash);
  await a.page.setInputFiles('[data-acc="foto-input"]', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: await fotoJpeg(a) });
  await hasta(() => a.nube.med_adjuntos.length === 1 && a.nube.archivos.size === 1, 'subida');
  const b = await abrir({ nube: a.nube }); await entrar(b);
  await b.page.waitForFunction(() => /Casa/.test(document.body.innerText), null, { timeout: 6000 });
  await b.page.evaluate(x => { location.hash = x; }, h); await b.page.waitForSelector('[data-pantalla="ficha"]'); await cargada(b);
  try { igual(b.errores, []); } finally { await a.cerrar(); await b.cerrar(); }
});
prueba('croquis: dibujar y guardar crea un PNG; cancelar no crea nada', con({}, async a => {
  await nuevaNota(a);
  await a.page.click('[data-acc="croquis"]'); await bocetoListo(a); await a.page.click('.boceto [data-acc="cancelar"]');
  await a.page.waitForTimeout(200); igual((await miniaturas(a)).length, 0);
  await a.page.click('[data-acc="croquis"]'); await bocetoListo(a);
  const c = await (await a.page.$('.boceto canvas')).boundingBox();
  await a.page.mouse.move(c.x + 30, c.y + 30); await a.page.mouse.down(); await a.page.mouse.move(c.x + 150, c.y + 90, { steps: 8 }); await a.page.mouse.up();
  await a.page.click('.boceto [data-acc="guardar"]'); await a.page.waitForSelector('[data-acc="ver-adjunto"]');
  await hasta(() => a.nube.med_adjuntos.length === 1, 'subida'); afirma(/\.png$/.test(a.nube.med_adjuntos[0].ruta)); igual(a.nube.med_adjuntos[0].tipo, 'croquis');
}));
prueba('cotas sobre foto abre el editor con la foto y guarda JPEG', con({}, async a => {
  await nuevaNota(a);
  await a.page.setInputFiles('[data-acc="cotas-input"]', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: await fotoJpeg(a) });
  await bocetoListo(a); await a.page.click('.boceto [data-acc="guardar"]'); await a.page.waitForSelector('[data-acc="ver-adjunto"]');
  await hasta(() => a.nube.med_adjuntos.length === 1, 'subida'); afirma(/\.jpg$/.test(a.nube.med_adjuntos[0].ruta)); igual(a.nube.med_adjuntos[0].tipo, 'foto');
}));
const linea = async (a, x1, y1, x2, y2) => {
  const c = await (await a.page.$('.boceto canvas')).boundingBox();
  await a.page.mouse.move(c.x + x1, c.y + y1); await a.page.mouse.down(); await a.page.mouse.move(c.x + x2, c.y + y2, { steps: 6 }); await a.page.mouse.up();
};
prueba('la regla pregunta cuánto mide la línea y lo apunta en la ficha', con({}, async a => {
  await nuevaNota(a);
  await a.page.click('[data-acc="croquis"]'); await bocetoListo(a); await a.page.click('.boceto [data-herr="linea"]');
  await linea(a, 30, 40, 220, 40);
  await a.page.waitForSelector('[data-acc="cota-valor"]'); igual(await a.page.innerText('.cota-dialogo .ud'), 'mm');
  await a.page.fill('[data-acc="cota-valor"]', '12,5'); await a.page.click('[data-acc="cota-ok"]');
  afirma(await a.page.$('[data-acc="cota-valor"]'), 'aceptó una medida mal escrita');
  await a.page.fill('[data-acc="cota-valor"]', '2450'); await a.page.click('[data-acc="cota-ok"]');
  await a.page.waitForFunction(() => !document.querySelector('.cota-dialogo'));
  await linea(a, 30, 90, 30, 200); await a.page.waitForSelector('[data-acc="cota-valor"]'); await a.page.click('[data-acc="cota-no"]');
  await a.page.waitForFunction(() => !document.querySelector('.cota-dialogo'));
  await a.page.click('.boceto [data-acc="guardar"]'); await a.page.waitForSelector('[data-acc="ver-adjunto"]');
  await a.page.waitForFunction(() => [...document.querySelectorAll('[data-acc="libre-nombre"]')].some(i => i.value === 'Cota 1'));
  const f = await a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
  igual(f.datos.libres.map(m => [m.nombre, m.mm]), [['Cota 1', 2450]]);
}));
prueba('deshacer una línea medida quita también su cota', con({}, async a => {
  await nuevaNota(a);
  await a.page.click('[data-acc="croquis"]'); await bocetoListo(a); await a.page.click('.boceto [data-herr="linea"]');
  await linea(a, 30, 40, 220, 40); await a.page.waitForSelector('[data-acc="cota-valor"]'); await a.page.fill('[data-acc="cota-valor"]', '900'); await a.page.click('[data-acc="cota-ok"]');
  await a.page.waitForFunction(() => !document.querySelector('.cota-dialogo'));
  await a.page.click('.boceto [data-herr="lapiz"]'); await linea(a, 50, 120, 200, 160);
  await a.page.click('.boceto [data-acc="deshacer"]'); await a.page.click('.boceto [data-acc="deshacer"]');
  await a.page.click('.boceto [data-acc="guardar"]'); await a.page.waitForTimeout(300);
  const f = await a.page.evaluate(async () => { const id = location.hash.split('/')[2]; const { abrirAlmacen } = await import('./js/almacen.js'); return (await abrirAlmacen()).leer('fichas', id); });
  igual(f ? f.datos.libres.length : 0, 0);
}));
prueba('borrar una foto pide confirmación', con({}, async a => {
  await nuevaNota(a); await a.page.setInputFiles('[data-acc="foto-input"]', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: await fotoJpeg(a) });
  await a.page.click('[data-acc="ver-adjunto"]'); a.estado.aceptar = false; await a.page.click('[data-acc="borrar-adjunto"]'); await a.page.waitForTimeout(100);
  afirma(a.estado.dialogos.some(d => d.startsWith('confirm'))); a.estado.aceptar = true; await a.page.click('[data-acc="borrar-adjunto"]');
  await a.page.waitForFunction(() => !document.querySelector('.visor') && !document.querySelector('[data-acc="ver-adjunto"]'));
}));
fin();
