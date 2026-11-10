import { prueba, afirma, igual, fin } from './mini.js';
import { anguloEsquina, comprobar, aEscala, planoPorDefecto, angulosNominales, reenderezar } from '../docs/js/plano-geo.js';

const esc = () => ({ estado: 'escuadra', sentido: null, mm: null, en: 1000 });
// Plano a partir de vértices de pantalla (sentido horario) y largos en mm.
const plano = (vs, largos, o) => Object.assign({ vertices: vs.map(([x, y]) => ({ x, y })), cerrada: true, largos, esquinas: vs.map(esc), diagonales: [] }, o);
const RECT = [[0, 0], [300, 0], [300, 200], [0, 200]];
const ELE = [[0, 0], [300, 0], [300, 100], [150, 100], [150, 200], [0, 200]];
const cerca = (a, b, t) => Math.abs(a - b) <= (t ?? 0.5);

prueba('ángulos nominales del dibujo: 90 y 270 en una L', () => igual(angulosNominales(plano(ELE, [])).map(Math.round), [90, 90, 90, 270, 90, 90]));
prueba('rectángulo que cierra', () => igual(comprobar(plano(RECT, [3000, 2000, 3000, 2000])).cierre, 'ok'));
prueba('justo 10 mm aún cierra', () => igual(comprobar(plano(RECT, [3000, 2000, 3010, 2000])).cierre, 'ok'));
prueba('11 mm no cierra y señala las paredes de ese eje', () => {
  const r = comprobar(plano(RECT, [3000, 2000, 3011, 2000]));
  igual(r.cierre, 'falla'); afirma(cerca(Math.abs(r.errorX), 11), String(r.errorX)); afirma(cerca(r.errorY, 0), String(r.errorY)); igual(r.paredes, [0, 2]);
});
prueba('L que cierra', () => igual(comprobar(plano(ELE, [3000, 1000, 1500, 1000, 1500, 2000])).cierre, 'ok'));
prueba('falta un largo', () => { const r = comprobar(plano(RECT, [3000, null, 3000, 2000])); igual(r.cierre, 'sin_datos'); igual(r.faltan, [1]); });
prueba('esquina descuadrada sin desviación: no se puede comprobar, nunca ok', () => {
  const p = plano(RECT, [3000, 2000, 3000, 2000]); p.esquinas[1] = { estado: 'descuadrada', sentido: 'abierta', mm: null, en: 1000 };
  igual(comprobar(p).cierre, 'no_comprobable'); igual(aEscala(p), null);
});
prueba('ángulo de una esquina descuadrada', () => {
  afirma(cerca(anguloEsquina({ estado: 'descuadrada', sentido: 'abierta', mm: 17.45, en: 1000 }, 90), 91, 0.01));
  afirma(cerca(anguloEsquina({ estado: 'descuadrada', sentido: 'cerrada', mm: 17.45, en: 1000 }, 90), 89, 0.01));
  igual(anguloEsquina(esc(), 270), 270); igual(anguloEsquina({ estado: 'descuadrada', sentido: 'abierta', mm: null, en: 1000 }, 90), null);
});
prueba('figura con dos esquinas descuadradas conocidas cierra', () => {
  // Pared izquierda inclinada 35 mm en 2000: esquina 0 abierta y esquina 3 cerrada.
  const p = plano(RECT, [3000, 2000, 3035, 2000]);
  p.esquinas[0] = { estado: 'descuadrada', sentido: 'abierta', mm: 35, en: 2000 };
  p.esquinas[3] = { estado: 'descuadrada', sentido: 'cerrada', mm: 35, en: 2000 };
  const r = comprobar(p); igual(r.cierre, 'ok', JSON.stringify(r));
});
prueba('figura abierta', () => igual(comprobar(plano([[0, 0], [300, 0], [300, 200]], [3000, 2000], { cerrada: false })).cierre, 'abierta'));
prueba('diagonal del rectángulo', () => {
  const p = plano(RECT, [3000, 2000, 3000, 2000], { diagonales: [{ de: 0, a: 2, mm: 3606 }, { de: 1, a: 3, mm: 3620 }] }), d = comprobar(p).diagonales;
  afirma(cerca(d[0].calculada, 3605.55, 0.1)); igual(d[0].ok, true); igual(d[1].ok, false);
});
prueba('a escala: cierra -> vértices en mm; no cierra -> null', () => {
  const v = aEscala(plano(ELE, [3000, 1000, 1500, 1000, 1500, 2000]));
  igual(v.length, 6); afirma(cerca(v[1].x - v[0].x, 3000) && cerca(v[1].y, v[0].y) && cerca(v[2].y - v[1].y, 1000), JSON.stringify(v));
  igual(aEscala(plano(RECT, [3000, 2000, 3050, 2000])), null);
});
prueba('a escala una figura abierta con todos los largos', () => {
  const v = aEscala(plano([[0, 0], [300, 0], [300, 200]], [3000, 2000], { cerrada: false })); igual(v.length, 3); afirma(cerca(v[2].y - v[1].y, 2000));
});
prueba('plano por defecto: paredes seguidas en ángulo recto', () => {
  const p1 = planoPorDefecto([{ largo: 3000 }]); igual(p1.cerrada, false); igual(p1.vertices.length, 2);
  const p3 = planoPorDefecto([{ largo: 3000 }, { largo: 2000 }, { largo: 3000 }]); igual(p3.cerrada, false); igual(aEscala(p3).length, 4);
  const p4 = planoPorDefecto([{ largo: 3000 }, { largo: 2000 }, { largo: 3000 }, { largo: 2000 }]); igual(p4.cerrada, true); igual(comprobar(p4).cierre, 'ok');
  igual(planoPorDefecto([]), null);
});
prueba('la esquina de arriba a la izquierda también cuenta', () => {
  const p = plano(RECT, [3000, 2000, 3000, 2000]); p.esquinas[0] = { estado: 'descuadrada', sentido: 'abierta', mm: 50, en: 1000 };
  const r = comprobar(p); igual(r.cierre, 'falla', JSON.stringify(r)); afirma(r.paredes.includes(0) && r.paredes.includes(3), JSON.stringify(r.paredes));
});
prueba('por qué no se puede comprobar: esquina sin medir o esquina que no es recta', () => {
  const p = plano(RECT, [3000, 2000, 3000, 2000]); p.esquinas[1] = { estado: 'descuadrada', sentido: 'abierta', mm: null, en: 1000 };
  const r = comprobar(p); igual([r.cierre, r.motivo, r.esquina], ['no_comprobable', 'esquina_sin_medir', 1]);
  const ch = plano([[0, 0], [200, 0], [300, 100], [300, 300], [0, 300]], [2000, 1414, 2000, 3000, 3000]);
  const s = comprobar(ch); igual([s.cierre, s.motivo], ['no_comprobable', 'esquina_no_recta']);
});
prueba('reenderezar lleva a 90° lo que se torció al arrastrar', () => {
  const v = reenderezar([{ x: 0, y: 0 }, { x: 300, y: 3 }, { x: 300, y: 200 }, { x: 0, y: 200 }], true);
  igual(angulosNominales({ vertices: v, cerrada: true }).map(Math.round), [90, 90, 90, 90]);
});
fin();
