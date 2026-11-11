import { prueba, afirma, igual, fin } from './mini.js';
import { camposDeElemento, paredNueva, elementoNuevo, fichaNueva, trabajoNuevo, avisos, buscar, TIPOS_ELEMENTO, puertaNueva, normalizarFicha, resumenPuerta, RAPIDAS_PUERTA, tieneInformacion, limpiarDatos, NOMBRE_ELEMENTO, USOS, nombreElemento, textoAzulejo } from '../docs/js/modelo.js';

const cocina = (largo, el) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = [{ id: 'p', letra: 'A', largo, elementos: [Object.assign(elementoNuevo('ventana', 'izq'), el)] }]; return f; };
const armario = o => Object.assign(fichaNueva('armario', 'corredera', 't'), { datos: Object.assign(fichaNueva('armario', 'corredera', 't').datos, o) });

prueba('campos por tipo', () => {
  igual(camposDeElemento('ventana'), { ancho: true, alto: true, fondo: false, altura: true, punto: 'borde' });
  igual(camposDeElemento('puerta'), { ancho: true, alto: true, fondo: false, altura: true, punto: 'borde' });
  igual(camposDeElemento('pilar'), { ancho: true, alto: false, fondo: true, altura: false, punto: 'borde' });
  igual(camposDeElemento('desague'), { ancho: false, alto: false, fondo: false, altura: true, punto: 'centro' });
});
prueba('ficha vacía: sin nada escrito no tiene información', () => {
  for (const [t, s] of [['puerta'], ['cocina'], ['armario', 'corredera'], ['armario', 'abatible'], ['armario', 'vestidor'], ['nota']]) {
    const f = fichaNueva(t, s, 't'); f.datos.notas.push({ id: 'n', texto: '  ' }); f.datos.libres.push({ id: 'l', nombre: '', mm: null });
    afirma(!tieneInformacion(f.datos), t + ' ' + s);
  }
  const p = fichaNueva('puerta', null, 't'); p.datos.puertas[0].condena = false; afirma(tieneInformacion(p.datos), 'condena no');
  const c = fichaNueva('cocina', null, 't'); c.datos.paredes[0].elementos.push(elementoNuevo('desague', 'izq')); afirma(tieneInformacion(c.datos), 'un desagüe');
  const n = fichaNueva('nota', null, null); n.datos.notas.push({ id: 'x', texto: 'hola' }); afirma(tieneInformacion(n.datos), 'nota escrita');
  const m = fichaNueva('nota', null, null); m.datos.libres.push({ id: 'x', nombre: '', mm: null, mal: { mm: '1.5' } }); afirma(tieneInformacion(m.datos), 'medida mal escrita');
});
prueba('limpiar quita notas y medidas vacías y deja las demás', () => {
  const f = fichaNueva('nota', null, null);
  f.datos.notas = [{ id: 'a', texto: '' }, { id: 'b', texto: 'Ojo' }, { id: 'c', texto: '   ' }];
  f.datos.libres = [{ id: 'x', nombre: '', mm: null }, { id: 'y', nombre: 'Mesa', mm: null }, { id: 'z', nombre: '', mm: 5 }];
  const d = limpiarDatos(f.datos);
  igual(d.notas.map(n => n.id), ['b']); igual(d.libres.map(m => m.id), ['y', 'z']); igual(f.datos.notas.length, 3, 'cambió el original');
});
prueba('tipos de vestidor sin los de cocina', () => { afirma(!TIPOS_ELEMENTO.vestidor.includes('humos')); afirma(TIPOS_ELEMENTO.cocina.includes('humos')); });
prueba('pocos botones: tomas y enchufes se eligen después', () => {
  igual(TIPOS_ELEMENTO.cocina, ['humos', 'desague', 'toma', 'enchufe', 'ventana', 'puerta', 'pilar', 'otro']);
  igual(TIPOS_ELEMENTO.vestidor, ['enchufe', 'ventana', 'puerta', 'pilar', 'otro']);
  igual(USOS.toma.map(u => u[0]), ['agua', 'termo', 'gas']);
  igual(USOS.enchufe.map(u => u[0]), ['general', 'hmo', 'placa', 'campana', 'frigo', 'lavavajillas', 'lavadora', 'termo']);
  igual(NOMBRE_ELEMENTO.pilar, 'Mocheta (pilar)');
});
prueba('nombre de cada elemento según de qué es', () => {
  igual(nombreElemento({ tipo: 'enchufe', para: 'hmo' }), 'Enchufe H/MO (columna)');
  igual(nombreElemento({ tipo: 'enchufe', para: null }), 'Enchufe');
  igual(nombreElemento({ tipo: 'toma', para: 'termo' }), 'Toma de termo');
  igual(nombreElemento({ tipo: 'toma', para: null }), 'Toma');
  igual(nombreElemento({ tipo: 'enchufe_horno' }), 'Enchufe horno'); // los antiguos siguen igual
  igual(nombreElemento({ tipo: 'otro', nombre: 'Radiador' }), 'Radiador');
  igual(camposDeElemento('toma').punto, 'centro');
});
prueba('zonas azulejadas: rectángulo en la pared con su nombre', () => {
  igual(camposDeElemento('zona'), { ancho: true, alto: true, fondo: false, altura: true, punto: 'borde' });
  igual(nombreElemento({ tipo: 'zona', nombre: 'campana' }), 'Zona azulejada (campana)'); igual(nombreElemento({ tipo: 'zona', nombre: '' }), 'Zona azulejada');
});
prueba('texto del azulejo de una pared', () => {
  igual(textoAzulejo({ azulejo: null }, 'm'), ''); igual(textoAzulejo({ azulejo: 'no' }, 'm'), 'sin azulejo');
  igual(textoAzulejo({ azulejo: 'toda' }, 'm'), 'azulejo en toda la pared');
  igual(textoAzulejo({ azulejo: 'franja', azulejo_desde: 900, azulejo_hasta: 1500 }, 'm'), 'azulejo desde 0,9 hasta 1,5 m');
  igual(textoAzulejo({ azulejo: 'franja', azulejo_desde: 900, azulejo_techo: true }, 'cm'), 'azulejo desde 90 cm hasta el techo');
  igual(textoAzulejo({ azulejo: 'franja' }, 'm'), 'azulejo en franja');
  igual(textoAzulejo({ azulejo: 'zonas' }, 'm'), 'azulejo por zonas');
});
prueba('franja al revés avisa', () => { const f = fichaNueva('cocina', null, 't'); Object.assign(f.datos.paredes[0], { azulejo: 'franja', azulejo_desde: 1500, azulejo_hasta: 900 }); igual(avisos(f, 'mm').length, 1); });
prueba('el elemento nuevo empieza sin elegir de qué es', () => { igual(elementoNuevo('enchufe', 'izq').para, null); });
prueba('siguiente letra libre', () => igual(paredNueva([{ letra: 'A' }, { letra: 'C' }]).letra, 'B'));
prueba('el elemento nace con la última referencia', () => { igual(elementoNuevo('gas', 'der').ref, 'der'); igual(elementoNuevo('gas').ref, 'izq'); });
prueba('ficha de puertas nace con una puerta, sin hacia dentro o fuera', () => {
  const f = fichaNueva('puerta', null, 't'); igual(f.trabajo_id, 't'); igual(f.updated_at, null); igual(f.datos.libres, []); igual(f.datos.notas, []);
  igual(f.datos.puertas.length, 1); const p = f.datos.puertas[0];
  igual([p.ancho, p.alto, p.tabique, p.mano, p.condena, p.vidriera], [null, null, null, null, null, null]); afirma(!('sentido' in p)); afirma(p.id);
});
prueba('una puerta nueva copia el tabique de la anterior', () => {
  const p = puertaNueva({ ancho: 820, tabique: 90, mano: 'izq' }); igual(p.tabique, 90); igual(p.ancho, null); igual(p.mano, null);
  igual(puertaNueva(null).tabique, null);
});
prueba('una ficha de puerta antigua pasa a tener la lista', () => {
  const vieja = { id: 'f', tipo: 'puerta', nombre: 'Baño', datos: { libres: [], notas: [], ref_ultima: 'izq', ancho: 825, alto: 2030, tabique: 90, mano: 'der', condena: true, vidriera: false } };
  const f = normalizarFicha(vieja), p = f.datos.puertas;
  igual(p.length, 1); igual([p[0].nombre, p[0].ancho, p[0].alto, p[0].tabique, p[0].mano, p[0].condena, p[0].vidriera], ['Baño', 825, 2030, 90, 'der', true, false]);
  afirma(!('ancho' in f.datos), 'quedó el ancho suelto'); igual(f.nombre, '');
  igual(normalizarFicha(f), f, 'una ficha ya nueva no cambia');
});
prueba('resumen de una puerta', () => {
  igual(resumenPuerta({ ancho: 820, alto: 2030, tabique: 90, mano: 'izq', condena: true, vidriera: false }, 'cm'), '82 × 203 × 9 cm · abre ← izq. · condena');
  igual(resumenPuerta({ ancho: 820, alto: null, tabique: null, mano: 'der', condena: false, vidriera: true }, 'mm'), '820 × ? mm · abre dcha. → · vidriera');
  igual(resumenPuerta({ ancho: null, alto: null, tabique: null, mano: null, condena: null, vidriera: null }, 'mm'), 'sin medidas');
});
prueba('medidas rápidas de puerta', () => { igual(RAPIDAS_PUERTA.ancho, [920, 820, 720, 620]); igual(RAPIDAS_PUERTA.alto, [2030, 2110]); igual(RAPIDAS_PUERTA.tabique, [70, 90, 110]); });
prueba('avisos de cada puerta', () => {
  const f = fichaNueva('puerta', null, 't'); f.datos.puertas[0].ancho = 0; f.datos.puertas.push(Object.assign(puertaNueva(null), { alto: 20001 }));
  const a = avisos(f, 'mm'); igual(a.length, 2); igual(a[0].campo, 'puerta.' + f.datos.puertas[0].id);
});
prueba('buscar mira los nombres de las puertas', () => { const f = fichaNueva('puerta', null, 't'); f.datos.puertas[0].nombre = 'Dormitorio grande'; igual(buscar('dormitorio', [], [f]).fichas.length, 1); });
prueba('las paredes tienen alto y cocina y vestidor empiezan con la pared A', () => {
  igual(paredNueva([]).alto, null);
  igual(fichaNueva('cocina', null, 't').datos.paredes.map(p => p.letra), ['A']);
  igual(fichaNueva('armario', 'vestidor', 't').datos.paredes.map(p => p.letra), ['A']);
});
prueba('alto de pared cero avisa', () => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes[0].alto = 0; igual(avisos(f, 'mm').length, 1); });
prueba('el vestidor tiene altura general y avisa si es cero', () => { const f = fichaNueva('armario', 'vestidor', 't'); igual(f.datos.alto_techo, null); f.datos.alto_techo = 0; igual(avisos(f, 'mm').length, 1); });
prueba('nota suelta sin trabajo', () => igual(fichaNueva('nota', null, null).trabajo_id, null));
prueba('trabajo nuevo con su unidad', () => { const t = trabajoNuevo('Casa', 'cm'); igual(t.unidad, 'cm'); igual(t.nombre, 'Casa'); igual(t.updated_at, null); });
prueba('elemento fuera de la pared avisa', () => igual(avisos(cocina(3000, { distancia: 3100 }), 'mm').length, 1));
prueba('distancia más ancho fuera de la pared avisa', () => igual(avisos(cocina(3000, { distancia: 2900, ancho: 200 }), 'mm').length, 1));
prueba('justo hasta el final no avisa', () => igual(avisos(cocina(3000, { distancia: 2800, ancho: 200 }), 'mm').length, 0));
prueba('sin largo no se compara', () => igual(avisos(cocina(null, { distancia: 3100 }), 'mm').length, 0));
prueba('distancia y altura cero son válidas', () => igual(avisos(cocina(3000, { distancia: 0, altura: 0 }), 'mm').length, 0));
prueba('anchos de armario dentro de 10 no avisan', () => igual(avisos(armario({ ancho_arriba: 2000, ancho_medio: 2010, ancho_abajo: 2005 }), 'mm').length, 0));
prueba('anchos de armario con 11 avisan en la unidad pedida', () => { const a = avisos(armario({ ancho_arriba: 2000, ancho_abajo: 2011 }), 'cm'); igual(a.length, 1); afirma(a[0].texto.includes('1,1'), a[0].texto); });
prueba('altos de armario avisan', () => igual(avisos(armario({ alto_izq: 2400, alto_der: 2411 }), 'mm').length, 1));
prueba('un solo alto no avisa', () => igual(avisos(armario({ alto_izq: 2400 }), 'mm').length, 0));
prueba('valores improbables', () => {
  const p = o => { const f = fichaNueva('puerta', null, 't'); Object.assign(f.datos.puertas[0], o); return f; };
  igual(avisos(p({ ancho: 0 }), 'mm').length, 1); igual(avisos(p({ ancho: 20001 }), 'mm').length, 1); igual(avisos(p({ ancho: 20000 }), 'mm').length, 0);
});
prueba('buscar ignora acentos y borrados, y mira notas', () => {
  const t1 = Object.assign(trabajoNuevo('Reforma', 'mm'), { cliente: 'García' }), t2 = Object.assign(trabajoNuevo('García antiguo', 'mm'), { borrado_at: 'x' });
  const f = fichaNueva('nota', null, null); f.datos.notas = [{ id: 'n', texto: 'Ajustar la SIERRA' }];
  const r = buscar('garcia', [t1, t2], [f]); igual(r.trabajos.length, 1); igual(r.fichas.length, 0);
  igual(buscar('sierra', [t1], [f]).fichas.length, 1);
});
prueba('buscar mira medidas libres', () => { const f = fichaNueva('nota', null, null); f.datos.libres = [{ id: 'l', nombre: 'Máquina', mm: 5 }]; igual(buscar('maquina', [], [f]).fichas.length, 1); });
prueba('buscar vacío devuelve todo lo no borrado', () => igual(buscar('', [trabajoNuevo('a', 'mm')], []).trabajos.length, 1));
fin();
