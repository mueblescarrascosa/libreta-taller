// Saca una captura de la perspectiva de una cocina inventada: node pruebas/perspectiva_muestra.js [salida.png]
import { abrir } from './arnes.js';
const a = await abrir({});
try {
  await a.page.setViewportSize({ width: 1100, height: 760 });
  await a.page.evaluate(async () => {
    const { escenaPerspectiva, vistaPorDefecto, svgPerspectiva } = await import('./js/perspectiva.js');
    const m = (tipo, ancho, gira) => ({ id: Math.random() + '', tipo, ancho, gira });
    const P = (letra, largo, extra = {}) => Object.assign({ letra, largo, elementos: [], bajos: [], altos: [] }, extra);
    const d = { alto_techo: 2600, paredes: [
      P('A', 3000, { bajos: [m('columna_frigo', 600), m('fregadero', 800), m('bajo', 600), m('rinconero', 930, 'der')], altos: [m('alto_frigo', 600), m('alto', 800), m('alto', 600)], azulejo: 'franja', azulejo_desde: 850, azulejo_hasta: 1450 }),
      P('B', 2500, { bajos: [m('bajo', 600), m('placa', 800)], elementos: [{ tipo: 'ventana', ref: 'der', distancia: 300, ancho: 1000, altura: 1000, alto: 1100 }, { tipo: 'pilar', ref: 'der', distancia: 0, ancho: 300, fondo: 250 }] }),
      P('C', 3000), P('D', 2500, { elementos: [{ tipo: 'puerta', ref: 'izq', distancia: 500, ancho: 820 }] })] };
    const e = escenaPerspectiva(d);
    document.body.replaceChildren(svgPerspectiva(e, vistaPorDefecto(e)));
    document.body.style.margin = 0;
  });
  await a.page.screenshot({ path: process.argv[2] || (await import('node:os')).tmpdir() + '/perspectiva.png' });
  console.log('errores', a.errores);
} finally { await a.cerrar(); }
