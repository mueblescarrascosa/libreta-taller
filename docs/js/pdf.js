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

// A4 vertical con 10 mm de margen; si no cabe, se corta en varias páginas.
export async function generarPdf(elemento) {
  await Promise.all([cargarScript(LIB_JSPDF), cargarScript(LIB_H2C)]);
  const lienzo = await window.html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const ancho = 190, alto = 277, pxPorMm = lienzo.width / ancho, altoPagina = Math.floor(alto * pxPorMm);
  for (let y = 0, pag = 0; y < lienzo.height; y += altoPagina, pag++) {
    const trozo = document.createElement('canvas');
    trozo.width = lienzo.width; trozo.height = Math.min(altoPagina, lienzo.height - y);
    trozo.getContext('2d').drawImage(lienzo, 0, y, lienzo.width, trozo.height, 0, 0, lienzo.width, trozo.height);
    if (pag) doc.addPage();
    doc.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 10, ancho, trozo.height / pxPorMm);
  }
  return doc.output('blob');
}
