# Guía para defender The Eras Escape

Preparada a partir del código del proyecto. Las preguntas son posibles preguntas de defensa; no reemplazan el programa de la materia. El juego importa Three.js 0.160.0 (r160) en `index.html:16`.

Para responder, practicá esta estructura: **qué es → dónde se usa en el juego → qué aporta a la experiencia o al rendimiento**. Las respuestas propuestas se pueden adaptar a las decisiones que ustedes efectivamente tomaron.

## Presentación de un minuto

> The Eras Escape es una experiencia de escape en primera persona organizada en seis salas, cada una con una identidad visual y acertijos propios. Usamos Three.js para representar el mundo 3D en el navegador: escena, cámara, geometrías, materiales, luces y renderizado. La lógica de acertijos, inventario y colisiones está programada en JavaScript. La luz, los colores y los efectos cambian entre eras y también sirven como devolución cuando el jugador avanza. El museo reúne los recuerdos recuperados y conecta el recorrido con una ceremonia final.

## 1. Luces: lo primero para estudiar

### ¿Qué tipos de luz usamos?

> Usamos cinco tipos: AmbientLight para una base de iluminación; PointLight para fuentes localizadas, como lámparas y neones; DirectionalLight para el sol y las lunas; HemisphereLight para diferenciar el aporte del cielo y del suelo; y SpotLight para destacar la estatua del hall. Los combinamos con superficies luminosas y bloom para construir la atmósfera de cada sala.

| Tipo | Explicación | Ejemplo real | ¿Puede proyectar sombras? |
|---|---|---|---|
| AmbientLight | Aporte uniforme, sin dirección; simula una base de iluminación indirecta. | Fearless, `js/rooms.js:259`. | No. |
| PointLight | Emite desde una posición en todas las direcciones, como una bombilla. | Lámparas de Fearless, `js/rooms.js:261`; luces de colores en 1989, `js/room1989.js:202`. | Sí, si se configura. |
| DirectionalLight | Rayos paralelos con una dirección, apropiados para una fuente muy distante. | Sol de Fearless, `js/rooms.js:260`; luna del bosque, `js/roomforest.js:261`. | Sí, si se configura. |
| HemisphereLight | Usa un color de cielo y otro de suelo; la contribución cambia con la orientación de la superficie. | Bosque, `js/roomforest.js:261`; Midnights, `js/roommidnights.js:66`. | No. |
| SpotLight | Foco dirigido en forma de cono, con apertura, penumbra y objetivo. | Estatua del museo, `js/intro.js:169`. | Sí, pero nuestro foco de la estatua no tiene sombras activadas. |

**Ayuda memoria:** ambiente = base; point = bombilla; directional = sol/luna; hemisphere = cielo/suelo; spot = reflector dirigido.

### ¿Por qué combinamos luces?

La ambiental mantiene visibles las zonas sin luz directa, pero por sí sola aplana el volumen. Las luces direccionales y puntuales ayudan a leer la forma, dar profundidad y establecer zonas de interés. La combinación permite conservar visibilidad y producir una atmósfera.

Un ejemplo concreto es Fearless: luz ambiental cálida, un sol de atardecer y dos lámparas. En el bosque se combinan cielo/suelo, luna y fuentes cálidas locales.

### ¿Qué significan los parámetros de una PointLight?

Ejemplo real de Fearless:

```js
const lamp1 = new THREE.PointLight(0xffd070, 18, 14);
lamp1.position.set(-0.5, 3.4, 2.5);
```

- `0xffd070`: color cálido en hexadecimal.
- `18`: intensidad.
- `14`: distancia máxima de influencia, en unidades de la escena.
- `position`: coordenadas X, Y y Z. En este juego Y es altura.
- Existe un cuarto parámetro, `decay`, que regula la atenuación con la distancia; su valor predeterminado en esta versión es 2.

### ¿Una DirectionalLight se orienta con rotation?

Su dirección se determina desde su posición hacia `target.position`. No se orienta mediante `rotation` como una malla. La distancia a la fuente no produce la atenuación de una PointLight.

### ¿Poner una luz dentro de un Group la limita a esa sala?

No. El grupo organiza objetos y transformaciones, pero no es una barrera para la iluminación. El proyecto ajusta intensidades según la ubicación del jugador. Por ejemplo, `js/roomforest.js:813` reduce la luz de Lover mientras se avanza y activa las del bosque.

### ¿Por qué algunas luces se crean con intensidad cero?

Porque se activan y transicionan durante el recorrido. No significa que no se usen. En el bosque se actualizan en `js/roomforest.js:816`; en la intro, alrededor de `js/intro.js:573`.

## 2. Luz, material luminoso y bloom

### ¿Emissive ilumina los objetos vecinos?

En el sistema de renderizado de este juego, no automáticamente. `emissive` agrega una contribución luminosa al propio material. Para iluminar el entorno se usan luces reales adicionales.

### ¿Qué es bloom?

Es postprocesado: toma zonas brillantes de la imagen, las desenfoca y combina para crear un halo. No reemplaza las luces ni calcula iluminación de rebote.

En `js/main.js:52` el pipeline es:

```text
RenderPass → UnrealBloomPass → OutputPass
```

El bloom está siempre activo con una intensidad base de 0.18. Cuando `ctx.fx.bloom` está activo transiciona hacia 0.6. La animación también modifica el umbral (`js/main.js:156`).

- `strength`: fuerza del brillo.
- `radius`: extensión del halo.
- `threshold`: umbral de luminosidad para decidir qué zonas contribuyen.

### ¿Cómo se hicieron los neones?

Se combinan geometría luminosa, colores intensos, bloom y PointLight. En 1989, `addTube()` usa MeshBasicMaterial y multiplica la intensidad del color (`js/room1989.js:137`). No todos los neones usan la propiedad `emissive`.

### ¿Todas las bombillitas y halos son luces reales?

No. Hay geometrías con MeshBasicMaterial, sprites y partículas que representan el brillo visual. Por ejemplo, las guirnaldas de Fearless usan InstancedMesh, no una PointLight por bombilla (`js/rooms.js:272`).

## 3. Sombras y rendimiento

### ¿Qué hace falta para ver una sombra?

En nuestro pipeline de shadow maps se habilitan tres niveles:

```js
renderer.shadowMap.enabled = true;
light.castShadow = true;
objeto.castShadow = true;
suelo.receiveShadow = true;
```

Además, el objeto debe quedar dentro de la zona cubierta por la cámara de sombras y el material receptor debe soportarlas. La configuración real está en `js/lighting.js:11`.

`castShadow` significa proyectar; `receiveShadow`, recibir. Un objeto puede hacer una cosa, ambas o ninguna.

### ¿Todas las luces del juego generan sombras?

No. Se seleccionan luces principales. El sistema busca una PointLight elegible por habitación, configura las lunas direccionales de Folklore y Midnights, y las luces principales del museo. El sol de Fearless y el foco de la estatua no reciben esa configuración de sombras.

Se usa `PCFSoftShadowMap`, mapas de 1024×1024 para las PointLight elegidas y 2048×2048 para las lunas. `bias` y `normalBias` ayudan a reducir artefactos.

### ¿Por qué las sombras son costosas?

Requieren renderizar los objetos desde la luz para construir mapas de profundidad adicionales. Una PointLight necesita cubrir seis direcciones. Por eso no conviene que cada bombilla tenga sombras.

Después de unos frames de preparación, el proyecto actualiza los mapas según la zona actual del jugador (`js/lighting.js:99`). Esto no significa que todas las salas se descarguen o dejen de existir.

### ¿Qué optimizaciones concretas tenemos?

- Bosque y Midnights reutilizan cinco PointLight por sala para las fuentes cercanas al jugador. No son cinco luces en todo el juego (`js/roomforest.js:263`, `js/roommidnights.js:68`).
- Esas luces móviles tienen `noShadow`, para no recalcular sombras de cada farol.
- InstancedMesh agrupa objetos repetidos: bombillas y vegetación.
- El pixel ratio está limitado a 2 (`js/main.js:40`).
- El glitter se anima en la GPU.
- Las ráfagas de partículas reutilizan un pool de hasta 300 puntos.
- Los modelos tienen caché; algunos se cargan cuando se recupera el recuerdo.
- Los reflectores del museo se activan según la zona.

Una draw call es una orden de dibujo a la GPU. La instanciación reduce órdenes para muchas copias con la misma geometría y material, aunque no elimina el costo de dibujar sus triángulos o píxeles.

## 4. Materiales, texturas y reflejos

### ¿Qué materiales usamos?

| Material | Uso real |
|---|---|
| MeshStandardMaterial | Mayor parte de las superficies y objetos de las salas; responde a luces y usa metalness/roughness. |
| MeshPhysicalMaterial | Acabados del museo y cristales; amplía el modelo de Standard con más propiedades. |
| MeshBasicMaterial | Carteles, imágenes, tubos luminosos y elementos que no deben depender de luces. |
| PointsMaterial | Estrellas y partículas. |
| SpriteMaterial | Halos y bruma en planos orientados hacia la cámara. |
| ShaderMaterial | Glitter con código propio de vertex y fragment shader. |
| LineBasicMaterial | Líneas, como la lluvia de la intro. |

No afirmar que se usan MeshPhongMaterial o MeshLambertMaterial solo porque `lighting.js` los reconoce: no se encontraron instanciaciones en el código del juego.

### ¿Qué son roughness y metalness?

`roughness` regula la rugosidad aparente: cerca de 0 da reflejos definidos; cerca de 1, más difusos. `metalness` regula el comportamiento metálico: madera y piedra se tratan como no metálicas; una llave o moldura dorada tiene una respuesta más metálica.

Ejemplo: en `js/rooms.js:246`, el material dorado tiene metalness 0.8 y roughness 0.3; la madera de la línea siguiente tiene roughness 0.8.

### ¿Qué diferencia hay entre geometría, material y textura?

La geometría es la forma. El material define cómo se representa su superficie. Una textura aporta datos al material: color, rugosidad, normales, transparencia, etc. Una textura no es necesariamente una foto; el proyecto dibuja textos y patrones en canvas y crea CanvasTexture (`js/rooms.js:9`).

### ¿Un normalMap agrega volumen real?

No modifica los vértices. Cambia las normales usadas en la iluminación para simular detalle. El bumpMap también simula relieve mediante sombreado. No confundirlos con displacementMap, que sí puede desplazar vértices; este sistema de materiales del museo no usa desplazamiento geométrico.

### ¿Todos los espejos reflejan la escena real?

No. El museo usa Reflector para reflejos planares en dos superficies (`js/museum-materials.js:163`). También usa mapas de entorno procesados con PMREMGenerator para materiales reflectantes (`js/lighting.js:17`). El espejo del acertijo de Midnights usa una imagen dibujada: no es otro Reflector.

El cristal de las vitrinas tiene transparencia; no se configuró transmission ni refracción física. Un material brillante por sí solo tampoco implica que esté reflejando dinámicamente toda la escena.

## 5. Fundamentos para cualquier repregunta

### ¿Qué es Three.js y qué programamos nosotros?

Three.js es una biblioteca JavaScript para gráficos 3D. En este proyecto se usa WebGLRenderer para renderizar con WebGL. Escena, cámaras, luces, geometrías y raycasting vienen de Three.js. La lógica de puzzles, inventario, progreso y las colisiones del jugador son código propio del proyecto.

### ¿Qué son escena, cámara y renderer?

La escena organiza el mundo; la cámara define desde dónde y con qué proyección se ve; el renderer produce la imagen. Acá se crea todo en `js/main.js:38` y el dibujo final pasa por EffectComposer, porque hay postprocesado.

### ¿Qué cámara usamos?

PerspectiveCamera, apropiada para primera persona: la distancia reduce el tamaño aparente de los objetos. Se crea con:

```js
new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
```

Los parámetros son FOV vertical en grados, relación ancho/alto, plano cercano y plano lejano. Atención: la intro amplía después `camera.far` a 400 (`js/intro.js:164`). Ese límite no es la distancia de interacción: el raycaster tiene su propio `far = 3`.

Al redimensionar la ventana se actualizan `aspect`, `updateProjectionMatrix()` y los tamaños del renderer y composer (`js/main.js:163`).

### ¿Qué es un Mesh y para qué sirve Group?

Un Mesh combina geometría y material y tiene posición, rotación y escala. Group permite organizar varios objetos y transformarlos juntos; los hijos heredan las transformaciones del padre. En este juego X/Z forman el suelo e Y es altura. Las rotaciones de Object3D usan radianes; el FOV de PerspectiveCamera se expresa en grados.

### ¿Cómo funcionan el mouse y las interacciones?

PointerLockControls captura el mouse para orientar la cámara; el desplazamiento se calcula en `js/player.js`. Se aplana la dirección al suelo y se normaliza el vector para que caminar en diagonal no sea más rápido.

Interaction lanza un Raycaster desde el centro de pantalla, filtra objetos habilitados y toma el impacto más cercano. E ejecuta el callback registrado. El rayo identifica el objeto; la lógica del acertijo decide qué hace (`js/interaction.js:23`).

### ¿Three.js evita atravesar paredes?

Las colisiones de este proyecto están implementadas aparte. El jugador se aproxima mediante un círculo y los obstáculos mediante rectángulos en X/Z. Se comprueban los ejes por separado para permitir deslizarse por paredes (`js/player.js:28`). No se usa un motor físico. La malla visible y el collider son representaciones diferentes.

### ¿Cómo se anima y qué es delta time?

`requestAnimationFrame` programa el próximo frame. `dt` mide el tiempo desde el anterior; velocidad × dt da el desplazamiento. Así el jugador no camina más rápido en una computadora que renderiza más frames.

El bucle limita dt a 0.1 segundos para reducir saltos grandes y ejecuta `ctx.updaters` para las animaciones registradas (`js/main.js:143`). Al pausar se detienen movimiento e interacción, pero siguen los updaters y el render.

### ¿Qué es un shader?

Es un programa de la GPU. En nuestro glitter, el vertex shader mueve los puntos y calcula su titileo; el fragment shader determina color y transparencia (`js/glitter.js:20`). `uTime` es un uniform compartido; `aSpeed` y `aPhase` son atributos por punto.

Las ráfagas de `particles.js` son otro sistema: sus posiciones se actualizan en JavaScript. No todas las partículas usan shaders de animación propios.

### ¿Todo está modelado por código?

Se combinan primitivas y geometrías creadas por código con archivos GLB cargados mediante GLTFLoader. Las estatuas tienen caché, ajuste de escala y reemplazos si no puede cargarse un modelo (`js/trophies.js:58`). Las salas se construyen al inicio; no afirmar que todo usa carga diferida.

## 6. Conectar la técnica con creatividad

Una forma de defender la relación entre técnica y experiencia es mostrar ejemplos visibles:

- Fearless: paleta cálida, madera, dorado y mariposas para una atmósfera de cuento.
- 1989: luces rosas/azules, ciudad y neones para una identidad urbana.
- Lover: colores pastel, corazones y túnel con sección de corazón.
- Folklore/Evermore: contraste entre cabaña cálida, bosque y sendero nevado; la exploración usa pistas visuales y sonoras.
- Midnights: luna, lavanda, relojes y oscuridad para sostener el tema temporal.

La defensa mejora si se muestra una acción: resolver un puzzle cambia el escenario, revela un objeto y activa sonido/partículas. La estética también comunica el estado del juego.

Si preguntan por una mejora futura, distinguirla de lo que existe: por ejemplo, guardar progreso o cargar salas por demanda serían ampliaciones, no funciones actuales.

## 7. Simulacro oral

Respondé sin leer, en 30–45 segundos por pregunta. Después comprobá si pudiste incluir el concepto, un ejemplo real y su utilidad.

1. ¿Qué luces usaron y dónde se ve cada tipo?
2. Si borro AmbientLight de Fearless, ¿qué cambia? ¿Se apagan automáticamente las otras luces?
3. ¿Por qué la luna es direccional y una lámpara es puntual?
4. Un tubo se ve luminoso: ¿eso prueba que ilumina la pared de al lado?
5. ¿Qué tres niveles de configuración necesitan las sombras?
6. ¿Por qué no hay una luz con sombras por cada bombilla?
7. ¿Qué cambia entre la madera y el dorado a nivel de material?
8. ¿Por qué la cámara es PerspectiveCamera? ¿Qué es el FOV?
9. ¿Qué hace el raycaster y qué pasa después al presionar E?
10. ¿Qué parte de las colisiones hizo Three.js y qué parte tiene código del proyecto?
11. ¿Para qué multiplican la velocidad por dt?
12. ¿Cómo une una decisión técnica el tema de una era con la experiencia del jugador?

Errores para evitar: llamar luz al bloom; decir que todos los materiales reaccionan a luces; afirmar que todas las luces proyectan sombras; confundir raycasting con ray tracing; decir que Group limita espacialmente una luz; afirmar que normalMap cambia la silueta; confundir camera.far con raycaster.far; prometer guardado de progreso que no existe.

## Referencias oficiales para repasar

- [AmbientLight](https://threejs.org/docs/pages/AmbientLight.html), [PointLight](https://threejs.org/docs/pages/PointLight.html), [DirectionalLight](https://threejs.org/docs/pages/DirectionalLight.html), [HemisphereLight](https://threejs.org/docs/pages/HemisphereLight.html), [SpotLight](https://threejs.org/docs/pages/SpotLight.html).
- [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html).
- [MeshStandardMaterial, documentación r160](https://raw.githubusercontent.com/mrdoob/three.js/r160/docs/api/en/materials/MeshStandardMaterial.html).
- [Sombras, manual r160](https://raw.githubusercontent.com/mrdoob/three.js/r160/manual/en/shadows.html).
- [PerspectiveCamera, documentación r160](https://raw.githubusercontent.com/mrdoob/three.js/r160/docs/api/en/cameras/PerspectiveCamera.html).
- [Raycaster, documentación r160](https://raw.githubusercontent.com/mrdoob/three.js/r160/docs/api/en/core/Raycaster.html).
