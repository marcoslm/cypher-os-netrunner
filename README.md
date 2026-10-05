# CYPHER://OS

> *El cable no duerme. Solo parpadea.*

Mini-RPG cyberpunk de netrunners para navegador. Eres CORVO-7: aceptas trabajos,
bajas a la red —ICE, daemons y cosas peores—, robas datos y vuelves a cobrar.

En fase alpha: jugable de principio a fin, pero sin probar a fondo. Pueden
aparecer bugs sin identificar, incluidos algunos que impidan terminar una partida.

Abre `cypher_os.html` y pulsa COMENZAR. Sin instalar nada, sin dependencias y sin
conexión. El progreso se guarda en el navegador. El sonido es de interfaz por
ahora; la música llegará más adelante.

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
