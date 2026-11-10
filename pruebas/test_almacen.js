import { prueba, afirma, igual, fin } from './mini.js';
import { pagina } from './arnes.js';

const conAlmacen = async fn => { const a = await pagina(); try { return await fn(a); } finally { await a.cerrar(); } };
const INICIO = "const {abrirAlmacen}=await import('/js/almacen.js');const al=await abrirAlmacen('prueba-db');";
const ev = (a, cuerpo) => a.page.evaluate('(async()=>{' + INICIO + cuerpo + '})()');

prueba('guarda y relee tras recargar', () => conAlmacen(async a => {
  await ev(a, "await al.guardar('fichas',{id:'f1',nombre:'A',updated_at:null});");
  await a.page.reload();
  igual((await ev(a, "return await al.leer('fichas','f1');")).nombre, 'A');
}));
prueba('dos guardados dejan una entrada de cola con la base de la primera', () => conAlmacen(async a => {
  await ev(a, "await al.poner('fichas',{id:'f1',nombre:'A',updated_at:'U1'});await al.guardar('fichas',{id:'f1',nombre:'B',updated_at:'U1'});await al.guardar('fichas',{id:'f1',nombre:'C',updated_at:'U2'});");
  const c = await ev(a, "return await al.todos('cola');");
  igual(c.length, 1); igual(c[0].clave, 'fichas:f1'); igual(c[0].tabla, 'fichas'); igual(c[0].id, 'f1'); igual(c[0].base, 'U1');
}));
prueba('fila nueva tiene base nula', () => conAlmacen(async a => {
  await ev(a, "await al.guardar('fichas',{id:'f2',updated_at:null});");
  igual((await ev(a, "return await al.todos('cola');"))[0].base, null);
}));
prueba('si falla la transacción no queda fila ni cola', () => conAlmacen(async a => {
  const r = await ev(a, "let fallo=false;try{await al.guardar('fichas',{id:'f3',malo:()=>1});}catch(e){fallo=true;}return {fallo,f:await al.leer('fichas','f3'),c:await al.todos('cola')};");
  afirma(r.fallo, 'no falló'); igual(r.f, null); igual(r.c.length, 0);
}));
prueba('la base es la versión que tenía la pantalla, no la del almacén', () => conAlmacen(async a => {
  await ev(a, "await al.poner('fichas',{id:'f1',nombre:'A',updated_at:'U5'});await al.guardar('fichas',{id:'f1',nombre:'B',updated_at:'U1'});");
  const r = await ev(a, "return {c:await al.todos('cola'),f:await al.leer('fichas','f1')};");
  igual(r.c[0].base, 'U1'); igual(r.f.nombre, 'B');
}));
prueba('confirmar recuerda la última versión propia', () => conAlmacen(async a => {
  const r = await ev(a, "await al.guardar('fichas',{id:'f1',updated_at:null});await al.confirmarSubida('fichas',{id:'f1',updated_at:'U7'},1);return await al.getPropia('fichas','f1');");
  igual(r, 'U7');
}));
prueba('dividir copia la fila local actual, deja la remota y no deja la original en cola', () => conAlmacen(async a => {
  const r = await ev(a, "await al.guardar('fichas',{id:'f1',nombre:'Baño',datos:{a:1},updated_at:'U1'});await al.guardar('fichas',{id:'f1',nombre:'Baño',datos:{a:2},updated_at:'U1'});const id=await al.dividir({id:'f1',nombre:'Baño',datos:{a:9},updated_at:'U3'},' (copia)');return {id,f:await al.leer('fichas','f1'),c:await al.leer('fichas',id),cola:await al.todos('cola')};");
  igual(r.f.datos.a, 9); igual(r.c.datos.a, 2); igual(r.c.nombre, 'Baño (copia)'); igual(r.c.updated_at, null);
  igual(r.cola.map(e => e.id), [r.id]); igual(r.cola[0].base, null);
}));
prueba('aceptar la remota quita la entrada aunque se editara durante la subida', () => conAlmacen(async a => {
  const r = await ev(a, "await al.guardar('trabajos',{id:'t1',nombre:'A',updated_at:'U1'});await al.guardar('trabajos',{id:'t1',nombre:'B',updated_at:'U1'});await al.aceptarRemota('trabajos',{id:'t1',nombre:'Z',updated_at:'U4'});return {t:await al.leer('trabajos','t1'),cola:await al.todos('cola')};");
  igual(r.t.nombre, 'Z'); igual(r.cola.length, 0);
}));
prueba('marcar el envío lo guarda en la entrada', () => conAlmacen(async a => {
  const r = await ev(a, "await al.guardar('fichas',{id:'f1',updated_at:null});await al.marcarEnvio('fichas:f1','H1');return (await al.todos('cola'))[0].enviado;");
  igual(r, 'H1');
}));
prueba('confirmar una subida editada mientras tanto la deja pendiente con base nueva', () => conAlmacen(async a => {
  await ev(a, "await al.guardar('fichas',{id:'f1',nombre:'A',updated_at:null});await al.guardar('fichas',{id:'f1',nombre:'B',updated_at:null});await al.confirmarSubida('fichas',{id:'f1',nombre:'A',updated_at:'U9'},1);");
  const r = await ev(a, "return {c:await al.todos('cola'),f:await al.leer('fichas','f1')};");
  igual(r.c[0].base, 'U9'); igual(r.f.nombre, 'B');
}));
prueba('una fila bajada no pisa cambios sin subir', () => conAlmacen(async a => {
  const r = await ev(a, "await al.guardar('fichas',{id:'f1',nombre:'A',updated_at:null});const x=await al.aplicarRemota('fichas',{id:'f1',nombre:'Z',updated_at:'U1'});const y=await al.aplicarRemota('fichas',{id:'f2',nombre:'Z',updated_at:'U1'});return {x,y,f:await al.leer('fichas','f1')};");
  igual(r.x, false); igual(r.y, true); igual(r.f.nombre, 'A');
}));
prueba('una base antigua (sin ajustes) se amplía sin perder nada', () => conAlmacen(async a => {
  const r = await a.page.evaluate(async () => {
    const vieja = await new Promise((ok, mal) => { const q = indexedDB.open('vieja-db', 1); q.onupgradeneeded = () => { const db = q.result; ['trabajos', 'fichas', 'adjuntos', 'blobs'].forEach(t => db.createObjectStore(t, { keyPath: 'id' })); db.createObjectStore('cola', { keyPath: 'clave' }); db.createObjectStore('meta', { keyPath: 'k' }); }; q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error); });
    await new Promise(ok => { const t = vieja.transaction('fichas', 'readwrite'); t.objectStore('fichas').put({ id: 'f1', nombre: 'Antigua' }); t.oncomplete = ok; });
    vieja.close();
    const { abrirAlmacen } = await import('/js/almacen.js'); const al = await abrirAlmacen('vieja-db');
    await al.guardar('ajustes', { id: 'U1', datos: { margen: 20 }, updated_at: null });
    return { f: await al.leer('fichas', 'f1'), aj: await al.leer('ajustes', 'U1') };
  });
  igual(r.f.nombre, 'Antigua'); igual(r.aj.datos.margen, 20);
}));
prueba('meta guarda y lee', () => conAlmacen(async a => {
  const r = await ev(a, "await al.setMeta('unidad','cm');return {v:await al.getMeta('unidad'),n:await al.getMeta('nada')};");
  igual(r.v, 'cm'); igual(r.n, null);
}));
fin();
