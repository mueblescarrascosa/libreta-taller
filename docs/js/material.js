// Material para pedir, sacado de lo medido: encimera (piezas, uniones en las esquinas y huecos), lineales en metros
// y herrajes (bisagras, guías, tiradores, patas, barras…). Orientativo: lo medido y lo pedido mandan.
import { situarMuebles, situarCuerpos, esColumna, piezasInterior, paredesVecinas } from './modulos.js';
import { frenteModulo, puertasCuerpo, varianteDe } from './frentes.js';
import { ALTURAS } from './alzado.js';
import { verMedida } from './unidades.js';

const hay = v => v !== null && v !== undefined;
export const ENCIMERA = { fondo: 620, largo_max: 3000 };

// Zócalo: va por el frente de los muebles (bajos y columnas seguidos, sin huecos). En una esquina donde se juntan dos
// tramos, sus frentes se cruzan a un fondo de mueble de la esquina: cada uno descuenta ese fondo (60). En un rincón en
// chaflán el frente es la diagonal. Islas: todo alrededor; península: los dos lados largos y la punta.
export const FONDO_ZOCALO = 600;
export function zocaloFrente(d) {
  const paredes = (d.paredes || []).filter(p => hay(p.largo)), corridas = new Map();
  paredes.forEach(p => {
    const sit = situarMuebles(p, d), trozos = [];
    if (sit.entran.izq) trozos.push([0, sit.entran.izq]);
    sit.bajos.forEach(b => { if (b.m.tipo !== 'hueco') trozos.push([b.desde, b.hasta]); });
    if (sit.entran.der) trozos.push([p.largo - sit.entran.der, p.largo]);
    trozos.sort((a, b) => a[0] - b[0]);
    const r = [];
    trozos.forEach(([a, b]) => { const u = r[r.length - 1]; if (u && a - u[1] < 5) u[1] = Math.max(u[1], b); else r.push([a, b]); });
    corridas.set(p, r);
  });
  let total = 0;
  paredes.forEach(p => {
    const v = paredesVecinas(d, p), r = corridas.get(p);
    const llegaFin = q => q && (corridas.get(q) || []).some(([, b]) => q.largo - b < 5), llegaIni = q => q && (corridas.get(q) || []).some(([a]) => a < 5);
    r.forEach(([a, b]) => {
      let l = b - a;
      if (a < 5 && llegaFin(v.izq)) l -= FONDO_ZOCALO;
      if (p.largo - b < 5 && llegaIni(v.der)) l -= FONDO_ZOCALO;
      total += Math.max(0, l);
    });
    // Rinconero en chaflán al final de la pared (gira a la derecha): la diagonal en vez de los dos trozos en L.
    const sit = situarMuebles(p, d), ult = sit.bajos[sit.bajos.length - 1];
    if (ult && ult.m.tipo === 'rinconero' && ult.m.forma === 'chaflan' && p.largo - ult.hasta < 5 && hay(ult.m.lado2)) {
      const x = Math.max(0, ult.m.ancho - FONDO_ZOCALO), y = Math.max(0, ult.m.lado2 - FONDO_ZOCALO);
      total += Math.hypot(x, y) - x - y;
    }
  });
  (d.islas || []).forEach(x => { if (hay(x.largo) && hay(x.fondo)) total += x.tipo === 'peninsula' ? 2 * x.largo + x.fondo : 2 * (x.largo + x.fondo); });
  return Math.round(total);
}

// Tramos de encimera de una pared: los bajos seguidos (sin columnas ni huecos), con lo que entra del rinconero de al lado.
function tramosPared(p, d) {
  if (!hay(p.largo)) return [];
  const sit = situarMuebles(p, d), trozos = [];
  if (sit.entran.izq) trozos.push({ desde: 0, hasta: sit.entran.izq, m: null });
  sit.bajos.forEach(b => { if (b.m.tipo !== 'hueco' && !esColumna(b.m)) trozos.push({ desde: b.desde, hasta: b.hasta, m: b.m }); });
  if (sit.entran.der) trozos.push({ desde: p.largo - sit.entran.der, hasta: p.largo, m: null });
  trozos.sort((a, b) => a.desde - b.desde);
  const tramos = [];
  trozos.forEach(t => {
    const u = tramos[tramos.length - 1];
    if (u && t.desde - u.hasta < 5) { u.hasta = Math.max(u.hasta, t.hasta); if (t.m) u.muebles.push(t.m); }
    else tramos.push({ desde: t.desde, hasta: t.hasta, muebles: t.m ? [t.m] : [] });
  });
  return tramos;
}

export function materialCocina(d) {
  const paredes = (d.paredes || []).filter(p => hay(p.largo));
  const porPared = new Map(paredes.map(p => [p, tramosPared(p, d)]));
  const piezas = [], uniones = [], huecos = [];
  paredes.forEach(p => {
    const v = paredesVecinas(d, p), izq = v.izq && porPared.get(v.izq);
    porPared.get(p).forEach(t => {
      let desde = t.desde, nota = '';
      // En la esquina de la izquierda, si la encimera de la pared de al lado llega hasta ella, esta empieza en su canto.
      if (t.desde < 5 && izq && izq.some(x => v.izq.largo - x.hasta < 5)) { desde = ENCIMERA.fondo; nota = 'desde el canto de la de ' + v.izq.letra; uniones.push(v.izq.letra + '-' + p.letra); }
      const largo = t.hasta - desde;
      if (largo <= 0) return;
      piezas.push({ pared: p.letra, largo, fondo: ENCIMERA.fondo, nota, larga: largo > ENCIMERA.largo_max });
      t.muebles.forEach(m => { if (m.tipo === 'placa' || m.tipo === 'fregadero') huecos.push({ que: m.tipo, ancho: m.ancho, pared: p.letra }); });
    });
  });
  (d.islas || []).forEach((x, i) => { if (hay(x.largo) && hay(x.fondo)) piezas.push({ pared: x.tipo === 'peninsula' ? 'península' : 'isla' + ((d.islas || []).length > 1 ? ' ' + (i + 1) : ''), largo: x.largo, fondo: x.fondo + 20, nota: '', larga: x.largo > ENCIMERA.largo_max }); });

  // Lineales: cornisa y LED bajo los altos (cornisa también sobre columnas); el zócalo, por el frente de los muebles.
  let arriba = 0, bajoAltos = 0;
  paredes.forEach(p => {
    const sit = situarMuebles(p, d);
    sit.bajos.forEach(b => { if (esColumna(b.m)) arriba += b.hasta - b.desde; });
    sit.altos.forEach(a => { if (a.m.tipo !== 'hueco') { arriba += a.hasta - a.desde; bajoAltos += a.hasta - a.desde; } });
  });
  const zocalo = zocaloFrente(d);

  // Herrajes, de los frentes de cada mueble.
  const h = { puertas: 0, bisagras: 0, cajones: 0, tiradores: 0, patas: 0, lavavajillas: 0 };
  paredes.forEach(p => {
    const sit = situarMuebles(p, d);
    const contar = (tipo, ancho, z0, z1, opc = {}) => {
      const f = frenteModulo(tipo, ancho, z0, z1, opc);
      f.forEach((q, i) => {
        if (q.k === 'tirador') h.tiradores++;
        if (q.k !== 'hoja') return;
        if (tipo === 'lavavajillas') { h.lavavajillas++; return; }
        const t = f[i + 1], cajon = t && t.k === 'tirador' && t.x1 - t.x0 > t.z1 - t.z0;
        if (cajon) h.cajones++;
        else { h.puertas++; const alto = q.z1 - q.z0; h.bisagras += alto <= 900 ? 2 : alto <= 1600 ? 3 : 4; }
      });
    };
    sit.bajos.forEach(b => {
      if (b.m.tipo === 'hueco') return;
      const w = b.hasta - b.desde;
      h.patas += 4;
      if (esColumna(b.m)) contar(b.m.tipo, w, 0, ALTURAS.columna, { columna: true, variante: varianteDe(b.m) });
      else contar(b.m.tipo, w, ALTURAS.zocalo, ALTURAS.encimera - ALTURAS.grueso_encimera, { variante: varianteDe(b.m) });
    });
    sit.altos.forEach(a => { if (a.m.tipo !== 'hueco') contar(a.m.tipo, a.hasta - a.desde, ALTURAS.altos_desde, ALTURAS.altos_hasta); });
  });
  return { piezas, uniones, huecos, lineales: { zocalo, cornisa: arriba, led: bajoAltos }, herrajes: h };
}

// Vestidor: barras (metros y soportes), estantes, cajones y patas de los cuerpos.
export function materialVestidor(d) {
  const r = { barras: 0, barras_mm: 0, estantes: 0, cajones: 0, zapateros: 0, pantaloneros: 0, patas: 0, puertas: 0, bisagras: 0, correderas: 0, tiradores: 0 };
  (d.paredes || []).forEach(p => {
    const sc = situarCuerpos(p, d);
    sc.cuerpos.forEach(({ c, desde, hasta }) => {
      const w = hasta - desde;
      r.patas += 4;
      puertasCuerpo(w, ALTURAS.columna, c.puertas).forEach(q => {
        if (q.k === 'tirador') r.tiradores++;
        if (q.pieza === 'puerta') { r.puertas++; r.bisagras += 4; }
        if (q.pieza === 'corredera') r.correderas++;
      });
      piezasInterior(c, ALTURAS.columna).forEach(q => {
        if (q.tipo === 'barra') { r.barras++; r.barras_mm += w - 40; }
        if (q.tipo === 'estante') r.estantes++;
        if (q.tipo === 'cajon') r.cajones++;
        if (q.tipo === 'zapato') r.zapateros++;
        if (q.tipo === 'pantalonero') r.pantaloneros++;
      });
    });
  });
  return r;
}

// Líneas de texto del material (para la ficha, el resumen, el PDF y WhatsApp). lineales: los que tiene la cocina (acabados).
export function textoMaterial(ficha, unidad = 'cm', ajustes = null) {
  const d = ficha.datos, l = [], m = mm => verMedida(Math.round(mm / 10) * 10, 'm') + ' m', v = mm => verMedida(mm, unidad) + ' ' + unidad;
  if (ficha.tipo === 'cocina') {
    const r = materialCocina(d);
    if (r.piezas.length) {
      const total = r.piezas.reduce((s, q) => s + q.largo, 0);
      l.push('Encimera: ' + r.piezas.length + (r.piezas.length > 1 ? ' piezas, ' : ' pieza, ') + m(total) + ' en total');
      r.piezas.forEach(q => l.push('- ' + (/^(isla|pen)/.test(q.pared) ? q.pared[0].toUpperCase() + q.pared.slice(1) : 'Pared ' + q.pared) + ': ' + v(q.largo) + ' × ' + v(q.fondo) + (q.nota ? ' (' + q.nota + ')' : '') + (q.larga ? ' · pasa de ' + m(ENCIMERA.largo_max) + ': puede llevar junta' : '')));
      if (r.uniones.length) l.push('- Uniones en esquina: ' + r.uniones.join(', '));
      r.huecos.forEach(q => l.push('- Hueco de ' + (q.que === 'placa' ? 'placa' : 'fregadero') + ' (mueble de ' + v(q.ancho) + ', pared ' + q.pared + ')'));
    }
    const lin = (d.acabados && d.acabados.lineales || []).map(x => x.tipo);
    if (r.lineales.zocalo) l.push('Zócalo: ' + m(r.lineales.zocalo));
    if (lin.includes('cornisa') && r.lineales.cornisa) l.push('Cornisa: ' + m(r.lineales.cornisa));
    if (lin.includes('led') && r.lineales.led) l.push('Tira LED (bajo los altos): ' + m(r.lineales.led));
    const h = r.herrajes, t = [];
    if (h.puertas) t.push(h.puertas + (h.puertas > 1 ? ' puertas (' : ' puerta (') + h.bisagras + ' bisagras)');
    if (h.cajones) t.push(h.cajones + (h.cajones > 1 ? ' cajones (guías)' : ' cajón (guías)'));
    if (h.tiradores) t.push(h.tiradores + ' tiradores');
    if (h.lavavajillas) t.push(h.lavavajillas + ' panel de lavavajillas');
    if (h.patas) t.push(h.patas + ' patas');
    if (t.length) l.push('Herrajes: ' + t.join(', '));
  }
  if (ficha.subtipo === 'vestidor') {
    const r = materialVestidor(d), t = [];
    if (r.barras) t.push(r.barras + (r.barras > 1 ? ' barras (' : ' barra (') + m(r.barras_mm) + ', ' + r.barras * 2 + ' soportes)');
    if (r.estantes) t.push(r.estantes + ' estantes');
    if (r.cajones) t.push(r.cajones + ' cajones (guías)');
    if (r.zapateros) t.push(r.zapateros + ' zapateros');
    if (r.pantaloneros) t.push(r.pantaloneros + (r.pantaloneros > 1 ? ' pantaloneros' : ' pantalonero'));
    if (r.puertas) t.push(r.puertas + (r.puertas > 1 ? ' puertas (' : ' puerta (') + r.bisagras + ' bisagras)');
    if (r.correderas) t.push(r.correderas + ' hojas correderas (con su kit)');
    if (r.tiradores) t.push(r.tiradores + ' tiradores');
    if (r.patas) t.push(r.patas + ' patas');
    if (t.length) l.push('Herrajes: ' + t.join(', '));
  }
  return l;
}
