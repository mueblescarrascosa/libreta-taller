// 1.45.0: la mejor cocina también propone altos en las paredes con bajos que aún no tienen ninguno (antes solo en las
// que ya tenían alguno), y puede llenar la pared libre de una vez; sin tapar ventanas.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo, REMATES, situarMuebles } from '../docs/js/modulos.js';
import { mejorCocina } from '../docs/js/puntuacion.js';

REMATES.porDefecto = false;
const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const cocina = paredes => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; return f; };

prueba('paredes B y C con bajos y sin altos: se proponen altos', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800), mod('lavavajillas', 600)], altos: [mod('alto', 900), mod('alto', 800)] }),
    pared('B', 2400, { bajos: [mod('cajonero', 600), mod('bajo', 600), mod('bajo', 600)] }), pared('C', 1800, { bajos: [mod('bajo', 900), mod('bajo', 900)] })]);
  const r = mejorCocina(f), al = l => r.ficha.datos.paredes.find(p => p.letra === l).altos;
  afirma(al('B').length && al('C').length, JSON.stringify(r.cambios));
  igual(f.datos.paredes[1].altos, [], 'la ficha no se toca');
});
prueba('pared sin bajos: no se ponen altos', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800)], altos: [mod('alto', 900)] }), pared('B', 2400)]);
  igual(mejorCocina(f).ficha.datos.paredes[1].altos, []);
});
prueba('pared con una ventana: los altos que se proponen no la tapan', () => {
  const v = { id: 'v', tipo: 'ventana', para: null, nombre: '', distancia: 600, ref: 'izq', altura: 1000, ancho: 1200, alto: 1200 };
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800)], altos: [mod('alto', 900)] }),
    pared('B', 2400, { elementos: [v], bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('bajo', 600)] })]);
  const r = mejorCocina(f), pB = r.ficha.datos.paredes[1];
  situarMuebles(pB, r.ficha.datos).altos.forEach(a => afirma(a.hasta <= 600 || a.desde >= 1800, 'tapa la ventana: ' + a.desde + '-' + a.hasta + ' ' + JSON.stringify(r.cambios)));
});
fin();
