// Sin dependencias 3D: la pantalla funciona antes de descargar Three.js.
const screen = document.getElementById('loading-screen');
const status = document.getElementById('loading-status');
const detail = document.getElementById('loading-detail');

// Dos cuadros dejan pintar el mensaje antes del siguiente trabajo de CPU.
export const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

export async function loadingStage(message) {
  status.textContent = message;
  await nextPaint();
}

export function loadingDetail(message) {
  detail.textContent = message;
}

export function finishLoading() {
  screen.setAttribute('aria-busy', 'false');
  document.getElementById('overlay').inert = false;
  document.body.classList.remove('is-loading');
  screen.classList.add('is-ready');
  // También se retira con movimiento reducido, sin depender de transitionend.
  setTimeout(() => screen.remove(), 500);
}

export function failLoading(error) {
  console.error('[loading] No se pudo iniciar el juego:', error);
  screen.setAttribute('aria-busy', 'false');
  screen.classList.add('has-error');
  status.textContent = 'No pudimos abrir el museo.';
  detail.textContent = 'Revisá tu conexión y volvé a intentar.';
  const retry = document.getElementById('loading-retry');
  retry.hidden = false;
  retry.onclick = () => location.reload();
}
