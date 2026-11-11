// Genera los iconos de la app (192 y 512) a partir de un SVG. Se ejecuta a mano: node pruebas/generar_icono.js
import { chromium } from 'playwright-core';
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f2937"/>
  <g transform="translate(256 256) scale(0.86) translate(-256 -256)">
  <!-- Libreta: hoja color papel con margen rojo, renglones y anillas -->
  <g transform="rotate(-6 256 256)">
    <rect x="132" y="96" width="250" height="320" rx="18" fill="#000" opacity=".25" transform="translate(8 10)"/>
    <rect x="132" y="96" width="250" height="320" rx="18" fill="#fffdf6"/>
    <line x1="176" y1="96" x2="176" y2="416" stroke="#e7a49a" stroke-width="6"/>
    <g stroke="#d9cfb8" stroke-width="4">
      <line x1="190" y1="170" x2="360" y2="170"/><line x1="190" y1="214" x2="360" y2="214"/>
      <line x1="190" y1="258" x2="360" y2="258"/><line x1="190" y1="302" x2="360" y2="302"/><line x1="190" y1="346" x2="360" y2="346"/>
    </g>
    <!-- Cota de medida -->
    <g stroke="#b45309" stroke-width="7" stroke-linecap="round">
      <line x1="200" y1="236" x2="340" y2="236"/><line x1="200" y1="218" x2="200" y2="254"/><line x1="340" y1="218" x2="340" y2="254"/>
    </g>
    <g fill="#1f2937">
      <circle cx="132" cy="140" r="11"/><circle cx="132" cy="200" r="11"/><circle cx="132" cy="260" r="11"/><circle cx="132" cy="320" r="11"/><circle cx="132" cy="380" r="11"/>
    </g>
  </g>
  <!-- Lápiz -->
  <g transform="rotate(38 360 330)">
    <rect x="340" y="190" width="40" height="190" rx="6" fill="#f59e0b"/>
    <rect x="340" y="190" width="40" height="26" rx="6" fill="#e7a49a"/>
    <rect x="340" y="212" width="40" height="10" fill="#9ca3af"/>
    <path d="M340 380 L380 380 L360 420 Z" fill="#fde68a"/>
    <path d="M352 404 L368 404 L360 420 Z" fill="#1f2937"/>
  </g>
  </g>
</svg>`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const n of [512, 192]) {
    await page.setViewportSize({ width: n, height: n });
    await page.setContent('<html><body style="margin:0">' + SVG.replace('<svg ', '<svg width="' + n + '" height="' + n + '" ') + '</body></html>');
    await page.screenshot({ path: 'docs/icons/icon-' + n + '-v2.png', clip: { x: 0, y: 0, width: n, height: n } });
  }
} finally { await browser.close(); }
