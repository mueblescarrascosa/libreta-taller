// 1.41.2: cada modelo elegido cambia el dibujo y la puntuación (placa con puertas, vitrinas, 1/4+3/4, abatible, decorativos).
import { prueba, afirma, igual, fin } from './mini.js';
import { frenteModulo } from '../docs/js/frentes.js';
import { puntuarCocina, mejorCocina } from '../docs/js/puntuacion.js';
import { avisosObra } from '../docs/js/avisos-obra.js';
import { elementoNuevo } from '../docs/js/modelo.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';

const k = (f, x) => f.filter(q => q.k === x);
const cajonesDe = f => f.filter((q, i) => q.k === 'hoja' && f[i + 1] && f[i + 1].k === 'tirador' && f[i + 1].x1 - f[i + 1].x0 > f[i + 1].z1 - f[i + 1].z0).length;
const cocina = (...bajos) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [], bajos: bajos.map(([t, w, v]) => Object.assign(moduloNuevo(t), { ancho: w, variante: v || null })), altos: [] })]; return f; };

prueba('placa con puertas: se dibujan puertas, no cajones', () => {
  igual(cajonesDe(frenteModulo('placa', 600, 100, 860, { variante: 'PUERTAS' })), 0);
  afirma(cajonesDe(frenteModulo('placa', 600, 100, 860, {})) >= 2, 'sin elegir, cajones');
});
prueba('la puntuación cambia al pasar de cajones a puertas (placa y bajo)', () => {
  const nota = (vp, vb) => puntuarCocina(cocina(['bajo', 800, vb], ['placa', 600, vp], ['fregadero', 800])).almacenaje.nota;
  afirma(nota('PUERTAS', null) < nota(null, null), 'placa con puertas guarda menos');
  afirma(nota(null, '2 CACEROLEROS') > nota(null, null), 'bajo con caceroleros guarda más');
  afirma(nota(null, '1 GAVETERO 1 PUERTA') > nota(null, null) && nota(null, '1 GAVETERO 1 PUERTA') < nota(null, '2 CACEROLEROS'), 'mixto, en medio');
});
prueba('vitrinas con cristal; 1/4+3/4 con dos puertas en alto; abatible una hoja; decorativos abiertos', () => {
  afirma(k(frenteModulo('alto', 600, 1450, 2150, { variante: 'VITRINA' }), 'vidrio').length >= 1, 'alto vitrina');
  afirma(k(frenteModulo('bajo', 600, 100, 860, { variante: 'VITRINA' }), 'vidrio').length >= 1, 'bajo vitrina');
  const c = frenteModulo('despensero', 600, 0, 2150, { columna: true, variante: '1/4+3/4' });
  igual(k(c, 'hoja').length, 2);
  const a = frenteModulo('alto', 600, 1450, 2150, { variante: 'ABATIBLE' });
  igual(k(a, 'hoja').length, 1); igual(cajonesDe(a), 0, 'cuenta como puerta');
  igual(k(frenteModulo('alto', 600, 1450, 2150, { variante: '2 ESTANTES DECORATIVO' }), 'hoja').length, 0);
  afirma(k(frenteModulo('alto', 600, 1450, 2150, { variante: 'BOTELLERO DECORATIVO' }), 'tablero').length >= 3, 'botellero');
});
prueba('la mejor cocina no pone altos encima de una ventana', () => {
  const f = cocina(['bajo', 600], ['fregadero', 800], ['bajo', 600], ['bajo', 600]);
  const p = f.datos.paredes[0];
  p.altos = [Object.assign(moduloNuevo('alto'), { ancho: 600 })];
  p.elementos = [Object.assign(elementoNuevo('ventana', 'izq'), { distancia: 800, ancho: 1000, altura: 1100, alto: 1100 })];
  const r = mejorCocina(f), tapa = x => avisosObra(x, 'mm').filter(a => /tapa la ventana/.test(a.texto)).length;
  igual(tapa(f), 0, 'antes no tapa');
  igual(tapa(r.ficha), 0, 'la propuesta tampoco: ' + r.cambios.join(' | '));
});
await fin();
