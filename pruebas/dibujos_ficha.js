// Captura de la planta y los alzados de unos datos de ficha (JSON): node pruebas/dibujos_ficha.js datos.json salida.png
import { readFileSync } from 'node:fs';
import { abrir } from './arnes.js';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const a = await abrir({});
try {
  await a.page.setViewportSize({ width: 900, height: 800 });
  const pisados = await a.page.evaluate(async d => {
    const { geometriaPlanta, svgPlanta } = await import('./js/plano-vista.js');
    const { geometriaAlzado, svgAlzado } = await import('./js/alzado.js');
    const { AJUSTES_FABRICA } = await import('./js/modelo.js');
    const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });
    const caja = document.createElement('div'); caja.style.cssText = 'width:880px';
    const g = geometriaPlanta(d, { margen: 10, unidad: 'cm' }); caja.append(svgPlanta(g));
    d.paredes.forEach(p => { const ga = geometriaAlzado(d, p, AJ); if (ga) caja.append(svgAlzado(ga, { unidad: 'cm' })); });
    caja.querySelectorAll('svg').forEach(s => { s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; s.style.border = '1px solid #ccc'; });
    document.body.replaceChildren(caja); document.body.style.margin = 0;
    // Rótulos que se pisan (por la caja que ocupan en pantalla).
    const r = [];
    caja.querySelectorAll('svg').forEach((s, i) => {
      const t = [...s.querySelectorAll('text')].filter(x => x.textContent.trim()).map(x => ({ t: x.textContent, b: x.getBoundingClientRect() }));
      for (let x = 0; x < t.length; x++) for (let y = x + 1; y < t.length; y++) {
        const A = t[x].b, B = t[y].b, ix = Math.min(A.right, B.right) - Math.max(A.left, B.left), iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (ix > 1 && iy > 1) r.push((i ? 'alzado ' + i : 'planta') + ': «' + t[x].t + '» y «' + t[y].t + '»');
      }
    });
    return r;
  }, d);
  console.log(pisados.join('\n') || 'nada se pisa');
  await a.page.screenshot({ path: process.argv[3], fullPage: true });
} finally { await a.cerrar(); }
