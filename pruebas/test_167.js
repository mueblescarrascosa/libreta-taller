import { prueba, afirma, igual, fin } from './mini.js';
import { resumenPuerta, textoTipoPuerta, otraHoja, anchoFijo, tiposPuertaPara, TIPOS_PUERTA } from '../docs/js/modelo.js';
import { recuentoPuertas } from '../docs/js/trabajos.js';

const P = o => Object.assign({ id: 'x', nombre: '', tipo: null, ancho: null, alto: null, tabique: null, mano: null, condena: null, vidriera: null }, o);

prueba('el paño fijo ya no es un tipo, salvo en puertas antiguas que lo tenían', () => {
  afirma(!TIPOS_PUERTA.some(t => t[0] === 'fija'));
  afirma(tiposPuertaPara(P({ tipo: 'fija' })).some(t => t[0] === 'fija'));
  igual(textoTipoPuerta(P({ tipo: 'fija' }), 'cm'), 'fija');
});
prueba('doble: hojas iguales, o la que abre y la otra calculada', () => {
  igual(textoTipoPuerta(P({ tipo: 'doble', ancho: 1200, hojas_iguales: true }), 'cm'), 'doble, hojas iguales');
  const d = P({ tipo: 'doble', ancho: 1200, hojas_iguales: false, hoja1: 800 });
  igual(otraHoja(d), 400);
  igual(textoTipoPuerta(d, 'cm'), 'doble, hojas 80 + 40 cm');
  igual(textoTipoPuerta(P({ tipo: 'doble', hojas_iguales: false, hoja1: 800 }), 'cm'), 'doble, hojas 80 + ? cm');
  igual(textoTipoPuerta(P({ tipo: 'doble', hojas_iguales: false }), 'cm'), 'doble, hojas distintas');
});
prueba('paño fijo: ancho total menos la puerta, con su lado', () => {
  const p = P({ tipo: 'abatible', ancho: 1200, alto: 2030, fijo: true, puerta_ancho: 820, fijo_lado: 'izq' });
  igual(anchoFijo(p), 380);
  igual(resumenPuerta(p, 'cm'), '120 × 203 cm · puerta 82 cm + paño fijo 38 cm a la izquierda');
  igual(textoTipoPuerta(P({ fijo: true, ancho: 1200 }), 'cm'), 'paño fijo');
});
prueba('doble con paño fijo: la hoja se resta del ancho de la puerta', () => {
  const p = P({ tipo: 'doble', ancho: 1600, fijo: true, puerta_ancho: 1200, hojas_iguales: false, hoja1: 800, fijo_lado: 'der' });
  igual(otraHoja(p), 400); igual(anchoFijo(p), 400);
});
prueba('recuento: con paño fijo cuenta el ancho de la puerta', () => {
  const r = recuentoPuertas([{ id: 'f', tipo: 'puerta', nombre: '', datos: { puertas: [P({ ancho: 1200, alto: 2030, fijo: true, puerta_ancho: 820 }), P({ ancho: 820, alto: 2030 })] } }], 'cm');
  afirma(r.lineas.includes('2 de 82 × 203'), r.lineas.join(' | '));
  afirma(r.lineas.includes('Con paño fijo: 1'), r.lineas.join(' | '));
});
fin();
