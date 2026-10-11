# CYPHER://OS

> *El cable no duerme. Solo parpadea.*

Mini-RPG cyberpunk de netrunners para navegador. Eres CORVO-7: aceptas trabajos, bajas a la red -ICE, daemons y cosas peores-, robas datos y vuelves a cobrar.
En fase alpha: jugable pero sin probar a fondo. Pueden aparecer bugs sin identificar, incluidos algunos que impidan terminar una partida. Falta desarrollar más el lore, y ampliar los "mini-juegos" en el grid.

**[Jugar online en GitHub Pages](https://marcoslm.github.io/cypher-os-netrunner/cypher_os.html)** — abre el enlace y pulsa COMENZAR, sin instalar nada.

También puedes jugar sin conexión: descarga el repositorio, abre `cypher_os.html` y pulsa COMENZAR. Sin dependencias. El progreso se guarda en el navegador.

### Versión del firmware

La BIOS muestra `FIRMWARE v1.0 · BUILD N`: N es el total de commits alcanzables de la revisión publicada; no sustituye la versión ficticia del SO (v9.2.7).

Para desarrollar, ejecuta una vez `npm run firmware:install` en cada clon. El hook local actualiza e incluye la build en cada commit nuevo, sin servidor ni build del juego. Requiere Node y Git solo para desarrollo. Para `--amend`, sincroniza primero con `npm run firmware:sync`, prepara los cambios y usa `git -c core.hooksPath=/dev/null commit --amend` para mantener la cuenta (no se añade un commit). `--no-verify` omite la automatización. Si hay cambios sin preparar en el módulo de datos, el hook aborta para no incluirlos accidentalmente.

`npm run firmware:sync` sincroniza manualmente con HEAD tras cambiar de rama o reescribir el historial. Un clon superficial solo puede contar el historial disponible: usa un clon completo. El navegador lee el número ya guardado y funciona offline.