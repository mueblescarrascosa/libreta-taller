// Unidad predeterminada, cuenta y sincronización.
import { h, segmentado } from '../util.js';
import { VERSION } from '../config.js';

export async function pintarAjustes(App) {
  const main = App.marco('ajustes', 'Ajustes', '#/');
  main.append(
    h('div', { class: 'tarjeta' },
      h('label', { class: 'et' }, 'Unidad predeterminada'),
      segmentado({ acc: 'unidad-pred', opciones: [['mm', 'Milímetros'], ['cm', 'Centímetros']], valor: App.ajustes().unidad, alCambiar: v => App.cambiarUnidad(v) }),
      h('small', {}, 'Se aplica a los trabajos nuevos y a las notas sueltas. Los trabajos ya creados no cambian.')),
    h('div', { class: 'tarjeta' },
      h('label', { class: 'et' }, 'Cuenta'), h('p', {}, App.email),
      h('button', { type: 'button', 'data-acc': 'sincronizar', onclick: () => App.sincro.sincronizar() }, 'Sincronizar ahora'),
      h('button', { type: 'button', 'data-acc': 'salir', onclick: async () => {
        const n = await App.sincro.pendientes();
        if (n && !confirm('Hay ' + n + ' cambios sin subir. Se quedan en este dispositivo y subirán cuando vuelvas a entrar. ¿Salir?')) return;
        App.salirDeCuenta();
      } }, 'Salir de la cuenta')),
    h('small', { class: 'version' }, 'Versión ' + VERSION));
}
