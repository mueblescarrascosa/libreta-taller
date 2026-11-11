import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo, textoAzulejo, mezclarAjustes } from '../docs/js/modelo.js';
import { avisosModulos, cuadreCuerposPared } from '../docs/js/modulos.js';
import { textoResumen } from '../docs/js/resumen.js';
import { faltan, resumenCorto } from '../docs/js/trabajos.js';
import { geometriaPlanta } from '../docs/js/plano-vista.js';

const AJ = mezclarAjustes(null);
const vestidor = () => { const f = fichaNueva('armario', 'vestidor', 't'); f.datos.alto_techo = 2600; f.datos.paredes[0].largo = 2000; return f; };
const cuerpo = ancho => ({ id: crypto.randomUUID(), ancho, interior: null, nombre: '' });

// ── El vestidor no pide las medidas de un hueco de armario ──
prueba('vestidor con altura y largos: no le falta nada', () => {
  igual(faltan(vestidor()), []);
});
prueba('vestidor sin altura ni largo: dice exactamente qué falta', () => {
  const f = fichaNueva('armario', 'vestidor', 't');
  igual(faltan(f), ['Falta la altura', 'Pared A: falta el largo']);
});
prueba('armario normal sigue pidiendo el hueco', () => {
  igual(faltan(fichaNueva('armario', 'corredera', 't')), ['Falta el ancho del hueco', 'Falta el alto del hueco', 'Falta el fondo']);
});

// ── Cuerpos por pared en el vestidor ──
prueba('cuadre de los cuerpos de una pared contra su largo', () => {
  const p = Object.assign(paredNueva([]), { largo: 2000, cuerpos: [cuerpo(1000), cuerpo(800)] });
  igual(cuadreCuerposPared(p), { suma: 1800, resto: 200 });
});
prueba('aviso si los cuerpos de una pared se pasan', () => {
  const f = vestidor(); f.datos.paredes[0].cuerpos = [cuerpo(1200), cuerpo(1000)];
  const av = avisosModulos(f, 'cm');
  igual(av.map(a => a.texto), ['Cuerpos de la pared A: te pasas 20 cm']);
  igual(av[0].campo, 'pared.' + f.datos.paredes[0].id);
});
prueba('resumen del vestidor: cuerpos en su pared con el cuadre', () => {
  const f = vestidor(); f.datos.paredes[0].cuerpos = [cuerpo(1000), Object.assign(cuerpo(800), { interior: 'baldas' })];
  const t = textoResumen({ ficha: f, trabajo: { unidad: 'cm' }, ajustes: AJ });
  afirma(/\*Pared A\*[^\n]*\n- Cuerpos: 100, 80 [^\n]*\(quedan 20 cm\)/.test(t), t);
});
prueba('lista de fichas: cuenta los cuerpos de las paredes del vestidor', () => {
  const f = vestidor(); f.datos.paredes[0].cuerpos = [cuerpo(1000), cuerpo(800)];
  igual(resumenCorto(f), 'Vestidor · 2 cuerpos · 1 pared');
});
prueba('planta: los cuerpos del vestidor se dibujan en su pared', () => {
  const f = vestidor(); f.datos.paredes[0].cuerpos = [cuerpo(1000), cuerpo(800)];
  const g = geometriaPlanta(f.datos);
  igual(g.modulos.map(m => [m.tipo, m.ancho, m.pared]), [['cuerpo', 1000, 'A'], ['cuerpo', 800, 'A']]);
});

// ── Azulejo en franja más zonas ──
prueba('franja con zona: el texto dice las dos cosas', () => {
  const p = Object.assign(paredNueva([]), { azulejo: 'franja', azulejo_desde: 900, azulejo_hasta: 1500 });
  p.elementos.push(elementoNuevo('zona', 'izq'));
  igual(textoAzulejo(p, 'm'), 'azulejo desde 0,9 hasta 1,5 m + zonas');
  p.azulejo_desde = null; p.azulejo_hasta = null;
  igual(textoAzulejo(p, 'm'), 'azulejo en franja + zonas');
});

// ── Cajas orientativas en la planta ──
prueba('planta: enchufes, tomas y desagües llevan una caja orientativa centrada en su medida', () => {
  const f = fichaNueva('cocina', null, 't'), p = f.datos.paredes[0]; p.largo = 3000;
  const e = Object.assign(elementoNuevo('enchufe', 'izq'), { distancia: 1000 });
  const d = Object.assign(elementoNuevo('desague', 'izq'), { distancia: 2000 });
  p.elementos.push(e, d);
  const g = geometriaPlanta(f.datos), [ge, gd] = g.elementos;
  const largo = c => Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y);
  const k = largo([g.paredes[0].a, g.paredes[0].b]) / 3000;
  afirma(ge.caja && gd.caja, 'sin caja');
  afirma(Math.abs(largo(ge.caja) / k - 80) < 1, 'enchufe ' + largo(ge.caja) / k);
  afirma(Math.abs(largo(gd.caja) / k - 50) < 1, 'desagüe ' + largo(gd.caja) / k);
  const centro = c => ({ x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 });
  afirma(Math.hypot(centro(ge.caja).x - ge.punto.x, centro(ge.caja).y - ge.punto.y) < 1e-6, 'no está centrada');
});

// ── Cotas en el croquis: la medida junto al nombre ──
prueba('planta: cada elemento lleva su cota en la unidad del trabajo, desde su esquina', () => {
  const f = fichaNueva('cocina', null, 't'), p = f.datos.paredes[0]; p.largo = 3000;
  p.elementos.push(Object.assign(elementoNuevo('enchufe', 'izq'), { distancia: 1000 }),
    Object.assign(elementoNuevo('ventana', 'der'), { distancia: 450, ancho: 800 }),
    Object.assign(elementoNuevo('pilar', 'izq'), { distancia: 0, ancho: 300 }));
  igual(geometriaPlanta(f.datos, { unidad: 'cm' }).elementos.map(e => e.cota), ['100', 'dcha 45', '0']);
  igual(geometriaPlanta(f.datos, { unidad: 'mm' }).elementos.map(e => e.cota), ['1000', 'dcha 450', '0']);
});

fin();
