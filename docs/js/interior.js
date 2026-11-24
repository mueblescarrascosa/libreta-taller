// Proponer el interior de un armario o de una pared de vestidor: cuántos cuerpos, de qué ancho (de 5 en 5 cm) y con qué
// dentro, con las normas de siempre (AMC, Leroy Merlin, IKEA, fabricantes):
// - Cuerpos de 50 a 90 cm: una barra de más de 100 se comba y una balda de más de 90 también.
// - Colgar largo (abrigos, vestidos): 150–170 cm libres. Corto (camisas, chaquetas): dos barras, con 200 cm de alto o más.
// - Cajonera por debajo de 100 cm (para ver dentro); baldas cada 30–35; zapatero abajo.
// - Fondo útil para colgar de frente: 55 (con correderas, 8–9 más por las guías). Con menos, doblado: baldas y cajones.
// - Lo que pasa de 2,20–2,40 no se alcanza: altillo para lo de temporada.
export const NORMAS_INTERIOR = { ancho_max: 900, ancho_min: 450, barra_min: 450, doble_barra_alto: 2000, colgar_largo: 1500, fondo_colgar: 550, guias_corredera: 90, altillo_desde: 2300, paso: 50 };
const N = NORMAS_INTERIOR;
const cm = mm => Math.round(mm / 10) + ' cm';

// Papeles de cada cuerpo, en el orden en que se reparten: lo que más se usa primero
const PAPELES = {
  largo: { interior: 'barra', interior2: null, texto: 'para colgar largo (abrigos y vestidos)' },
  cajones: { interior: 'barra', interior2: 'cajonera', texto: 'barra y cajonera debajo (ropa interior, camisetas)' },
  corto: { interior: 'doble_barra', interior2: null, texto: 'doble barra para camisas y chaquetas' },
  doblado: { interior: 'estantes', interior2: 'cajonera', texto: 'baldas para doblar y cajonera' },
  zapatos: { interior: 'estantes', interior2: 'zapatero', texto: 'zapatero abajo y baldas encima' },
};
const ORDEN = ['cajones', 'largo', 'corto', 'doblado', 'zapatos', 'corto', 'cajones', 'doblado', 'largo'];
// Cómo se ven de izquierda a derecha: lo largo a un lado, los cajones en medio (a mano), el zapatero al otro
const SITIO = { largo: 0, corto: 1, cajones: 2, doblado: 3, zapatos: 4 };

// ancho, alto y fondo (mm) del hueco; corredera: si lleva correderas (comen fondo).
export function proponerInterior({ ancho, alto, fondo, corredera = false } = {}) {
  if (!(ancho > 0)) return { cuerpos: [], texto: [], aviso: 'Falta el ancho.' };
  const H = alto > 0 ? alto : 2400, util = (fondo > 0 ? fondo : 600) - (corredera ? N.guias_corredera : 0), colgar = util >= N.fondo_colgar;
  let n = Math.max(1, Math.ceil(ancho / N.ancho_max));
  while (n > 1 && ancho / n < N.ancho_min) n--;
  // Anchos de 5 en 5: iguales y lo que sobre, 5 cm a los primeros; lo que no llega a 5, regleta
  const base = Math.floor(ancho / n / N.paso) * N.paso, extra = Math.floor((ancho - base * n) / N.paso), regleta = Math.round(ancho - base * n - extra * N.paso);
  const anchos = Array.from({ length: n }, (_, i) => base + (i < extra ? N.paso : 0));
  let papeles = ORDEN.slice(0, n);
  // Con poca altura, sin doble barra; sin fondo para colgar, todo doblado (barra extraíble si hace falta colgar)
  papeles = papeles.map(p => (p === 'corto' && H < N.doble_barra_alto ? 'cajones' : p));
  if (!colgar) papeles = papeles.map((p, i) => (n >= 3 && i === n - 1 ? 'zapatos' : 'doblado'));
  papeles.sort((a, b) => SITIO[a] - SITIO[b]);
  const cuerpos = anchos.map((w, i) => {
    let p = papeles[i];
    if (w < N.barra_min && PAPELES[p].interior !== 'estantes') p = 'doblado';   // en un cuerpo estrecho no cabe una percha
    return { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2), ancho: w, interior: PAPELES[p].interior, interior2: PAPELES[p].interior2, nombre: '', papel: p };
  });
  const texto = cuerpos.map((c, i) => 'Cuerpo ' + (i + 1) + ' de ' + cm(c.ancho) + ': ' + PAPELES[c.papel].texto);
  if (regleta > 0) texto.push('Y ' + Math.round(regleta) + ' mm de regleta para cuadrar con la pared.');
  if (!colgar) texto.push('Con ' + cm(util) + ' de fondo útil la percha no cabe de frente: todo doblado (si hace falta colgar, barra extraíble de fondo).');
  if (H > N.altillo_desde) texto.push('Con ' + cm(H) + ' de alto: por encima de unos 2,20 m no se alcanza bien; arriba, un altillo para lo de temporada.');
  cuerpos.forEach(c => delete c.papel);
  return { cuerpos, texto, aviso: null };
}
