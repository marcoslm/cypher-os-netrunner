/* ============================================================
   CYPHER://OS  ·  contenido de la pantalla AYUDA
   Extraído de cypher_os.js para reducir peso del JS principal.
   Variable global: HELP_HTML
   ============================================================ */

var HELP_HTML = '<h1 class="title">AYUDA</h1>'+
'<div class="sub"> cómo jugar · el cable no duerme · pulsa AYUDA o escribe AYUDA</div>'+

/* ⓪ EL MUNDO EN 30 SEGUNDOS */
'<div class="panel-h">⓪ EL MUNDO EN 30 SEGUNDOS · si no sabes nada, empieza aquí</div><div class="box helpbox">'+
'<ol class="helpol">'+
'<li><b>Eres CORVO-7</b>, un netrunner de calle: te conectas a la red con un ciberdeck para robar datos y cumplir contratos.</li>'+
'<li><b>La red —"el cable"— lo es todo</b>: dinero, tráfico, vigilancia. Desde hace años está <b>viva</b>: nadie sabe si es una máquina, un organismo o un sueño.</li>'+
'<li><b>El Núcleo</b> es lo que gobierna la red desde lo más profundo (capa 5). En 2091 alguien lo apagó 11 segundos… y desapareció. Ese misterio es la historia del juego.</li>'+
'<li><b>Tu trabajo</b>: aceptar contratos de los fixers, bajar a la red, cumplir el objetivo y volver a la superficie a cobrar. El riesgo se mide en <b>calor</b> (tu rastro) y <b>CPU</b> (tu cordura dentro de la red).</li>'+
'<li><b>La historia</b> se lee en INFORMES y cada uno empieza con una glosa en claro marcada con ▸. La serie <b>«Cómo llegamos aquí»</b> cuenta el mundo entero en 6 lecturas. Y lo que otros te mandan queda en <b>MENSAJES</b> (la bandeja del deck): si un aviso se te pasa en la línea inferior, siempre queda la carta.</li>'+
'</ol>'+
'<div class="callout cyan">💡 Toda la jerga está explicada en una línea en <b>GLOSARIO</b> (⑰, al final de esta pantalla) o escribe <b>glosario</b> en el terminal.</div>'+
'</div>'+

/* ① BUCLE */
'<div class="panel-h">① EL BUCLE DEL CABLE</div><div class="box helpbox">'+
'<ol class="helpol">'+
'<li><b>Pide un trabajo</b> en CONTACTOS. Cada contrato tiene un objetivo (recoger datos, destruir ICE, etc.) y una recompensa.</li>'+
'<li><b>Baja a la red</b> con ◈ DIP AL GRID. El trabajo se "carga" en tu mochila dentro del grid.</li>'+
'<li><b>Cumple el objetivo</b> mientras estás dentro: muévete por los nodos y haz exactamente lo que pide el contrato.</li>'+
'<li><b>Vuelve a la superficie</b> con el botón SUPERFICIE (o pulsando <b>F</b>). Ahí es cuando el trabajo se <b>resuelve</b>.</li>'+
'</ol>'+
'<div class="callout ambar">⚠ Los trabajos NO se resuelven por entrar o salir: se evalúan en el instante en que <b>superficializas</b>. Si al volver (superficializar) todavía no lo has cumplido, marca <b>FRACASADO</b> y sube el calor (+8). Asegúrate de completar el objetivo antes de volver a la superficie.</div>'+
'</div>'+

/* ② CAPAS */
'<div class="panel-h">② EL GRID · LAS CAPAS</div><div class="box helpbox">'+
'<p class="help-p">Al entrar, ves una grilla con <b>capas</b> (columnas verticales). La <b>capa 0</b> es tu <b>puerto de entrada</b> (a la izquierda, ⌂). Cada capa más a la derecha es <b>más profunda</b>: más peligrosa, pero con más datos y los trabajos más difíciles.</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="sym cyan">CAPA 0</span><span class="muted">tu entrada · puerto de calle</span></div>'+
'<div class="helprow-item"><span class="sym cyan">CAPAS 1-2</span><span class="muted">ICE débil (T1) · datos · primeros daemons</span></div>'+
'<div class="helprow-item"><span class="sym ambar">CAPAS 3-4</span><span class="muted">ICE fuerte (T2/T3) · daemon T3 · VAULT</span></div>'+
'<div class="helprow-item"><span class="sym magenta">CAPA 5</span><span class="muted">solo la misión final · allí vive EL NÚCLEO</span></div>'+
'</div>'+
'<p class="help-p">Moverse a nodos profundos genera <b>calor</b>. Cuanto más profundo bajes, mejor recompensa… pero más riesgo. Usa las <b>subestaciones</b> (⌁) para bajar calor y obtener algo de crédito.</p>'+
'</div>'+

/* ③ NODOS */
'<div class="panel-h">③ LOS NODOS · leyenda</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="sym cyan">⌂</span><span class="lg-key">PUERTO</span><span class="lg-desc">tu entrada. explora las capas.</span></div>'+
'<div class="legend-row"><span class="sym verde">◆</span><span class="lg-key">DATOS</span><span class="lg-desc">cógelo: te llena la RAM y paga ₡. Para RECOLECTA.</span></div>'+
'<div class="legend-row"><span class="sym verde">▣ T1</span><span class="lg-key">ICE T1</span><span class="lg-desc">defensa débil · combate de claves.</span></div>'+
'<div class="legend-row"><span class="sym ambar">▣ T2</span><span class="lg-key">ICE T2</span><span class="lg-desc">defensa media · combate de claves.</span></div>'+
'<div class="legend-row"><span class="sym rojo">▣ T3</span><span class="lg-key">ICE T3</span><span class="lg-desc">defensa dura · combate de escáner.</span></div>'+
'<div class="legend-row"><span class="sym magenta">Ω</span><span class="lg-key">DAEMON</span><span class="lg-desc">habitante del cable · combate de memoria.</span></div>'+
'<div class="legend-row"><span class="sym ambar">⬢</span><span class="lg-key">VAULT</span><span class="lg-desc">proyecto corporativo · puzzle de símbolos. Para trabajos VAULT.</span></div>'+
'<div class="legend-row"><span class="sym cyan">⌁</span><span class="lg-key">SUBESTACIÓN</span><span class="lg-desc">+₡ y calor −6 (una vez).</span></div>'+
'<div class="legend-row"><span class="sym magenta">✦</span><span class="lg-key">NÚCLEO</span><span class="lg-desc">el boss · solo en la misión final (capa 5).</span></div>'+
'<div class="legend-row"><span class="sym magenta">◎</span><span class="lg-key">SEÑAL DEL NÚCLEO</span><span class="lg-desc">fragmento residual · +30 XP (solo tras la historia).</span></div>'+
'<div class="legend-row"><span class="sym sym-unknown">?</span><span class="lg-key">DESCONOCIDO</span><span class="lg-desc">nodo aún no conectado a tu nodo actual.</span></div>'+
'<div class="legend-row"><span class="sym">·</span><span class="lg-key">CONSUMIDO</span><span class="lg-desc">nodo ya limpiado: no queda nada en él.</span></div>'+
'</div>'+
'<p class="help-p">Tu posición actual se marca con un <b>anillo rosa</b>. Los nodos conectados a ti se ven con una línea verde; los que no están aparecen como <b>?</b> hasta que te mueves cerca. En las partidas avanzadas pueden aparecer <b>ECOS DEL NÚCLEO</b> (ICE T2 especiales que dan más XP).</p>'+
'</div>'+

/* ④ MOVERSE */
'<div class="panel-h">④ MOVERSE POR EL GRID</div><div class="box helpbox">'+
'<p class="help-p">Solo puedes moverte a nodos <b>conectados</b> a tu posición actual. <b>Clic</b> en el nodo al que quieres ir. También pulsas las <b>teclas 1-9</b> (según el orden en que aparecen en el HUD).</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">Clic en nodo</span><span class="muted">moverse a un nodo vecino conectado</span></div>'+
'<div class="helprow-item"><span class="kbd">1 - 9</span><span class="muted">moverse al nodo vecino número N</span></div>'+
'<div class="helprow-item"><span class="kbd">F</span><span class="muted">superficializar (volver a la superficie)</span></div>'+
'</div>'+
'</div>'+

/* ⑤ EVENTOS */
'<div class="panel-h">⑤ EVENTOS DEL GRID · el cable también se mueve</div><div class="box helpbox">'+
'<p class="help-p">Al moverte pueden dispararse <b>eventos aleatorios</b> (más probables con el calor alto) y <b>transmisiones</b> interceptadas de lore. Un aviso amable y otro no tanto:</p>'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">SEÑAL INTERCEPTADA</span><span class="lg-desc">un fragmento de datos cae en tu RAM (si hay sitio).</span></div>'+
'<div class="legend-row"><span class="lg-key">INTERFERENCIA</span><span class="lg-desc">oculta nodos vecinos durante unos movimientos.</span></div>'+
'<div class="legend-row"><span class="lg-key">AYUDA DEL CORVO</span><span class="lg-desc">una señal amiga: +15 CPU.</span></div>'+
'<div class="legend-row"><span class="lg-key">TRAMPA DE SEGURIDAD</span><span class="lg-desc">−30₡ dispersados, pero ganas experiencia del incidente.</span></div>'+
'<div class="legend-row"><span class="lg-key">CORRIENTE DE DATOS</span><span class="lg-desc">te arrastra una capa más profunda. +10 de calor.</span></div>'+
'<div class="legend-row"><span class="lg-key">FRAGMENTO ENCRÍPTADO</span><span class="lg-desc">una cache olvidada: desbloquea un informe (INFORMES).</span></div>'+
'<div class="legend-row"><span class="lg-key">RUIDO BLANCO</span><span class="lg-desc">ráfaga corporativa: +15 de calor.</span></div>'+
'<div class="legend-row"><span class="lg-key">ECO DEL DECK</span><span class="lg-desc">la memoria de un portador anterior de tu deck: una pista de su voz… y algo de experiencia.</span></div>'+
'</div>'+
'<div class="callout rojo">⚠ <b>RASTREADOR CORPORATIVO</b>: emboscada aleatoria al moverte. Su probabilidad crece con el calor alto y el SIGILO bajo (casi segura con calor ≥95) y su dureza depende del calor. Si lo destruyes, el nodo donde estabas se resuelve con normalidad.</div>'+
'</div>'+

/* ⑥ COMBATE */
'<div class="panel-h">⑥ COMBATE · los tres duelos</div><div class="box helpbox">'+
'<p class="help-p">Entrar en una defensa inicia un <b>combate</b>. Hay <b>tres modos</b> según el enemigo y un puzzle especial para los vaults:</p>'+
'<div class="legend">'+
'<div class="legend-row"><span class="sym ambar">▣</span><span class="lg-key">CLAVES · ICE T1/T2</span><span class="lg-desc">escribe la clave hexadecimal y pulsa ENTER. Se ignoran espacios y mayúsculas.</span></div>'+
'<div class="legend-row"><span class="sym magenta">Ω</span><span class="lg-key">MEMORIA · daemons</span><span class="lg-desc">memoriza la secuencia hex durante unos segundos y repítela cuando se oculte.</span></div>'+
'<div class="legend-row"><span class="sym rojo">▣</span><span class="lg-key">ESCÁNER · ICE T3</span><span class="lg-desc">una línea barre la zona: haz clic cuando pase sobre un hueco. Toca todos antes de que acabe el tiempo.</span></div>'+
'<div class="legend-row"><span class="sym ambar">⬢</span><span class="lg-key">VAULT · símbolos</span><span class="lg-desc">memoriza el orden (3 s) y repítelo en 15 s. Fallar cuesta −10 CPU y 10 s de bloqueo.</span></div>'+
'</div>'+
'<p class="help-p">Todas las defensas tienen varias <b>fases</b>: gana todas para destruirlas. Un fallo o un timeout hacen <b>daño neural</b> (en claves y memoria toca repetir la fase con una clave o secuencia nueva).</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">ENTER</span><span class="muted">enviar clave / secuencia (también se comprueba sola al escribir)</span></div>'+
'<div class="helprow-item"><span class="kbd">ESC</span><span class="muted">huir · abandonas el combate (el nodo sigue en pie)</span></div>'+
'<div class="helprow-item"><span class="kbd">Teclado hex</span><span class="muted">botones en pantalla para teclados táctiles</span></div>'+
'</div>'+
'<div class="callout cyan">💡 Sube <b>HACK</b> (ESTADO) para claves más cortas y más tiempo, y <b>Nervios</b> para menos daño. El <b>Firewall</b>, los <b>Discos Decoy</b> (cancelan un golpe) y los <b>Paquetes Virus</b> (eliminan una fase al empezar) también te protegen.</div>'+
'<div class="callout ambar">✦ <b>EL NÚCLEO</b> (solo en la misión final, capa 5) combate en modo CLAVES con 4 fases y <b>no se puede huir</b> de él.</div>'+
'</div>'+

/* ⑦ TRABAJOS */
'<div class="panel-h">⑦ LOS TRABAJOS · cómo completar cada uno</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">◆ RECOLECTA</span><span class="lg-desc">Coge N nodos de datos (◆) y vuelve sano.</span></div>'+
'<div class="legend-row"><span class="lg-key">◆ CARRERA</span><span class="lg-desc">Coge N datos en <b>capas ≥3</b> y superficializa con <b>calor &lt;45</b>.</span></div>'+
'<div class="legend-row"><span class="lg-key">▣ PURGA / ROMPEHIELOS</span><span class="lg-desc">Destruye N ICE <b>T2/T3</b>. Los daemons no cuentan; los rastreadores T2/T3 sí.</span></div>'+
'<div class="legend-row"><span class="lg-key">Ω CAZA DE DEMONIOS</span><span class="lg-desc">Destruye N daemons (Ω).</span></div>'+
'<div class="legend-row"><span class="lg-key">⬢ VAULT</span><span class="lg-desc">Llega a la capa marcada y recupera el VAULT (⬢). El VAULT solo aparece en el grid si aceptas ese contrato, y solo puedes llevar <b>uno a la vez</b>.</span></div>'+
'</div>'+
'<p class="help-p">El progreso de cada trabajo lo ves en TRABAJOS (barra "X/N"). Los trabajos se resuelven todos a la vez cuando superficializas: los cumplidos se <b>pagan</b> y sube la reputación (mejora los pagos futuros); los no cumplidos quedan como <b>FRACASADO</b>.</p>'+
'<p class="help-p">Puedes tener hasta <b>3 trabajos activos</b>. Acepta antes del DIP: esa red contendrá suficientes objetivos para todos. Las cuotas máximas por inmersión son <b>6 datos, 4 datos profundos, 4 ICE o 3 daemons</b>, respetando la RAM. Dentro del grid solo puedes aceptar trabajos si aún quedan objetivos y RAM; VAULT siempre se acepta en la calle.</p>'+
'<p class="help-p">La RAM necesaria para los contratos queda reservada: los fragmentos de SEÑAL no ocupan esos slots y debes recoger primero los datos profundos de CARRERA si los superficiales los agotarían. Refresca las ofertas en CONTACTOS para nuevos contratos. KAIROS se desbloquea con nivel 4 y reputación con NIGHT-0X ≥ 2.</p>'+
'</div>'+

/* ⑧ CALOR / RAM / CPU */
'<div class="panel-h">⑧ CALOR · RAM · CPU</div><div class="box helpbox">'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="lg-key">CALOR</span><span class="muted">sube al profundizar, pelear y con eventos; baja solo con el tiempo (−1 cada 20 s), con subestaciones (−6), la NÉBULA FRESCA (−30) y al superficializar (−12). Con calor ≥50 los datos valen menos; con ≥90 suenas ruido blanco; con <b>100 estás en LOCKDOWN</b> y no puedes bajar a la red.</span></div>'+
'<div class="helprow-item"><span class="lg-key">RAM</span><span class="muted">guardas los datos recogidos. Cuando está llena, superficializa para <b>venderlos</b> (los datos se convierten en ₡; su valor escala con la capa y con HACK).</span></div>'+
'<div class="helprow-item"><span class="lg-key">CPU</span><span class="muted">tu integridad neural. Al superficializar recuperas +8. Si llega a 0 → FLATLINE (ver ⑭).</span></div>'+
'</div>'+
'<p class="help-p">Estrategia: cumple el objetivo del contrato, <b>superficializa</b> para vender los datos y cobrar, y vuelve a bajar. No profundices demasiado si el calor sube. El reloj de calle avanza <b>1 min por segundo real</b>.</p>'+
'</div>'+

/* ⑨ HABILIDADES */
'<div class="panel-h">⑨ HABILIDADES, ÁRBOL Y MEJORAS</div><div class="box helpbox">'+
'<p class="help-p">Al subir de nivel (por XP) ganas <b>1 punto de habilidad</b>. Gástalo en <b>ESTADO</b> con el botón + (máximo 5 por atributo) o en el <b>ÁRBOL DE HABILIDADES</b>:</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">HACK</span><span class="muted">claves más cortas · más tiempo · datos más valiosos</span></div>'+
'<div class="helprow-item"><span class="kbd">SIGILO</span><span class="muted">menos emboscadas y calor · huir más fácil</span></div>'+
'<div class="helprow-item"><span class="kbd">NERVIOS</span><span class="muted">recibes menos daño en combate</span></div>'+
'</div>'+
'<div class="callout cyan">★ El <b>ÁRBOL DE HABILIDADES</b> (botón en ESTADO) tiene 14 skills en tres ramas: <b>ROMPEMUROS</b> (claves más cortas), <b>ANALISTA</b> (hack), <b>FANTASMA y EVASIVO</b> (sigilo), <b>TANQUE</b> (nervios) y <b>REGENERACIÓN</b> (recuperas CPU al moverte sin combate). Cuestan 1-3 puntos y exigen el skill anterior. Los skills que suben atributo respetan el máximo de 5.</div>'+
'<p class="help-p">En el <b>Mercado Negro</b> compras mejoras permanentes (RAM, Firewall, Link Neural, Rompehielos) y consumibles (Discos Decoy, Paquetes Virus, Pulso Reparador, NÉBULA FRESCA).</p>'+
'</div>'+

/* ⑩ CALLE */
'<div class="panel-h">⑩ ACTIVIDADES DE LA CALLE</div><div class="box helpbox">'+
'<p class="help-p">En INICIO, cuando no estás en la red, la calle ofrece cosas (con tiempo de enfriamiento entre usos):</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">BAR-CLUB ÓCTAVA</span><span class="muted">recuperas 10 CPU · cuesta 30 min de reloj</span></div>'+
'<div class="helprow-item"><span class="kbd">INFORMANTES</span><span class="muted">−50₡ · el próximo grid revela los nodos de las capas 1-2</span></div>'+
'<div class="helprow-item"><span class="kbd">ENTRENAMIENTO</span><span class="muted">+5 XP · cuesta 1 hora de reloj</span></div>'+
'</div>'+
'</div>'+

/* ⑪ DIFICULTADES */
'<div class="panel-h">⑪ DIFICULTADES</div><div class="box helpbox">'+
'<p class="help-p">Se elige al arrancar (viene preseleccionada la de tu partida guardada) y se aplica en esa sesión:</p>'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key verde">NORMAL</span><span class="lg-desc">más tiempo en combate, daño normal, y puedes RECONEXIONAR al caer.</span></div>'+
'<div class="legend-row"><span class="lg-key ambar">HARDCORE</span><span class="lg-desc">combates más rápidos, daño ×1.5, el calor es más pegajoso, y al flatlinear solo hay NUEVO REGISTRO.</span></div>'+
'<div class="legend-row"><span class="lg-key magenta">LEGENDARIO</span><span class="lg-desc">se desbloquea al derrotar al Núcleo. Los grids van +1 capa más profundos y los ICE suben de tier.</span></div>'+
'</div>'+
'</div>'+

/* ⑫ PRIMERA PARTIDA */
'<div class="panel-h">⑫ TU PRIMERA PARTIDA</div><div class="box helpbox">'+
'<ol class="helpol">'+
'<li>En <b>INICIO</b> mira tu estado (CPU, calor, créditos, nivel). La primera vez un <b>tutorial interactivo</b> te acompaña paso a paso.</li>'+
'<li>Ve a <b>CONTACTOS</b> y pulsa <b>ACEPTAR</b> en un trabajo (empieza por una <b>RECOLECTA</b> de Mama Wire — la más sencilla).</li>'+
'<li>Pulsa <b>◈ DIP AL GRID</b> para sumergirte.</li>'+
'<li><b>Clic en un nodo ◆</b> para recoger datos. Muévete entre los nodos conectados (clic o teclas 1-9).</li>'+
'<li>Cuando cumplas el objetivo del contrato, pulsa <b>SUPERFICIE</b> (o <b>F</b>) para <b>resolverlo</b> y cobrar.</li>'+
'<li>Con los ₡ compra mejoras en el <b>Mercado Negro</b> y sube habilidades en <b>ESTADO</b>.</li>'+
'<li>Repite. Sube de nivel, desbloquea contactos mejores y, más adelante, los <b>VAULT</b> y los <b>daemons</b>.</li>'+
'</ol>'+
'<div class="callout verde">🎯 Recuerda: el trabajo se paga cuando vuelves a la superficie con el objetivo cumplido. No lo superficialices a medias.</div>'+
'</div>'+

/* ⑬ LOGROS Y POST-PARTIDA */
'<div class="panel-h">⑬ LOGROS Y TRAS EL NÚCLEO</div><div class="box helpbox">'+
'<p class="help-p">La pantalla <b>LOGROS</b> guarda tus 22 hazañas (los que faltan aparecen cifrados). Y cuando derrotas a <b>EL NÚCLEO</b>… el juego no termina:</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">◎ SEÑAL</span><span class="muted">nodos residuales del Núcleo: +30 XP</span></div>'+
'<div class="helprow-item"><span class="kbd">▣ ECO</span><span class="muted">ICE T2 especiales que dan más XP</span></div>'+
'<div class="helprow-item"><span class="kbd">SEALED NETWORK</span><span class="muted">modo supervivencia (botón en INICIO): sin contratos, grids cada vez más profundos · a partir de la capa 6 empieza EL FONDO DEL SUEÑO (hay un informe solo para los que llegan)</span></div>'+
'</div>'+
'<p class="help-p">También se desbloquea la dificultad <b>LEGENDARIO</b> y los contactos tienen cosas nuevas que decir.</p>'+
'</div>'+

/* ⑭ GUARDAR Y PARTIDAS */
'<div class="panel-h">⑭ GUARDAR Y PARTIDAS</div><div class="box helpbox">'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">GUARDAR</span><span class="muted">guarda a mano (también hay autoguardado)</span></div>'+
'<div class="helprow-item"><span class="kbd">EXPORTAR</span><span class="muted">descarga tu partida como archivo .json</span></div>'+
'<div class="helprow-item"><span class="kbd">IMPORTAR</span><span class="muted">restaura una partida desde un .json</span></div>'+
'<div class="helprow-item"><span class="kbd">RESET</span><span class="muted">borra todo (con confirmación) · conserva tu mejor registro</span></div>'+
'</div>'+
'<div class="callout ambar">⚠ <b>FLATLINE</b> (CPU a 0): <b>RECONEXIÓN</b> recupera la última partida —pierdes los datos de la inmersión, CPU al ~50% y el calor baja— o <b>NUEVO REGISTRO</b> empieza desde cero (tu mejor registro se conserva aparte). En <b>HARDCORE</b> solo hay NUEVO REGISTRO.</div>'+
'</div>'+

/* ⑮ COMANDOS */
'<div class="panel-h">⑮ COMANDOS</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">red / net / dip</span><span class="lg-desc">sumergirse en la red</span></div>'+
'<div class="legend-row"><span class="lg-key">superficie</span><span class="lg-desc">volver a la superficie (resuelve trabajos)</span></div>'+
'<div class="legend-row"><span class="lg-key">contactos / trabajos / tienda</span><span class="lg-desc">abrir cada sección (trabajos = jobs, tienda = shop)</span></div>'+
'<div class="legend-row"><span class="lg-key">stats / intel / log</span><span class="lg-desc">estado / informes / registro (estado, informes y registro también valen)</span></div>'+
'<div class="legend-row"><span class="lg-key">salir / back</span><span class="lg-desc">volver a INICIO</span></div>'+
'<div class="legend-row"><span class="lg-key">nucleo</span><span class="lg-desc">acepta la misión EL NÚCLEO (nivel 5 y reputación con NIGHT-0X ≥ 3)</span></div>'+
'<div class="legend-row"><span class="lg-key">sonido / snd</span><span class="lg-desc">canal FX/UI: botones, avisos y logros (indicador FX; por defecto ON)</span></div>'+
'<div class="legend-row"><span class="lg-key">musica / music / mus</span><span class="lg-desc">canal de música (indicador MUS; por defecto ON). Sin mp3 en music/, suena el guiño del canal 7</span></div>'+
'<div class="legend-row"><span class="lg-key">ambiente / amb</span><span class="lg-desc">canal de fondo: tonos y ruido blanco constantes (indicador AMB; por defecto OFF)</span></div>'+
'<div class="legend-row"><span class="lg-key">brillo / lum</span><span class="lg-desc">brillo de pantalla 50-150% (ej.: <b>brillo 120</b>); también con LUM −/+ de la topbar y un clic en LUM vuelve a la fábrica (100%, ya ~+28% sobre el tema base). Se recuerda en este dispositivo</span></div>'+
'<div class="legend-row"><span class="lg-key">pantalla / full</span><span class="lg-desc">modo pantalla completa (indicador FULL de la topbar; también con su botón). En tablet, el navegador y sus barras dejan de robarle espacio al juego. El juego arranca como lo dejaste: si cerraste en pantalla completa, vuelves a entrar al pulsar ▶ COMENZAR. Sales con ESC o con el botón FULL</span></div>'+
'<div class="legend-row"><span class="lg-key">mensajes / buzon / mail</span><span class="lg-desc">la bandeja del deck: las cartas que te llegan (sección ⑱)</span></div>'+
'<div class="legend-row"><span class="lg-key">responder</span><span class="lg-desc">intenta contestar la última carta… si su ruta lo permite (casi nunca)</span></div>'+
'<div class="legend-row"><span class="lg-key">expediente / quien &lt;nombre&gt; / diario</span><span class="lg-desc">tu ficha de archivo, las fichas de los personajes (el OS evade lo importante) y el registro filtrado por tu historia</span></div>'+
'<div class="legend-row"><span class="lg-key">glosario / mundo</span><span class="lg-desc">el mundo en 30 segundos y el glosario de términos (esta misma ayuda)</span></div>'+
'<div class="legend-row"><span class="lg-key">guardar / clear / whoami / tiempo</span><span class="lg-desc">utilidades (clear = cls)</span></div>'+
'<div class="legend-row"><span class="lg-key">ayuda / help / ?</span><span class="lg-desc">abre esta ayuda, también desde la red</span></div>'+
'</div>'+
'</div>'+

/* ⑯ ATAJOS GLOBALES */
'<div class="panel-h">⑯ ATAJOS GLOBALES</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">Ctrl+1..9</span><span class="lg-desc">cambiar a la vista correspondiente del sidebar</span></div>'+
'<div class="legend-row"><span class="lg-key">Ctrl+G</span><span class="lg-desc">dip al grid (si no hay inmersión activa)</span></div>'+
'<div class="legend-row"><span class="lg-key">Ctrl+S</span><span class="lg-desc">guardar partida (funciona siempre; no abre el "guardar página" del navegador)</span></div>'+
'<div class="legend-row"><span class="lg-key">Ctrl+K</span><span class="lg-desc">foco en el terminal de comandos</span></div>'+
'<div class="legend-row"><span class="lg-key">Escape</span><span class="lg-desc">cerrar overlay, modal, confirmación o árbol de habilidades</span></div>'+
'<div class="legend-row"><span class="lg-key">F</span><span class="lg-desc">superficializar (dentro del grid)</span></div>'+
'<div class="legend-row"><span class="lg-key">1-9</span><span class="lg-desc">moverse a nodo vecino (dentro del grid)</span></div>'+
'</div>'+
'<p class="help-p">Los atajos se pausan mientras escribes en el terminal o mientras un modal está abierto. Ningún atajo <b>Ctrl</b> del juego se cuela al navegador.</p>'+
'</div>'+

/* ⑰ GLOSARIO */
'<div class="panel-h">⑰ GLOSARIO · el mundo en una línea por palabra</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">corvo</span><span class="lg-desc">netrunner de calle. Te llamas como tu deck: por eso eres CORVO-7.</span></div>'+
'<div class="legend-row"><span class="lg-key">el cable</span><span class="lg-desc">la red que lo gobierna todo en la ciudad. Está viva y nadie sabe qué es de verdad.</span></div>'+
'<div class="legend-row"><span class="lg-key">el Núcleo</span><span class="lg-desc">la máquina que manda en la red, en lo más profundo (capa 5).</span></div>'+
'<div class="legend-row"><span class="lg-key">capas</span><span class="lg-desc">profundidad de la red: del puerto (capa 0) al Núcleo (capa 5). Más abajo, más dinero y más peligro.</span></div>'+
'<div class="legend-row"><span class="lg-key">ciberdeck / deck</span><span class="lg-desc">el hardware con el que te conectas a la red. Los de la calle son robados.</span></div>'+
'<div class="legend-row"><span class="lg-key">CPU</span><span class="lg-desc">tu cordura dentro de la red. Si llega a 0: flatline.</span></div>'+
'<div class="legend-row"><span class="lg-key">flatline</span><span class="lg-desc">muerte-conexión: te expulsan de la red a las malas.</span></div>'+
'<div class="legend-row"><span class="lg-key">calor</span><span class="lg-desc">tu rastro en la red. Con 100, la ciudad te busca (LOCKDOWN).</span></div>'+
'<div class="legend-row"><span class="lg-key">ruido blanco</span><span class="lg-desc">el zumbido de fondo de la red viva. Se oye cuando el calor sube.</span></div>'+
'<div class="legend-row"><span class="lg-key">superficializar</span><span class="lg-desc">volver a la superficie: salir de la red y cobrar.</span></div>'+
'<div class="legend-row"><span class="lg-key">ICE</span><span class="lg-desc">defensas de la red. Tres durezas: T1, T2 y T3.</span></div>'+
'<div class="legend-row"><span class="lg-key">daemon</span><span class="lg-desc">habitante de la red: no ataca por dinero, archiva. Combate de memoria.</span></div>'+
'<div class="legend-row"><span class="lg-key">vault</span><span class="lg-desc">archivo sellado con un proyecto corporativo dentro. Puzzle de símbolos.</span></div>'+
'<div class="legend-row"><span class="lg-key">subestación</span><span class="lg-desc">órgano de la red: da crédito y baja el calor (una vez).</span></div>'+
'<div class="legend-row"><span class="lg-key">fixer</span><span class="lg-desc">quien te consigue contratos (Mama Wire, Night-0X). Cobran por facilitar.</span></div>'+
'<div class="legend-row"><span class="lg-key">rastreador</span><span class="lg-desc">la policía de la red: emboscada si dejas mucho rastro.</span></div>'+
'<div class="legend-row"><span class="lg-key">créditos (₡)</span><span class="lg-desc">la moneda de la calle.</span></div>'+
'<div class="legend-row"><span class="lg-key">las Torres</span><span class="lg-desc">macro-obras que se dejaron de construir en 2071. Nadie habla de por qué.</span></div>'+
'<div class="legend-row"><span class="lg-key">el Parpadeo</span><span class="lg-desc">2091: alguien apagó el Núcleo 11 segundos. La calle recuerda 3.</span></div>'+
'<div class="legend-row"><span class="lg-key">corporaciones y proyectos</span><span class="lg-desc">quién manda en la ciudad y qué esconde cada uno: todo en INFORMES, con su glosa en claro (▸).</span></div>'+
'</div>'+
'</div>'+

/* ⑱ MENSAJES */
'<div class="panel-h">⑱ MENSAJES · la bandeja del deck</div><div class="box helpbox">'+
'<p class="help-p">Los fixers y otros contactos te escriben <b>cartas</b> según lo que hagas (tu primer trabajo, un cobro, un fracaso…). A diferencia de la línea inferior, <b>aquí todo se queda</b>: léelas cuando quieras con un clic.</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">● punto magenta</span><span class="muted">carta sin leer en el menú MENSAJES</span></div>'+
'<div class="helprow-item"><span class="kbd">EMISOR</span><span class="muted">al pie de cada carta. Si dice <b>«sin respuesta»</b>, tu respuesta no llegará: quien escribió quemó su ruta para no exponerse. Es lo normal por aquí. En muy pocas cartas aparece el botón de <b>contestar de todas formas</b>: el envío vuelve… pero contestar a lo que no firma tiene su recompensa</span></div>'+
'</div>'+
'<div class="callout cyan">💡 Si tecleas <b>responder</b> en el terminal, el OS te lo dirá con otras palabras: casi ninguna ruta de vuelta sobrevive en la calle.</div>'+
'</div>';
