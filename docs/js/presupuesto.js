// Pasar una cocina o un vestidor a la app de presupuestos (cocinas, en la misma web): cada mueble va a su artículo del
// catálogo de allí (tipo · modelo · medida). Si se ha elegido una variante o una altura en la libreta, manda esa;
// si no, la habitual. Lo que no tiene artículo claro va a «Revisar». La app de presupuestos lo comprueba otra vez
// contra su catálogo y crea un presupuesto NUEVO en borrador (libreta.js de cocinas).
import { situarMuebles, situarCuerpos, piezasInterior } from './modulos.js';
import { textoMaterial } from './material.js';
import { ALTURAS } from './alzado.js';

const hay = v => v !== null && v !== undefined;
export const CLAVE_PASO = 'libreta_a_presupuesto';
export const CALIDAD = 'BÁSICO';            // G2
export const ALTURAS_ALTO = ['ALTO 90-100', 'ALTO 70-80', 'ALTO 45', 'ALTO 60', 'ALTO 35-40'];
export const ALTURAS_COLUMNA = ['COLUMNA 200-215', 'COLUMNA 220-240', 'SEMICOLUMNA 135-145'];
const puertas = (cm, una = '1 PUERTA', dos = '2 PUERTAS') => (cm >= 70 ? dos : una);
// Color del casco de la libreta → acabado de casco de presupuestos.
const CASCO = { blanco: 'blanco 16', gris: 'gris 16', antracita: 'antracita 19', roble: 'roble 19', nogal: 'nogal 19', coco: 'coco 19' };

// Modelos que se pueden elegir para cada tipo de mueble (los del catálogo de presupuestos).
export function variantesDe(m) {
  switch (m.tipo) {
    case 'bajo': return ['PUERTAS', '2 CACEROLEROS', '1 GAVETERO 2 CACEROLEROS', '2 GAVETEROS 1 CACEROLERO', '1 GAVETERO 1 PUERTA', '4 GAVETEROS', '5 GAVETEROS', 'ESPECIERO', 'PANERO', 'VITRINA'];
    case 'cajonero': return ['4 GAVETEROS', '5 GAVETEROS', '2 CACEROLEROS', '1 GAVETERO 2 CACEROLEROS', '2 GAVETEROS 1 CACEROLERO'];
    case 'placa': return ['1 GAVETERO 2 CACEROLEROS', '2 CACEROLEROS', '2 GAVETEROS 1 CACEROLERO', 'PUERTAS', 'SOPORTE HORNO Y 1 GAVETERO', 'SOPORTE HORNO SIN CAJÓN'];
    case 'columna_hmo': return ['PUERTA + H/MO + 2 CACEROLEROS', 'PUERTA + H/MO + PUERTA', 'PUERTA + ELECTRODOMÉSTICO + 2 CACER', 'PUERTA + ELECTRODOMÉSTICO + PUERTA'];
    case 'escobero': case 'despensero': return ['PUERTAS', '1/4+3/4', 'VITRINA'];
    case 'alto': return ['PUERTAS', 'VITRINA', 'BOTELLERO DECORATIVO', '2 ESTANTES DECORATIVO', 'ABATIBLE'];
    case 'alto_campana': return ['CAMPANA EXTRAÍBLE', 'CAMPANA INTEGRABLE'];
    case 'rinconero': return m.forma === 'L' || !m.forma ? ['RINCÓN EN L'] : [];
    default: return [];
  }
}
export const NOMBRE_VARIANTE = v => ({ PUERTAS: 'Puertas', '1/4+3/4': '1/4 + 3/4' }[v] || v.charAt(0) + v.slice(1).toLowerCase());
export const alturasDe = m => (['alto', 'alto_campana'].includes(m.tipo) ? ALTURAS_ALTO : ['columna_hmo', 'columna_frigo', 'escobero', 'despensero'].includes(m.tipo) ? ALTURAS_COLUMNA : []);

// La variante que va si no se ha elegido.
export function varianteHabitual(m, d) {
  const cm = (m.ancho || 0) / 10;
  if (m.tipo === 'cajonero') return cm <= 60 ? '4 GAVETEROS' : '1 GAVETERO 2 CACEROLEROS';
  if (m.tipo === 'placa') return m.horno ? 'SOPORTE HORNO Y 1 GAVETERO' : '1 GAVETERO 2 CACEROLEROS';
  if (m.tipo === 'columna_hmo') return 'PUERTA + H/MO + 2 CACEROLEROS';
  if (m.tipo === 'alto_campana') { const c = (d.electro || []).find(e => e.clave === 'campana'); return c && c.tipo === 'integrada' ? 'CAMPANA INTEGRABLE' : 'CAMPANA EXTRAÍBLE'; }
  if (m.tipo === 'rinconero') return 'RINCÓN EN L';
  return variantesDe(m)[0] || null;
}
export const alturaHabitual = (m, d) => (alturasDe(m) === ALTURAS_COLUMNA ? ((d.alto_techo || 2500) >= 2400 ? 'COLUMNA 220-240' : 'COLUMNA 200-215') : alturasDe(m).length ? ALTURAS_ALTO[0] : null);

// El artículo del catálogo de un mueble: { m, mo, med, texto } o { revisar: '…' } si no hay uno claro.
export function articulo(m, d) {
  const cm = (m.ancho || 0) / 10, med = String(Math.round(cm)), texto = (m.nombre || m.tipo) + ' ' + med;
  if (!hay(m.ancho) || Math.round(cm) !== cm) return { revisar: 'Mueble ' + m.tipo + (hay(m.ancho) ? ' de ' + String(cm).replace('.', ',') + ' cm' : ' sin ancho') + ': elegir a mano' };
  const v = m.variante || varianteHabitual(m, d), alto = m.altura || alturaHabitual(m, d);
  const r = (mm, mo, extra = '') => ({ m: mm, mo, med, texto: mm + ' · ' + mo + ' · ' + med + extra });
  switch (m.tipo) {
    case 'bajo': case 'fregadero': return r('BAJO', v === 'PUERTAS' || !v ? puertas(cm) : v);
    case 'cajonero': case 'placa': return r('BAJO', v === 'PUERTAS' ? puertas(cm) : v);
    case 'lavavajillas': return r('BAJO', 'LAVAVAJILLAS INTEGRABLE');
    case 'rinconero':
      if (m.forma === 'recto') return r('BAJO', 'RINCÓN CIEGO');
      if (m.forma === 'chaflan') return { revisar: 'Rinconero en chaflán de ' + med + ': no hay bajo en chaflán en el catálogo' };
      return r('BAJO', 'RINCÓN EN L');
    case 'columna_hmo': return r(alto, v);
    case 'columna_frigo':
      if ((d.electro || []).some(e => e.clave === 'frigo' && (e.tipo === 'libre' || e.tipo === 'americano'))) return { revisar: 'Hueco para frigorífico libre de ' + med + ' (sin mueble)' };
      return r(alto, 'FRIGORÍFICO INTEGRADO');
    case 'escobero': case 'despensero': {
      const una = v === '1/4+3/4' ? '1/4+3/4 1 PUERTA' : v === 'VITRINA' ? 'VITRINA' : '1 PUERTA', dos = v === '1/4+3/4' ? '1/4+3/4 2 PUERTAS' : v === 'VITRINA' ? 'VITRINA' : '2 PUERTA';
      return r(alto, cm >= 70 ? dos : una);
    }
    case 'alto': return r(alto, v === 'PUERTAS' || !v ? puertas(cm) : v);
    case 'alto_campana': return r(alto, v);
    case 'alto_micro': return r('ALTO MO 130', '1 PUERTA');
    case 'alto_frigo': return r('ALTO S-FRIGO 50-60', cm >= 70 ? '2 PUERTAS' : '1 PUERTA');
    case 'hueco': return null;
    default: return { revisar: (m.nombre || 'Mueble') + ' de ' + med + ': elegir a mano' };
  }
}

// El paquete que recoge la app de presupuestos.
export function paquetePresupuesto(ficha, trabajo, ajustes) {
  const d = ficha.datos, t = trabajo || {}, td = t.datos || {}, revisar = [], notas = [];
  const bajos = [], altos = [], tramos = [];
  (d.paredes || []).forEach(p => {
    const sit = situarMuebles(p, d);
    sit.bajos.forEach(b => { const a = articulo(b.m, d); if (!a) return; if (a.revisar) revisar.push('Pared ' + p.letra + ': ' + a.revisar); else bajos.push(Object.assign({ und: 1 }, a, { texto: 'Pared ' + p.letra + ': ' + a.texto })); });
    sit.altos.forEach(x => { const a = articulo(x.m, d); if (!a) return; if (a.revisar) revisar.push('Pared ' + p.letra + ': ' + a.revisar); else altos.push(Object.assign({ und: 1 }, a, { texto: 'Pared ' + p.letra + ': ' + a.texto })); });
    // Vestidor: un tramo por pared, con sus cuerpos.
    const sc = situarCuerpos(p, d);
    if (sc.cuerpos.length) {
      const cuerpos = sc.cuerpos.map(({ c, desde, hasta }) => {
        const pz = piezasInterior(c, ALTURAS.columna), n = k => pz.filter(q => q.tipo === k).length;
        return { ancho: Math.round((hasta - desde) / 10), barra: n('barra'), cajones: n('cajon'), estantes: n('estante') + n('zapato') };
      });
      const conPuertas = sc.cuerpos.map(x => x.c.puertas).find(Boolean);
      tramos.push({ nombre: 'Pared ' + p.letra, ancho: cuerpos.reduce((s, c) => s + c.ancho, 0), alto: Math.round((d.alto_techo || 2500) / 10), cuerpos,
        puertas: conPuertas === 'corredera' ? 'corredera_tablero' : conPuertas === 'abatible' ? 'abatible_tablero' : 'ninguna' });
      sc.cuerpos.forEach(({ c }, i) => { if (c.rincon) revisar.push('Pared ' + p.letra + ', cuerpo ' + (i + 1) + ': de rincón (' + c.rincon + '), revisar'); });
    }
  });
  // Electrodomésticos, encimera y lineales: para elegir modelo o ponerles precio.
  (d.electro || []).forEach(e => revisar.push('Electrodoméstico: ' + [e.clave === 'otro' ? e.nombre || 'otro' : e.clave, e.tipo, e.modelo].filter(Boolean).join(' ') + ' (elegir modelo)'));
  textoMaterial(ficha, 'cm', ajustes).filter(l => /^(Encimera|- Pared|- Isla|- Pen|- Uniones|- Hueco|Zócalo|Cornisa|Tira LED)/.test(l)).forEach(l => revisar.push(l.replace(/^- /, 'Encimera · ')));
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
  if (tramos.length) grupos.push({ tipo: 'armario', nombre: 'Vestidor', tramos });
  if (revisar.length) grupos.push({ tipo: 'revisar', lineas: revisar });
  const nombre = ficha.nombre || (ficha.tipo === 'cocina' ? 'Cocina' : 'Vestidor');
  const n = bajos.length + altos.length + tramos.reduce((s, x) => s + x.cuerpos.length, 0);
  return { v: 1, creado: new Date().toISOString(), titulo: (ficha.tipo === 'cocina' ? 'la cocina' : 'el vestidor') + ' «' + nombre + '»' + (t.nombre ? ' de ' + t.nombre : ''),
    resumen: n + (n === 1 ? ' mueble' : ' muebles') + (revisar.length ? ' · ' + revisar.length + ' por revisar' : ''),
    cliente: t.cliente || '', direccion: t.direccion || '', telefono: td.telefono || '', notas: notas.join('\n'), grupos };
}
