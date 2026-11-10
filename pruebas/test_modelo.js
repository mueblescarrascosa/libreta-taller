import { prueba, afirma, igual, fin } from './mini.js';
import { camposDeElemento, paredNueva, elementoNuevo, fichaNueva, trabajoNuevo, avisos, buscar, TIPOS_ELEMENTO } from '../docs/js/modelo.js';

const cocina = (largo, el) => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = [{ id: 'p', letra: 'A', largo, elementos: [Object.assign(elementoNuevo('ventana', 'izq'), el)] }]; return f; };
const armario = o => Object.assign(fichaNueva('armario', 'corredera', 't'), { datos: Object.assign(fichaNueva('armario', 'corredera', 't').datos, o) });

prueba('campos por tipo', () => {
  igual(camposDeElemento('ventana'), { ancho: true, alto: true, punto: 'borde' });
  igual(camposDeElemento('puerta'), { ancho: true, alto: true, punto: 'borde' });
  igual(camposDeElemento('pilar'), { ancho: true, alto: false, punto: 'borde' });
  igual(camposDeElemento('desague'), { ancho: false, alto: false, punto: 'centro' });
});
prueba('tipos de vestidor sin los de cocina', () => { afirma(!TIPOS_ELEMENTO.vestidor.includes('humos')); afirma(TIPOS_ELEMENTO.cocina.includes('humos')); });
prueba('siguiente letra libre', () => igual(paredNueva([{ letra: 'A' }, { letra: 'C' }]).letra, 'B'));
prueba('el elemento nace con la última referencia', () => { igual(elementoNuevo('gas', 'der').ref, 'der'); igual(elementoNuevo('gas').ref, 'izq'); });
prueba('ficha nueva de puerta sin hacia dentro o fuera', () => {
  const f = fichaNueva('puerta', null, 't'); igual(f.trabajo_id, 't'); igual(f.datos.mano, null); igual(f.updated_at, null); afirma(!('sentido' in f.datos)); igual(f.datos.libres, []); igual(f.datos.notas, []);
});
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
  const p = o => Object.assign(fichaNueva('puerta', null, 't'), { datos: Object.assign(fichaNueva('puerta', null, 't').datos, o) });
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
