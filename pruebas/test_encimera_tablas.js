// 1.48.0: tableros de encimera según el material (Egger 4,10 m; Topform 3,60 m) y tablas de piedra (3,02×1,40 o
// 3,20×1,59, la que gaste menos), en el presupuesto y en Material.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { tablerosEncimera, tablasPiedra, textoTablas, textoMaterial } from '../docs/js/material.js';
import { encimeraPresupuesto } from '../docs/js/presupuesto.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
function cocina(material, largoA = 3800) {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: largoA, elementos: [], altos: [], bajos: Array.from({ length: Math.floor(largoA / 600) }, () => mod('bajo', 600)) })];
  f.datos.acabados.encimera = { material, modelo: '', color: '', grueso: 20 };
  return f;
}
prueba('laminados: Egger en tableros de 4,10 m y Topform de 3,60 m', () => {
  const und = m => encimeraPresupuesto(cocina(m).datos).extras[0].und;
  igual([und('Hidrófuga Egger'), und('Topform')], [1, 2]);
  afirma(textoMaterial(cocina('Topform')).includes('- Tableros: 2 de 3,60 m'), textoMaterial(cocina('Topform')).join(' | '));
  afirma(textoMaterial(cocina('Hidrófuga Egger')).includes('- Tableros: 1 de 4,10 m'));
});
prueba('piedra: tablas de 3,02×1,40 o 3,20×1,59, la que gasta menos primero; pieza más larga que la tabla, con junta', () => {
  igual(tablasPiedra([{ largo: 2800, fondo: 620 }, { largo: 1500, fondo: 620 }]).map(t => [t.largo, t.tablas]), [[3020, 1], [3200, 1]]);
  igual(textoTablas(tablasPiedra([{ largo: 2800, fondo: 620 }])), '1 tabla de 3,02×1,40 (o 1 de 3,20×1,59)');
  const e = encimeraPresupuesto(cocina('Silestone').datos);
  afirma(/· \d tablas? de 3,02×1,40 .*\(precio del marmolista\)$/.test(e.libres[0].texto), e.libres[0].texto);
  afirma(e.revisar.some(t => /lleva junta/.test(t)), JSON.stringify(e.revisar));
  afirma(textoMaterial(cocina('Granito', 2400)).some(t => /^- Tablas: 1 tabla de 3,02×1,40/.test(t)), textoMaterial(cocina('Granito', 2400)).join(' | '));
  igual(tablerosEncimera([{ largo: 5000 }], 3600), 2);
});
fin();
