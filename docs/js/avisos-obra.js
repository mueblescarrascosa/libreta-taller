// Avisos de obra: lo que choca en una pared (muebles con ventanas o puertas), instalaciones fuera de sitio
// (desagüe lejos del fregadero, humos que no caen encima de la placa, enchufes sin su mueble) y alturas raras.
// Se calculan sobre el alzado de cada pared (las alturas de los muebles son las orientativas de alzado.js).
import { geometriaAlzado, ALTURAS, campanasPared, salidaCampana } from './alzado.js';
import { verMedida } from './unidades.js';
import { situarMuebles, paredesVecinas, electrosColumna, placaConHorno } from './modulos.js';

const hay = v => v !== null && v !== undefined;
const MUEBLES = ['bajo', 'columna', 'alto', 'cuerpo'];
// Cuánto puede separarse una instalación de su mueble (mm, en horizontal) antes de avisar.
export const CERCA = { agua: 600, humos: 150, enchufe: 600 };
// Enchufes: de qué mueble son (tipos de módulo que les valen).
const ENCHUFE_DE = { hmo: ['columna_hmo', 'semicolumna', 'columna_electro'], placa: ['placa'], campana: ['alto_campana', 'placa'], frigo: ['columna_frigo', 'alto_frigo'], lavavajillas: ['lavavajillas', 'columna_electro'] };
const NOMBRE_DE = { columna_hmo: 'la columna H/MO', semicolumna: 'la semicolumna', columna_electro: 'la columna del electrodoméstico', placa: 'la placa', alto_campana: 'el alto de la campana', columna_frigo: 'la columna del frigo', alto_frigo: 'el alto sobre frigo', lavavajillas: 'el lavavajillas' };

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

// ── Lo que falta: muebles y electrodomésticos sin su toma, enchufe, desagüe o salida de humos, y por dónde ponerla.
// Vale una instalación de la misma pared a menos de CERCA de su mueble, o de la pared de al lado junto a la esquina.
// Enchufes: vale el de su aparato (también por el nombre de un uso propio: «Placa y horno»), uno general o sin uso.
const norma = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const usoDe = e => norma((e.para || '') + ' ' + (e.para_nombre || ''));
const sinUso = e => !e.para || e.para === 'general';
const USO = { placa: /placa|vitro|induc/, horno: /horno|hmo|h\/mo/, micro: /micro|hmo|h\/mo/, frigo: /frigo|nevera/, lavavajillas: /lavavaj/, lavadora: /lavadora/, campana: /campana|extractor/ };
const VALE = {
  desague: e => e.tipo === 'desague',
  agua: e => e.tipo === 'agua' || (e.tipo === 'toma' && (/agua/.test(usoDe(e)) || !e.para)),
  gas: e => e.tipo === 'gas' || (e.tipo === 'toma' && /gas/.test(usoDe(e))),
  humos: e => e.tipo === 'humos' && e.humos_forma !== 'recirculacion',
};
const enchufe = clave => e => e.tipo === 'enchufe' && (sinUso(e) || USO[clave].test(usoDe(e)));
// Qué se dice de cada instalación: nombre y altura orientativa (o dónde).
const QUE = {
  desague: ['el desagüe', 'a unos 40 cm del suelo'], agua: ['la toma de agua', 'a unos 50 cm del suelo'],
  gas: ['la toma de gas', 'a unos 50 cm del suelo'], humos: ['la salida de humos', 'encima de la placa, por la pared o el techo'],
};
const DE = { fregadero: 'del fregadero', lavavajillas: 'del lavavajillas', lavadora: 'de la lavadora', placa: 'de la placa', horno: 'del horno', micro: 'del microondas', frigo: 'del frigo', campana: 'de la campana' };

export function instalacionesQueFaltan(d) {
  const r = [], paredes = (d && d.paredes) || [];
  const gasEnElectro = (d.electro || []).some(e => e.clave === 'placa' && e.tipo === 'gas');
  // Puntos de cada pared con su sitio a lo largo de ella (mm desde la izquierda).
  const puntos = new Map(paredes.map(p => { const g = geometriaAlzado(d, p); return [p, g ? g.puntos.filter(q => q.dato) : []]; }));
  const humosEnCocina = paredes.some(p => (p.elementos || []).some(VALE.humos));
  paredes.forEach(p => {
    if (!(p.largo > 0)) return;
    const L = p.largo, sit = situarMuebles(p, d), vec = paredesVecinas(d, p);
    // ¿Hay una instalación que valga cerca del tramo [a, b] de esta pared (o en la de al lado, junto a la esquina)?
    const cerca = (vale, a, b, tol) => {
      if (puntos.get(p).some(q => vale(q.dato) && lejos(q.x, { x: a, w: b - a }) <= tol)) return true;
      const izq = vec.izq, der = vec.der;
      if (izq && izq !== p && a < tol && izq.largo > 0 && (puntos.get(izq) || []).some(q => vale(q.dato) && a + (izq.largo - q.x) <= tol)) return true;
      if (der && der !== p && L - b < tol && (puntos.get(der) || []).some(q => vale(q.dato) && (L - b) + q.x <= tol)) return true;
      return false;
    };
    const falta = (que, de, a, b, altura) => r.push({ pared: p, que: que + ' ' + de, desde: Math.max(0, a), hasta: Math.min(L, b), altura });
    const pide = (clave, a, b, altura) => { if (!cerca(enchufe(clave), a, b, CERCA.enchufe)) falta('el enchufe', DE[clave], a, b, altura); };
    const pideInst = (k, de, a, b, extra = '') => { if (!cerca(VALE[k], a, b, CERCA.agua)) falta(QUE[k][0], DE[de] + extra, a, b, QUE[k][1]); };
    const fregaderos = sit.bajos.filter(b => b.m.tipo === 'fregadero');
    // Con el mueble de al lado (el enchufe del lavavajillas o la lavadora mejor no va detrás del aparato).
    const conVecino = (i, b) => {
      const ant = sit.bajos[i - 1], sig = sit.bajos[i + 1], v = [ant, sig].find(x => x && x.m.tipo === 'fregadero') || sig || ant;
      return v ? [Math.min(b.desde, v.desde), Math.max(b.hasta, v.hasta)] : [b.desde, b.hasta];
    };
    sit.bajos.forEach((b, i) => {
      const m = b.m, a = b.desde, z = b.hasta;
      const agua = de => {
        // Junto a un fregadero usa su agua y su desagüe (si le faltan, ya se avisa en el fregadero)
        if (de !== 'fregadero' && fregaderos.some(f => lejos((a + z) / 2, { x: f.desde, w: f.hasta - f.desde }) <= CERCA.agua)) return;
        pideInst('desague', de, a, z); pideInst('agua', de, a, z);
      };
      if (m.tipo === 'fregadero') agua('fregadero');
      if (m.tipo === 'lavavajillas' || m.tipo === 'lavadora') {
        agua(m.tipo);
        const [x0, x1] = conVecino(i, b);
        if (!cerca(enchufe(m.tipo), a, z, CERCA.enchufe)) falta('el enchufe', DE[m.tipo], x0, x1, 'a unos 50 cm del suelo (mejor en el mueble de al lado)');
      }
      if (m.tipo === 'placa') {
        const gas = m.placa_tipo === 'gas' || (!m.placa_tipo && gasEnElectro);
        if (gas) pideInst('gas', 'placa', a, z, ' (si no va con bombona)');
        else pide('placa', a, z, 'a unos 50 cm del suelo, debajo de la placa');
        if (gas && placaConHorno(m)) pide('horno', a, z, 'a unos 50 cm del suelo, detrás del horno');
      }
      if (m.tipo === 'columna_frigo') pide('frigo', a, z, 'detrás del frigo');
      if (['columna_hmo', 'semicolumna', 'columna_electro'].includes(m.tipo)) {
        const e = electrosColumna(m);
        if (e.horno) pide('horno', a, z, 'dentro de la columna, detrás del horno');
        else if (e.micro) pide('micro', a, z, 'dentro de la columna, detrás del microondas');
        if (m.tipo === 'columna_electro' && (m.abajo === 'lavadora' || m.abajo === 'lavavajillas')) { agua(m.abajo); pide(m.abajo, a, z, 'a unos 50 cm del suelo'); }
      }
    });
    sit.altos.forEach(({ m, desde, hasta }) => { if (m.tipo === 'alto_micro') pide('micro', desde, hasta, 'dentro del alto, detrás del microondas'); });
    // Campanas: las de encima de la placa, las de un «Campana decorativa» y los «Alto campana».
    const campanas = campanasPared(p, d, sit).map(c => ({ m: c.alto || c.placa, a: c.desde, z: c.hasta }))
      .concat(sit.altos.filter(x => x.m.tipo === 'alto_campana').map(x => ({ m: x.m, a: x.desde, z: x.hasta })));
    campanas.forEach(({ m, a, z }) => {
      pide('campana', a, z, 'a unos 2,10 m del suelo, por encima de la campana');
      if (salidaCampana(m, p, d) !== 'recirculacion' && !humosEnCocina) falta(QUE.humos[0], DE.campana, a, z, QUE.humos[1]);
    });
  });
  return r;
}

// «pared B, entre 60 y 140 cm de A»: el tramo contado desde la esquina más cercana (con la letra de la pared de al lado).
export function textoFalta(x, d) {
  const p = x.pared, L = p.largo, vec = paredesVecinas(d, p), c = (x.desde + x.hasta) / 2, der = L - c < c;
  const [a, b] = der ? [L - x.hasta, L - x.desde] : [x.desde, x.hasta], v = vec[der ? 'der' : 'izq'];
  const cm = mm => verMedida(Math.round(mm / 10) * 10, 'cm');
  return 'pared ' + p.letra + ', entre ' + cm(a) + ' y ' + cm(b) + ' cm ' + (v && v.letra ? 'de ' + v.letra : der ? 'de la dcha.' : 'de la izq.');
}

export function avisosFaltan(ficha) {
  if (ficha.tipo !== 'cocina') return [];
  const d = ficha.datos;
  return instalacionesQueFaltan(d).map(x => ({ campo: 'pared.' + x.pared.id, texto: 'Falta ' + x.que + ': ' + textoFalta(x, d) + ', ' + x.altura }));
}
