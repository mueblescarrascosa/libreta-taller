import { prueba, afirma, igual, fin } from './mini.js';
import { leerMedida } from '../docs/js/unidades.js';
import { fichaNueva, avisos, resumenPuerta, puertaNueva, trabajoNuevo, paredNueva, elementoNuevo } from '../docs/js/modelo.js';
import { ELECTRO, electroNuevo, textoElectro } from '../docs/js/modulos.js';
import { textoResumen } from '../docs/js/resumen.js';
import { resumenCorto, faltan, recuentoPuertas, duplicarFicha, enPapelera, restaurar, actividad, fotosParaLimpiar, fichasDePlantilla, textoTrabajo } from '../docs/js/trabajos.js';
import { mezclarAjustes } from '../docs/js/modelo.js';

const AJ = mezclarAjustes(null);
const puertas = (...ps) => { const f = fichaNueva('puerta', null, 't'); f.datos.puertas = ps.map(p => Object.assign(puertaNueva(null), p)); return f; };

// ── Cuentas en las medidas ──
prueba('cuentas: sumar y restar en cada unidad', () => {
  igual(leerMedida('240-1,5', 'cm'), { mm: 2385, error: null });
  igual(leerMedida('80+12', 'cm'), { mm: 920, error: null });
  igual(leerMedida('800+12', 'mm'), { mm: 812, error: null });
  igual(leerMedida('2,4+0,15', 'm'), { mm: 2550, error: null });
  igual(leerMedida('1+2+3', 'cm'), { mm: 60, error: null });
  igual(leerMedida(' 240 - 1,5 ', 'cm'), { mm: 2385, error: null });
});
prueba('cuentas: lo incompleto o negativo no vale', () => {
  igual(leerMedida('240-', 'cm').error, 'formato');
  igual(leerMedida('10-20', 'cm').error, 'formato');
  igual(leerMedida('+5', 'cm').error, 'formato');
  igual(leerMedida('8,5+1', 'mm').error, 'formato');
  igual(leerMedida('5-5', 'cm'), { mm: 0, error: null });
});

// ── Resumen corto y lo que falta ──
prueba('resumen corto de cada ficha', () => {
  igual(resumenCorto(puertas({}, {}, {})), '3 puertas');
  igual(resumenCorto(puertas({})), '1 puerta');
  const c = fichaNueva('cocina', null, 't'); c.datos.paredes.push(paredNueva(c.datos.paredes));
  igual(resumenCorto(c), '2 paredes');
  const a = fichaNueva('armario', 'corredera', 't'); a.datos.cuerpos = [{ id: 1 }, { id: 2 }, { id: 3 }];
  igual(resumenCorto(a), 'Corredera · 3 cuerpos');
  const n = fichaNueva('nota', null, 't'); n.datos.notas = [{ id: 1, texto: 'a' }, { id: 2, texto: 'b' }];
  igual(resumenCorto(n), '2 notas');
});
prueba('lo que falta por medir', () => {
  igual(faltan(puertas({ ancho: 820, alto: 2030 }, { nombre: 'Baño', ancho: 720 })), ['Baño: falta el alto']);
  const c = fichaNueva('cocina', null, 't'); c.datos.alto_techo = 2600;
  igual(faltan(c), ['Pared A: falta el largo']);
  const a = fichaNueva('armario', 'abatible', 't'); a.datos.ancho_medio = 1500;
  igual(faltan(a), ['Falta el alto del hueco', 'Falta el fondo']);
  igual(faltan(fichaNueva('nota', null, 't')), []);
});

// ── Recuento de puertas para el pedido ──
prueba('recuento de puertas agrupa por medida', () => {
  const r = recuentoPuertas([
    puertas({ ancho: 820, alto: 2030, condena: true, mano: 'izq' }, { ancho: 820, alto: 2030, vidriera: true, mano: 'der' }, { ancho: 720, alto: 2030, tipo: 'corredera' }),
    puertas({ ancho: 820, alto: 2030, mano: 'izq', vidriera: true }, {}),
  ], 'cm');
  igual(r.total, 5);
  igual(r.lineas, ['3 de 82 × 203 (premarco)', '1 de 72 × 203 (premarco)', '1 sin medidas', 'Abren a la izquierda: 2 · a la derecha: 1', 'Con condena: 1', 'Con vidriera: 2', 'Correderas: 1']);
});

// ── Duplicar ──
prueba('duplicar crea otra ficha con todo copiado e ids nuevos', () => {
  const f = puertas({ nombre: 'Salón', ancho: 820 }); f.nombre = 'Planta baja'; f.updated_at = '2026-01-01'; f.datos.notas = [{ id: 'n1', texto: 'ojo' }];
  const c = duplicarFicha(f, 'otro');
  afirma(c.id !== f.id); igual(c.trabajo_id, 'otro'); igual(c.nombre, 'Planta baja (copia)'); igual(c.updated_at, null); igual(c.borrado_at, null);
  igual(c.datos.puertas[0].ancho, 820); afirma(c.datos.puertas[0].id !== f.datos.puertas[0].id, 'mismo id de puerta'); afirma(c.datos.notas[0].id !== 'n1');
  igual(f.datos.puertas[0].nombre, 'Salón');
  c.datos.puertas[0].ancho = 1; igual(f.datos.puertas[0].ancho, 820, 'comparten datos');
});
prueba('duplicar una ficha sin nombre la llama copia', () => {
  igual(duplicarFicha(fichaNueva('cocina', null, 't'), 't').nombre, 'Cocina (copia)');
});

// ── Papelera ──
const DIA = 86400000, AHORA = Date.parse('2026-11-10T12:00:00Z');
const hace = d => new Date(AHORA - d * DIA).toISOString();
prueba('la papelera guarda 30 días lo borrado con información', () => {
  const t1 = Object.assign(trabajoNuevo('Casa', 'mm'), { borrado_at: hace(2) }), t2 = Object.assign(trabajoNuevo('Viejo', 'mm'), { borrado_at: hace(40) }), t3 = trabajoNuevo('Vivo', 'mm');
  const f1 = Object.assign(puertas({ ancho: 820 }), { trabajo_id: t1.id, borrado_at: t1.borrado_at });
  const f2 = Object.assign(puertas({ ancho: 720 }), { trabajo_id: t3.id, borrado_at: hace(1) });
  const f3 = Object.assign(fichaNueva('nota', null, t3.id), { borrado_at: hace(1) }); // vacía: no
  const r = enPapelera([t1, t2, t3], [f1, f2, f3], AHORA);
  igual(r.trabajos.map(t => t.nombre), ['Casa']);
  igual(r.fichas.map(f => f.id), [f2.id]);
});
prueba('restaurar un trabajo trae sus fichas borradas con él', () => {
  const t = Object.assign(trabajoNuevo('Casa', 'mm'), { borrado_at: hace(2) });
  const f1 = Object.assign(puertas({ ancho: 820 }), { trabajo_id: t.id, borrado_at: t.borrado_at });
  const f2 = Object.assign(puertas({ ancho: 720 }), { trabajo_id: t.id, borrado_at: hace(5) });
  const r = restaurar({ tipo: 'trabajo', fila: t }, [t], [f1, f2]);
  igual(r.map(x => [x.tabla, x.fila.id, x.fila.borrado_at]), [['trabajos', t.id, null], ['fichas', f1.id, null]]);
});
prueba('restaurar una ficha de un trabajo borrado trae también el trabajo', () => {
  const t = Object.assign(trabajoNuevo('Casa', 'mm'), { borrado_at: hace(2) });
  const f = Object.assign(puertas({ ancho: 820 }), { trabajo_id: t.id, borrado_at: hace(3) });
  igual(restaurar({ tipo: 'ficha', fila: f }, [t], [f]).map(x => x.tabla), ['fichas', 'trabajos']);
});

// ── Orden por actividad ──
prueba('la actividad de un trabajo es lo último que se tocó en él', () => {
  const t = Object.assign(trabajoNuevo('Casa', 'mm'), { updated_at: '2026-01-01T00:00:00+00:00' });
  const f = Object.assign(fichaNueva('nota', null, t.id), { updated_at: '2026-03-01T00:00:00+00:00' });
  igual(actividad(t, [f], new Set()), Date.parse('2026-03-01T00:00:00Z'));
  afirma(actividad(t, [f], new Set(['fichas:' + f.id])) === Infinity, 'lo pendiente va primero');
});

// ── Limpieza de fotos ──
prueba('se limpian del móvil solo las fotos subidas de fichas sin tocar hace 60 días', () => {
  const vieja = Object.assign(fichaNueva('nota', null, 't'), { id: 'fv', updated_at: hace(70) }), nueva = Object.assign(fichaNueva('nota', null, 't'), { id: 'fn', updated_at: hace(3) });
  const adj = [{ id: 'a1', ficha_id: 'fv', borrado_at: null }, { id: 'a2', ficha_id: 'fn', borrado_at: null }, { id: 'a3', ficha_id: 'fv', borrado_at: null }, { id: 'a4', ficha_id: 'fn', borrado_at: hace(1) }];
  const r = fotosParaLimpiar({ adjuntos: adj, fichas: [vieja, nueva], cola: new Set(['adjuntos:a3']), blobs: ['a1', 'a2', 'a3', 'a4', 'a9'], ahora: AHORA });
  igual(r.sort(), ['a1', 'a4', 'a9']);
});

// ── Plantilla ──
prueba('plantilla de piso: crea las fichas con nombre para que no se descarten', () => {
  const l = fichasDePlantilla('T', { puertas: true, cocina: true, armarios: { corredera: 2, vestidor: 1 } });
  igual(l.map(f => [f.tipo, f.subtipo, f.nombre, f.trabajo_id]), [
    ['puerta', null, 'Puertas', 'T'], ['cocina', null, 'Cocina', 'T'],
    ['armario', 'corredera', 'Armario corredera 1', 'T'], ['armario', 'corredera', 'Armario corredera 2', 'T'], ['armario', 'vestidor', 'Vestidor', 'T']]);
});

// ── Puertas: tipo ──
prueba('el tipo de puerta sale en su resumen', () => {
  afirma(resumenPuerta(Object.assign(puertaNueva(null), { ancho: 820, tipo: 'corredera' }), 'cm').includes('corredera'));
  afirma(resumenPuerta(Object.assign(puertaNueva(null), { ancho: 1440, tipo: 'doble' }), 'cm').includes('doble'));
  afirma(!resumenPuerta(Object.assign(puertaNueva(null), { ancho: 820, tipo: 'abatible' }), 'cm').includes('abatible'), 'la normal no se repite');
});

// ── Armario: diagonales ──
prueba('armario: diagonales distintas avisan de que no está a escuadra', () => {
  const a = fichaNueva('armario', 'corredera', 't'); a.datos.diag_1 = 2000; a.datos.diag_2 = 2015;
  const l = avisos(a, 'mm', { margen: 10 }).filter(x => x.campo === 'diagonales');
  igual(l.length, 1); afirma(/escuadra/.test(l[0].texto), l[0].texto);
  a.datos.diag_2 = 2005; igual(avisos(a, 'mm', { margen: 10 }).filter(x => x.campo === 'diagonales').length, 0);
  a.datos.diag_2 = 2015; afirma(/Diagonales: 2000 y 2015/.test(textoResumen({ ficha: a, trabajo: null, ajustes: AJ })));
});

// ── Electrodomésticos ──
prueba('electrodomésticos: lista y texto', () => {
  afirma(ELECTRO.some(e => e[0] === 'frigo') && ELECTRO.some(e => e[0] === 'campana'));
  const e = Object.assign(electroNuevo('frigo'), { tipo: 'integrable', ancho: 600, modelo: 'Bosch KIV' });
  igual(textoElectro(e), 'Frigorífico: integrable · 60 cm · Bosch KIV');
  igual(textoElectro(electroNuevo('horno')), 'Horno');
  const c = fichaNueva('cocina', null, 't'); c.datos.electro = [e];
  afirma(textoResumen({ ficha: c, trabajo: null, ajustes: AJ }).includes('Frigorífico: integrable · 60 cm · Bosch KIV'));
});

// ── Resumen del trabajo completo ──
prueba('el texto del trabajo junta el recuento y todas las fichas', () => {
  const t = Object.assign(trabajoNuevo('Piso Sol', 'cm'), { cliente: 'Juan' });
  const p = Object.assign(puertas({ ancho: 820, alto: 2030 }, { ancho: 820, alto: 2030 }), { trabajo_id: t.id });
  const n = Object.assign(fichaNueva('nota', null, t.id), { nombre: 'Recado' }); n.datos.notas = [{ id: 1, texto: 'Llamar' }];
  const x = textoTrabajo({ trabajo: t, fichas: [p, n], ajustes: AJ });
  afirma(x.startsWith('*Piso Sol*\nJuan'), x);
  afirma(x.includes('*Puertas: 2*\n2 de 82 × 203'), x);
  afirma(x.includes('*Recado*') && x.includes('Llamar'), x);
  igual(x.split('*Piso Sol*').length, 2, 'cabecera repetida');
});

await fin();
