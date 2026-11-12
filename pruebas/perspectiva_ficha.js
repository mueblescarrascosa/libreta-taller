// Captura de la perspectiva de unos datos de ficha (JSON): node pruebas/perspectiva_ficha.js datos.json salida.png [x y ang]
import { readFileSync } from 'node:fs';
import { abrir } from './arnes.js';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const vista = process.argv[6] ? { x: +process.argv[4], y: +process.argv[5], ang: +process.argv[6] } : d.vista || null;
const a = await abrir({});
try {
  await a.page.setViewportSize({ width: 1000, height: 640 });
  await a.page.evaluate(async ({ d, vista }) => {
    const { escenaPerspectiva, vistaDe, svgPerspectiva } = await import('./js/perspectiva.js');
    const e = escenaPerspectiva(d);
    document.body.replaceChildren(svgPerspectiva(e, vistaDe(e, vista)));
    document.body.style.margin = 0;
  }, { d, vista });
  await a.page.screenshot({ path: process.argv[3] });
  console.log('errores', a.errores);
} finally { await a.cerrar(); }
