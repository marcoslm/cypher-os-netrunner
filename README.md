# CYPHER://OS

> *El cable no duerme. Solo parpadea.*

Mini-RPG cyberpunk de netrunners para navegador. Eres CORVO-7: aceptas trabajos,
bajas a la red —ICE, daemons y cosas peores—, robas datos y vuelves a cobrar.

En fase alpha: jugable de principio a fin, pero sin probar a fondo. Pueden
aparecer bugs sin identificar, incluidos algunos que impidan terminar una partida.

Abre `cypher_os.html` y pulsa COMENZAR. Sin instalar nada, sin dependencias y sin
conexión. El progreso se guarda en el navegador. FX, ambiente y música tienen
controles independientes.

La música es opcional y no se distribuye en este repositorio. El catálogo de
[`cypher_os_data.js`](cypher_os_data.js) admite 20 pistas locales `music/cyos-*.mp3`.
Puedes añadirlas progresivamente con los nombres exactos del catálogo y recargar
el juego: se saltan los archivos ausentes y las escenas sin pistas quedan en
silencio, sin impedir jugar. Los MP3 locales no se versionan.

## Pruebas de desarrollo

La suite rápida no necesita instalar dependencias:

```sh
node tests/smoke.js
```

Opcionalmente, con Node 20+ y Microsoft Edge instalado:

```sh
npm ci --ignore-scripts --cache .npm-cache
npm run test:e2e
```

Playwright abre el mismo HTML por `file://`, sin build ni servidor. No descarga
otro navegador: usa Edge, o un binario Chrome/Chromium compatible indicado en
`PLAYWRIGHT_EXECUTABLE_PATH`.
Para ver la ejecución, usa `npm run test:e2e:headed`. Las dependencias y los
informes generados no se versionan. Nada de esto es necesario para jugar.
