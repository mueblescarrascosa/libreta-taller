// 1.43.0: «Calcular con la tarifa» en el coste estimado: Presupuestos (aquí, uno de mentira en /cocinas/) contesta con
// los totales; el recargo del mueble va en el paquete; error si no contesta bien.
import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
// Presupuestos de mentira: dice que está lista y contesta con un resultado fijo (o con error), y guarda lo recibido.
const falso = ok => '<!doctype html><script>addEventListener("message", ev => { if (ev.data.tipo !== "libreta-estimar") return; window.parent.__recibido = ev.data.paquete;'
  + 'ev.source.postMessage(' + (ok ? '{ tipo: "libreta-estimacion", id: ev.data.id, ok: true, resultado: { grupos: [{ nombre: "Bajos y columnas", tipo: "muebles", total: 512.3, sinPrecio: [] }, { nombre: "Complicaciones", tipo: "libre", total: 40, sinPrecio: [] }, { nombre: "Revisar (de la libreta)", tipo: "libre", total: 0, sinPrecio: ["Electrodoméstico: horno"] }], subtotal: 552.3, instalacion: 100, total: 652.3 } }'
  : '{ tipo: "libreta-estimacion", id: ev.data.id, ok: false, error: "no-arranca" }') + ', location.origin); });'
  + 'window.parent.postMessage({ tipo: "libreta-lista" }, location.origin);</script>';
const cocina = async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="recargo-motivo"][data-v="pilar"]');
  await a.page.click('[data-acc="abrir-coste"]');
};

prueba('calcula con la tarifa: total, instalación, sin precio y el recargo en el paquete', con({}, async a => {
  await a.page.route('**/cocinas/**', r => r.fulfill({ contentType: 'text/html', body: falso(true) }));
  await cocina(a);
  await a.page.click('[data-acc="calcular-tarifa"]');
  await a.page.waitForSelector('[data-acc="tarifa-total"]');
  igual(await a.page.innerText('[data-acc="tarifa-total"] b'), '652 €');
  afirma(await a.page.$('[data-grupo-tarifa="Instalación"]'), 'sale la instalación');
  afirma(/1 cosa sin precio/.test(await a.page.innerText('[data-acc="tarifa-sin-precio"]')));
  const p = await a.page.evaluate(() => window.__recibido);
  igual(p.plano3d, null, 'sin el plano');
  igual(p.grupos[0].lineas[0].recargo, { motivo: 'pilar', pct: 20, texto: 'Cajeado por pilar – Bajo 60 (pared A)' });
  // Al cambiar algo, avisa de que el cálculo es de antes
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]');
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await a.page.waitForSelector('[data-acc="tarifa-vieja"]');
}));
prueba('si Presupuestos no puede calcular, lo dice y deja probar otra vez', con({}, async a => {
  await a.page.route('**/cocinas/**', r => r.fulfill({ contentType: 'text/html', body: falso(false) }));
  await cocina(a);
  await a.page.click('[data-acc="calcular-tarifa"]');
  await a.page.waitForSelector('[data-acc="tarifa-error"]');
  afirma(/Abre Presupuestos una vez/.test(await a.page.innerText('[data-acc="tarifa-error"]')));
  afirma(await a.page.$('[data-acc="calcular-tarifa"]'), 'botón para probar otra vez');
}));
fin();
