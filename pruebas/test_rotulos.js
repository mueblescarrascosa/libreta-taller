import { prueba, afirma, fin } from './mini.js';
import { abrir } from './arnes.js';

// Una cocina real (en L, con pilares, mochetas, ventana y muchos muebles estrechos).
const COCINA = {"islas": [], "plano": {"cerrada": false, "vertices": [{"x": 259.8665466308594, "y": 574.4000854492188}, {"x": 51.35009956359863, "y": 574.4000854492188}, {"x": 51.350099563598626, "y": 204.63331604003906}, {"x": 344.5999755859375, "y": 204.63331604003903}], "diagonales": []}, "libres": [], "electro": [], "paredes": [{"id": "a", "altos": [], "bajos": [], "largo": 2660, "letra": "A", "azulejo": null, "elementos": [{"id": "v", "ref": "der", "alto": 1350, "tipo": "ventana", "ancho": 1950, "desde": "pilar", "altura": 800, "distancia": 0}, {"id": "p1", "ref": "der", "tipo": "pilar", "ancho": 260, "fondo": 260, "distancia": 0}]}, {"id": "b", "altos": [{"id": "h1", "tipo": "hueco", "ancho": 650}, {"id": "ac", "tipo": "alto_campana", "ancho": 600}], "bajos": [{"id": "h2", "tipo": "hueco", "ancho": 50}, {"id": "b1", "tipo": "bajo", "ancho": 500}, {"id": "pl", "tipo": "placa", "ancho": 800}, {"id": "b2", "tipo": "bajo", "ancho": 300}, {"id": "r", "gira": "der", "tipo": "rinconero", "ancho": 930, "forma": "L", "lado2": 930}], "largo": 2580, "letra": "B", "elementos": [{"id": "p2", "ref": "der", "tipo": "pilar", "ancho": 220, "fondo": 350, "distancia": 0}]}, {"id": "c", "altos": [{"id": "h3", "tipo": "hueco", "ancho": 380}, {"id": "a1", "tipo": "alto", "ancho": 600}, {"id": "a2", "tipo": "alto", "ancho": 400}, {"id": "a3", "tipo": "alto", "ancho": 800}, {"id": "a4", "tipo": "alto", "ancho": 600}], "bajos": [{"id": "cj", "tipo": "cajonero", "ancho": 450}, {"id": "fr", "tipo": "fregadero", "ancho": 800}, {"id": "lv", "tipo": "lavavajillas", "ancho": 600}, {"id": "hm", "tipo": "columna_hmo", "ancho": 600}, {"id": "cf", "tipo": "columna_frigo", "ancho": 600}], "largo": 4020, "letra": "C", "elementos": []}], "alto_techo": 2330};

prueba('planta y alzados: ningún rótulo pisa a otro', async () => {
  const a = await abrir({});
  try {
    await a.page.setViewportSize({ width: 900, height: 800 });
    const pisados = await a.page.evaluate(async d => {
      const { geometriaPlanta, svgPlanta } = await import('./js/plano-vista.js');
      const { geometriaAlzado, svgAlzado } = await import('./js/alzado.js');
      const { AJUSTES_FABRICA } = await import('./js/modelo.js');
      const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });
      const caja = document.createElement('div'); caja.style.cssText = 'width:880px';
      caja.append(svgPlanta(geometriaPlanta(d, { margen: 10, unidad: 'cm' })));
      d.paredes.forEach(p => { const ga = geometriaAlzado(d, p, AJ); if (ga) caja.append(svgAlzado(ga, { unidad: 'cm' })); });
      caja.querySelectorAll('svg').forEach(s => { s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; });
      document.body.replaceChildren(caja);
      const r = [];
      caja.querySelectorAll('svg').forEach((s, i) => {
        const t = [...s.querySelectorAll('text')].filter(x => x.textContent.trim()).map(x => ({ t: x.textContent, b: x.getBoundingClientRect() }));
        for (let x = 0; x < t.length; x++) for (let y = x + 1; y < t.length; y++) {
          const A = t[x].b, B = t[y].b, ix = Math.min(A.right, B.right) - Math.max(A.left, B.left), iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (ix > 1 && iy > 1) r.push((i ? 'alzado ' + i : 'planta') + ': «' + t[x].t + '» y «' + t[y].t + '»');
        }
      });
      return r;
    }, COCINA);
    afirma(!pisados.length, pisados.join(' | '));
    afirma(!a.errores.length, a.errores.join(' | '));
  } finally { await a.cerrar(); }
});
prueba('tomas de la pared C: desagüe con el nombre debajo, rayitas por detrás de los nombres y sin pisar al pilar', async () => {
  const a = await abrir({});
  try {
    await a.page.setViewportSize({ width: 900, height: 800 });
    const r = await a.page.evaluate(async d => {
      const { geometriaAlzado, svgAlzado } = await import('./js/alzado.js');
      const { AJUSTES_FABRICA } = await import('./js/modelo.js');
      const AJ = Object.assign({}, AJUSTES_FABRICA, { unidad: 'cm' });
      const p = d.paredes.find(x => x.letra === 'C');
      p.elementos = [['enchufe', 300, 1100], ['enchufe', 900, 1100], ['agua', 1650, 500], ['desague', 1700, 400], ['enchufe', 1750, 300], ['enchufe', 2400, 300], ['desague', 2350, 350], ['enchufe', 2900, 600]]
        .map(([tipo, distancia, altura], i) => ({ id: 'e' + i, tipo, ref: 'izq', distancia, altura }));
      const svg = svgAlzado(geometriaAlzado(d, p, AJ), { unidad: 'cm' });
      svg.style.width = '880px'; document.body.replaceChildren(svg);
      const t = [...svg.querySelectorAll('text')].filter(x => x.textContent.trim()).map(x => ({ t: x.textContent, b: x.getBoundingClientRect() }));
      const pis = [];
      for (let x = 0; x < t.length; x++) for (let y = x + 1; y < t.length; y++) {
        const A = t[x].b, B = t[y].b;
        if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 1 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 1) pis.push(t[x].t + ' / ' + t[y].t);
      }
      const hijos = [...svg.children], primerRotulo = hijos.findIndex(n => n.getAttribute && n.getAttribute('data-rotulo-punto'));
      const rayasDespues = hijos.slice(primerRotulo).filter(n => n.tagName === 'line').length;
      const des = svg.querySelector('[data-rotulo-punto="desague"]').getBoundingClientRect(), punto = svg.querySelector('[data-punto="desague"]').getBoundingClientRect();
      return { pis, rayasDespues, debajo: des.top > punto.bottom };
    }, COCINA);
    afirma(!r.pis.length, r.pis.join(' | '));
    afirma(r.rayasDespues === 0, 'ninguna rayita encima de un nombre: ' + r.rayasDespues);
    afirma(r.debajo, 'el desagüe pone el nombre debajo de su punto');
  } finally { await a.cerrar(); }
});
fin();
