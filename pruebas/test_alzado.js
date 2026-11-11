import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, elementoNuevo } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { geometriaAlzado, ALTURAS } from '../docs/js/alzado.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
function cocina() {
  const f = fichaNueva('cocina', null, 't');
  f.datos.alto_techo = 2600;
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [], azulejo: 'franja', azulejo_desde: 850, azulejo_hasta: 1450,
    bajos: [mod('columna_frigo', 600), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto_frigo', 600), mod('alto', 800)] })];
  return f;
}

prueba('alzado: muebles a su altura, el alto sobre frigo encima de su columna y la franja de azulejo', () => {
  const f = cocina(), g = geometriaAlzado(f.datos, f.datos.paredes[0]);
  igual([g.largo, g.techo, g.techoMedido], [3000, 2600, true]);
  const de = clase => g.piezas.filter(p => p.clase === clase);
  igual(de('columna').map(p => [p.x, p.h]), [[0, ALTURAS.frigo]]);
  igual(de('alto').map(p => [p.tipo, p.x, p.y]), [['alto_frigo', 0, ALTURAS.frigo], ['alto', 600, ALTURAS.altos_desde]]);
  igual(de('bajo').map(p => p.x), [600, 1400]);
  igual(de('azulejo').map(p => [p.y, p.h]), [[850, 600]]);
});
prueba('alzado: ventana con su alféizar, enchufe a su altura desde la derecha y sin largo no hay alzado', () => {
  const f = cocina(), A = f.datos.paredes[0];
  A.elementos.push(Object.assign(elementoNuevo('ventana', 'izq'), { distancia: 1000, ancho: 1200, altura: 1050, alto: 1100 }),
    Object.assign(elementoNuevo('enchufe', 'der'), { distancia: 300, altura: 1100 }), Object.assign(elementoNuevo('desague', 'izq'), { distancia: 900 }));
  const g = geometriaAlzado(f.datos, A);
  igual(g.piezas.filter(p => p.clase === 'ventana').map(p => [p.x, p.y, p.w, p.h]), [[1000, 1050, 1200, 1100]]);
  igual(g.puntos.map(q => [q.tipo, q.x, q.y]), [['enchufe', 2700, 1100], ['desague', 900, null]]);
  A.largo = null; igual(geometriaAlzado(f.datos, A), null);
  f.datos.alto_techo = null; A.largo = 2000; igual(geometriaAlzado(f.datos, A).techoMedido, false);
});
prueba('en la ficha: cada pared de frente con su botón', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa');
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > [data-c="largo"] input', '3');
    await a.page.click('[data-acc="anadir-pared"]');
    await a.page.fill('[data-pared="B"] > [data-c="largo"] input', '2');
    await a.page.waitForSelector('[data-acc="alzado"]');
    igual(await a.page.getAttribute('[data-acc="alzado"]', 'aria-label'), 'Alzado de la pared A');
    await a.page.click('[data-acc="alzado-pared"][data-v="B"]');
    igual(await a.page.getAttribute('[data-acc="alzado"]', 'aria-label'), 'Alzado de la pared B');
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
fin();
