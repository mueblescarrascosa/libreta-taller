import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo, avisos } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
const el = (tipo, x) => Object.assign(elementoNuevo(tipo, 'izq'), x);
const pared = (letra, largo, extra = {}) => Object.assign(paredNueva([]), { letra, largo, elementos: [] }, extra);
const textos = f => avisos(f, 'cm').map(a => a.texto);

function cocina(extra = {}) {
  const f = fichaNueva('cocina', null, 't');
  f.datos.alto_techo = 2500;
  f.datos.paredes = [
    pared('A', 3600, { bajos: [mod('bajo', 600), mod('fregadero', 800), mod('placa', 600), mod('bajo', 600)], altos: [mod('alto', 600), mod('alto', 800), mod('alto_campana', 600)],
      elementos: [el('desague', { distancia: 900, altura: 400 }), el('humos', { distancia: 1700, altura: 2200 }), el('enchufe', { para: 'campana', distancia: 1700, altura: 1900 })] }),
    pared('B', 2000)];
  Object.assign(f.datos, extra);
  return f;
}

prueba('una cocina bien puesta no da avisos de obra', () => {
  igual(textos(cocina()), []);
});

prueba('ventanas y puertas: un alto o un bajo que la tapa, un mueble contra la puerta', () => {
  const f = cocina(), A = f.datos.paredes[0], B = f.datos.paredes[1];
  A.elementos.push(el('ventana', { distancia: 100, ancho: 1000, altura: 800, alto: 1000 }));
  B.bajos = [mod('columna_hmo', 600)]; B.elementos.push(el('puerta', { distancia: 300, ancho: 820 }));
  const t = textos(f);
  afirma(t.some(x => /Ventana de la pared A a 80 cm del suelo: queda por debajo de la encimera \(85 cm\) sobre Bajo 60/.test(x)), t.join(' | '));
  afirma(t.some(x => x === 'Alto 60 de la pared A tapa la ventana'), t.join(' | '));
  afirma(t.some(x => x === 'Columna H/MO 60 de la pared B choca con la puerta'), t.join(' | '));
});

prueba('instalaciones: desagüe lejos del fregadero, humos fuera de la placa, enchufe sin su mueble', () => {
  const f = cocina(), A = f.datos.paredes[0];
  A.elementos[0].distancia = 3300; A.elementos[1].distancia = 300;
  A.elementos.push(el('enchufe', { para: 'hmo', distancia: 200, altura: 1100 }));
  const t = textos(f);
  afirma(t.includes('Desagüe de la pared A a 190 cm del fregadero'), t.join(' | '));
  afirma(t.some(x => /La salida de humos de la pared A no cae encima de la placa/.test(x)), t.join(' | '));
  afirma(t.some(x => /Enchufe H\/MO en la pared A, pero no hay columna H\/MO/.test(x)), t.join(' | '));
});

prueba('enchufe en el canto de la encimera y techo más bajo que las columnas', () => {
  const f = cocina({ alto_techo: 2100 }), A = f.datos.paredes[0];
  A.elementos.push(el('enchufe', { distancia: 100, altura: 840 }));
  const t = textos(f);
  afirma(t.some(x => /a 84 cm: cae en el canto de la encimera/.test(x)), t.join(' | '));
  afirma(t.some(x => /El techo \(210 cm\) es más bajo que las columnas y los altos \(215 cm\)/.test(x)), t.join(' | '));
});
fin();
