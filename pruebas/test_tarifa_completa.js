// 1.47.0: «Calcular con la tarifa» lo incluye todo: costados y regletas (material según la gama), tiradores según
// Acabados, cornisa y tira LED por metro y electrodomésticos orientativos (estos, solo al calcular).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, mezclarAjustes } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { paquetePresupuesto } from '../docs/js/presupuesto.js';
import { conGama, GAMAS_TARIFA } from '../docs/js/tarifa.js';
import { PRECIOS_EXTRA } from '../docs/js/coste.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
function cocina(ac = {}) {
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [], bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('bajo', 600), mod('fregadero', 800)], altos: [mod('alto', 600), mod('alto', 800)] })];
  Object.assign(f.datos.acabados, ac);
  f.datos.electro = [{ clave: 'horno', tipo: 'columna' }];
  return f;
}
const AJ = mezclarAjustes({}), g = (p, n) => p.grupos.find(x => x.nombre === n), rev = p => (p.grupos.find(x => x.tipo === 'revisar') || { lineas: [] }).lineas;

prueba('costados y regletas con medidas de la tarifa; la gama cambia su material', () => {
  const p = paquetePresupuesto(cocina(), null, AJ);
  const c = g(p, 'Costados'), r = g(p, 'Regletas');
  afirma(c && c.lineas.length && c.lineas.every(l => [350, 600].includes(l.ancho)), JSON.stringify(c));
  afirma(r && r.lineas.every(l => l.ancho === 100 && l.und >= 1), JSON.stringify(r));
  const alta = conGama(p, ...GAMAS_TARIFA[2].slice(1));
  igual([g(alta, 'Costados').cal, g(alta, 'Regletas').cal, alta.grupos[0].cal], ['COLOR 19', 'LACA M', 'ALTO GAMA']);
});
prueba('tirador de Acabados en los grupos de muebles: visto (o nada) medio, gola, uñero e integrado (gamma)', () => {
  const t = ac => paquetePresupuesto(cocina(ac), null, AJ).grupos.filter(x => x.tipo === 'muebles').map(x => x.tir.tipo);
  igual(t({}), ['medio', 'medio']); igual(t({ tirador: 'visto' }), ['medio', 'medio']);
  igual(t({ tirador: 'gola' }), ['gola', 'gola']); igual(t({ tirador: 'unero' }), ['unero', 'unero']); igual(t({ tirador: 'integrado' }), ['gamma', 'gamma']);
  igual(g(paquetePresupuesto(cocina(), null, AJ), 'Tiradores'), undefined, 'sin grupo de extras de tiradores');
});
prueba('cornisa y LED por metro; a 0 € van a «Revisar»', () => {
  const p = paquetePresupuesto(cocina({ lineales: [{ tipo: 'cornisa' }, { tipo: 'led' }] }), null, AJ), l = g(p, 'Cornisa y luz').lineas;
  igual(l.map(x => x.precio), [2 * PRECIOS_EXTRA.cornisa, 1.4 * PRECIOS_EXTRA.led]);
  afirma(!rev(p).some(x => /^(Cornisa|Tira LED)/.test(x)), JSON.stringify(rev(p)));
  const p0 = paquetePresupuesto(cocina({ lineales: [{ tipo: 'cornisa' }] }), null, mezclarAjustes({ precios_extra: { cornisa: 0 } }));
  igual(g(p0, 'Cornisa y luz'), undefined); afirma(rev(p0).some(x => /^Cornisa/.test(x)));
});
prueba('electrodomésticos: con precio orientativo solo al calcular; al pasar, para elegir modelo', () => {
  const e = paquetePresupuesto(cocina(), null, AJ, { estimar: true });
  igual(g(e, 'Electrodomésticos (orientativo)').lineas.map(x => x.precio), [PRECIOS_EXTRA.horno]);
  const p = paquetePresupuesto(cocina(), null, AJ);
  igual(g(p, 'Electrodomésticos (orientativo)'), undefined); afirma(rev(p).some(x => /horno/.test(x)));
});
prueba('ajustes: precios de extras de fábrica y guardados válidos', () => {
  igual(AJ.precios_extra, PRECIOS_EXTRA);
  const a = mezclarAjustes({ precios_extra: { horno: 500, placa: -1, raro: 3 } });
  igual([a.precios_extra.horno, a.precios_extra.placa, a.precios_extra.raro], [500, PRECIOS_EXTRA.placa, undefined]);
});
fin();
