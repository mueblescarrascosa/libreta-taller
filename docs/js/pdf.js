// PDF de una parte de la página (el resumen) con jsPDF y html2canvas, cargadas solo cuando hacen falta.
export const LIB_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
export const LIB_H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

const cargadas = {};
function cargarScript(url) {
  if (!cargadas[url]) {
    cargadas[url] = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = url; s.onload = ok; s.onerror = () => { delete cargadas[url]; mal(new Error('No se ha podido cargar ' + url)); };
      document.head.append(s);
    });
  }
  return cargadas[url];
}

// Ancho con el que se «fotografía» el resumen: el de una hoja, se haga desde el móvil o desde el ordenador.
const ANCHO_HOJA = 760;
// Sitios buenos para cortar de página: antes de un título, una sección, una fila de tabla o un dibujo.
// No se corta justo después de un título (pasaría solo a la página siguiente su contenido).
const BLOQUES = 'h2, h3, section, tbody tr, p, .planta-resumen, .alzado-resumen, .ficha-resumen, .recuento, .fotos-resumen img, footer';
export function puntosDeCorte(el) {
  const arriba = el.getBoundingClientRect().top;
  return [...el.querySelectorAll(BLOQUES)]
    .filter(e => !(e.previousElementSibling && e.previousElementSibling.matches('h2, h3, .tit')))
    .filter(e => !(e.matches('tbody tr') && !e.previousElementSibling))
    .map(e => e.getBoundingClientRect().top - arriba)
    .filter(y => y > 0);
}
// Dónde acaba cada página (en píxeles del lienzo): el último corte bueno que quepa, si no deja la página casi vacía.
export function paginas(altoTotal, altoPagina, cortes) {
  const r = [];
  let y = 0;
  while (y < altoTotal) {
    let fin = y + altoPagina;
    if (fin < altoTotal) {
      const buenos = cortes.filter(c => c > y + altoPagina * 0.35 && c <= fin);
      if (buenos.length) fin = Math.max(...buenos);
    }
    fin = Math.min(fin, altoTotal);
    r.push([y, fin]);
    y = fin;
  }
  return r;
}

// A4 vertical con 10 mm de margen; las páginas se cortan por los sitios buenos.
export async function generarPdf(elemento) {
  await Promise.all([cargarScript(LIB_JSPDF), cargarScript(LIB_H2C)]);
  let cortes = [];
  elemento.setAttribute('data-pdf', '');
  try {
    const lienzo = await window.html2canvas(elemento, {
      scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: Math.max(ANCHO_HOJA + 80, window.innerWidth),
      onclone: docClon => {
        const el = docClon.querySelector('[data-pdf]');
        if (!el) return;
        Object.assign(el.style, { width: ANCHO_HOJA + 'px', maxWidth: 'none', boxShadow: 'none', border: '0' });
        // Los dibujos, a todo el ancho de la hoja (en pantalla llevan un tope de altura pensado para el móvil).
        el.querySelectorAll('svg.planta, svg.alzado').forEach(g => {
          const vb = g.viewBox && g.viewBox.baseVal, caja = g.parentElement.clientWidth || ANCHO_HOJA;
          if (!vb || !vb.width || !vb.height) return;
          // Tope de alto: la planta, algo más de media hoja; los alzados, dos por hoja.
          const tope = g.classList.contains('alzado') ? 440 : 560, ancho = Math.min(caja - 4, tope * vb.width / vb.height);
          Object.assign(g.style, { width: ancho + 'px', height: ancho * vb.height / vb.width + 'px', maxHeight: 'none', margin: '0 auto' });
        });
        cortes = puntosDeCorte(el);
      },
    });
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const ancho = 190, alto = 277, pxPorMm = lienzo.width / ancho, altoPagina = Math.floor(alto * pxPorMm), k = lienzo.width / ANCHO_HOJA;
    paginas(lienzo.height, altoPagina, cortes.map(c => Math.round(c * k))).forEach(([y0, y1], pag) => {
      const trozo = document.createElement('canvas');
      trozo.width = lienzo.width; trozo.height = y1 - y0;
      const ctx = trozo.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, trozo.width, trozo.height);
      ctx.drawImage(lienzo, 0, y0, lienzo.width, trozo.height, 0, 0, lienzo.width, trozo.height);
      if (pag) doc.addPage();
      doc.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 10, ancho, trozo.height / pxPorMm);
    });
    return doc.output('blob');
  } finally { elemento.removeAttribute('data-pdf'); }
}
