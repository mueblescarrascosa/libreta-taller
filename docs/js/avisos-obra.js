// Avisos de obra: lo que choca en una pared (muebles con ventanas o puertas), instalaciones fuera de sitio
// (desagüe lejos del fregadero, humos que no caen encima de la placa, enchufes sin su mueble) y alturas raras.
// Se calculan sobre el alzado de cada pared (las alturas de los muebles son las orientativas de alzado.js).
import { geometriaAlzado, ALTURAS } from './alzado.js';
import { verMedida } from './unidades.js';

const hay = v => v !== null && v !== undefined;
const MUEBLES = ['bajo', 'columna', 'alto', 'cuerpo'];
// Cuánto puede separarse una instalación de su mueble (mm, en horizontal) antes de avisar.
export const CERCA = { agua: 600, humos: 150, enchufe: 600 };
// Enchufes: de qué mueble son (tipos de módulo que les valen).
const ENCHUFE_DE = { hmo: ['columna_hmo'], placa: ['placa'], campana: ['alto_campana', 'placa'], frigo: ['columna_frigo', 'alto_frigo'], lavavajillas: ['lavavajillas'] };
const NOMBRE_DE = { columna_hmo: 'la columna H/MO', placa: 'la placa', alto_campana: 'el alto de la campana', columna_frigo: 'la columna del frigo', alto_frigo: 'el alto sobre frigo', lavavajillas: 'el lavavajillas' };

const pisan = (a, b, h = 10) => a.x < b.x + b.w - h && b.x < a.x + a.w - h && a.y < b.y + b.h - h && b.y < a.y + a.h - h;
// Distancia en horizontal de un punto a un mueble (0 si cae dentro de su ancho).
const lejos = (x, p) => Math.max(0, p.x - x, x - (p.x + p.w));

export function avisosObra(ficha, unidad) {
  const d = ficha.datos, l = [], v = mm => verMedida(mm, unidad) + ' ' + unidad;
  const cocina = ficha.tipo === 'cocina';
  const geos = (d.paredes || []).map(p => [p, geometriaAlzado(d, p)]).filter(([, g]) => g);
  // Dónde está cada tipo de mueble (para decir «está en la pared C»).
  const enPared = {};
  geos.forEach(([p, g]) => g.piezas.forEach(q => { if (MUEBLES.includes(q.clase) && q.texto) (enPared[q.tipo] = enPared[q.tipo] || new Set()).add(p.letra); }));

  geos.forEach(([p, g]) => {
    const campo = 'pared.' + p.id, pared = 'pared ' + p.letra;
    const muebles = g.piezas.filter(q => MUEBLES.includes(q.clase) && q.texto);
    const nombre = q => (q.clase === 'cuerpo' ? q.texto.replace(/^C(\d+).*$/, 'Cuerpo $1') : q.texto);
    // Muebles que tapan una ventana o chocan con una puerta.
    g.piezas.filter(q => q.clase === 'ventana').forEach(w => {
      muebles.filter(q => pisan(q, w)).forEach(q => {
        if (q.clase === 'bajo') l.push({ campo, texto: 'Ventana de la ' + pared + ' a ' + v(w.y) + ' del suelo: queda por debajo de la encimera (' + v(ALTURAS.encimera) + ') sobre ' + nombre(q) });
        else l.push({ campo, texto: nombre(q) + ' de la ' + pared + ' tapa la ventana' });
      });
    });
    g.piezas.filter(q => q.clase === 'puerta').forEach(w => {
      muebles.filter(q => pisan(q, w, 5)).forEach(q => l.push({ campo, texto: nombre(q) + ' de la ' + pared + ' choca con la puerta' }));
    });
    if (!cocina) return;
    const de = tipos => muebles.filter(q => tipos.includes(q.tipo));
    // Desagüe y agua cerca del fregadero.
    const fregaderos = de(['fregadero']);
    g.puntos.filter(q => q.tipo === 'desague' || q.tipo === 'agua' || (q.tipo === 'toma' && /agua/i.test(q.texto))).forEach(q => {
      if (!fregaderos.length) {
        if (enPared.fregadero && !enPared.fregadero.has(p.letra)) l.push({ campo, texto: (q.tipo === 'desague' ? 'Desagüe' : 'Toma de agua') + ' en la ' + pared + ', pero el fregadero está en la ' + [...enPared.fregadero].join(', ') });
        return;
      }
      const m = Math.min(...fregaderos.map(f => lejos(q.x, f)));
      if (m > CERCA.agua) l.push({ campo, texto: (q.tipo === 'desague' ? 'Desagüe' : 'Toma de agua') + ' de la ' + pared + ' a ' + v(m) + ' del fregadero' });
    });
    // Salida de humos encima de la placa.
    const placas = de(['placa']);
    g.puntos.filter(q => q.tipo === 'humos' && !/Recirculaci/.test(q.texto)).forEach(q => {
      if (placas.length) {
        const m = Math.min(...placas.map(f => lejos(q.x, f)));
        if (m > CERCA.humos) l.push({ campo, texto: 'La salida de humos de la ' + pared + ' no cae encima de la placa (a ' + v(m) + ')' });
      } else if (enPared.placa && !enPared.placa.has(p.letra)) l.push({ campo, texto: 'Salida de humos en la ' + pared + ', pero la placa está en la ' + [...enPared.placa].join(', ') });
    });
    // Enchufes con su mueble cerca.
    (p.elementos || []).filter(e => e.tipo === 'enchufe' && ENCHUFE_DE[e.para]).forEach(e => {
      const pt = g.puntos.find(q => q.dato === e);
      if (!pt) return;
      const tipos = ENCHUFE_DE[e.para], cerca = de(tipos), que = NOMBRE_DE[tipos[0]];
      if (cerca.length) {
        const m = Math.min(...cerca.map(f => lejos(pt.x, f)));
        if (m > CERCA.enchufe) l.push({ campo, texto: 'Enchufe ' + pt.texto.replace(/^E /, '') + ' de la ' + pared + ' a ' + v(m) + ' de ' + que });
      } else {
        const otras = tipos.flatMap(t => [...(enPared[t] || [])]).filter(x => x !== p.letra);
        if (otras.length) l.push({ campo, texto: 'Enchufe ' + pt.texto.replace(/^E /, '') + ' en la ' + pared + ', pero ' + que + ' está en la ' + [...new Set(otras)].join(', ') });
        else if (Object.keys(enPared).length) l.push({ campo, texto: 'Enchufe ' + pt.texto.replace(/^E /, '') + ' en la ' + pared + ', pero no hay ' + que.replace(/^(la|el) /, '') });
      }
    });
    // Enchufes o tomas justo en el canto de la encimera (donde hay bajos).
    const bajos = muebles.filter(q => q.clase === 'bajo');
    g.puntos.filter(q => (q.tipo === 'enchufe' || q.tipo === 'toma') && hay(q.y) && q.y > ALTURAS.encimera - ALTURAS.grueso_encimera - 20 && q.y < ALTURAS.encimera + 40 && bajos.some(b => lejos(q.x, b) === 0))
      .forEach(q => l.push({ campo, texto: q.texto + ' de la ' + pared + ' a ' + v(q.y) + ': cae en el canto de la encimera' }));
  });

  // Techo más bajo que las columnas o los cuerpos.
  // (el alzado ya los corta al techo: se compara con su altura normal)
  if (hay(d.alto_techo) && d.alto_techo > 0) {
    const altos = geos.flatMap(([, g]) => g.piezas.filter(q => ['columna', 'cuerpo', 'alto'].includes(q.clase)));
    const top = altos.length ? Math.max(ALTURAS.columna, ALTURAS.altos_hasta) : 0;
    if (top && d.alto_techo < top) l.push({ campo: 'alto_techo', texto: 'El techo (' + v(d.alto_techo) + ') es más bajo que ' + (cocina ? 'las columnas y los altos' : 'los cuerpos') + ' (' + v(top) + '): hay que recortarlos' });
  }
  return l;
}
