// Mini corredor de pruebas: prueba(nombre, fn), afirma(cond, msg), fin().
const lista = [];
export const prueba = (n, f) => lista.push([n, f]);
export const afirma = (c, m) => { if (!c) throw new Error(m || 'falló'); };
export const igual = (a, b, m) => afirma(JSON.stringify(a) === JSON.stringify(b), (m ? m + ': ' : '') + JSON.stringify(a) + ' != ' + JSON.stringify(b));
export async function fin() {
  let mal = 0;
  for (const [n, f] of lista) {
    try { await f(); console.log('PASA  ' + n); }
    catch (e) { mal++; console.log('FALLA ' + n + ' -> ' + e.message); }
  }
  console.log((lista.length - mal) + ' pasan, ' + mal + ' fallan');
  process.exitCode = mal ? 1 : 0;
}
