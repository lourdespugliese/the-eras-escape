import { loadingStage, loadingDetail, nextPaint, finishLoading, failLoading } from './loading.js';

try {
  await loadingStage('Preparando tu historia…');
  const THREE = await import('three');
  // Todos los TextureLoader y GLTFLoader existentes usan este mismo manager.
  // Se conecta antes de importar el juego para incluir las cargas de sus módulos.
  const manager = THREE.DefaultLoadingManager;
  let assetsLoading = false;
  let resolveAssets;
  manager.onStart = () => { assetsLoading = true; };
  manager.onProgress = (_url, loaded, total) => loadingDetail(`Reuniendo recuerdos · ${loaded} de ${total} recursos`);
  manager.onLoad = () => { assetsLoading = false; resolveAssets?.(); };

  await import('./main.js');
  await loadingStage('Reuniendo los últimos recuerdos…');
  // Las imágenes del menú son HTML, no texturas: también deben estar decodificadas.
  const menuImages = [...document.querySelectorAll('#overlay img')].map(image => image.decode());
  await Promise.all([
    assetsLoading ? new Promise(resolve => { resolveAssets = resolve; }) : Promise.resolve(),
    ...menuImages,
  ]);
  await loadingStage('Abriendo las puertas del museo…');
  loadingDetail('Tu historia está por comenzar.');
  // El loop ya está activo: permite dibujar la escena con las texturas cargadas.
  await nextPaint();
  finishLoading();
} catch (error) {
  failLoading(error);
}
