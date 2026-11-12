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
    await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3');
    await a.page.click('[data-acc="anadir-pared"]');
    await a.page.fill('[data-pared="B"] > .fila-largo > [data-c="largo"] input', '2');
    await a.page.waitForSelector('[data-acc="alzado"]');
    igual(await a.page.getAttribute('[data-acc="alzado"]', 'aria-label'), 'Alzado de la pared A');
    await a.page.click('[data-acc="alzado-pared"][data-v="B"]');
    igual(await a.page.getAttribute('[data-acc="alzado"]', 'aria-label'), 'Alzado de la pared B');
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
prueba('pilar junto al largo y zona azulejada justo debajo, con la altura de la franja; alzados en el resumen', async () => {
  const a = await abrir(); try {
    await entrar(a); await crearTrabajo(a, 'Casa');
    await a.page.click('[data-acc="unidad"][data-v="cm"]'); await a.page.waitForTimeout(50);
    await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > .fila-largo [data-c="largo"] input', '3');
    await a.page.click('[data-pared="A"] [data-acc="pilares"]');
    afirma(await a.page.$('[data-pared="A"] .zona-pilares [data-elemento="pilar"]'), 'el pilar no sale junto a su botón');
    await a.page.click('[data-pared="A"] [data-acc="azulejo"][data-v="franja"]');
    await a.page.fill('[data-pared="A"] [data-acc="azulejo_desde"]', '0,85'); await a.page.fill('[data-pared="A"] [data-acc="azulejo_hasta"]', '1,45');
    await a.page.press('[data-pared="A"] [data-acc="azulejo_hasta"]', 'Tab');
    await a.page.click('[data-pared="A"] [data-acc="anadir-zona"]');
    const Z = '[data-pared="A"] .zona-zonas [data-elemento="zona"] ';
    igual([await a.page.inputValue(Z + '[data-acc="altura"]'), await a.page.inputValue(Z + '[data-acc="alto"]')], ['85', '60']);
    await a.page.click('header [data-acc="cab-resumen"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
    igual((await a.page.$$('.resumen-doc .alzado-resumen svg.alzado')).length, 1);
    igual(a.errores, []);
  } finally { await a.cerrar(); }
});
prueba('alzado: un pilar en el rincón sale en las dos paredes (en la otra, lo que sobresale)', () => {
  const f = fichaNueva('cocina', null, 't');
  const pilar = Object.assign(elementoNuevo('pilar', 'der'), { distancia: 0, ancho: 220, fondo: 350 });
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 2580, elementos: [pilar] }), Object.assign(paredNueva([]), { letra: 'B', largo: 4020, elementos: [] })];
  const ga = geometriaAlzado(f.datos, f.datos.paredes[0]), gb = geometriaAlzado(f.datos, f.datos.paredes[1]);
  igual(ga.piezas.filter(p => p.clase === 'pilar').map(p => [p.x, p.w]), [[2360, 220]]);
  igual(gb.piezas.filter(p => p.clase === 'pilar').map(p => [p.x, p.w, p.texto]), [[0, 350, 'Pilar A']]);
  const sinPilar = Object.assign(paredNueva([]), { letra: 'C', largo: 1000, elementos: [] });
  f.datos.paredes.push(sinPilar);
  igual(geometriaAlzado(f.datos, sinPilar).piezas.filter(p => p.clase === 'pilar').length, 0);
});
fin();
