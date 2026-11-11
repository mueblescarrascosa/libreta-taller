import { prueba, afirma, igual, fin } from './mini.js';
import { textoResumen } from '../docs/js/resumen.js';
import { fichaNueva, trabajoNuevo, elementoNuevo, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';

const trabajo = Object.assign(trabajoNuevo('Reforma Sol', 'cm'), { cliente: 'Juan', direccion: 'C/ Sol 1' });

prueba('texto de puertas: cabecera, modelo y una línea por puerta', () => {
  const f = fichaNueva('puerta', null, 't'); Object.assign(f.datos, { modelo: 'Lisa', color: 'Blanco' });
  Object.assign(f.datos.puertas[0], { nombre: 'Dormitorio 1', ancho: 820, alto: 2030, tabique: 90, mano: 'izq', condena: true });
  f.datos.puertas.push(Object.assign(f.datos.puertas[0].constructor(), { id: 'p2', nombre: '', ancho: 720, alto: 2030, tabique: null, mano: null, condena: null, vidriera: true }));
  const t = textoResumen({ ficha: f, trabajo, ajustes: AJUSTES_FABRICA });
  afirma(t.startsWith('*Reforma Sol*'), t); afirma(t.includes('Juan') && t.includes('C/ Sol 1'));
  afirma(t.includes('*Puertas*') && t.includes('Modelo: Lisa') && t.includes('Color: Blanco'), t);
  afirma(t.includes('1. Dormitorio 1: 82 × 203 cm · tabique 9 · izquierda · condena'), t);
  afirma(t.includes('2. Puerta 2: 72 × 203 cm · vidriera'), t);
});
prueba('texto de cocina: altura, acabados, paredes con elementos y módulos', () => {
  const f = fichaNueva('cocina', null, 't'); const d = f.datos, p = d.paredes[0];
  d.alto_techo = 2600; Object.assign(d.acabados, { modelo: 'Alpha', color: 'Blanco' }); d.acabados.encimera.material = 'Compacto';
  Object.assign(p, { largo: 3000, azulejo: 'franja', azulejo_desde: 900, azulejo_techo: true });
  p.elementos.push(Object.assign(elementoNuevo('humos', 'izq'), { distancia: 600, altura: 2100 }), Object.assign(elementoNuevo('enchufe', 'der'), { para: 'hmo', distancia: 300, altura: 1100 }));
  p.bajos.push(Object.assign(moduloNuevo('columna_hmo'), { ancho: 600 }), Object.assign(moduloNuevo('fregadero'), { ancho: 800 }));
  const t = textoResumen({ ficha: f, trabajo, ajustes: AJUSTES_FABRICA });
  afirma(t.includes('Altura: 2,6 m'), t); afirma(t.includes('Muebles: Alpha Blanco') && t.includes('Encimera: Compacto'), t);
  afirma(t.includes('*Pared A* · 3 m\n- Azulejo desde 0,9 m hasta el techo'), t);
  afirma(t.includes('- Salida de humos: a 60 cm desde la izquierda, altura 210 cm'), t);
  afirma(t.includes('- Enchufe H/MO (columna): a 30 cm desde la derecha, altura 110 cm'), t);
  afirma(t.includes('- Bajos: Columna H/MO 60, Fregadero 80 (quedan 160 cm)'), t);
});
prueba('texto de armario con cuerpos, y notas y otras medidas al final', () => {
  const f = fichaNueva('armario', 'corredera', 't'); const d = f.datos;
  Object.assign(d, { ancho_arriba: 2000, ancho_abajo: 2010, alto_izq: 2400, fondo: 600, hojas: 2 });
  d.cuerpos.push({ id: 'c', ancho: 1000, interior: 'barra', nombre: '' });
  d.libres.push({ id: 'l', nombre: 'Rodapié', mm: 100 }); d.notas.push({ id: 'n', texto: 'Ojo enchufe detrás' });
  const t = textoResumen({ ficha: f, trabajo, ajustes: AJUSTES_FABRICA });
  afirma(t.includes('*Armario corredera*'), t); afirma(t.includes('Ancho del hueco: arriba 200, abajo 201 cm'), t);
  afirma(t.includes('Hojas: 2') && t.includes('Cuerpos: 100 barra'), t);
  afirma(t.includes('Rodapié: 10 cm') && t.includes('Ojo enchufe detrás'), t);
});
prueba('sin datos no salen líneas vacías', () => {
  const t = textoResumen({ ficha: fichaNueva('nota', null, null), trabajo: null, ajustes: AJUSTES_FABRICA });
  afirma(!/undefined|null|NaN/.test(t), t); afirma(!/\n\n\n/.test(t), JSON.stringify(t));
});
fin();
