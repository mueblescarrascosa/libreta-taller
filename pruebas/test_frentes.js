import { prueba, afirma, igual, fin } from './mini.js';
import { frenteModulo, frenteCuerpo, FRENTE } from '../docs/js/frentes.js';
import { piezasInterior } from '../docs/js/modulos.js';

const de = (l, k) => l.filter(q => q.k === k);

prueba('cajonero: 4 cajones, cada uno con su tirador', () => {
  const f = frenteModulo('cajonero', 450, 100, 820);
  igual([de(f, 'hoja').length, de(f, 'tirador').length], [4, 4]);
});

prueba('puertas: una hasta 69 cm, dos desde 70 (bajos y altos)', () => {
  igual(de(frenteModulo('bajo', 600, 100, 820), 'hoja').length, 1);
  igual(de(frenteModulo('bajo', 700, 100, 820), 'hoja').length, 2);
  igual(de(frenteModulo('fregadero', 800, 100, 820), 'hoja').length, 2);
  igual(de(frenteModulo('alto', 800, 1450, 2150), 'hoja').length, 2);
  igual(de(frenteModulo('alto', 400, 1450, 2150), 'hoja').length, 1);
});

prueba('columna H/MO: horno y micro juntos desde 66 cm, 1 m de alto; cajones debajo y puerta encima', () => {
  const f = frenteModulo('columna_hmo', 600, 0, 2150, { columna: true }), el = de(f, 'electro');
  igual(el.length, 2);
  igual([Math.min(...el.map(q => q.z0)) - 5, Math.max(...el.map(q => q.z1)) + 5], [FRENTE.hmo_desde, FRENTE.hmo_desde + FRENTE.hmo_alto]);
  afirma(de(f, 'hoja').some(q => q.z1 <= 660) && de(f, 'hoja').some(q => q.z0 >= 1660), 'cajones debajo y puerta encima');
  igual(de(f, 'zocalo').length, 1);
});

prueba('vestidor: laterales, techo y zócalo; el pantalonero siempre abajo', () => {
  igual(frenteCuerpo(800, 2150).length, 5);
  for (const c of [{ interior: 'pantalonero', interior2: 'barra' }, { interior: 'barra', interior2: 'pantalonero' }, { interior: 'cajonera', interior2: 'pantalonero_doble' }, { interior: 'pantalonero' }]) {
    const p = piezasInterior(c, 2150).find(q => q.tipo === 'pantalonero');
    afirma(p && p.z0 <= 150, JSON.stringify(c) + ' → ' + JSON.stringify(p));
  }
});
fin();
