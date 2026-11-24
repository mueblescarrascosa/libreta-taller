// Pasar una cocina o un vestidor a la app de presupuestos (cocinas, en la misma web): cada mueble va a su artículo del
// catálogo de allí (tipo · modelo · medida). Si se ha elegido una variante o una altura en la libreta, manda esa;
// si no, la habitual. Lo que no tiene artículo claro va a «Revisar». La app de presupuestos lo comprueba otra vez
// contra su catálogo y crea un presupuesto NUEVO en borrador (libreta.js de cocinas).
import { situarMuebles, situarCuerpos, piezasInterior, esLibre, instalacionDe, PUENTE, topePuente } from './modulos.js';
import { textoMaterial, materialCocina } from './material.js';
import { ALTURAS, desdeAlto } from './alzado.js';
import { NOMBRE_MOTIVO, pctRecargo } from './coste.js';
import { nombreModulo } from './modulos.js';

const hay = v => v !== null && v !== undefined;
export const CLAVE_PASO = 'libreta_a_presupuesto';
export const CALIDAD = 'BÁSICO';            // G2
export const ALTURAS_ALTO = ['ALTO 90-100', 'ALTO 70-80', 'ALTO 45', 'ALTO 60', 'ALTO 35-40'];
export const ALTURAS_COLUMNA = ['COLUMNA 200-215', 'COLUMNA 220-240', 'SEMICOLUMNA 135-145'];
// En el catálogo, de una puerta hasta 60; más ancho (61-69 incluido, que va al de 70), de dos.
const puertas = (cm, una = '1 PUERTA', dos = '2 PUERTAS') => (cm > 60 ? dos : una);
// Color del casco de la libreta → acabado de casco de presupuestos.
const CASCO = { blanco: 'blanco 16', gris: 'gris 16', antracita: 'antracita 19', roble: 'roble 19', nogal: 'nogal 19', coco: 'coco 19' };

// Modelos que se pueden elegir para cada tipo de mueble (los del catálogo de presupuestos).
export function variantesDe(m) {
  switch (m.tipo) {
    case 'bajo': return ['PUERTAS', '2 CACEROLEROS', '1 GAVETERO 2 CACEROLEROS', '2 GAVETEROS 1 CACEROLERO', '1 GAVETERO 1 PUERTA', '4 GAVETEROS', '5 GAVETEROS', 'ESPECIERO', 'PANERO', 'VITRINA'];
    case 'cajonero': return ['4 GAVETEROS', '5 GAVETEROS', '2 CACEROLEROS', '1 GAVETERO 2 CACEROLEROS', '2 GAVETEROS 1 CACEROLERO'];
    case 'placa': if (m.extractor === 'recirculacion') return ['2 CACEROLEROS'];   // con el filtro debajo: cajón ciego y 2 caceroleros
      return ['1 GAVETERO 2 CACEROLEROS', '2 CACEROLEROS', '2 GAVETEROS 1 CACEROLERO', 'PUERTAS', 'SOPORTE HORNO Y 1 GAVETERO', 'SOPORTE HORNO SIN CAJÓN'];
    case 'columna_desayuno': return ['PUERTAS', '2 CACEROLEROS', '1 GAVETERO 2 CACEROLEROS', '4 GAVETEROS'];
    case 'semicolumna': return ['PUERTAS', '4-5 CACEROLEROS', 'HORNO + 1 PUERTA', 'HORNO/MICROONDAS + 1 CACEROLERO'];
    case 'columna_hmo': return ['PUERTA + H/MO + 2 CACEROLEROS', 'PUERTA + H/MO + PUERTA', 'PUERTA + ELECTRODOMÉSTICO + 2 CACER', 'PUERTA + ELECTRODOMÉSTICO + PUERTA'];
    case 'escobero': case 'despensero': return ['PUERTAS', '1/4+3/4', 'VITRINA'];
    case 'alto': return ['PUERTAS', 'VITRINA', 'BOTELLERO DECORATIVO', '2 ESTANTES DECORATIVO', 'ABATIBLE'];
    case 'alto_campana': return ['CAMPANA EXTRAÍBLE', 'CAMPANA INTEGRABLE'];
    case 'rinconero': return m.forma === 'L' || !m.forma ? ['RINCÓN EN L'] : [];
    default: return [];
  }
}
export const NOMBRE_VARIANTE = v => ({ PUERTAS: 'Puertas', '1/4+3/4': '1/4 + 3/4', 'HORNO/MICROONDAS + 1 CACEROLERO': 'Horno/micro + 1 cacerolero', 'SOPORTE HORNO Y 1 GAVETERO': 'Soporte horno con cajón' }[v] || v.charAt(0) + v.slice(1).toLowerCase());
export const alturasDe = m => (['alto', 'alto_abierto', 'alto_campana'].includes(m.tipo) ? ALTURAS_ALTO : ['columna_hmo', 'columna_frigo', 'columna_electro', 'columna_desayuno', 'escobero', 'despensero'].includes(m.tipo) ? ALTURAS_COLUMNA : []);

// La variante que va si no se ha elegido.
export function varianteHabitual(m, d) {
  const cm = (m.ancho || 0) / 10;
  if (m.tipo === 'cajonero') return cm <= 60 ? '4 GAVETEROS' : '1 GAVETERO 2 CACEROLEROS';
  if (m.tipo === 'placa') return m.extractor === 'recirculacion' ? '2 CACEROLEROS' : m.horno ? 'SOPORTE HORNO Y 1 GAVETERO' : '1 GAVETERO 2 CACEROLEROS';
  if (m.tipo === 'columna_hmo') return 'PUERTA + H/MO + 2 CACEROLEROS';
  if (m.tipo === 'alto_campana') { const c = (d.electro || []).find(e => e.clave === 'campana'); return c && c.tipo === 'integrada' ? 'CAMPANA INTEGRABLE' : 'CAMPANA EXTRAÍBLE'; }
  if (m.tipo === 'rinconero') return 'RINCÓN EN L';
  return variantesDe(m)[0] || null;
}
// El alto campana con placa de gas va más bajo (a 75 de la placa, a ras arriba con los altos): la altura que le toca.
const alturaDeAlto = mm => (mm >= 850 ? 'ALTO 90-100' : mm >= 650 ? 'ALTO 70-80' : mm >= 550 ? 'ALTO 60' : mm >= 420 ? 'ALTO 45' : 'ALTO 35-40');
// En la cocina puente, los altos de abajo llegan solo hasta los de arriba: más bajos.
const enPuente = (m, d) => ((d && d.paredes) || []).some(p => p.puente && (p.altos || []).includes(m));
export const alturaHabitual = (m, d) => (alturasDe(m) === ALTURAS_COLUMNA ? ((d.alto_techo || 2500) >= 2400 ? 'COLUMNA 220-240' : 'COLUMNA 200-215')
  : alturasDe(m) === ALTURAS_ALTO && enPuente(m, d) ? alturaDeAlto(PUENTE.desde - ALTURAS.altos_desde)
  : m.tipo === 'alto_campana' && desdeAlto(m, d) > ALTURAS.altos_desde ? alturaDeAlto(ALTURAS.altos_hasta - desdeAlto(m, d)) : alturasDe(m).length ? ALTURAS_ALTO[0] : null);

// El artículo del catálogo de un mueble: { m, mo, med, texto } o { revisar: '…' } si no hay uno claro.
export function articulo(m, d) {
  // La medida va tal cual (45,5 también): presupuestos pone la del catálogo inmediatamente superior y lo avisa.
  const cm = Math.round((m.ancho || 0) / 10 * 10) / 10, med = String(cm);
  if (!hay(m.ancho)) return { revisar: 'Mueble ' + m.tipo + ' sin ancho: elegir a mano' };
  const v = m.variante || varianteHabitual(m, d), alto = m.altura || alturaHabitual(m, d);
  const r = (mm, mo, extra = '') => ({ m: mm, mo, med, texto: mm + ' · ' + mo + ' · ' + med + extra });
  switch (m.tipo) {
    case 'bajo': case 'fregadero': return r('BAJO', v === 'PUERTAS' || !v ? puertas(cm) : v);
    case 'cajonero': case 'placa': return r('BAJO', v === 'PUERTAS' ? puertas(cm) : v);
    case 'lavavajillas': return esLibre(m, d) ? { revisar: 'Hueco para lavavajillas libre de ' + med + ' (sin mueble)' } : r('BAJO', 'LAVAVAJILLAS INTEGRABLE');
    // La lavadora integrable lleva su puerta (frente) como el panel del lavavajillas integrable: el mismo artículo.
    case 'lavadora': return esLibre(m, d) ? { revisar: 'Hueco para lavadora libre de ' + med + ' (sin mueble)' } : Object.assign(r('BAJO', 'LAVAVAJILLAS INTEGRABLE'), { texto: 'BAJO · LAVAVAJILLAS INTEGRABLE · ' + med + ' (puerta de la lavadora)' });
    case 'rinconero':
      if (m.forma === 'recto') return r('BAJO', 'RINCÓN CIEGO');
      if (m.forma === 'chaflan') return { revisar: 'Rinconero en chaflán de ' + med + ': no hay bajo en chaflán en el catálogo' };
      return r('BAJO', 'RINCÓN EN L');
    case 'columna_hmo': return r(alto, v);
    // (en la plantilla: «2 PUERTA» y «4 - 5 CACEROLEROS»)
    case 'semicolumna': return r('SEMICOLUMNA 135-145', v === 'PUERTAS' || !v ? puertas(cm, '1 PUERTA', '2 PUERTA') : v === '4-5 CACEROLEROS' ? '4 - 5 CACEROLEROS' : v);
    // En el catálogo no hay columna con un electrodoméstico abajo: a mano
    // Desayunador: la columna de su alto con el bajo elegido (el hueco de 70; con 80, la puerta de arriba es algo más corta)
    case 'columna_desayuno': return r(alto, 'DESAYUNADOR ' + (v || 'PUERTAS'));
    // Con un electrodoméstico abajo: lavavajillas (subido) u otro integrable; arriba puerta, o hueco H/MO (horno y/o micro)
    case 'columna_electro': return r(alto, ((m.abajo || 'lavavajillas') === 'lavavajillas' ? 'LAVAVAJILLAS' : 'ELECTRO') + ' + ' + ((m.arriba || 'puertas') === 'puertas' ? 'PUERTA' : 'H/MO'));
    case 'columna_frigo':
      if (esLibre(m, d)) return { revisar: 'Hueco para frigorífico ' + (instalacionDe(m, d) === 'americano' ? 'americano' : 'libre') + ' de ' + med + ' (sin mueble)' };
      return r(alto, 'FRIGORÍFICO INTEGRADO');
    case 'escobero': case 'despensero': {
      const una = v === '1/4+3/4' ? '1/4+3/4 1 PUERTA' : v === 'VITRINA' ? 'VITRINA' : '1 PUERTA', dos = v === '1/4+3/4' ? '1/4+3/4 2 PUERTAS' : v === 'VITRINA' ? 'VITRINA' : '2 PUERTA';
      return r(alto, cm > 60 ? dos : una);
    }
    case 'alto': return r(alto, v === 'PUERTAS' || !v ? puertas(cm) : v);
    case 'alto_campana': return r(alto, v);
    case 'alto_abierto': return r(alto, '2 ESTANTES DECORATIVO');
    case 'campana_deco': return null;   // no lleva mueble (la campana va en electrodomésticos)
    case 'alto_micro': return r('ALTO MO 130', '1 PUERTA');
    case 'alto_frigo': return r('ALTO S-FRIGO 50-60', cm > 60 ? '2 PUERTAS' : '1 PUERTA');
    case 'hueco': return null;
    default: return { revisar: (m.nombre || 'Mueble') + ' de ' + med + ': elegir a mano' };
  }
}

// Alto de arriba de la cocina puente (fondo 60): ALTO PUENTE de la altura que le toca (30-40, 50-60 o 70-80).
export function articuloPuente(m, d) {
  if (!m || m.tipo === 'hueco') return null;
  const cm = Math.round((m.ancho || 0) / 10 * 10) / 10, med = String(cm), h = topePuente(d) - PUENTE.desde;
  if (!hay(m.ancho)) return { revisar: 'Alto de arriba (puente) sin ancho: elegir a mano' };
  if (m.tipo !== 'alto') return { revisar: 'Alto de arriba (puente) ' + (m.tipo === 'alto_abierto' ? 'abierto' : m.nombre || m.tipo) + ' de ' + med + ': elegir a mano' };
  const tramo = h <= 450 ? '30-40' : h <= 650 ? '50-60' : '70-80', mo = puertas(cm);
  return { m: 'ALTO PUENTE ' + tramo, mo, med, texto: 'ALTO PUENTE ' + tramo + ' · ' + mo + ' · ' + med };
}

// El plano de la ficha para la vista 3D de presupuestos: los datos tal cual, sin fotos ni dibujos pegados
// (textos de más de 4000 caracteres o en data:) para que quepa en el paquete y en el presupuesto guardado.
export function planoPara3d(d) {
  const limpio = v => {
    if (typeof v === 'string') return v.startsWith('data:') || v.length > 4000 ? undefined : v;
    if (Array.isArray(v)) return v.map(limpio).filter(x => x !== undefined);
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(k => { const x = limpio(v[k]); if (x !== undefined) o[k] = x; }); return o; }
    return v;
  };
  return limpio(d);
}

// Encimera para el presupuesto. Laminados: tableros de 4,10 m (los trozos repartidos para aprovechar), colocación,
// agujeros de placa y fregadero, juntas de unión en las esquinas y copete a juego por metros contra la pared.
// Piedra y madera: una línea a 0 € para poner el precio del marmolista.
export const ENCIMERA_PRESUPUESTO = { 'Hidrófuga Egger': 'HIDROFUGA EGGER', 'Egger Perfsense': 'HIDROFUGA EGGER PERFSENSE', 'Egger Porsinc': 'HIDROFUGA EGGER PORSINC',
  'Hidrófuga 19 mm': 'HIDROFUGA 19mm', Topform: 'TOPFORM ENCIMERA' };
export const TABLERO_ENCIMERA = 4100, TIRA_ZOCALO = 4000;
export function tablerosEncimera(piezas, largo = TABLERO_ENCIMERA) {
  const trozos = [];
  piezas.forEach(p => { let r = p.largo; while (r > largo) { trozos.push(largo); r -= largo; } if (r > 0) trozos.push(r); });
  const tableros = [];
  trozos.sort((a, b) => b - a).forEach(t => { const i = tableros.findIndex(x => x + t <= largo); if (i >= 0) tableros[i] += t; else tableros.push(t); });
  return tableros.length;
}
export function encimeraPresupuesto(d) {
  const enc = (d.acabados || {}).encimera || {}, mat = enc.material;
  if (!mat) return null;
  const r = materialCocina(d);
  if (!r.piezas.length) return null;
  const total = r.piezas.reduce((s, q) => s + q.largo, 0), mts = Math.round(total / 100) / 10;
  const desc = [mat, enc.modelo, enc.color].filter(Boolean).join(' '), texto = r.piezas.length + (r.piezas.length > 1 ? ' piezas, ' : ' pieza, ') + String(mts).replace('.', ',') + ' m';
  const item = ENCIMERA_PRESUPUESTO[mat], revisar = [];
  r.piezas.filter(q => q.fondo > 650).forEach(q => revisar.push('Encimera de ' + q.pared + ': ' + Math.round(q.fondo / 10) + ' cm de fondo, necesita tablero ancho'));
  if (!item) return { extras: [], libres: [{ texto: 'Encimera ' + desc + ' · ' + texto + ' (precio del marmolista)', und: 1, precio: 0 }], revisar };
  const extras = [{ cat: 'ENCIMERA', item, und: tablerosEncimera(r.piezas), texto: desc + ' · ' + texto }];
  extras.push({ cat: 'TRABAJOS ENCIMERA', item: 'COLOCACIÓN ENCIMERA', und: 1, otro: ['ENCIMERA', '+ COLOCACIÓN ENCIMERA'] });
  if (r.huecos.length) extras.push({ cat: 'TRABAJOS ENCIMERA', item: 'AGUJERO PLACA/FREGADERO', und: r.huecos.length, otro: ['ENCIMERA', '+ AGUJERO PLACA/FREGADERO'] });
  if (r.uniones.length) extras.push({ cat: 'TRABAJOS ENCIMERA', item: 'JUNTA DE UNIÓN', und: r.uniones.length, otro: ['ENCIMERA', 'JUNTA DE UNION'] });
  const contraPared = r.piezas.filter(q => !/^(isla|pen)/.test(q.pared)).reduce((s, q) => s + q.largo, 0);
  if (contraPared) extras.push({ cat: 'COPETE', item: 'A JUEGO CON ENCIMERA EGGER', und: Math.ceil(contraPared / 1000) });
  return { extras, libres: [], revisar };
}

// El paquete que recoge la app de presupuestos.
export function paquetePresupuesto(ficha, trabajo, ajustes) {
  const d = ficha.datos, t = trabajo || {}, td = t.datos || {}, revisar = [], notas = [];
  const bajos = [], altos = [], tramos = [];
  // Recargo por complicación del mueble: pasa con su % y su texto; en Presupuestos va como línea aparte.
  const textoRec = (o, que, p) => (NOMBRE_MOTIVO[o.recargo.motivo] || 'Complicación') + ' – ' + que + ' (pared ' + p.letra + ')';
  const conRec = (m, p) => (m.recargo ? { recargo: { motivo: m.recargo.motivo, pct: pctRecargo(m, ajustes), texto: textoRec(m, nombreModulo(m) + ' ' + Math.round(m.ancho / 10), p) } } : {});
  const recARevisar = (m, p) => { if (m.recargo) revisar.push('Pared ' + p.letra + ': ' + textoRec(m, nombreModulo(m), p) + ' +' + pctRecargo(m, ajustes) + ' % (ponerlo a mano)'); };
  (d.paredes || []).forEach(p => {
    const sit = situarMuebles(p, d);
    sit.bajos.forEach(b => { const a = articulo(b.m, d); if (!a) return; if (a.revisar) { revisar.push('Pared ' + p.letra + ': ' + a.revisar); recARevisar(b.m, p); } else bajos.push(Object.assign({ und: 1 }, a, { texto: 'Pared ' + p.letra + ': ' + a.texto }, conRec(b.m, p))); });
    sit.altos.forEach(x => { const a = articulo(x.m, d); if (!a) return; if (a.revisar) { revisar.push('Pared ' + p.letra + ': ' + a.revisar); recARevisar(x.m, p); } else altos.push(Object.assign({ und: 1 }, a, { texto: 'Pared ' + p.letra + ': ' + a.texto }, conRec(x.m, p))); });
    // Altos de arriba de la cocina puente (fondo 60): el catálogo no los tiene a esa altura, a mano
    (sit.altillos || []).forEach(x => { const a = articuloPuente(x.m, d); if (!a) return; if (a.revisar) { revisar.push('Pared ' + p.letra + ': ' + a.revisar); recARevisar(x.m, p); } else altos.push(Object.assign({ und: 1 }, a, { texto: 'Pared ' + p.letra + ': ' + a.texto }, conRec(x.m, p))); });
    // Vestidor: un tramo por pared, con sus cuerpos.
    const sc = situarCuerpos(p, d);
    if (sc.cuerpos.length) {
      const cuerpos = sc.cuerpos.map(({ c, desde, hasta }) => {
        const pz = piezasInterior(c, ALTURAS.columna), n = k => pz.filter(q => q.tipo === k).length;
        return { ancho: Math.round((hasta - desde) / 10), barra: n('barra'), cajones: n('cajon'), estantes: n('estante') + n('zapato') };
      });
      const conPuertas = sc.cuerpos.map(x => x.c.puertas).find(Boolean);
      const recargos = sc.cuerpos.filter(x => x.c.recargo).map(({ c, desde, hasta }) => ({ ancho: Math.round((hasta - desde) / 10), motivo: c.recargo.motivo, pct: pctRecargo(c, ajustes),
        texto: textoRec(c, 'Cuerpo ' + (p.cuerpos.indexOf(c) + 1) + ' ' + Math.round((hasta - desde) / 10), p) }));
      tramos.push(Object.assign({ nombre: 'Pared ' + p.letra, ancho: cuerpos.reduce((s, c) => s + c.ancho, 0), alto: Math.round((d.alto_techo || 2500) / 10), cuerpos,
        puertas: conPuertas === 'corredera' ? 'corredera_tablero' : conPuertas === 'abatible' ? 'abatible_tablero' : 'ninguna' }, recargos.length ? { recargos } : {}));
      sc.cuerpos.forEach(({ c }, i) => { if (c.rincon) revisar.push('Pared ' + p.letra + ', cuerpo ' + (i + 1) + ': de rincón (' + c.rincon + '), revisar'); });
    }
  });
  // Armario empotrado (correderas o abatibles): un tramo de armario con el hueco, sus cuerpos y las hojas (en cm).
  const empotrado = ficha.tipo === 'armario' && ficha.subtipo !== 'vestidor';
  if (empotrado) {
    const A = d.ancho_medio || d.ancho_arriba || d.ancho_abajo, altos = [d.alto_izq, d.alto_der].filter(x => x > 0), H = altos.length ? Math.min(...altos) : 2500, cm = x => Math.round(x) / 10;
    const cs = (d.cuerpos || []).filter(c => c.ancho > 0), suma = cs.reduce((s, c) => s + c.ancho, 0);
    const cuerpoDe = c => { const pz = piezasInterior(c, H), n = k => pz.filter(q => q.tipo === k).length; return { ancho: cm(c.ancho), barra: n('barra'), cajones: n('cajon'), estantes: n('estante') + n('zapato') }; };
    // Sin interior apuntado: barra y maletero, como un armario normal.
    const tipico = ancho => ({ ancho: cm(ancho), barra: 1, cajones: 0, estantes: 0, maletero: true });
    if (A || suma) {
      const ancho = Math.max(A || 0, suma), cuerpos = cs.map(c => (c.interior ? cuerpoDe(c) : tipico(c.ancho)));
      if (!cs.length) { const n = Math.max(1, Math.round(ancho / 1000)); for (let i = 0; i < n; i++) cuerpos.push(tipico(ancho / n)); }
      else if (ancho - suma > 1) cuerpos.push(tipico(ancho - suma));
      const recargos = cs.filter(c => c.recargo).map((c, i) => ({ ancho: cm(c.ancho), motivo: c.recargo.motivo, pct: pctRecargo(c, ajustes), texto: (NOMBRE_MOTIVO[c.recargo.motivo] || 'Complicación') + ' – Cuerpo ' + (d.cuerpos.indexOf(c) + 1) + ' ' + Math.round(c.ancho / 10) }));
      if (!cs.length && d.recargo) recargos.push({ ancho: cm(ancho), motivo: d.recargo.motivo, pct: pctRecargo(d, ajustes), texto: (NOMBRE_MOTIVO[d.recargo.motivo] || 'Complicación') + ' – Armario ' + Math.round(ancho / 10) });
      const corr = ficha.subtipo !== 'abatible';
      tramos.push(Object.assign({ clase: 'armario', nombre: ficha.nombre || '', ancho: cm(ancho), alto: cm(H), cuerpos, puertas: corr ? 'corredera_tablero' : 'abatible_tablero' },
        d.fondo > 0 ? { fondo: cm(d.fondo) } : {}, corr && d.hojas > 0 ? { hojas: d.hojas } : {}, recargos.length ? { recargos } : {}));
      if (!altos.length) revisar.push('Armario: falta el alto del hueco, puesto 250 cm');
    }
  }
  // Electrodomésticos, encimera y lineales: para elegir modelo o ponerles precio.
  (d.electro || []).forEach(e => revisar.push('Electrodoméstico: ' + [e.clave === 'otro' ? e.nombre || 'otro' : e.clave, e.tipo, e.modelo].filter(Boolean).join(' ') + ' (elegir modelo)'));
  // Con el material de la encimera elegido, la encimera va con sus líneas (abajo); si no, su detalle a «Revisar».
  const enc = ficha.tipo === 'cocina' ? encimeraPresupuesto(d) : null;
  // Zócalo de PVC de la altura de la cocina tipo (10 o 15), en tiras de 4 m.
  const zmm = ficha.tipo === 'cocina' ? materialCocina(d).lineales.zocalo : 0, zAlto = (ajustes && ajustes.cocina_tipo && ajustes.cocina_tipo.zocalo) || ALTURAS.zocalo;
  const zocalo = zmm > 0 ? { cat: 'ZÓCALO', item: zAlto >= 125 ? 'ALTO 15' : 'ALTO 10', und: Math.ceil(zmm / TIRA_ZOCALO), texto: 'Zócalo de ' + Math.round(zAlto / 10) + ' cm · ' + String(Math.round(zmm / 100) / 10).replace('.', ',') + ' m' } : null;
  if (!empotrado) textoMaterial(ficha, 'cm', ajustes).filter(l => (enc ? /^(Cornisa|Tira LED)/ : /^(Encimera|- Pared|- Isla|- Pen|- Uniones|- Hueco|Cornisa|Tira LED)/).test(l)).forEach(l => revisar.push(l.replace(/^- /, 'Encimera · ')));
  if (enc) revisar.push(...enc.revisar);
  const ac = d.acabados || {};
  if (ac.modelo || ac.color) notas.push('Frentes: ' + [ac.modelo, ac.color].filter(Boolean).join(' '));
  if (ac.bitono) notas.push('Bitono · altos: ' + [ac.modelo_altos, ac.color_altos].filter(Boolean).join(' ') + ' · bajos: ' + [ac.modelo_bajos, ac.color_bajos].filter(Boolean).join(' '));
  if (ac.casco) notas.push('Cascos: ' + ac.casco);
  if (ac.encimera && (ac.encimera.material || ac.encimera.modelo || ac.encimera.color)) notas.push('Encimera: ' + [ac.encimera.material, ac.encimera.modelo, ac.encimera.color].filter(Boolean).join(' '));
  const casco = CASCO[String(ac.casco || '').trim().toLowerCase()] || null;
  if (ac.casco && !casco) revisar.push('Cascos ' + ac.casco + ': elegir el acabado de casco');
  const grupos = [];
  if (bajos.length) grupos.push({ tipo: 'muebles', nombre: 'Bajos y columnas', cal: CALIDAD, casco, lineas: bajos });
  if (altos.length) grupos.push({ tipo: 'muebles', nombre: 'Altos', cal: CALIDAD, casco, lineas: altos });
  const nomArm = ficha.subtipo === 'abatible' ? 'Armario de puertas abatibles' : 'Armario de correderas';
  if (tramos.length) grupos.push({ tipo: 'armario', nombre: empotrado ? nomArm : 'Vestidor', tramos });
  const lineasEx = (enc ? enc.extras : []).concat(zocalo ? [zocalo] : []);
  if (lineasEx.length) grupos.push({ tipo: 'extras', nombre: enc && enc.extras.length ? (zocalo ? 'Encimera y zócalo' : 'Encimera') : 'Zócalo', lineas: lineasEx });
  if (enc && enc.libres.length) grupos.push({ tipo: 'libre', nombre: 'Encimera (precio a mano)', lineas: enc.libres });
  if (revisar.length) grupos.push({ tipo: 'revisar', lineas: revisar });
  const nombre = ficha.nombre || (ficha.tipo === 'cocina' ? 'Cocina' : empotrado ? nomArm : 'Vestidor');
  const n = bajos.length + altos.length + tramos.reduce((s, x) => s + x.cuerpos.length, 0);
  return { v: 1, creado: new Date().toISOString(), titulo: (ficha.tipo === 'cocina' ? 'la cocina' : empotrado ? 'el armario' : 'el vestidor') + ' «' + nombre + '»' + (t.nombre ? ' de ' + t.nombre : ''),
    resumen: n + (empotrado ? (n === 1 ? ' cuerpo' : ' cuerpos') : n === 1 ? ' mueble' : ' muebles') + (revisar.length ? ' · ' + revisar.length + ' por revisar' : ''),
    cliente: t.cliente || '', direccion: t.direccion || '', telefono: td.telefono || '', notas: notas.join('\n'), grupos,
    // Para dibujar la cocina en 3D en el presupuesto con los colores elegidos (la perspectiva de la libreta).
    plano3d: empotrado ? null : { datos: planoPara3d(d), ajustes: { margen: (ajustes && ajustes.margen) || 10, unidad: (ajustes && ajustes.unidad) || 'mm', cocina_tipo: (ajustes && ajustes.cocina_tipo) || null } } };
}
