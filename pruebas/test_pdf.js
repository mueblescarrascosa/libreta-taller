import { prueba, igual, fin } from './mini.js';
import { paginas } from '../docs/js/pdf.js';

prueba('PDF: corta por el último sitio bueno que cabe, sin dejar páginas casi vacías', () => {
  igual(paginas(500, 1000, [100, 300]), [[0, 500]]);
  igual(paginas(2500, 1000, [400, 900, 1100, 1700, 2100]), [[0, 900], [900, 1700], [1700, 2500]]);
  // Sin sitio bueno (o solo muy arriba), se corta por el alto de la página.
  igual(paginas(2200, 1000, [100]), [[0, 1000], [1000, 2000], [2000, 2200]]);
});
fin();
