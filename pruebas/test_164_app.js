import { prueba, afirma, igual, fin } from './mini.js';
import { pagina, abrir, entrar, crearTrabajo } from './arnes.js';

// Cocina real (una sola pared) que salía mal: nombres fuera del dibujo y el largo tapado por el azulejo.
const PISO1 = { paredes: [{ id: 'a', letra: 'A', largo: 3600, azulejo: 'franja', azulejo_desde: 840, azulejo_hasta: 1420, azulejo_techo: false, bajos: [], altos: [], elementos: [
  { tipo: 'humos', ref: 'der', distancia: 1370 }, { tipo: 'desague', ref: 'der', distancia: 2700 }, { tipo: 'agua', ref: 'der', distancia: 2150 },
  { tipo: 'zona', ref: 'der', ancho: 1200, techo: true, altura: 1420, nombre: 'campana', distancia: 770 },
  { tipo: 'toma', ref: 'der', para: 'termo', altura: 1650, distancia: 3150, para_nombre: 'Termo' },
  { tipo: 'enchufe', ref: 'der', altura: 1500, distancia: 3000 }, { tipo: 'enchufe', ref: 'der', para: 'general', altura: 1100, distancia: 3100, para_nombre: 'General' }] }] };

const dibujar = (a, d) => a.page.evaluate(async d => {
  const { geometriaPlanta, svgPlanta } = await import('/js/plano-vista.js');
  document.body.innerHTML = ''; const svg = svgPlanta(geometriaPlanta(d, { unidad: 'cm' })); svg.style.width = '358px'; document.body.append(svg);
  const vb = svg.viewBox.baseVal, cajas = [...svg.querySelectorAll('text')].map(t => { const b = t.getBBox(); return { t: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height }; });
  return { vb: { x: vb.x, y: vb.y, w: vb.width, h: vb.height }, cajas, cajasAgua: svg.querySelectorAll('[data-caja="agua"]').length };
}, d);

prueba('planta de una pared: todos los nombres caben en el dibujo', async () => {
  const a = await pagina(); try {
    const { vb, cajas } = await dibujar(a, PISO1);
    const fuera = cajas.filter(c => c.x < vb.x || c.y < vb.y || c.x + c.w > vb.x + vb.w || c.y + c.h > vb.y + vb.h).map(c => c.t);
    igual(fuera, []);
    for (const t of ['E a 300 de dcha', 'E general a 310 de dcha', 'Toma termo a 315 de dcha', 'Agua a 215 de dcha']) afirma(cajas.some(c => c.t === t), 'falta ' + t + ': ' + cajas.map(c => c.t).join(' | '));
  } finally { await a.cerrar(); }
});
prueba('planta: nada pisa el largo de la pared ni el texto del azulejo', async () => {
  const a = await pagina(); try {
    const { cajas } = await dibujar(a, PISO1);
    const pisa = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
    const fijos = cajas.filter(c => /^A · /.test(c.t) || /^azulejo/.test(c.t));
    igual(fijos.length, 2);
    for (const f of fijos) for (const c of cajas) if (c !== f) afirma(!pisa(f, c), '«' + c.t + '» pisa «' + f.t + '»');
  } finally { await a.cerrar(); }
});
prueba('la toma de agua antigua («agua») lleva su caja como las demás', async () => {
  const a = await pagina(); try { igual((await dibujar(a, PISO1)).cajasAgua, 1); } finally { await a.cerrar(); }
});

prueba('ajustes: descargar copia de seguridad con todos los trabajos', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa Pepe');
    await a.page.evaluate(() => { location.hash = '#/ajustes'; }); await a.page.waitForSelector('[data-pantalla="ajustes"]');
    await a.page.evaluate(() => { navigator.canShare = () => false; });
    const [d] = await Promise.all([a.page.waitForEvent('download'), a.page.click('[data-acc="copia-seguridad"]')]);
    afirma(/^libreta-taller-copia-\d{4}-\d{2}-\d{2}\.json$/.test(d.suggestedFilename()), d.suggestedFilename());
    const fs = await import('node:fs'), c = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
    igual([c.app, c.trabajos.map(t => t.nombre)], ['Libreta Taller', ['Casa Pepe']]);
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});

fin();
