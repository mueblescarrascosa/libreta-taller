// Aviso de versión nueva: el service worker nuevo toma el control mientras la app sigue abierta.
// La primera instalación no avisa (no había ninguna versión funcionando).
import { h } from './util.js';

export function vigilarVersion(sw, alNueva) {
  let habia = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    if (habia) alNueva();
    habia = true;
  });
}

export function pintarAvisoVersion() {
  if (document.querySelector('[data-acc="actualizar"]')) return;
  document.body.append(h('button', { type: 'button', class: 'aviso-version', 'data-acc': 'actualizar', onclick: () => location.reload() },
    'Hay una versión nueva. Toca para actualizar.'));
}
