// Recorrido de usuario con capturas a pantalla completa (móvil 390 px): node pruebas/recorrido.js (deja pruebas/rec_*.png).
import { abrir, entrar } from './arnes.js';
const a = await abrir();
let n = 0, toques = 0;
const foto = async nombre => { await a.page.waitForTimeout(300); await a.page.screenshot({ path: 'pruebas/rec_' + String(++n).padStart(2, '0') + '_' + nombre + '.png', fullPage: true }); };
const toca = async sel => { toques++; await a.page.click(sel); };
const escribe = async (sel, v) => { toques++; await a.page.fill(sel, v); };
const alto = () => a.page.evaluate(() => document.documentElement.scrollHeight);
try {
  await a.page.setViewportSize({ width: 390, height: 844 });
  await entrar(a);
  await foto('inicio_vacio');
  await toca('[data-acc="nuevo-trabajo"]');
  await foto('nuevo_trabajo');
  await escribe('[data-acc="trabajo-nombre"]', 'Piso calle Real 12');
  await toca('[data-acc="trabajo-crear"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await foto('trabajo');
  console.log('trabajo: alto', await alto(), 'toques', toques);
  // Puertas
  toques = 0;
  await toca('[data-acc="tipo"][data-v="puerta"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await foto('puertas_nueva');
  await toca('[data-acc="medida-de"][data-v="puerta"]');
  const P = '[data-puerta].abierta ';
  await toca(P + '[data-c="ancho"] [data-acc="rapido"][data-v="820"]');
  await toca(P + '[data-c="alto"] [data-acc="rapido"][data-v="2030"]');
  await toca(P + '[data-c="tabique"] [data-acc="rapido"]');
  await toca(P + '[data-acc="mano"][data-v="izq"]');
  await toca('[data-acc="anadir-puerta"]');
  await foto('puertas_dos');
  console.log('puertas: alto', await alto(), 'toques', toques);
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  // Cocina
  toques = 0;
  await toca('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await foto('cocina_nueva');
  console.log('cocina vacía: alto', await alto());
  await escribe('[data-pared="A"] > [data-c="largo"] input', '3,6');
  await toca('[data-pared="A"] [data-acc="anadir-elemento"][data-v="enchufe"]');
  await foto('cocina_enchufe');
  await toca('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="fregadero"]');
  await toca('[data-pared="A"] [data-fila="bajos"] .modulo.abierto [data-acc="rapido"][data-v="800"]');
  await toca('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="lavavajillas"]');
  await toca('[data-pared="A"] [data-fila="bajos"] .modulo.abierto [data-acc="rapido"][data-v="600"]');
  await foto('cocina_muebles');
  console.log('cocina: alto', await alto(), 'toques', toques);
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  // Armario
  toques = 0;
  await toca('[data-acc="tipo"][data-v="armario"]');
  await foto('armario_subtipo');
  await toca('[data-acc="subtipo"][data-v="corredera"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  await foto('armario');
  console.log('armario: alto', await alto());
  await a.page.evaluate(() => history.back()); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await foto('trabajo_con_fichas');
  await toca('[data-acc="resumen-trabajo"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
  await foto('resumen_trabajo');
  await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-pantalla="inicio"]');
  await foto('inicio_con_trabajo');
  await a.page.evaluate(() => { location.hash = '#/ajustes'; }); await a.page.waitForSelector('[data-pantalla="ajustes"]');
  console.log('ajustes: alto', await alto());
  console.log('errores', JSON.stringify(a.errores));
} finally { await a.cerrar(); }
