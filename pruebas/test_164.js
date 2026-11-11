import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, trabajoNuevo, mezclarAjustes, puertaNueva } from '../docs/js/modelo.js';
import { copiaSeguridad } from '../docs/js/trabajos.js';

const AJ = mezclarAjustes(null);

prueba('copia de seguridad: trabajos con sus fichas, sueltas, papelera y ajustes', () => {
  const t1 = Object.assign(trabajoNuevo('Casa Pepe', 'cm'), { cliente: 'Pepe' }), t2 = Object.assign(trabajoNuevo('Viejo', 'cm'), { borrado_at: '2026-11-01T00:00:00Z' });
  const p = fichaNueva('puerta', null, t1.id); p.datos.puertas = [Object.assign(puertaNueva(null), { ancho: 820, alto: 2030 })];
  const suelta = fichaNueva('nota', null, null); suelta.nombre = 'Idea'; suelta.datos.notas = [{ id: 'n', texto: 'Llamar al cristalero' }];
  const borrada = Object.assign(fichaNueva('nota', null, t1.id), { nombre: 'Borrada', borrado_at: '2026-11-02T00:00:00Z' });
  const c = copiaSeguridad({ trabajos: [t1, t2], fichas: [p, suelta, borrada], adjuntos: [{ id: 'a1', ficha_id: p.id, ruta: 'U1/a1.jpg', borrado_at: null }], ajustes: AJ, version: '1.6.5', ahora: '2026-11-11T12:00:00Z' });
  igual([c.app, c.version, c.fecha], ['Libreta Taller', '1.6.5', '2026-11-11T12:00:00Z']);
  igual(c.trabajos.map(t => [t.nombre, t.fichas.length]), [['Casa Pepe', 1]]);
  afirma(/82 × 203/.test(c.trabajos[0].fichas[0].texto), c.trabajos[0].fichas[0].texto);
  igual(c.trabajos[0].fichas[0].fotos, ['U1/a1.jpg']);
  igual(c.notas_sueltas.map(f => f.nombre), ['Idea']);
  igual(c.papelera.trabajos.map(t => t.nombre), ['Viejo']); igual(c.papelera.fichas.map(f => f.nombre), ['Borrada']);
  igual(c.ajustes.unidad, AJ.unidad);
});

fin();
