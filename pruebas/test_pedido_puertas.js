import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, puertaNueva, AJUSTES_FABRICA, mezclarAjustes } from '../docs/js/modelo.js';
import { recuentoPuertas, puertaParaPremarco } from '../docs/js/trabajos.js';

const q = (a, h) => { const r = puertaParaPremarco(a, h); return [r.ancho && r.ancho.w, r.ancho && r.ancho.rebaje, r.alto && r.alto.w, r.alto && r.alto.rebaje]; };

prueba('qué puerta pide cada premarco (ancho +3 cm, alto +2 cm, rebajar hasta 3 cm)', () => {
  igual(q(860, 2050), [820, 0, 2030, 0]);    // lo habitual: 4 cm de sobra
  igual(q(850, 2040), [820, 0, 2030, 10]);   // justo de ancho; 1 cm que rebajar de alto
  igual(q(840, 2050), [805, 0, 2030, 0]);    // mejor la de 80,5 que rebajar 1 cm para la de 82
  igual(q(830, 2050), [805, 5, 2030, 0]);    // la de 80,5 rebajando 0,5 antes que bajar a la de 72
  igual(q(950, 2130), [920, 0, 2110, 0]);
  igual(q(600, 2000), [null, null, null, null]); // no entra ninguna
  igual(q(1200, 2050)[0], null);             // sobra demasiado: no es ninguna puerta de catálogo
});

prueba('el recuento junta los premarcos parecidos en la puerta a pedir', () => {
  const f = fichaNueva('puerta', null, 't');
  f.datos.medida = 'premarco';
  f.datos.puertas = [[860, 2040], [860, 2060], [850, 2050], [840, 2050], [860, 2060], [600, 2000]].map(([ancho, alto]) => Object.assign(puertaNueva(null), { ancho, alto }));
  const r = recuentoPuertas([f], 'cm');
  igual(r.total, 6);
  igual(r.lineas.slice(0, 3), ['4 de 82 × 203 · premarcos 86×204 (rebajar 1 cm de alto), 86×206 ×2, 85×205',
    '1 de 80,5 × 203 (no todos los fabricantes) · premarco 84×205', '1 sin puerta que encaje · premarco 60×200']);
});

prueba('lo medido como puerta sigue por su medida; los ajustes cambian las reglas', () => {
  const f = fichaNueva('puerta', null, 't');
  f.datos.medida = 'puerta';
  f.datos.puertas = [Object.assign(puertaNueva(null), { ancho: 820, alto: 2030 })];
  igual(recuentoPuertas([f], 'cm').lineas, ['1 de 82 × 203']);
  // Sin los «,5» y pidiendo solo 2 cm de más, con 84 ya sale la de 82.
  const aj = mezclarAjustes({ pedido_anchos_extra: [], holgura_ancho: 20 });
  igual(puertaParaPremarco(840, 2050, aj).ancho.w, 820);
  igual(AJUSTES_FABRICA.pedido_altos, [2110, 2030]);
});

prueba('las de entrada van aparte: otro grosor, no se juntan con las de paso', () => {
  const f = fichaNueva('puerta', null, 't');
  f.datos.medida = 'premarco';
  f.datos.puertas = [['Entrada', 860, 2050], ['Entrada 2', 860, 2060], ['Entrada 3', 850, 2050], ['Salón', 860, 2060], ['Habitación 1', 860, 2050]].map(([nombre, ancho, alto]) => Object.assign(puertaNueva(null), { nombre, ancho, alto }));
  const r = recuentoPuertas([f], 'cm');
  igual([r.total, r.paso, r.entrada, r.titulo], [5, 2, 3, 'Puertas: 5 (2 de paso y 3 de entrada)']);
  igual(r.lineas[0], '2 de 82 × 203 · premarcos 86×206, 86×205');
  afirma(r.lineas.includes('Entrada: 3 de 82 × 203'), r.lineas.join(' | '));
});
fin();
