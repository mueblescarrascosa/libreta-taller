// Coste con la tarifa de Presupuestos (misma web): se abre Presupuestos por dentro (iframe oculto, ?estimar=1), se le
// manda lo medido (el mismo paquete que «Pasar a presupuesto», sin el plano) y devuelve los totales con su tarifa, la
// del dispositivo. No crea presupuesto ni guarda nada. Si Presupuestos no contesta (nunca abierto aquí, sin red la primera
// vez…), error «sin-respuesta».
export const urlEstimar = () => new URL('../cocinas/?estimar=1', location.href).href;
let marco = null;

export function estimarConTarifa(paquete, { url = urlEstimar(), espera = 30000 } = {}) {
  const limpio = Object.assign({}, paquete, { plano3d: null });
  return new Promise((ok, mal) => {
    const id = Math.random().toString(36).slice(2);
    let hecho = false;
    const fin = (f, v) => { if (hecho) return; hecho = true; clearTimeout(t); window.removeEventListener('message', oir); f(v); };
    const t = setTimeout(() => fin(mal, new Error('sin-respuesta')), espera);
    const mandar = () => { try { marco.contentWindow.postMessage({ tipo: 'libreta-estimar', id, paquete: limpio }, location.origin); } catch (e) { fin(mal, e); } };
    function oir(ev) {
      if (ev.origin !== location.origin || !ev.data || !marco) return;
      // Presupuestos dice que está lista al cargar (también si se recarga sola al bajar la nube): se le manda otra vez.
      if (ev.data.tipo === 'libreta-lista' && ev.source === marco.contentWindow) mandar();
      if (ev.data.tipo === 'libreta-estimacion' && ev.data.id === id) (ev.data.ok ? fin(ok, ev.data.resultado) : fin(mal, new Error(ev.data.error || 'error')));
    }
    window.addEventListener('message', oir);
    if (!marco || !marco.isConnected) {
      marco = document.createElement('iframe');
      Object.assign(marco, { hidden: true, title: 'Tarifa de Presupuestos', src: url });
      marco.setAttribute('aria-hidden', 'true'); marco.setAttribute('data-acc', 'marco-tarifa');
      document.body.append(marco);
    } else mandar();
  });
}

// Lo que no tiene precio en el resultado: las líneas a 0 € de los grupos libres (Revisar, encimera de piedra…).
export const sinPrecio = r => (r && r.grupos ? r.grupos.flatMap(g => g.sinPrecio || []) : []);
