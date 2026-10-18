/* ============================================================
   CYPHER://OS  ·  contenido de la pantalla AYUDA
   Historia de extracción: el peso del JS principal se alivió sacando la AYUDA
   de lo que antes era un único cypher_os.js monolítico; hoy vive en los seis
   módulos de AGENTS.md §0.
   Variable global: HELP_HTML
   ============================================================ */

'use strict';
var HELP_HTML = '<h1 class="title">AYUDA</h1>'+
'<div class="sub"> cómo jugar · el cable no duerme · pulsa AYUDA o escribe AYUDA</div>'+

/* ⓪ EL MUNDO EN 30 SEGUNDOS */
'<div class="panel-h">⓪ EL MUNDO EN 30 SEGUNDOS · si no sabes nada, empieza aquí</div><div class="box helpbox">'+
'<ol class="helpol">'+
'<li><b>Eres Álex Riba</b>, técnico de mantenimiento. Berto te deja usar el equipo de Tomás, ausente del Hostal La Bajante. CORVO-7 identifica al dispositivo; no has heredado las credenciales de su dueño.</li>'+
'<li><b>La red —el cable—</b> conecta servicios, dinero y vigilancia. El Grid representa esas conexiones externas; no es el almacenamiento local del deck.</li>'+
'<li><b>ARCHIVOS</b> conserva documentos anteriores y recuperados con su procedencia. Dañado significa falta de reconstrucción; cifrado significa falta de clave. Abrirlos no cobra ni resuelve un caso.</li>'+
'<li><b>MENSAJES</b> separa ENTRADA (cartas recibidas) y ARCHIVO (correo anterior). Una copia anterior no te convierte en su remitente. En AYUDA puedes releer el prólogo sin cambiar la partida.</li>'+
'<li><b>LA FACTURA</b> se acepta en TRABAJOS. VEYRA abre un canal nuevo para Álex; no usas la cuenta de Tomás. Tras verificar la entrega se abren los trabajos genéricos de CONTACTOS. El riesgo se mide en calor (tu rastro) y CPU (integridad de conexión).</li>'+
'</ol>'+
'<div class="callout cyan">💡 Toda la jerga está explicada en una línea en <b>GLOSARIO</b> (⑰, al final de esta pantalla) o escribe <b>glosario</b> en el terminal.</div>'+
'</div>'+

/* ① BUCLE */
'<div class="panel-h">① EL BUCLE DEL CABLE</div><div class="box helpbox">'+
'<p class="help-p"><b>Dónde seguir cada asunto:</b> TRABAJOS separa INVESTIGACIÓN (los casos de Tomás) y CONTRATOS (los encargos corrientes). CONTACTOS separa PERSONALES (conversaciones) y OFERTAS (contratos nuevos). Cambiar de pestaña no lee conversaciones ni acepta encargos.</p>'+
'<p class="help-p"><b>Primer caso:</b> acepta LA FACTURA en TRABAJOS, INVESTIGACIÓN. Conecta con facturación, retira la defensa del archivador y copia el historial. El paquete ocupa una unidad de RAM, no se vende. Vuelve al puerto y sal de la red para conservarlo; después pulsa ENTREGAR HISTORIAL en la investigación. Solo esa verificación paga 140₡ y 60 XP una vez. Retirarte sin la prueba o perderla en FLATLINE permite reintentar. La defensa conserva su XP normal.</p>'+
'<p class="help-p"><b>Investigación:</b> consulta los siguientes casos en TRABAJOS y acéptalos expresamente en la calle. ORVIK necesita el respaldo del índice; verificarlo reconstruye referencias, no rompe el cifrado. Consulta el permiso de Inés, recibe su clave y pulsa APLICAR CLAVE para leer las copias locales y aceptar LAS DOS VERSIONES. Después puedes contrastar el diario de LOS ONCE SEGUNDOS. Cada copia ocupa una unidad de RAM reservada y se consolida al volver por el puerto; la verificación posterior paga una sola vez.</p>'+
'<p class="help-p">Los contratos genéricos pueden acompañar un caso si caben en RAM; una prueba documental no cuenta como dato vendido ni como objetivo de RECOLECTA o CARRERA. Las redes posteriores a la factura conservan eventos y rastreadores. Retirarte sin prueba permite reintentar el caso, pero no elimina las reglas de fracaso de los contratos genéricos.</p>'+
'<p class="help-p"><b>LA FIRMA:</b> consulta la presentación de NAEV por Inés y recupera la cadena de autorizaciones. Firmas y actualización forman un paquete de una unidad de RAM. <b>EL HUÉSPED:</b> vuelve con el registro de custodia, verifica la identidad en el canal supervisado y después tramita la revisión con Inés. La salida no la ejecuta el combate. Berto confirma la acogida al consultarlo después.</p>'+
'<p class="help-p"><b>LA CONTINUIDAD:</b> significa que la luz, el transporte y la atención no se paren al quitar al Núcleo el permiso para cambiar los registros. Recupera las tres comprobaciones y las confirmaciones de copia en un solo paquete. No es la actualización de Orce que lleva ese nombre. Su entrega abre <b>SIN ÚLTIMA PALABRA</b>. Retira la defensa del Núcleo, copia la revocación (la constancia de que ya no tiene ese permiso) y vuelve al puerto. El combate no cierra ni paga: verificar la entrega concede 5000₡ y 600 XP una vez. El cierre avanza por comunicaciones a tu ritmo y conserva el punto al guardar; no acepta otra misión. VER PRUEBAS abre las copias y VOLVER A LA CALLE deja disponibles genéricos y supervivencia.</p>'+
'<p class="help-p"><b>Contratos genéricos, disponibles después de la factura:</b></p>'+
'<ol class="helpol">'+
'<li><b>Pide un trabajo</b> en CONTACTOS, OFERTAS. Cada contrato tiene un objetivo (recoger datos, destruir ICE, etc.) y una recompensa. Sigue su progreso en TRABAJOS, CONTRATOS.</li>'+
'<li><b>Baja a la red</b> con ◈ DIP AL GRID. El trabajo se "carga" en tu mochila dentro del grid.</li>'+
'<li><b>Cumple el objetivo</b> mientras estás dentro: muévete por los nodos y haz exactamente lo que pide el contrato.</li>'+
'<li><b>Vuelve a la superficie</b> con el botón SUPERFICIE (o pulsando <b>F</b>). Ahí es cuando el trabajo se <b>resuelve</b>.</li>'+
'</ol>'+
'<div class="callout ambar">⚠ Los contratos genéricos se evalúan al <b>superficializar</b>. Si todavía no cumples su objetivo, quedan <b>FRACASADOS</b> y sube el calor (+8 por contrato). Esta penalización no se aplica al caso de la factura pendiente.</div>'+
'</div>'+

/* ② CAPAS */
'<div class="panel-h">② EL GRID · LAS CAPAS</div><div class="box helpbox">'+
'<p class="help-p">Al entrar, ves una grilla con <b>capas</b> (columnas verticales). La <b>capa 0</b> es tu <b>puerto de entrada</b> (a la izquierda, ⌂). Cada capa más a la derecha es <b>más profunda</b>: más peligrosa, pero con más datos y los trabajos más difíciles.</p>'+
'<div class="helprow help-layers">'+
'<div class="helprow-item"><span class="help-layer cyan">CAPA 0</span><span class="muted">tu entrada · puerto de calle</span></div>'+
'<div class="helprow-item"><span class="help-layer cyan">CAPAS 1-2</span><span class="muted">ICE débil (T1) · datos · primeros daemons</span></div>'+
'<div class="helprow-item"><span class="help-layer ambar">CAPAS 3-4</span><span class="muted">ICE fuerte (T2/T3) · daemon T3 · VAULT</span></div>'+
'<div class="helprow-item"><span class="help-layer magenta">CAPA 5</span><span class="muted">solo la misión final · allí vive EL NÚCLEO</span></div>'+
'</div>'+
'<p class="help-p">Moverse a nodos profundos genera <b>calor</b>. Cuanto más profundo bajes, mejor recompensa… pero más riesgo. Usa las <b>subestaciones</b> (⌁) para bajar calor y obtener algo de crédito.</p>'+
'</div>'+

/* ③ NODOS */
'<div class="panel-h">③ LOS NODOS · leyenda</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="sym cyan">⌂</span><span class="lg-key">PUERTO</span><span class="lg-desc">tu entrada. explora las capas.</span></div>'+
'<div class="legend-row"><span class="sym verde">◆</span><span class="lg-key">DATOS</span><span class="lg-desc">cógelos: te llenan la RAM y pagan ₡. Para RECOLECTA.</span></div>'+
'<div class="legend-row"><span class="sym verde">▣ T1</span><span class="lg-key">ICE T1</span><span class="lg-desc">defensa débil · combate de claves.</span></div>'+
'<div class="legend-row"><span class="sym ambar">▣ T2</span><span class="lg-key">ICE T2</span><span class="lg-desc">desviador de enlaces · conexiones rotables.</span></div>'+
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
'<p class="help-p">Solo puedes moverte a nodos <b>conectados</b> a tu posición actual. <b>Clic</b> en el nodo al que quieres ir. También puedes pulsar las <b>teclas 1-9</b> (según el orden en que aparecen en el HUD).</p>'+
'<p class="help-p">RED dedica toda su área al mapa. Antes de conectar, DIP AL GRID aparece sobre el canvas. Durante la inmersión, el botón de menú del mapa abre los controles superpuestos: SUPERFICIE, AYUDA, nodo actual, vecinos, EXPLORACIÓN y TRABAJOS. Pulsa de nuevo el botón o Escape desde el panel para cerrarlo y despejar los nodos; abrirlo no encoge el mapa ni pausa la partida. CPU, calor y RAM siguen en la barra superior. EXPLORACIÓN y TRABAJOS empiezan desplegados y recuerdan su elección en este dispositivo; el panel completo empieza cerrado al entrar en RED. Girar la pantalla o redimensionar no cambia tu red ni el progreso.</p>'+
'<p class="help-p">Si visitas otra sección durante una inmersión, RED conserva una marca cyan en el lateral: INMERSIÓN en escritorio y un punto en el menú compacto. La marca desaparece al salir de la red; no es la selección de la sección actual.</p>'+
'<p class="help-p">El HUD cuenta ICE (incluidos rastreadores), daemons y nodos <b>visitados en esta inmersión</b>. Revelar un mapa no cuenta como visitarlo. <b>GRID EXPLORADO</b> significa que has visitado todos los nodos; <b>GRID AGOTADO</b>, que tampoco quedan objetivos fijos por resolver. La RAM llena y los vaults bloqueados siguen siendo pendientes. Los eventos y rastreadores no desaparecen: superficializa cuando te convenga. Los guardados antiguos indican <b>parcial</b> si falta historial.</p>'+
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
'<div class="legend-row"><span class="lg-key">FRAGMENTO ENCRIPTADO</span><span class="lg-desc">una caché olvidada: desbloquea un informe narrativo (no los expedientes recuperados de vaults).</span></div>'+
'<div class="legend-row"><span class="lg-key">RUIDO BLANCO</span><span class="lg-desc">ráfaga corporativa: +15 de calor.</span></div>'+
'<div class="legend-row"><span class="lg-key">ECO DEL DECK</span><span class="lg-desc">la memoria de un portador anterior de tu deck: una pista de su voz… y algo de experiencia.</span></div>'+
'</div>'+
'<div class="callout rojo">⚠ <b>RASTREADOR CORPORATIVO</b>: emboscada aleatoria al moverte. Su probabilidad crece con el calor alto y el SIGILO bajo (casi segura con calor ≥95) y su dureza depende del calor. Si lo destruyes, el nodo donde estabas se resuelve con normalidad.</div>'+
'</div>'+

/* ⑥ COMBATE */
'<div class="panel-h">⑥ COMBATE · defensas y enlaces</div><div class="box helpbox">'+
'<p class="help-p">Cada encuentro con ICE, rastreador, daemon o Núcleo muestra primero una <b>ficha en pausa</b>: qué ha ocurrido, qué protege o amenaza, silueta de su familia, modo de combate y equipo útil disponible. Puedes leer sin límite; el reloj y el calor se detienen. Pulsa <b>ENTRAR AL COMBATE</b> para iniciar el reto o <b>HUIR</b>: éxito = calor +5; fallo = un golpe y comienza el combate. SIGILO mejora la huida y DECOY absorbe el golpe. Del Núcleo no se huye. Esta ficha aparece siempre, no solo al aprender. Hay <b>cinco modos</b> y un puzzle especial para los vaults:</p>'+
'<div class="legend">'+
'<div class="legend-row"><span class="sym ambar">▣</span><span class="lg-key">CLAVES · archivador T1 / Núcleo</span><span class="lg-desc">el deck obtiene una clave de consulta, pero el canal separado requiere confirmación manual. Escribe la clave hexadecimal; se ignoran espacios y mayúsculas.</span></div>'+
'<div class="legend-row"><span class="sym verde">◉</span><span class="lg-key">RASTREO · perseguidor</span><span class="lg-desc">el contexto se lee en la ficha, sin reloj. Al entrar solo aparece la dirección 0x que debes recordar; el teclado permanece oculto. CERRAR LECTURA Y RESPONDER retira la dirección y muestra el teclado hex. Envía la dirección sin 0x. Memorizar y responder comparten el tiempo de fase; un fallo o timeout abre otra lectura.</span></div>'+
'<div class="legend-row"><span class="sym cyan">▦</span><span class="lg-key">DESVÍO · ICE T2</span><span class="lg-desc">conecta la entrada oeste con la salida este indicadas. Cada conexión gira un cuarto de vuelta con clic, toque, Enter o Espacio; su nombre y tooltip enumeran los puertos. ENRUTAR verifica un enlace continuo con puertos recíprocos. Un fallo o timeout daña y renueva el tablero en la misma fase.</span></div>'+
'<div class="legend-row"><span class="sym magenta">Ω</span><span class="lg-key">MEMORIA · daemons</span><span class="lg-desc">memoriza la secuencia hex durante unos segundos y repítela cuando se oculte.</span></div>'+
'<div class="legend-row"><span class="sym rojo">▣</span><span class="lg-key">ESCÁNER · ICE T3</span><span class="lg-desc">una línea barre la zona: haz clic cuando pase sobre un hueco. Toca todos antes de que acabe el tiempo.</span></div>'+
'<div class="legend-row"><span class="sym ambar">⬢</span><span class="lg-key">VAULT · símbolos</span><span class="lg-desc">memoriza el orden (3 s) y repítelo en 15 s. Fallar cuesta −10 CPU y 10 s de bloqueo.</span></div>'+
'</div>'+
'<p class="help-p">Las fases representan protecciones retiradas. La silueta se rellena de rojo <b>desde abajo al recibir daño el programa</b>; el porcentaje DAÑO RECIBIDO sube, no es vida restante. TU CPU sigue indicando tu integridad. Completar una defensa no entrega ni paga por sí solo una prueba narrativa. Un fallo o timeout hace daño neural; cada modo conserva sus reglas de reintento.</p>'+
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
'<p class="help-p">El progreso de cada trabajo lo ves en TRABAJOS y en el bloque <b>TRABAJOS del HUD</b> (pulsa su cabecera para plegarlo o abrirlo). Alcanzar el objetivo no es cobrar: los trabajos se resuelven todos a la vez cuando superficializas. Los cumplidos se <b>pagan</b> y sube la reputación; los no cumplidos quedan como <b>FRACASADO</b>. CARRERA muestra también si el calor permite cobrar.</p>'+
'<p class="help-p">Recuperar un proyecto de un vault archiva inmediatamente su <b>EXPEDIENTE RECUPERADO</b> en INFORMES: qué hace, quién lo custodia y qué parte falta. Hay ocho, uno por proyecto; no se duplican ni sustituyen los informes narrativos. No hace falta cobrar el contrato para leerlo. Cada proyecto se recupera <b>una sola vez por partida</b>: deja de ofrecerse al resolver su puzzle, aunque aún falte cobrar. Cuando recuperas los ocho, los demás trabajos siguen disponibles.</p>'+
'<p class="help-p">Los contratos antiguos que repiten un proyecto ya recuperado quedan <b>RETIRADOS</b>, sin calor ni recompensa; cuentan una sola vez como fracaso administrativo. Una recuperación legítima pendiente de cobro se conserva y se paga al superficializar.</p>'+
'<p class="help-p">Puedes tener hasta <b>3 trabajos activos</b>. Acepta antes del DIP: esa red contendrá suficientes objetivos para todos. Las cuotas máximas por inmersión son <b>6 datos, 4 datos profundos, 4 ICE o 3 daemons</b>, respetando la RAM. Dentro del grid solo puedes aceptar trabajos si aún quedan objetivos y RAM; VAULT siempre se acepta en la calle.</p>'+
'<p class="help-p">La RAM necesaria para los contratos queda reservada: los fragmentos de SEÑAL no ocupan esos slots y debes recoger primero los datos profundos de CARRERA si los superficiales los agotarían. Las ofertas de cada fixer varían: entre <b>una y su máximo disponible</b>, siempre con un trabajo repetible si lo tiene. Abrir CONTACTOS o cargar la partida no vuelve a sortearlas: pulsa <b>REFRESCAR OFERTAS</b> para renovarlas. Refrescar no cambia tus contratos activos ni el Grid. Al empezar, VEYRA conserva RECOLECTA para aprender. NAEV se desbloquea con nivel 4 y reputación con Inés Aro ≥ 2.</p>'+
'</div>'+

/* ⑧ CALOR / RAM / CPU */
'<div class="panel-h">⑧ CALOR · RAM · CPU</div><div class="box helpbox">'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="lg-key">CALOR</span><span class="muted">sube al profundizar, pelear y con eventos; baja solo con el tiempo (−1 cada 20 s), con subestaciones (−6), la NÉBULA FRESCA (−30) y al superficializar (−12). Con calor ≥50 los datos valen menos; con ≥90 oyes ruido blanco; con <b>100 estás en LOCKDOWN</b> y no puedes bajar a la red.</span></div>'+
'<div class="helprow-item"><span class="lg-key">RAM</span><span class="muted">guardas los datos recogidos. Cuando está llena, superficializa para <b>venderlos</b> (los datos se convierten en ₡; su valor escala con la capa y con HACK).</span></div>'+
'<div class="helprow-item"><span class="lg-key">CPU</span><span class="muted">tu integridad neural. Al superficializar recuperas +8. Si llega a 0 → FLATLINE (ver ⑭).</span></div>'+
'</div>'+
'<p class="help-p">La barra superior conserva CPU, calor y RAM también en pantallas estrechas. CPU avisa con ≤40% de integridad y marca crítico con ≤20%. El calor se destaca desde 40, señala peligro con &gt;70 y crítico con ≥80. Los tres indicadores cambian solo el fondo y el halo exterior según su estado, con la etiqueta en verde y el valor estable: <b>sin símbolos ni insignias</b>; la RAM llena se distingue en cian y no implica daño. CPU crítica y calor rojo pulsan suavemente su halo; con movimiento reducido o animaciones OFF el resplandor queda estático y resplandor OFF lo elimina. Son señales visuales: no cambian las reglas del juego.</p>'+
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
'<p class="help-p">La dificultad se elige únicamente en la <b>intro</b>. Para cambiarla durante una partida, vuelve desde <b>PARTIDA → VOLVER A INTRO</b> cuando estés en la calle, elige el modo y pulsa <b>COMENZAR</b>: conservas tu progreso. <b>ESTADO</b> solo muestra el modo actual. Una red en curso conserva sus reglas y una partida HARDCORE terminada no se puede revivir cambiando de modo.</p>'+
'</div>'+
'</div>'+

/* ⑫ PRIMERA PARTIDA */
'<div class="panel-h">⑫ TU PRIMERA PARTIDA</div><div class="box helpbox">'+
'<ol class="helpol">'+
'<li>En <b>INICIO</b> mira tu estado (CPU, calor, créditos, nivel). La primera vez un <b>tutorial interactivo</b> te acompaña paso a paso.</li>'+
'<li>Ve a <b>CONTACTOS</b> y pulsa <b>ACEPTAR</b> en un trabajo (empieza por una <b>RECOLECTA</b> de VEYRA — la más sencilla).</li>'+
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
'<p class="help-p">La pantalla <b>LOGROS</b> guarda tus 26 hazañas (los que faltan aparecen cifrados). Tras verificar y entregar la revocación final puedes continuar sin reactivar al Núcleo:</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">◎ SEÑAL</span><span class="muted">nodos residuales del Núcleo: +30 XP</span></div>'+
'<div class="helprow-item"><span class="kbd">▣ ECO</span><span class="muted">ICE T2 especiales que dan más XP</span></div>'+
'<div class="helprow-item"><span class="kbd">SEALED NETWORK</span><span class="muted">modo supervivencia (botón en INICIO): sin contratos, grids cada vez más profundos · a partir de la capa 6 empieza EL FONDO DEL SUEÑO (hay un informe solo para los que llegan)</span></div>'+
'</div>'+
'<p class="help-p">También se desbloquea la dificultad <b>LEGENDARIO</b> y los contactos tienen cosas nuevas que decir.</p>'+
'</div>'+

/* ⑭ GUARDAR Y PARTIDAS */
'<div class="panel-h">⑭ GUARDAR Y PARTIDAS</div><div class="box helpbox">'+
'<p class="help-p">El botón de menú de la barra superior <b>muestra u oculta el lateral</b> y siempre permite recuperarlo. La elección se guarda en este dispositivo, no en la partida; importar, RESET y NUEVO REGISTRO no la cambian. Ocultarlo libera espacio para el panel y ajusta el Grid sin regenerarlo ni detener el reloj. Vuelve a mostrarlo para acceder a PARTIDA.</p>'+
'<p class="help-p">Abre <b>PARTIDA</b> en el menú lateral para GUARDAR, EXPORTAR, IMPORTAR, RESET o VOLVER A INTRO. Sus opciones aparecen en un panel unido al botón por una traza verde, como un cable de datos. Pulsar una opción lo cierra al instante; también lo cierran el <b>✕</b> de su cabecera, <b>PARTIDA</b> de nuevo, <b>Escape</b> o cualquier zona fuera, y ese clic además ejecuta lo que pulses. Está cerrado al cargar la página y puedes abrirlo con clic/toque o con Tab y Enter/Espacio. <b>Ctrl+S</b> guarda aunque esté cerrado. Abrirlo y cerrarlo no cambia tu progreso ni detiene el reloj.</p>'+
'<p class="help-p">Bajo <b>CONSULTAS</b>, la opción <b>REGISTRO</b> abre el diario de sesión sin ocupar una fila del lateral. También puedes entrar con <b>Ctrl+9</b> o con los comandos <b>log</b>, <b>registro</b> y <b>diario</b>; al consultarlo, PARTIDA queda marcado como sección actual.</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">GUARDAR</span><span class="muted">guarda a mano (también hay autoguardado)</span></div>'+
'<div class="helprow-item"><span class="kbd">EXPORTAR</span><span class="muted">descarga tu partida como archivo .json</span></div>'+
'<div class="helprow-item"><span class="kbd">IMPORTAR</span><span class="muted">restaura una partida desde un .json</span></div>'+
'<div class="helprow-item"><span class="kbd">RESET</span><span class="muted">borra todo (con confirmación) y vuelve a la pantalla inicial · conserva tu mejor registro</span></div>'+
'<div class="helprow-item"><span class="kbd">VOLVER A INTRO</span><span class="muted">guarda y vuelve a la intro para cambiar la dificultad sin recargar; solo en la calle —desde el Grid, superficializa primero— y COMENZAR reanuda tu partida intacta</span></div>'+
'<div class="helprow-item"><span class="kbd">CONSULTAS</span><span class="muted">REGISTRO abre el diario de sesión con filtros y exportación (también Ctrl+9 o log); no es una operación de guardado</span></div>'+
'</div>'+
'<div class="callout ambar">⚠ <b>FLATLINE</b> (CPU a 0): <b>RECONEXIÓN</b> conserva saldo, equipo y archivo consolidados, pero pierde la carga de la inmersión; CPU al ~50% y calor menor. <b>NUEVO REGISTRO</b> empieza otro prólogo desde cero, conservando el mejor registro. En <b>HARDCORE</b> no hay reconexión.</div>'+
'<p class="help-p">El menú no inicia el diagnóstico por sí solo. COMENZAR reanuda la página guardada o la sesión activa; INICIAR RECUPERACIÓN es una acción separada. Los formatos anteriores de prueba no se convierten ni se borran.</p>'+
'</div>'+

/* ⑮ COMANDOS */
'<div class="panel-h">⑮ COMANDOS</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">red / net / dip</span><span class="lg-desc">sumergirse en la red</span></div>'+
'<div class="legend-row"><span class="lg-key">superficie</span><span class="lg-desc">volver a la superficie (resuelve trabajos)</span></div>'+
'<div class="legend-row"><span class="lg-key">contactos / trabajos / tienda</span><span class="lg-desc">abrir cada sección (trabajos = jobs, tienda = shop)</span></div>'+
'<div class="legend-row"><span class="lg-key">archivos</span><span class="lg-desc">consultar documentos anteriores y recuperados</span></div>'+
'<div class="legend-row"><span class="lg-key">stats / intel / log</span><span class="lg-desc">estado / informes / registro (estado, informes y registro también valen)</span></div>'+
'<div class="legend-row"><span class="lg-key">salir / back</span><span class="lg-desc">volver a INICIO</span></div>'+
'<div class="legend-row"><span class="lg-key">nucleo</span><span class="lg-desc">conecta con la intervención ya aceptada en TRABAJOS; exige continuidad verificada, no nivel ni reputación</span></div>'+
'<div class="legend-row"><span class="lg-key">ajustes / config</span><span class="lg-desc">PANEL DE CONTROL: volúmenes independientes, brillo, textura CRT, resplandor y movimiento reducido. Iconos de la barra = silenciar o reactivar sin perder el volumen. Ajustes del dispositivo, conservados al importar o reiniciar. Cambios inmediatos; restablecer no borra la partida. El panel muestra el estado efectivo de avisos/transiciones y su causa. MOVIMIENTO REDUCIDO LOCAL en OFF no anula una solicitud de reducción del sistema o navegador: si marca SISTEMA/NAVEGADOR, revisa su accesibilidad o preferencias (también en Firefox). Esa señal no mide la CPU ni depende de la resolución. No pausa el reloj y no se abre durante combates o puzzles</span></div>'+
'<div class="legend-row"><span class="lg-key">sonido / snd</span><span class="lg-desc">canal FX/UI: botones, avisos y logros (indicador FX; por defecto ON)</span></div>'+
'<div class="legend-row"><span class="lg-key">musica / music / mus</span><span class="lg-desc">canal de música (indicador MUS; por defecto ON). Sin mp3 en assets/music/, suena el guiño del canal 7; el prólogo sin su pista queda en silencio</span></div>'+
'<div class="legend-row"><span class="lg-key">ambiente / amb</span><span class="lg-desc">canal de fondo: tonos y ruido blanco constantes (indicador AMB; por defecto OFF)</span></div>'+
'<div class="legend-row"><span class="lg-key">brillo / lum</span><span class="lg-desc">brillo de pantalla 50-150% (ej.: <b>brillo 120</b>); también desde el PANEL DE CONTROL (100% = fábrica, ya ~+28% sobre el tema base). Se recuerda en este dispositivo</span></div>'+
'<div class="legend-row"><span class="lg-key">pantalla / full</span><span class="lg-desc">modo pantalla completa (indicador FULL de la topbar; también con su botón). En tablet, el navegador y sus barras dejan de robarle espacio al juego. El juego arranca como lo dejaste: si cerraste en pantalla completa, vuelves a entrar al pulsar ▶ COMENZAR. Sales con ESC o con el botón FULL</span></div>'+
'<div class="legend-row"><span class="lg-key">mensajes / buzon / mail</span><span class="lg-desc">la bandeja del deck: las cartas que te llegan (sección ⑱)</span></div>'+
'<div class="legend-row"><span class="lg-key">responder</span><span class="lg-desc">intenta contestar la última carta… si su ruta lo permite (casi nunca)</span></div>'+
'<div class="legend-row"><span class="lg-key">expediente / quien &lt;nombre&gt; / diario</span><span class="lg-desc">registro local de sesión, referencias de personajes y registro filtrado por tu historia; identidad y situación requieren documentos, no solo un alias</span></div>'+
'<div class="legend-row"><span class="lg-key">glosario / mundo</span><span class="lg-desc">el mundo en 30 segundos y el glosario de términos (esta misma ayuda)</span></div>'+
'<div class="legend-row"><span class="lg-key">guardar / clear / whoami / tiempo</span><span class="lg-desc">utilidades (clear = cls)</span></div>'+
'<div class="legend-row"><span class="lg-key">ayuda / help / ?</span><span class="lg-desc">abre esta ayuda, también desde la red</span></div>'+
'</div>'+
'</div>'+

/* ⑯ ATAJOS GLOBALES */
'<div class="panel-h">⑯ ATAJOS GLOBALES</div><div class="box helpbox">'+
'<div class="legend">'+
'<div class="legend-row"><span class="lg-key">Ctrl+1..9</span><span class="lg-desc">destinos fijos: 1 INICIO, 2 RED, 3 CONTACTOS, 4 MENSAJES, 5 TRABAJOS, 6 MERCADO NEGRO, 7 ESTADO, 8 INFORMES y 9 REGISTRO. No dependen de la posición en el menú.</span></div>'+
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
'<div class="legend-row"><span class="lg-key">ciberdeck / deck</span><span class="lg-desc">el hardware con el que te conectas a la red. El de Tomás está prestado a Álex; los archivos anteriores no transfieren su identidad.</span></div>'+
'<div class="legend-row"><span class="lg-key">CPU</span><span class="lg-desc">tu cordura dentro de la red. Si llega a 0: flatline.</span></div>'+
'<div class="legend-row"><span class="lg-key">flatline</span><span class="lg-desc">muerte-conexión: te expulsan de la red a las malas.</span></div>'+
'<div class="legend-row"><span class="lg-key">calor</span><span class="lg-desc">tu rastro en la red. Con 100, la ciudad te busca (LOCKDOWN).</span></div>'+
'<div class="legend-row"><span class="lg-key">ruido blanco</span><span class="lg-desc">el zumbido de fondo de la red viva. Se oye cuando el calor sube.</span></div>'+
'<div class="legend-row"><span class="lg-key">superficializar</span><span class="lg-desc">volver a la superficie: salir de la red y cobrar.</span></div>'+
'<div class="legend-row"><span class="lg-key">ICE</span><span class="lg-desc">defensas de la red. Tres durezas: T1, T2 y T3.</span></div>'+
'<div class="legend-row"><span class="lg-key">daemon</span><span class="lg-desc">habitante de la red: no ataca por dinero, archiva. Combate de memoria.</span></div>'+
'<div class="legend-row"><span class="lg-key">vault</span><span class="lg-desc">archivo sellado con un proyecto corporativo dentro. Puzzle de símbolos.</span></div>'+
'<div class="legend-row"><span class="lg-key">subestación</span><span class="lg-desc">órgano de la red: da crédito y baja el calor (una vez).</span></div>'+
'<div class="legend-row"><span class="lg-key">fixer</span><span class="lg-desc">quien te consigue contratos (VEYRA, Inés Aro). Cobran por facilitar.</span></div>'+
'<div class="legend-row"><span class="lg-key">rastreador</span><span class="lg-desc">la policía de la red: emboscada si dejas mucho rastro.</span></div>'+
'<div class="legend-row"><span class="lg-key">créditos (₡)</span><span class="lg-desc">la moneda de la calle.</span></div>'+
'<div class="legend-row"><span class="lg-key">las Torres</span><span class="lg-desc">macroobras que se dejaron de construir en 2071. Nadie habla de por qué.</span></div>'+
'<div class="legend-row"><span class="lg-key">el Parpadeo</span><span class="lg-desc">2091: alguien apagó el Núcleo 11 segundos. La calle recuerda 3.</span></div>'+
'<div class="legend-row"><span class="lg-key">corporaciones y proyectos</span><span class="lg-desc">quién manda en la ciudad y qué esconde cada uno: todo en INFORMES, con su glosa en claro (▸).</span></div>'+
'</div>'+
'</div>'+

/* ⑱ MENSAJES */
'<div class="panel-h">⑱ MENSAJES · la bandeja del deck</div><div class="box helpbox">'+
'<p class="help-p">Los fixers y otros contactos te escriben <b>cartas</b> según lo que hagas (tu primer trabajo, un cobro, un fracaso…). A diferencia de la línea inferior, <b>aquí todo se queda</b>. <b>ENTRADA</b> reúne lo recibido y <b>ARCHIVO</b> el correo anterior: elige una fila y la carta se abre en el panel de lectura sin perder de vista la lista.</p>'+
'<div class="helprow">'+
'<div class="helprow-item"><span class="kbd">● punto magenta</span><span class="muted">carta sin leer en el menú MENSAJES</span></div>'+
'<div class="helprow-item"><span class="kbd">EMISOR</span><span class="muted">al pie de cada carta. Si dice <b>«sin respuesta»</b>, tu respuesta no llegará: quien escribió quemó su ruta para no exponerse. Es lo normal por aquí. En muy pocas cartas aparece el botón de <b>contestar de todas formas</b>: el envío vuelve… pero contestar a lo que no firma tiene su recompensa</span></div>'+
'</div>'+
'<div class="callout cyan">💡 Si tecleas <b>responder</b> en el terminal, el OS te lo dirá con otras palabras: casi ninguna ruta de vuelta sobrevive en la calle.</div>'+
'</div>';
