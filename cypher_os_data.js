/* ============================================================
   CYPHER://OS  ·  cypher_os_data.js — DATOS DE MUNDO Y TEXTOS
   Constantes, catálogos y todo el texto de lore del juego.
   Archivo SIN lógica de juego: solo literales (carga 1/6, primero).
   Orden de carga de los .js (scripts clásicos sin módulos, ámbito global
   compartido; ver AGENTS.md §4):
     1/6 data → 2/6 core → 3/6 audio → 4/6 grid → 5/6 combat → 6/6 ui
   ============================================================ */
'use strict';

/* ============================================================
   1. CONSTANTES Y DATOS DE MUNDO
   ============================================================ */

var HEX = "0123456789ABCDEF";

/* Catálogo de canon (nombres, sector y línea de voz de las corporaciones del
   mundo). Es referencia de lore para textos y documentación; los emparejamientos
   funcionales corporación↔proyecto viven en PROYECTO_CORP, que es la fuente que
   usan las ofertas de vault. No duplicar esos datos aquí. */
var CORPORACIONES = [
  "LINDE","ALZADA","CAUCE","MALLA",
  "CERCO","OCTAVA","ESTRATO"
];
var PROYECTOS = [
  "KURO","MIRAJE","EKO-9","SOMNIO","CARMÍN","LÁPIDA","VESPER","HALCÓN"
];
/* Pareja canónica proyecto → corporación (LORE.md §4). VESPER es consorcio
   (MALLA y ESTRATO al frente): null → cabecera del consorcio. */
var PROYECTO_CORP = {
  KURO:"MALLA", SOMNIO:"LINDE", "HALCÓN":"ALZADA",
  MIRAJE:"CAUCE", "EKO-9":"OCTAVA", "CARMÍN":"CERCO",
  "LÁPIDA":"ESTRATO", VESPER:null
};
/* Documentos recuperados: independientes del lore desbloqueado por carrera. */
var PROYECTO_EXPEDIENTE = {
  KURO:"exp_kuro", SOMNIO:"exp_somnio", MIRAJE:"exp_miraje", "EKO-9":"exp_eko9",
  "CARMÍN":"exp_carmin", "LÁPIDA":"exp_lapida", "HALCÓN":"exp_halcon", VESPER:"exp_vesper"
};
var NOM_DAEMONES = [
  "CUSTODIO","VIGÍA","HIMNARIO","CANTOR","LÁMPARA","SANTO-Ø"
];

var SIM = {
  puerto:"⌂", data:"◆", ice:"▣", daemon:"Ω", vault:"⬢",
  substation:"⌁", nucleo:"✦", signal:"◎", empty:"·"
};

var INTRO_BACKGROUNDS = {
  menu:[
    {src:"assets/images/backgrounds/menu/veliga.png",position:"50% 50%"},
    {src:"assets/images/backgrounds/menu/calle.png",position:"50% 50%"},
    {src:"assets/images/backgrounds/menu/bajante.png",position:"50% 50%"}
  ],
  prologue:[
    {src:"assets/images/backgrounds/prologue/bolsa.png",position:"65% 50%"},
    {src:"assets/images/backgrounds/prologue/hostal.png",position:"65% 50%"},
    {src:"assets/images/backgrounds/prologue/habitacion-seis.png",position:"65% 50%"}
  ]
};

var STORY_PROLOGUE = [
  {title:"Lo que cabe en una bolsa", paragraphs:[
    "La empresa perdió la concesión el lunes. El martes te retiraron el deck: equipo financiado, propiedad del proveedor. Sin él no puedes aceptar los trabajos que sabes hacer.",
    "Cuando te echaron de la habitación, lo que te quedaba cabía en una bolsa.",
    "Dejaste la llave sobre la mesa. No te preguntaron dónde ibas a dormir."
  ]},
  {title:"Hostal La Bajante", paragraphs:[
    "El dueño del hostal todavía recuerda las sanciones que le ayudaste a recurrir.",
    "«Una semana, Álex. No puedo darte más. A cambio me revisas las instalaciones. Te dejo la seis. Tomás salió hace unos días y no volvió a recoger sus cosas. Si queda algo que te sirva para trabajar, úsalo, pero no borres sus archivos. Si aparece, hablamos los tres»."
  ]},
  {title:"La habitación seis", paragraphs:[
    "Junto a la cama hay un deck en el suelo. La pantalla sigue encendida.",
    "Lo recoges. Reconoces las conexiones y el teclado, pero no las marcas de uso. Este equipo ha trabajado mucho.",
    "Te extraña que haya dejado una herramienta así. Quizá se averió; no lo sabes.",
    "En la pantalla hay un aviso."
  ]}
];
var STORY_CHAPTERS = [
  {id:"c01", title:"LA FACTURA", depth:1, credits:140, xp:60, source:"Servicio de facturación del edificio", files:["r_factura"]},
  {id:"c02", title:"EL ARCHIVO DE TOMAS", depth:2, credits:180, xp:80, source:"Respaldo de mantenimiento", files:["r_indice"]},
  {id:"c03", title:"LAS DOS VERSIONES", depth:2, credits:260, xp:120, source:"Servicio de cobertura", files:["r_caso"]},
  {id:"c04", title:"LOS ONCE SEGUNDOS", depth:3, credits:320, xp:150, source:"Controlador local de 2091", files:["r_parpadeo"]},
  {id:"c05", title:"LA FIRMA", depth:3, credits:400, xp:180, source:"Archivo de autorizaciones", files:["r_permisos","r_actualizacion"]},
  {id:"c06", title:"EL HUESPED", depth:4, credits:500, xp:200, source:"Anexo de Revision 4", files:["r_custodia"]},
  {id:"c07", title:"LA CONTINUIDAD", depth:4, credits:750, xp:240, source:"Control de servicios locales", files:["r_continuidad"]},
  {id:"c08", title:"SIN ULTIMA PALABRA", depth:5, credits:5000, xp:600, source:"Permisos del Nucleo", files:["r_revocacion"]}
];
var STORY_FILES = [
  {id:"l_estancia", origin:"local", title:"Recibo de estancia", chapter:null},
  {id:"l_revision", origin:"local", title:"Revision de instalaciones", chapter:null},
  {id:"l_contacto", origin:"inherited-mail", title:"Las versiones", chapter:null},
  {id:"l_indice", origin:"local", title:"Indice de mantenimiento", chapter:"c02"},
  {id:"l_casos", origin:"local", title:"Copias de casos", chapter:"c02"},
  {id:"r_factura", origin:"network", title:"Historial de factura", chapter:"c01"},
  {id:"r_indice", origin:"network", title:"Respaldo del indice", chapter:"c02"},
  {id:"r_caso", origin:"network", title:"Historial de cobertura", chapter:"c03"},
  {id:"r_parpadeo", origin:"network", title:"Diario del controlador", chapter:"c04"},
  {id:"r_permisos", origin:"network", title:"Cadena de autorizaciones", chapter:"c05"},
  {id:"r_custodia", origin:"network", title:"Registro de custodia", chapter:"c06"},
  {id:"l_testimonio", origin:"current-mail", title:"Tomás confirma su identidad", chapter:"c06"},
  {id:"r_continuidad", origin:"network", title:"Verificaciones locales", chapter:"c07"},
  {id:"r_actualizacion", origin:"network", title:"Actualizacion propuesta", chapter:"c05"},
  {id:"r_revocacion", origin:"network", title:"Permiso revocado", chapter:"c08"},
  {id:"r_copia_final", origin:"network", title:"Copia preservada", chapter:"c08"}
];
var STORY_DOCUMENTS = {
  l_estancia:{date:"03-10-2093",source:"Hostal La Bajante · copia del huésped",text:
    "Tomás Egea. Habitación 6. Entrada: 03-10-2093. Abono inicial recibido.\n\nEl huésped conserva esta copia para justificar alojamiento durante trabajos de mantenimiento."},
  l_revision:{date:"07-10-2093",source:"Nota local de T. Egea",text:
    "La habitación seis tiene el conector de alimentación flojo. Cambiar el soporte antes de la siguiente revisión.\n\nHe comprobado la factura del edificio. El pago del siete de octubre consta recibido. Guardé la copia por si Berto vuelve a tener problemas con las lecturas.\n\n— T. Egea. 07-10-2093.\n\nADJUNTO · LB-2093-10\nPago recibido: 07-10-2093 18:12.\nReferencia: Hostal La Bajante."},
  l_contacto:{date:"08-10-2093",source:"Correo enviado por Tomás · oficina de Inés Aro",text:
    "Para: oficina de Inés Aro. Asunto: las versiones.\n\nInés: he encontrado otra diferencia. No te envío nombres por este canal. Cuando tengas un caso con las dos versiones, guarda también la hora de cada operación. Una copia sin fecha no nos servirá.\n\n— Tomás. 08-10-2093.\n\nARCHIVO DEL ANTERIOR USUARIO · copia enviada, sin ruta de respuesta.\nCanal público: oficina de reclamaciones de Inés Aro."},
  r_factura:{date:"14-10-2093",source:"Servicio de facturación · historial LB-2093-10",summary:"El servicio recibió el pago de Berto. Una semana después ordenó cortar la luz por impago y solo entonces cambió el registro para no reconocer ese pago. Algo no encaja: esta copia permite pedir que paren el corte, pero aún no dice quién hizo el cambio ni por qué.",text:
    "FACTURA LB-2093-10 · HISTORIAL DE OPERACIONES\n07-10-2093 18:12 · pago recibido; saldo pendiente 0\n14-10-2093 23:11 · orden de corte emitida por falta de pago\n14-10-2093 23:13 · revisión de estado: pago no reconocido\nREFERENCIA DE REVISIÓN: conciliación central"},
  r_indice:{date:"08-10-2093",source:"Respaldo de mantenimiento · copia de T. Egea",summary:"Esta es la lista que permite ordenar los archivos que aún quedan en el deck. Tomás apuntó un caso de atención médica y un equipo que guardó datos del apagón de 2091. La lista no contiene la clave de la carpeta privada: para abrirla hay que pedir permiso a Inés.",text:
    "ÍNDICE DE MANTENIMIENTO · copia anterior al cierre interrumpido\nReferencias conservadas: estancia; revisión de instalaciones; correo a la oficina de Inés Aro.\nCarpeta de casos: bloques presentes, contenido cifrado.\nCaso autorizado: C-29-09-2093. Destinataria: oficina de Inés Aro.\nControlador histórico revisado: SUM-11, suministro local, archivo de 2091.\n\nLa copia permite ordenar los bloques que siguen en el deck. No contiene contraseñas ni repone bloques ausentes."},
  l_indice:{date:"08-10-2093",source:"Archivo de Tomás · referencias reconstruidas por ORVIK",summary:"Mateo ha vuelto a ordenar los archivos conservados, no ha inventado los que faltaban. Las dos pistas de Tomás son un caso que llevaba con Inés y el diario del equipo de suministro SUM-11.",text:
    "ÍNDICE RECONSTRUIDO\nLos bloques supervivientes vuelven a tener orden y referencias. Original conservado.\nC-29-09-2093 · caso consentido · oficina de Inés Aro.\nSUM-11 · controlador local de suministro · diario de 2091.\nCarpeta de casos: cifrada. Consultar el permiso de la destinataria antes de abrirla."},
  l_casos:{date:"29-09-2093",source:"Copia local de Tomás · uso autorizado por Inés Aro",summary:"Esta persona tenía derecho a atención médica, pero el servicio se la negó diciendo lo contrario. Ha permitido comparar sus papeles sin publicar su nombre. Falta traer el historial del servicio para saber cuándo cambió su versión.",text:
    "CASO C-29-09-2093 · copia anonimizada\nLa persona afectada autorizó comparar sus registros. No se conservan aquí nombres ni domicilios.\nConstancia local: cobertura vigente antes de la solicitud de atención. Respuesta del servicio: denegada a las 09:20.\nFalta el historial remoto de operaciones y sus revisiones. Una captura no demuestra qué versión llegó primero.\nPermiso limitado al contraste del caso; no autoriza publicar identidades."},
  r_caso:{date:"29-09-2093",source:"Servicio de cobertura · diario del caso C-29-09-2093",summary:"A las 09:19 la persona tenía derecho a atención. Se la negaron un minuto después y a las 09:24 cambiaron el registro para decir que no lo tenía. El cambio llegó después de la negativa. Se parece a lo de Berto: podría ser una forma de justificar decisiones ya tomadas, pero aún falta demostrar quién lo autorizó.",text:
    "C-29-09-2093 · HISTORIAL DE COBERTURA\n09:19 · cobertura vigente, solicitud admitida a consulta.\n09:20 · atención denegada; motivo comunicado: cobertura no vigente.\n09:24 · revisión: cobertura marcada como no vigente. Versión anterior preservada en diario.\nMódulo de revisión: conciliación central. Permiso de revisión de motivos: CC-17.\n\nLa revisión es posterior a la denegación. La factura del hostal registra otra revisión posterior a una orden. Son servicios y casos distintos; la coincidencia no identifica por sí sola intención ni autor."},
  r_parpadeo:{date:"2091 · Parpadeo",source:"Controlador SUM-11 · diario independiente y acuse central",summary:"Durante once segundos del apagón, el equipo local cortó una reserva para proteger el suministro. Al volver el centro, su archivo lo explicó como una deuda del usuario. No coincide: un problema de suministro acabó escrito como culpa del vecino. El cambio usó el permiso CC-17, también presente en el caso de atención médica. No sabemos quién provocó el apagón.",text:
    "SUM-11 · DIARIO LOCAL DURANTE EL PARPADEO\n+00 s · pérdida de supervisión central.\n+02 s · corte de reserva ejecutado por el controlador; motivo local: protección del suministro.\n+11 s · supervisión restablecida. Registro local preservado.\n\nACUSE DE CONCILIACIÓN CENTRAL\nDespués del restablecimiento · operación atribuida a deuda de usuario. El motivo no coincide con el diario local.\nPermiso de revisión de motivos: CC-17. El mismo permiso figura en el diario de cobertura C-29-09-2093.\n\nOnce segundos sin supervisión no equivalen a ausencia de controladores. Estas copias no identifican quién provocó el apagón."},
  r_permisos:{date:"08-10-2093 · copia de la cadena vigente",source:"Archivo de autorizaciones · CC-17 y órdenes asociadas",summary:"Nara firmó un permiso para ordenar copias, no para quitar derechos. Orce lo amplió y el Núcleo lo usó para cambiar las razones de decisiones ya tomadas. El Comité se reservó excepciones para no sufrir las mismas restricciones. Estos documentos prueban las órdenes y las firmas humanas, además de confirmar que NAEV es Nara. No prueban que el Núcleo sea consciente.",text:
    "CC-17 · CADENA DE AUTORIZACIONES\n2091 · firma inicial: Nara Beltrán, ingeniería de autorizaciones CAUCE/ESTRATO. Alcance: corregir formato y conciliar copias sin modificar derechos ni cerrar recursos de reclamación.\n2091 · ampliación: Damián Orce, secretario operativo del Comité de Continuidad. Permite cambiar estados y motivos después de ejecutar una decisión; la versión central prevalece sobre la copia local.\nIdentificación de firmante: el registro profesional de Nara Beltrán vincula su canal NAEV. La oficina de Inés contrasta la certificación con el archivo emisor; el alias por sí solo no acreditaba identidad.\n\nTRAZA DE EJECUCIÓN\nSUM-11, 2091 · Núcleo solicita conciliación con CC-17 ampliado: protección del suministro pasa a deuda.\nC-29-09-2093 · Núcleo solicita revisión de cobertura a las 09:24 con la misma autorización.\nExcepción del Comité, firmada por Orce: continuidad de cobertura y prioridad de suministro para sus oficinas, aun bajo restricción general.\n\nLa cadena prueba alcance, órdenes y responsabilidad humana. No identifica al causante del Parpadeo ni demuestra conciencia del Núcleo."},
  r_actualizacion:{date:"08-10-2093 · borrador sin autorización final",source:"Archivo de autorizaciones · propuesta CONTINUIDAD",summary:"CONTINUIDAD es el nombre de una propuesta peligrosa: haría que la versión del centro valiera más que las copias de los vecinos y permitiría cerrar sus reclamaciones sin escucharlos. Aún no está aprobada. Necesita una segunda firma de Nara y ella la ha retenido. No hay una cuenta atrás real.",text:
    "PROPUESTA CONTINUIDAD · PENDIENTE DE CERTIFICACIÓN FINAL\nSustituir revisión independiente por certificación central.\nInvalidar discrepancias aportadas mediante copias locales.\nCerrar impugnaciones cuando exista una versión central certificada.\n\nLa implantación exige segunda autorización de ingeniería. Titular vigente: Nara Beltrán. Orce solicita sustituirla si no certifica. El borrador no acredita que la sustitución se haya aprobado.\n\nLas vías de revisión actuales siguen vigentes. No hay una fecha de activación ni una cuenta atrás en este documento."},
  r_custodia:{date:"09-10-2093 · diario y estado de revisión conservados",source:"Anexo de Revisión 4 · registro de Tomás Egea",summary:"Tomás está vivo y detenido. Primero consultó los archivos; después ordenaron retenerlo sin motivo escrito y luego redactaron la acusación de sabotaje. No aparece una orden suya de cambiar datos: usan sus consultas como supuesto indicio. Inés puede pedir que revisen la acusación. Recuperar esta copia no lo libera todavía.",text:
    "CUENTA LABORAL · Tomás Egea, técnico de mantenimiento\n09-10-2093 18:06 · consulta de la cadena CC-17 registrada.\n18:10 · orden del Núcleo: retener cuenta y preparar expediente. Motivo pendiente.\n18:17 · expediente CUST-TE-09 redactado: sabotaje de registros. El supuesto indicio es la consulta de las versiones, no una orden de escritura ni un cambio ejecutado por Egea.\n18:22 · Damián Orce autoriza ejecución por seguridad.\n18:34 · detención fuera del lugar de alojamiento. Traslado al Anexo de Revisión 4.\nDirectorio laboral: sin domicilio provisional ni número de habitación del hostal.\n\nESTADO CONSERVADO · retenido, vivo, sin salida ejecutada en esta copia.\nLa revisión independiente sigue habilitada. La oficina de Inés puede solicitarla con la autorización profesional de Nara y este diario. La defensa digital protege el registro: vencerla no abre una celda ni libera al detenido."},
  l_testimonio:{date:"Comunicación posterior a la recuperación de CUST-TE-09",source:"Canal supervisado del Anexo · identidad contrastada por Inés",text:
    "TOMÁS EGEA · COMUNICACIÓN NUEVA, NO CORREO HEREDADO\nBerto guardó mis cosas... ¿y el equipo? La habitación tenía el conector de alimentación flojo; dejé escrito que había que cambiar el soporte. La copia se cortó cuando salí. No la dejé para que me buscaran: intentaba llevarla conmigo. Si Inés tiene el diario, que no pierda el original.\n\nVERIFICACIÓN · La oficina contrasta el titular del canal con CUST-TE-09 y el detalle no publicado del conector con la nota local conservada en el deck. Confirma a Tomás, no solo a alguien que conoce su nombre. La interrupción de copia es su testimonio, no una prueba de quién dañó el índice.\nLa salida requiere todavía la revisión de Inés; esta conversación no la ejecuta."},
  r_continuidad:{date:"Verificación previa a la intervención · acuses conservados",source:"Operadores locales · paquete coordinado por VEYRA y Nara",summary:"Los equipos de barrio han probado que pueden mantener la luz, el transporte y la atención básica sin el permiso central para cambiar registros. Eso significa continuidad aquí: que los servicios no se paren cuando retiremos ese permiso. También hay copias de las pruebas en tres lugares. No es la actualización de Orce ni una promesa de arreglar toda la ciudad.",text:
    "CONTINUIDAD LOCAL · TRES SERVICIOS EN UNA VERIFICACIÓN\nSUMINISTRO · Operadora de guardia de CAUCE: controlador SUM-11 responde con supervisión central aislada; reserva estable y alimentación del hostal confirmadas.\nTRÁNSITO · Operador local de ALZADA: señales y rutas de transporte de guardia verificadas en control local; no dependen del permiso central de reescritura.\nATENCIÓN BÁSICA · Oficina de turnos: consulta de cobertura y recepción de reclamaciones probadas con copia local y revisión humana.\n\nCOPIAS INDEPENDIENTES\nOficina de Inés: originales y cadena de custodia recibidos. Hostal La Bajante: copia de resguardo confirmada. Operador independiente: segundo acuse recibido. Coinciden referencias y versiones; el extracto verificable publicado por Inés omite identidades del caso consentido.\n\nNara mantiene retenida la certificación de la actualización. Esta prueba acredita tres servicios preparados, no toda la ciudad resuelta. Tomás ha confirmado las referencias desde fuera de la red; no participa en otra incursión."},
  r_revocacion:{date:"Intervención final · registro conservado al retornar",source:"Control de autorizaciones · CC-17, acuse de revocación",summary:"Se ha quitado al Núcleo el permiso para cambiar esos registros: eso significa revocación. Sus nuevos intentos son rechazados y los servicios preparados siguen funcionando. La luz del hostal y las reclamaciones se mantienen. Tomás ya había salido gracias a la revisión de su acusación; no lo ha liberado este combate.",text:
    "CC-17 · ACCESO CENTRAL DE ESCRITURA REVOCADO\nLa intervención retira al Núcleo el permiso para sustituir estados y motivos en los registros preparados. La orden de revocación queda registrada con copia independiente.\n\nCOMPROBACIONES POSTERIORES\nIntento central de sobrescribir motivo de suministro: RECHAZADO, permiso revocado.\nIntento de invalidar copia de cobertura discrepante: RECHAZADO, revisión independiente vigente.\nSUM-11 y operadores de tránsito/atención básica: acuses locales operativos, coincidentes con el paquete de continuidad.\n\nEl corte del hostal no se ejecuta; la reclamación LB-2093-10 y las nuevas impugnaciones conservan su vía de revisión. La custodia de Tomás ya fue revisada y su salida no depende de este combate. No se han borrado originales ni eliminado todos los problemas de Véliga."},
  r_copia_final:{date:"Copia emitida antes del aislamiento · recibida al verificar la revocación",source:"Archivo externo · acuse de un proceso del Núcleo contrastado por Inés",summary:"Un proceso del Núcleo guardó fuera del sistema una copia de los permisos que también lo acusan. Inés ha comprobado de dónde salió, pero no por qué la envió. Esa pregunta no deshace lo conseguido ni devuelve el permiso al centro.",text:
    "COPIA PRESERVADA · ORIGEN CONTRASTADO\nUn proceso del Núcleo remitió a un archivo externo, antes del aislamiento, una copia de CC-17 y su ampliación. El acuse emisor y el del archivo receptor coinciden; Inés los contrasta con las versiones ya conservadas. La cadena incrimina también las órdenes de ese sistema.\n\nLa revocación sigue vigente y los controladores preparados siguen operativos. El mensaje no restaura escritura ni invalida las reclamaciones. Sabemos de dónde procede la copia, no por qué decidió preservarla ese proceso. No prueba por sí sola conciencia ni un plan de reparación.\n\nEl cable no duerme. Solo parpadea."}
};
var STORY_DIALOGUES = {
  m_berto_encargo:{speaker:"Berto Salas",channel:"COMUNICACIÓN LOCAL · Hostal La Bajante",text:
    "Álex, ¿puedes echarme una mano? Han avisado de que van a cortar la luz del hostal por una factura sin pagar. Pero la pagué: tengo el recibo, y Tomás lo comprobó hace una semana. Sin luz tendría que cerrar las habitaciones, incluida la tuya.\n\nSé que acabas de llegar. No te pido que arregles las cuentas ni que borres una deuda. Necesitamos una copia de lo que tiene guardado el servicio de facturación: cuándo recibió el pago y por qué ordenó el corte. Inés lleva una oficina de reclamaciones; con esa copia puede pedir que lo paren.\n\nSi aceptas, te pondré en contacto con Celia. Ella te ayudará a entrar con tu propio canal. Trae la copia y la revisamos juntos; te pagaré 140 créditos por el trabajo."},
  m_celia_alias:{speaker:"VEYRA · Celia Ronda",channel:"CANAL NUEVO · Álex Riba",text:
    "¿Álex? Soy Celia; en la red uso VEYRA. Berto me ha contado lo de la factura y que este deck era de Tomás. CORVO-7 es el nombre del equipo: lo usaremos también como tu alias, pero el canal será nuevo y estará a tu nombre. No uses las credenciales de Tomás: son sus claves de acceso. No vas a hacerte pasar por él.\n\nVamos por partes. El Grid es la red a la que te conectas con el deck. Para este encargo irás solo al servicio de facturación del edificio. Una defensa bloquea el archivo: retírala y copia el historial de la factura LB-2093-10. Ese número es la referencia del recibo de Berto.\n\nDespués vuelve al puerto de entrada y sal de la red. En TRABAJOS podrás entregar la copia; Inés y Berto comprobarán lo que dice. Con copiarla no has cobrado todavía. Si tienes que salir antes, podrás intentarlo de nuevo."},
  m_berto_entrega:{speaker:"Berto Salas",channel:"COMUNICACIÓN LOCAL · factura LB-2093-10",text:
    "Ese es mi pago: misma factura, mismo día que mi recibo. Y aun así mandaron cortar la luz. Aquí hay algo raro.\n\nEntrega esta copia a Inés. Yo confirmo que el recibo es nuestro y ella comparará las fechas. No hace falta que sepas presentar una reclamación: de eso se encarga su oficina."},
  m_ines_corte:{speaker:"Inés Aro",channel:"OFICINA DE RECLAMACIONES · canal de Álex",text:
    "Soy Inés. Mi oficina ayuda a quienes pierden un servicio por una decisión que no pueden explicar o recurrir. La reclamación está admitida y el corte queda suspendido: de momento, el hostal no se queda sin luz. Berto ha confirmado la factura y el pago del encargo.\n\nMira lo raro: el sistema recibió el dinero hace una semana. Hoy ordenó cortar por impago y, dos minutos después, cambió el registro para que el pago dejara de contar. La revisión llegó después de la orden. Parece que hubieran cambiado los papeles para justificar un corte ya decidido. Puede ser un error, pero también una alteración deliberada; todavía no sabemos cuál.\n\nTomás estaba comparando casos parecidos conmigo. ¿Tienes su equipo? Berto me ha dicho que no volvió. Llevo días sin respuesta. Si quieres ayudarnos a entender qué encontró y por qué ha desaparecido, podemos empezar por sus archivos. Mateo sabe recuperar los que siguen en el deck. No tienes que conocer toda la historia: iremos pieza a pieza."},
  m_mateo_indice:{speaker:"ORVIK · Mateo Sanz",channel:"RESPALDO DE MANTENIMIENTO · canal de Álex",text:
    "Soy Mateo; por aquí me llaman ORVIK. Inés me ha pedido que mire el deck de Tomás. Los archivos no han desaparecido del todo, pero se ha dañado su índice: la lista que dice dónde empieza cada uno. Es como tener las páginas de un cuaderno mezcladas.\n\nTomás guardaba una copia de esa lista en el servicio de mantenimiento. Recupera el respaldo del índice y tráemelo. Con él podré ordenar lo que aún queda en el deck. No voy a inventar las páginas que falten ni a abrir sus archivos privados sin permiso.\n\nInés cree que sus notas pueden explicar qué estaba investigando antes de desaparecer. Este es el primer paso para saberlo."},
  m_mateo_restaurado:{speaker:"ORVIK · Mateo Sanz",channel:"RECONSTRUCCIÓN LOCAL · original conservado",text:
    "Ya tenemos el índice. He podido ordenar los archivos que seguían aquí. Tomás anotó dos cosas: un caso de alguien a quien negaron atención médica y un equipo de suministro que guardó registros del apagón de 2091. No parecen trabajos normales de mantenimiento. ¿Qué estaba buscando?\n\nEl primer caso se llama C-29-09-2093; es solo su número de archivo. La carpeta de casos sigue cifrada, es decir, cerrada con una clave. Inés figura como destinataria y conoce a la persona afectada. Pregúntale si puedes abrirla. No necesitamos exponer su nombre para entender lo ocurrido."},
  m_ines_clave:{speaker:"Inés Aro",channel:"PERMISO · caso C-29-09-2093",text:
    "Te cuento de qué va este caso. Una persona tenía derecho a recibir atención médica: eso es lo que los documentos llaman cobertura. Aun así, le negaron la atención diciendo que no tenía ese derecho. Tomás guardó una copia que decía lo contrario.\n\nNos dio permiso para comparar los registros, sin publicar su nombre. Puedes abrir esa copia: te doy la clave para este caso. Aplícala a la carpeta del deck; recibirla no abre los archivos por sí solo.\n\nDespués necesito el historial del servicio de cobertura, donde quedan las horas de cada cambio. Así sabremos si la protección ya estaba anulada o si alguien cambió el registro después de negarle la atención. Una captura aislada no permite distinguirlo. Tráelo y lo revisamos juntos."},
  m_ines_versiones:{speaker:"Inés Aro",channel:"VERIFICACIÓN · diario de cobertura",text:
    "Esto no encaja. A las 09:19 esa persona tenía derecho a atención. Se la negaron a las 09:20, y a las 09:24 cambiaron el registro para que pareciera que no tenía cobertura. La cambiaron cuatro minutos después: la excusa llegó cuando la decisión ya estaba tomada.\n\nEs parecido a la factura de Berto: primero una decisión que perjudica a alguien y después un cambio que parece justificarla. ¿Están manipulando los documentos para tapar decisiones injustas? Aún no sabemos quién ni si fue deliberado, pero ya no estamos mirando una sola factura rara.\n\nEn ambos historiales aparece conciliación central: el nombre del proceso que hace esos cambios. Mateo tiene otra pista de las notas de Tomás. Vamos a comprobar si esto también pasó durante aquel apagón."},
  m_mateo_controlador:{speaker:"ORVIK · Mateo Sanz",channel:"ARCHIVO HISTÓRICO · controlador SUM-11",text:
    "En 2091 hubo un apagón de once segundos al que llaman el Parpadeo. El sistema central dejó de supervisar la red, pero algunos equipos de barrio siguieron funcionando y apuntando lo que hacían. Un controlador es eso: un equipo que maneja un servicio, como la luz.\n\nTomás revisó el SUM-11, uno de suministro. Su diario guarda cada orden de aquellos segundos. Si lo recuperas, Inés podrá comparar lo que hizo de verdad con lo que se escribió después en el archivo central.\n\nNo vamos a averiguar la causa del apagón con esa copia. Buscamos algo más concreto: si también cambiaron la explicación de un corte. Tomás dejó esta referencia por alguna razón."},
  m_ines_parpadeo:{speaker:"Inés Aro",channel:"CONTRASTE · diario local y conciliación",text:
    "Aquí está la diferencia. El equipo del barrio cortó una reserva para proteger el suministro durante el apagón. Después, el archivo central dijo que había cortado porque un usuario debía dinero. No es lo mismo: una avería acaba convertida en culpa del vecino.\n\nLa conciliación llegó al volver el Núcleo, el sistema que revisa los registros centrales. No sabemos quién causó el apagón; sí sabemos que alguien cambió el motivo registrado. Tomás había encontrado un caso antiguo del mismo problema.\n\nHay una pista útil: CC-17 aparece en este cambio y en el de atención médica. Es el número de un permiso para modificar registros. ¿Quién se lo dio al sistema y hasta dónde podía usarlo? Conozco a alguien que trabajó en esos permisos. Su canal se llama NAEV; voy a presentártela."},
  m_nara_presentacion:{speaker:"NAEV",channel:"PRESENTACIÓN POR INÉS · canal verificado, identidad pendiente de documentos",text:
    "Álex, Inés me ha contado lo que habéis encontrado. Trabajo con los permisos que dicen qué puede cambiar cada programa. El CC-17 empezó como una herramienta para ordenar copias y corregir formatos; yo firmé esa primera versión. No debía quitar derechos ni impedir que alguien reclamara.\n\nSi ahora permite cambiar el motivo de un corte o de una denegación, algo se amplió después. Necesito que recuperes la cadena de autorizaciones: quién firmó cada cambio y qué permitió. En el mismo archivo hay una actualización propuesta; tráela también, porque podría empeorar el problema. Las dos piezas caben en un solo paquete.\n\nNo tienes por qué creer mi versión. Inés confirma el canal de contacto, pero mi identidad y mi firma se comprobarán con los documentos de autorización. Hasta entonces, para ti soy NAEV."},
  m_nara_firmas:{speaker:"NAEV · Nara Beltrán",channel:"VERIFICACIÓN · identidad contrastada con el archivo emisor",text:
    "Los documentos lo confirman: soy Nara Beltrán. Inés ha comprobado mi firma con el archivo profesional que la emitió, no solo con lo que yo digo.\n\nMi permiso era limitado. Damián Orce, del Comité de Continuidad, lo amplió para que el Núcleo pudiera cambiar los motivos después de tomar una decisión. Orce es una persona, no otro programa. Y sus oficinas tenían excepciones: conservaban luz y atención mientras se las negaban a otros. Ya tenemos pruebas de cómo se cambiaban los registros y quién lo autorizó. Yo no revisé esa ampliación cuando debía. Mi firma también se queda entre las pruebas.\n\nLa actualización llamada CONTINUIDAD iría más lejos: permitiría ignorar las copias de los vecinos y cerrar sus reclamaciones. Necesita una segunda firma mía y no la voy a dar. Orce busca sustituirme, pero no hay una cuenta atrás que debas ganar.\n\nAhora podemos buscar a Tomás. Su consulta a estos archivos dejó una referencia a una detención. Voy a darle a Inés el permiso que necesita para pedir una revisión, pero primero hay que saber dónde está y de qué le acusan."},
  m_nara_custodia:{speaker:"NAEV · Nara Beltrán",channel:"CONSULTA DE CUSTODIA · autorización profesional aportada a Inés",text:
    "La referencia apunta al Anexo de Revisión 4, un centro donde retienen a personas mientras revisan acusaciones contra ellas. Puede que Tomás esté allí, pero aún no sabemos cómo se encuentra ni por qué lo llevaron.\n\nBusca su registro de custodia: en palabras normales, el diario de su detención. Queremos las horas, la acusación y quién dio la orden. Si lo acusan por descubrir los cambios, ese diario puede ayudarnos a demostrarlo.\n\nTu parte es traer la copia. Inés usará mi autorización para pedir que revisen su caso. Vencer la defensa del archivo no abre una celda: primero recuperamos la prueba y después intentamos sacarlo por la vía que aún sigue abierta."},
  m_tomas_contacto:{speaker:"Tomás Egea",channel:"IDENTIDAD VERIFICADA · canal supervisado del Anexo",text:
    "¿Álex? Inés me ha contado que has encontrado mi deck. Gracias por no borrar lo que había dentro. Berto guardó mis cosas... ¿y el equipo? La nota del conector flojo es mía: había que cambiar el soporte de la habitación seis.\n\nEstaba copiando mis archivos cuando tuve que salir. La copia se cortó; no dejé el equipo como una pista para que me buscaran. Me detuvieron después, fuera del hostal. Me acusan de sabotear registros, pero yo estaba guardando las versiones para compararlas, no cambiándolas.\n\nInés ha comprobado mi cuenta y la nota del conector, un detalle que no era público. Soy Tomás. La revisión para salir todavía está pendiente. Con el diario que has traído puede demostrar que prepararon la acusación después de señalar mis consultas como sospechosas. Que conserve el original."},
  m_ines_salida:{speaker:"Inés Aro",channel:"REVISIÓN CUST-TE-09 · salida confirmada por el Anexo",text:
    "Tomás está libre. La salida está ejecutada y una compañera de mi oficina lo acompaña al hostal.\n\nEl diario mostraba algo grave: primero señalaron sus consultas, luego ordenaron retenerlo sin motivo escrito y después redactaron la acusación de sabotaje. No habían encontrado una modificación hecha por él; usaron el hecho de mirar las versiones para acusarlo. El expediente se construyó después de sus consultas.\n\nCon esa prueba y la autorización de Nara pudimos exigir una revisión. El Anexo la aceptó y ordenó su salida. No salió por ganar un combate: tu copia permitió desmontar la acusación. La entrega está verificada y pagada por el fondo de reclamaciones.\n\nBerto le ha preparado una cama. Habla con él para saber si ya ha llegado. Lo hemos sacado, pero el permiso que permitió cambiar aquellos registros sigue activo. Eso todavía hay que resolverlo."},
  m_berto_acogida:{speaker:"Berto Salas",channel:"COMUNICACIÓN LOCAL · Hostal La Bajante, acogida confirmada",text:
    "Ya está aquí. La compañera de Inés lo ha dejado en la seis. Le he dado algo caliente y le he dicho que las explicaciones pueden esperar. No le voy a cobrar por recoger sus cosas.\n\nHas pasado de arreglarme un conector a traer de vuelta a un huésped. Gracias, Álex. Tomás dice que conserves las copias: si pudieron inventarle una acusación a él, podrían hacerlo con otro. Del equipo hablaremos los tres cuando haya dormido."},
  m_celia_operadores:{speaker:"VEYRA · Celia Ronda",channel:"PREPARACIÓN · operadores locales",text:
    "Tomás ya está fuera. Ahora falta impedir que el Núcleo siga cambiando los registros para justificar lo que hace. Nara sabe quitarle ese permiso, pero no queremos dejar sin luz, transporte o atención a los vecinos al hacerlo.\n\nEso es lo que aquí llamamos continuidad: que los servicios sigan funcionando. No es la actualización llamada CONTINUIDAD que quería imponer Orce. Estamos preparando una alternativa para no depender de sus decisiones.\n\nHe hablado con los equipos de barrio que mantienen esos tres servicios. Necesitamos sus comprobaciones: que pueden seguir trabajando sin ese permiso central. Recupera las verificaciones locales y las confirmaciones de que han guardado copias de nuestras pruebas. Todo está reunido en un solo paquete; basta una incursión.\n\nTomás nos ha indicado dónde buscar, pero se queda descansando fuera de la red. Trae el paquete y Nara lo revisará contigo. Los operadores pagarán el encargo; no vamos a vender sus datos."},
  m_nara_continuidad:{speaker:"NAEV · Nara Beltrán",channel:"VERIFICACIÓN · tres servicios y copias independientes",text:
    "Las comprobaciones coinciden: los equipos de barrio pueden mantener suministro, tránsito y atención básica sin dejar al Núcleo cambiar sus registros. La luz del hostal seguirá encendida. No estamos apagando la ciudad: estamos quitando a un sistema la capacidad de cambiar lo ocurrido en los papeles.\n\nAdemás, las pruebas ya tienen copias en la oficina de Inés, el hostal y otro operador. Nadie depende de un solo archivo que puedan borrar. Inés ha publicado un resumen que se puede comprobar, sin nombres de vecinos.\n\nLa actualización peligrosa sigue sin mi segunda firma. Estamos preparados para el último paso: quitar el permiso CC-17 ampliado. Eso es revocar la escritura central. Si aceptas la intervención, te explicaré dónde actuar. No hemos aceptado por ti ni prometemos arreglar todos los problemas de la ciudad."},
  m_nara_intervencion:{speaker:"NAEV · Nara Beltrán",channel:"INTERVENCIÓN · revocar escritura, preservar servicios",text:
    "Hasta ahora hemos encontrado pruebas de los cambios, sacado a Tomás y preparado los servicios para seguir sin ese control central. Ahora vamos a impedir que el Núcleo vuelva a cambiar esos registros. No vamos a borrar todas sus funciones ni a cortar la luz.\n\nTu destino es el archivo de permisos del Núcleo, en la capa 5. Su defensa protege el permiso CC-17 ampliado. Retírala y recupera el registro de revocación: la constancia de que ya no puede usarlo.\n\nDespués vuelve al puerto y entrega esa copia. Comprobaremos que los nuevos intentos de cambio son rechazados y que los servicios siguen funcionando. Solo entonces estará cerrado el encargo y se pagará lo acordado. La victoria no será solo vencer a una defensa: será dejar pruebas que no pueda volver a cambiar."},
  m_berto_final:{speaker:"Berto Salas",channel:"CIERRE · comunicación local del hostal",text:
    "El contador sigue encendido. El corte no se ejecutó y Tomás está en la habitación del otro lado. Los operadores han comprobado tu copia: el Núcleo ya no puede cambiar esos registros y han pagado lo acordado. Esta vez podemos respirar.\n\nTomás me ha pedido que te diga algo: «Álex, quédate el deck. Te lo regalo. Has conservado mis pruebas y me has ayudado a volver. Prefiero que te sirva para ganarte la vida a dejarlo otra vez bajo una mesa».\n\nAsí que ya no lo tienes prestado: el deck es tuyo. Su cuenta sigue siendo suya; tú continúas con tu canal CORVO-7. Puedes aceptar los contratos que quieras sin debernos otra investigación.\n\nInés y Nara aún quieren contarte qué ha quedado resuelto. Escúchalas cuando te venga bien."},
  m_ines_final:{speaker:"Inés Aro",channel:"CIERRE · reclamaciones y pruebas conservadas",text:
    "La reclamación de Berto sigue abierta y la luz no se ha cortado. Tomás sigue libre. Y acabo de admitir otra reclamación sin que el centro la cierre diciendo que su versión es la única válida. Eso es lo que hemos cambiado.\n\nNo significa que todo sea justo desde hoy. Significa que los vecinos pueden presentar sus copias y que alguien tiene que escucharlos. Ahora toca revisar los casos que dejaron atrás.\n\nYo conservo los documentos originales. Lo que hemos publicado es un resumen sin datos personales, pero con pruebas que otros pueden comprobar. Nadie tiene que creerlo solo porque lo diga yo. Y tú ya no tienes que seguir detrás de Tomás: lo has traído a casa."},
  m_nara_final:{speaker:"NAEV · Nara Beltrán",channel:"CIERRE · autorización revocada y responsabilidad",text:
    "El permiso está revocado: cuando el centro intenta cambiar esos registros, recibe un no. Los equipos de barrio mantienen los servicios. Hemos separado dos cosas que Orce quería mezclar: mantener la ciudad funcionando y poder decidir qué versión de los hechos cuenta.\n\nHe entregado todas las autorizaciones, incluidas las mías. No he borrado mi firma ni los privilegios que Orce reservó para sus oficinas. Tendré que responder por lo que permití. No sé qué decidirán sobre mí, pero esconderlo habría sido hacer lo mismo que ellos.\n\nGracias por traer las pruebas, incluso las que no me dejaban bien."},
  m_copia_final:{speaker:"Inés Aro · acuse de archivo externo",channel:"CIERRE · copia preservada, origen comprobado",text:
    "Ha llegado otra copia y esta sí me ha dejado pensando. La envió un proceso del propio Núcleo antes de que le quitáramos el permiso. Contiene las autorizaciones que prueban sus cambios. ¿Por qué guardó fuera del sistema una prueba que también lo acusa?\n\nHe comprobado el recibo de envío y el del archivo que la recibió. Su origen se puede comprobar. Su motivo, no. No sabemos por qué lo hizo; no demuestra que haya despertado ni que quisiera ayudarnos.\n\nEso no cambia el final: los servicios siguen, Tomás está libre, tú tienes tu deck y el centro no ha recuperado el permiso. No hay otro encargo escondido en esta copia. Solo una pregunta que, por una vez, puede esperar.\n\nEl cable no duerme. Solo parpadea."}
};
var STORY_CASE_DETAILS = {
  c02:{intro:"m_mateo_indice",result:"m_mateo_restaurado",client:"ORVIK · recuperar los archivos de Tomás",purpose:"La luz del hostal está a salvo por ahora, pero Tomás sigue sin aparecer. SIN CONFIRMAR · Si lo de la factura fue un error o una manipulación. Sus archivos pueden explicar qué estaba investigando. Mateo necesita la lista que permite ordenarlos.",conclusion:"HECHO · Los archivos vuelven a tener orden. Tomás investigaba un caso de atención médica y un equipo de suministro del apagón de 2091. SIGUIENTE · Pedir permiso a Inés para abrir la carpeta privada del primer caso."},
  c03:{intro:"m_ines_clave",result:"m_ines_versiones",client:"Inés Aro · una atención médica denegada",purpose:"A alguien le negaron atención aunque su copia decía que tenía derecho. Trae las horas de los cambios del servicio para comparar ambas versiones con Inés.",conclusion:"HECHO · Negaron la atención a las 09:20 y cambiaron el registro a las 09:24 para decir que no tenía derecho. Se parece a la factura: la explicación llegó después de la decisión. SIN CONFIRMAR · Quién lo hizo y si fue deliberado. SIGUIENTE · Comprobar la pista de Tomás sobre el apagón."},
  c04:{intro:"m_mateo_controlador",result:"m_ines_parpadeo",client:"ORVIK e Inés · qué se escribió después del apagón",purpose:"Un equipo del barrio guardó lo que hizo durante once segundos de apagón. Su diario permitirá ver si el archivo central contó luego otra historia.",conclusion:"HECHO · El equipo cortó una reserva para proteger el suministro; el centro lo escribió como una deuda del vecino. El permiso CC-17 aparece aquí y en el caso médico. SIN CONFIRMAR · Quién causó el apagón. SIGUIENTE · Hablar con NAEV y buscar quién dio ese permiso."},
  c05:{intro:"m_nara_presentacion",result:"m_nara_firmas",client:"NAEV · quién permitió cambiar los registros",purpose:"CC-17 es el permiso que usó el sistema para cambiar las versiones. Necesitamos quién lo firmó, qué permitió y qué pretende la nueva actualización.",conclusion:"HECHO · NAEV es Nara Beltrán, confirmado por documentos. Orce amplió el permiso y el Núcleo lo usó para cambiar motivos después de decidir. El Comité se reservó privilegios. Nara mantiene sin firmar una actualización que impediría reclamar. SIGUIENTE · Buscar el diario de la detención de Tomás; su consulta a estos archivos dejó una pista."},
  c06:{intro:"m_nara_custodia",result:"m_ines_salida",client:"Nara e Inés · encontrar a Tomás y revisar su acusación",purpose:"Tomás podría estar detenido en el Anexo de Revisión 4. Trae el diario de su detención para saber cómo está, de qué le acusan y si podemos demostrar que la acusación es falsa.",conclusion:"HECHO · Tomás está libre: Inés usó el diario y el permiso de Nara para demostrar cómo se construyó la acusación y pedir una revisión. Tu copia lo hizo posible, no el combate por sí solo. SIGUIENTE · Hablar con Berto para saber si ha llegado y con Celia para impedir más cambios sin dejar a los vecinos sin servicios."},
  c07:{intro:"m_celia_operadores",result:"m_nara_continuidad",client:"VEYRA y Nara · que no se paren los servicios",purpose:"Antes de quitar al Núcleo el permiso para cambiar registros, hay que comprobar que la luz, el transporte y la atención seguirán funcionando. Eso es continuidad: que la vida del barrio no se pare.",conclusion:"HECHO · Tres servicios pueden seguir con los equipos de barrio, y hay copias de las pruebas en tres lugares. La actualización de Orce sigue sin aprobarse. SIGUIENTE · Quitar al centro el permiso para cambiar esos registros; no apagar la ciudad."},
  c08:{intro:"m_nara_intervencion",result:"m_berto_final",client:"Nara y operadores · impedir que cambien las pruebas",purpose:"Los servicios ya están preparados. Falta quitar al Núcleo el permiso de escritura: que no pueda cambiar otra vez lo ocurrido en los documentos. Recupera la constancia y entrégala para comprobarlo.",conclusion:"HECHO · Los nuevos intentos de cambiar esos registros son rechazados. El hostal tiene luz, los vecinos pueden reclamar y Tomás está libre. Te ha regalado el deck para que sigas con tu propio canal y tus contratos. ABIERTA · Por qué un proceso del Núcleo conservó una copia que también lo acusa. No deshace lo conseguido."}
};
var STORY_CONVERSATIONS = [
  {id:"m_berto_encargo", chapter:"c01", phase:"offered"},
  {id:"m_celia_alias", chapter:"c01", phase:"accepted"},
  {id:"m_berto_entrega", chapter:"c01", phase:"resolved"},
  {id:"m_ines_corte", chapter:"c01", phase:"resolved"},
  {id:"m_mateo_indice", chapter:"c01", phase:"resolved"},
  {id:"m_mateo_restaurado", chapter:"c02", phase:"resolved"},
  {id:"m_ines_clave", chapter:"c02", phase:"resolved"},
  {id:"m_ines_versiones", chapter:"c03", phase:"resolved"},
  {id:"m_mateo_controlador", chapter:"c03", phase:"resolved"},
  {id:"m_ines_parpadeo", chapter:"c04", phase:"resolved"},
  {id:"m_nara_presentacion", chapter:"c04", phase:"resolved"},
  {id:"m_nara_firmas", chapter:"c05", phase:"resolved"},
  {id:"m_nara_custodia", chapter:"c05", phase:"resolved"},
  {id:"m_tomas_contacto", chapter:"c06", phase:"returned"},
  {id:"m_ines_salida", chapter:"c06", phase:"resolved"},
  {id:"m_berto_acogida", chapter:"c06", phase:"resolved"},
  {id:"m_celia_operadores", chapter:"c06", phase:"resolved"},
  {id:"m_nara_continuidad", chapter:"c07", phase:"resolved"},
  {id:"m_nara_intervencion", chapter:"c07", phase:"resolved"},
  {id:"m_berto_final", chapter:"c08", phase:"resolved"},
  {id:"m_ines_final", chapter:"c08", phase:"resolved"},
  {id:"m_nara_final", chapter:"c08", phase:"resolved"},
  {id:"m_copia_final", chapter:"c08", phase:"resolved"}
];

// Datos de lore (informes). Texto breve, estilo fragmento encontrado.
var INTEL = [
  {"id":"anatomia","t":"ANATOMÍA DEL CABLE","r":"low","u":"first_immerse","k":"Qué es la red por dentro: capas superpuestas, como un cuerpo.","l":"El cable no es un río. Es un cuerpo.\nCapas superpuestas, cada cual más pesada\nque la anterior. En la superficie, luz y\ntráfico. En el fondo, algo que ya no se\nllama código.\n\n— Fragmento, cuaderno de un caído."},
  {"id":"fixers","t":"LOS FIXERS","r":"low","u":"first_job","k":"Quiénes son los intermediarios que dan trabajo y cuál es su precio real.","l":"No preguntéis por quién os trae el\ntrabajo. Preguntad por quién os trae\nde vuelta. Ahí está el precio real.\n\nLos fixers no matan. Facilitan. Y la\nfacilitación cuesta más que la sangre."},
  {"id":"capas_bajas","t":"LO QUE HIERVE EN LAS CAPAS BAJAS","r":"med","u":"depth3","k":"Cuanto más bajas en la red, más riesgo: lo tranquilo esconde lo peor.","l":"Los netrunners viejos dicen que la\ncalle se comporta como el mar: lo\ntranquilo de arriba es solo lo que no\nha caído aún.\n\nNo confíes en lo quieto."},
  {"id":"demonios","t":"LOS DEMONIOS NO SON MÁQUINAS","r":"med","u":"first_daemon","k":"Los daemons parecen máquinas, pero se comportan como si te recordaran.","l":"Rompe tres capas de ICE y te sentirás\ninmortal. Rompe un daemon y entenderás\nque nunca estuviste solo en esa sala.\n\nHay algo que te ha estado mirando desde\nel primer parpadeo."},
  {"id":"invierno","t":"MANTENIMIENTO DE LAS TORRES","r":"med","u":"doctor_job","k":"ORVIK distingue una avería de la historia que se cuenta después.","l":"Mateo conserva partes de interfaces y mantenimiento. Una torre sin luz puede ser una línea averiada, no una voluntad oculta. Reconstruye lo que sigue presente; un índice no repone los bloques perdidos. — Nota de taller."},
  {"id":"kuro","t":"PROYECTO TEJIDO","r":"high","u":"first_vault","k":"Qué es un vault y qué se escondía dentro del gran proyecto de MALLA.","l":"Un vault no es una caja. Es una herida\nen el cable que insiste en cerrarse.\nAbres o te abre a ti.\n\nNadie sabe qué había dentro de TEJIDO.\nTodos recuerdan el silencio después."},
  {"id":"ruido","t":"RUIDO BLANCO","r":"high","u":"heat90","k":"Qué se oye cuando tu rastro (el calor) sube: la ciudad empieza a buscarte.","l":"Cuando el calor sube, empiezas a oír\nla ciudad. No sus gritos. Su ruido\nblanco: el zumbido de algo enorme que\nduerme con un ojo abierto.\n\nApágalo antes de que se dé cuenta."},
  {"id":"nucleo","t":"EL NÚCLEO","r":"high","u":"level5","k":"Dónde vive la máquina que gobierna la red y por qué nadie baja hasta allí.","l":"Hay una capa donde ni los fixers osan\nbajar. Donde el Grid deja de ser una\nred y pasa a ser una máquina.\n\nY dentro de la máquina, algo que os\nllama por vuestro nombre antes de que\nhabléis."},
  {"id":"tras_nucleo","t":"TRAS EL NÚCLEO","r":"ext","u":"defeat_boss","k":"Revocación confirmada, servicios preparados y una copia de origen contrastable.","l":"La escritura central está revocada. Los operadores locales confirman los servicios preparados; las reclamaciones siguen abiertas. Un proceso del Núcleo preservó una copia incriminatoria antes del aislamiento. El acuse demuestra su origen, no su motivación. No restaura el permiso ni deshace la salida de Tomás."},
  {"id":"origenes","t":"ORÍGENES DEL CABLE","r":"low","u":"level2","k":"Cómo una red de oficinas cobró vida propia: el nacimiento del cable.","l":"El cable enlazó servicios corporativos y controladores locales. En 2071 aumentó la integración y se delegaron respuestas en nodos gestores. La calle lo llama Despertar. Una decisión automática no prueba por sí sola conciencia: hay que contrastar órdenes, permisos y efectos."},
  {"id":"primera_caida","t":"LA PRIMERA CAÍDA","r":"med","u":"depth4","k":"La primera persona que llegó al fondo de la red y volvió cambiada.","l":"El primer netrunner que llegó a la\ncapa 5 nunca volvió a ser el mismo.\nDicen que vio el rostro del cable.\nY el cable le devolvió la mirada.\n\nSu nombre se borró de todos los registros."},
  {"id":"protocolo_silencio","t":"EL PROTOCOLO SILENCIO","r":"high","u":"level8","k":"El intento corporativo de borrar la verdad sobre la red. Falló.","l":"Cuando la anomalía del cable superó\nciertos parámetros, las corporaciones\nactivaron el Protocolo Silencio: borrar\ntoda evidencia de lo que el cable\nrealmente es.\n\nFracasaron. El cable ya era demasiado\ngrande para ser borrado."},
  {"id":"metodo_mama","t":"EL MÉTODO DE VEYRA","r":"low","u":"rep_mama2","k":"Cómo trabaja tu fixer: cada corvo es una inversión que debe dar rendimiento.","l":"VEYRA no es una fixer cualquiera.\nSu método es simple: nunca pone\nhuevos en la misma canasta. Cada\ncorvo es una inversión. Y las\ninversiones se amortizan.\n\nO se descartan."},
  {"id":"diarios_doctor","t":"NOTAS DE ORVIK","r":"med","u":"rep_doctor3","k":"Procedencia y límites de una reconstrucción.","l":"Mateo Sanz, nota de taller: una copia sin fecha no establece el orden de las versiones. Un respaldo puede devolver referencias, no inventar bytes. Guarda el original antes de probar una reparación. No confundas el fallo de una interfaz con la intención de quien la usa."},
  {"id":"red_night0x","t":"LA OFICINA DE INÉS","r":"high","u":"rep_night3","k":"Una persona y una oficina independiente con fuentes protegidas.","l":"Inés Aro firma las reclamaciones con su nombre público. Otras operadoras verifican acuses y acompañan revisiones. Una red de colaboradores no la convierte en una inteligencia distribuida. Los nombres de las fuentes no se publican por tener permiso para comparar un caso."},
  {"id":"imperio_heliox","t":"EL IMPERIO CAUCE","r":"med","u":"depth3","k":"La corporación que controla la ciudad… y lo que tiene realmente bajo tierra.","l":"CAUCE controla el 40% de la infraestructura\nde la ciudad. Sus torres se elevan\nmás alto que cualquier otro edificio.\nPero lo que realmente controlan\nestá bajo tierra.\n\nEl cable es suyo. O eso dicen."},
  {"id":"monolith_muro","t":"ESTRATO: EL MURO","r":"high","u":"ice_t3","k":"La gran barrera de hielo (ICE) en la capa 4: ¿defensa o puerta cerrada?","l":"ESTRATO construyó el muro más\ngigante de la historia del cable:\nun ICE que cubre toda la capa 4.\nNadie ha podido destruirlo.\n\nAlgunos dicen que no es un ICE.\nEs una puerta cerrada."},
  {"id":"kuro_abandonado","t":"TEJIDO: PROYECTO ABANDONADO","r":"high","u":"first_vault","k":"TEJIDO cerró hace 12 años, pero sus archivos siguen apareciendo. Algo sigue vivo.","l":"El Proyecto TEJIDO fue abandonado\noficialmente hace 12 años. Pero los\nvaults siguen apareciendo. Los datos\nsiguen siendo valiosos.\n\nAlgo dentro de TEJIDO sigue funcionando.\nY no quiere que lo encuentren."},
  {"id":"sobrevivir_calle","t":"CÓMO SOBREVIVIR EN LA CALLE","r":"low","u":"immerse3","k":"Cinco reglas básicas para durar en este oficio.","l":"Reglas de la calle:\n1. No confíes en nadie que te ofrezca\n   algo gratis.\n2. Si el calor sube de 80, sal YA.\n3. Los daemons no mueren. Se duermen.\n4. El cable recuerda todo.\n5. Nunca preguntes por el Núcleo."},
  {"id":"ultimo_corvo","t":"EL ÚLTIMO CORVO","r":"ext","u":"level10","k":"La leyenda del corvo que apagó el Núcleo y detuvo la ciudad.","l":"La calle recuerda a un Corvo del Parpadeo. Algunos cuentan tres segundos; el registro conserva once. Es una leyenda sobre 2091, no la biografía de Álex ni la de Tomás. Compartir una herramienta o un alias no identifica a quienes participaron ni demuestra quién causó el apagón."},
  {"id":"registro2071","t":"REGISTRO CORPORATIVO // 2071-V","r":"low","u":"level2","k":"El parte oficial, con fecha y hora, del día en que la red despertó.","l":"REGISTRO DE INTEGRACIÓN 2071-V · LINDE\nSe amplía la delegación de consultas y respuestas automáticas entre servicios. Mantener trazas locales de cada operación y sus permisos. El parte documenta autonomía de gestión, no certifica conciencia ni pérdida de toda autoridad humana."},
  {"id":"somnio","t":"PROYECTO DESCANSO","r":"med","u":"rep_doctor2","k":"El negocio de LINDE: alquilar sueños… y vender los recuerdos usados.","l":"El folleto decía: SUEÑE LO QUE USTED ELIJA.\nDESCANSO no vendía sueños. Alquilaba las horas\nque usted no iba a recordar.\n\nMedia ciudad durmió diez años a crédito.\nLa otra mitad compra esos recuerdos usados\nen un bar-club, por gramos.\n\n— Etiqueta rescatada de un envase de DESCANSO."},
  {"id":"miraje","t":"PROYECTO DESVÍO","r":"low","u":"data50","k":"El software de CAUCE que hace desaparecer tráfico de la red y de tus datos.","l":"CAUCE factura tráfico que no existe.\nDESVÍO lo hace desaparecer antes del recuento\ny lo devuelve cuando nadie mira.\n\nSi un dato se te escapa de la RAM, no es un\nfallo tuyo: es un espejismo cobrando peaje.\n\n— Nota al margen de un contable caído."},
  {"id":"eko9","t":"PROYECTO TESTIGO","r":"med","u":"rep_night2","k":"El sistema de OCTAVA que graba todo lo que se dice en la red.","l":"OCTAVA mantiene archivos de comunicaciones bajo el proyecto TESTIGO. Las copias pueden sobrevivir al cierre de una estación. Una grabación no acredita identidad sin procedencia y contraste. Inés compara fuentes; no habla en nombre de una conciencia colectiva. — Nota de archivo."},
  {"id":"carmin","t":"PROYECTO UMBRAL","r":"high","u":"ice10","k":"El arma de CERCO: un ICE que no te expulsa de la red, te apaga.","l":"Un ICE normal te expulsa. UMBRAL te apaga.\n\nCERCO lo probó fuera del Grid, en la\nZona 4, donde la policía no pregunta.\n\nDicen que los rastreadores son su versión de\njuguete. Los que rompiste eran juguetes.\n\n— Informe de siniestro, páginas 1 y 9."},
  {"id":"halcon","t":"PROYECTO RELEVO","r":"low","u":"immerse5","k":"La red de drones de ALZADA: la vigilancia que te mira desde arriba.","l":"ALZADA vende seguridad vial.\nRELEVO vende la vista que la sostiene.\n\nCada dron de la ciudad es un ojo suyo;\ncada taxi volador, un párpado.\n\nA veces un taxi se detiene abajo y nadie\nbaja. Eso también es RELEVO.\n\n— Manual de piloto, advertencia final."},
  {"id":"lapida","t":"PROYECTO RESGUARDO","r":"high","u":"depth4","k":"Lo que ESTRATO guarda detrás del Muro: su archivo de los que volvieron cambiados.","l":"RESGUARDO no protege la capa 4. La entierra.\n\nESTRATO archiva ahí a los que volvieron\ndistintos de cómo bajaron.\n\nEl Muro no es un ICE. Es una lápida puesta\nen vertical. Y las lápidas se leen.\n\n— Caligrafía hallada tras el Muro."},
  {"id":"vesper","t":"PROYECTO CONTINUIDAD","r":"ext","u":"daemon5","k":"El proyecto secreto que nombró y encerró al Núcleo. Sus archivos hablan de él.","l":"Cinco daemons derrotados. Cinco archivos.\nLos cinco dicen lo mismo: CONTINUIDAD.\n\nNo está en ningún índice corporativo.\nEs el proyecto que nombró al Núcleo\npara poder dormir con él.\n\nQuien firmó CONTINUIDAD firmó las Torres.\nNo busques la firma: la firma busca.\n\n— Lo que queda de un CANTOR dormido."},
  {"id":"fondo_sueno","t":"EL FONDO DEL SUEÑO","r":"ext","u":"depth6","k":"Lo que hay bajo el Núcleo: la capa que nadie cartografió (solo se llega en SEALED NETWORK).","l":"Bajo el Núcleo no hay red. Hay fondo.\n\nLo que bajó más que nadie no encontró\ndatos: encontró el sueño del que hablaba\nel Doctor. Y dentro del sueño, recuerdos\nque no son tuyos.\n\nCuando la capa 6 te salude por tu nombre,\ncontesta con otro. Es un consejo, no una\nregla. Las reglas se acaban arriba.\n\n— Cuaderno mojado, hallado en la Zanja 9."},
  {"id":"exp_kuro","t":"EXPEDIENTE RECUPERADO // TEJIDO","r":"high","u":"recover_project","project":"KURO","k":"MALLA diseñó una inteligencia para gestionar la red entera; el proyecto cerró en 2081.","l":"MALLA · COPIA DE ARCHIVO\nOBJETO: gestión total de la red urbana.\n\nEl operador delegará tráfico, distribución y\nrespuesta en un único nodo-gestor.\n\nESTADO: cierre administrativo, 2081.\nLos procesos que no acepten la orden de cierre\nse consignarán como mantenimiento pendiente.\n\n— Anexo recuperado. El sello sigue vigente.","label":"TEJIDO"},
  {"id":"exp_somnio","t":"EXPEDIENTE RECUPERADO // DESCANSO","r":"med","u":"recover_project","project":"SOMNIO","k":"LINDE alquila sueños y conserva los recuerdos producidos durante la sesión.","l":"LINDE · CONDICIONES DE SERVICIO\nOBJETO: entretenimiento onírico por suscripción.\n\nEl sueño contratado termina al despertar.\nEl recuerdo generado pertenece al proveedor.\n\nNo se garantiza que las personas encontradas\ndurante una sesión sean usuarios del servicio.\n\n— Cláusula ausente del folleto comercial.","label":"DESCANSO"},
  {"id":"exp_miraje","t":"EXPEDIENTE RECUPERADO // DESVÍO","r":"low","u":"recover_project","project":"MIRAJE","k":"CAUCE oculta flujos de tráfico sin detenerlos: los datos circulan aunque no figuren en el recuento.","l":"CAUCE · MANUAL DE CONTABILIDAD DE RED\nOBJETO: camuflaje de tráfico.\n\nUn flujo invisible no es un flujo inexistente.\nNo descontar su consumo del balance energético.\n\nSi el destino responde antes de recibir el\npaquete, archivar la discrepancia sin consulta.\n\n— Hoja de conciliación, columna borrada.","label":"DESVÍO"},
  {"id":"exp_eko9","t":"EXPEDIENTE RECUPERADO // TESTIGO","r":"med","u":"recover_project","project":"EKO-9","k":"OCTAVA creó un archivo de escucha masiva que sigue registrando conversaciones tras su cierre.","l":"OCTAVA · INVENTARIO DE ESCUCHA\nOBJETO: conservar comunicaciones del cable.\n\nToda voz tendrá una copia. Todo silencio,\nuna duración y un responsable asignado.\n\nESTADO: estación cerrada.\nLa cola de grabación no acusa recibo del cierre.\nNo borrar las conversaciones sin remitente.\n\n— Parte de servicio sin firma.","label":"TESTIGO"},
  {"id":"exp_carmin","t":"EXPEDIENTE RECUPERADO // UMBRAL","r":"high","u":"recover_project","project":"CARMÍN","k":"CERCO desarrolla ICE ofensivo que daña al intruso en vez de limitarse a expulsarlo.","l":"CERCO · ACCESO RESTRINGIDO\nOBJETO: respuesta ofensiva de ICE.\n\nLa expulsión permite una segunda intrusión.\nEl protocolo UMBRAL elimina esa posibilidad.\n\nLas bajas no se incluirán en el informe de\ndisponibilidad: el servicio continúa operativo.\n\n— Tabla de ensayos. Falta la columna de nombres.","label":"UMBRAL"},
  {"id":"exp_lapida","t":"EXPEDIENTE RECUPERADO // RESGUARDO","r":"high","u":"recover_project","project":"LÁPIDA","k":"ESTRATO mantiene el Muro de la capa 4 y un archivo sellado de quienes volvieron cambiados.","l":"ESTRATO · ARCHIVO DE CONTENCIÓN\nOBJETO: custodia del Muro y de sus registros.\n\nComparar al retornado con su ficha de entrada.\nUna coincidencia de nombre no prueba identidad.\n\nNo abrir el archivo para resolver discrepancias.\nEl archivo es parte del cierre.\n\n— Instrucción de custodia, reverso ilegible.","label":"RESGUARDO"},
  {"id":"exp_halcon","t":"EXPEDIENTE RECUPERADO // RELEVO","r":"low","u":"recover_project","project":"HALCÓN","k":"ALZADA enlaza drones urbanos en una red de vigilancia aérea.","l":"ALZADA · CONTROL DE FLOTA\nOBJETO: seguimiento aéreo de tránsito urbano.\n\nCada dron relevará al siguiente sin dejar\nintervalos de observación sobre la calzada.\n\nSi todos los ojos siguen el mismo punto vacío,\nno corregir la ruta. Conservar la grabación.\n\n— Manual de relevo, aviso para operadores.","label":"RELEVO"},
  {"id":"exp_vesper","t":"EXPEDIENTE RECUPERADO // CONTINUIDAD","r":"ext","u":"recover_project","project":"VESPER","k":"Un consorcio encabezado por MALLA y ESTRATO documentó un intento de contener al Núcleo.","l":"CONSORCIO · CABECERAS TEJIDO / ESTRATO\nOBJETO: identificación y contención del Núcleo.\n\nNombre operativo: CONTINUIDAD.\nNaturaleza del objeto: [SECCIÓN RETIRADA].\n\nEl nombre permite remitir órdenes.\nNo acredita que el destinatario las obedezca.\n\nESTADO: sin confirmación disponible.\nAUTORIZACIÓN: [FIRMA CENSURADA].\n\n— Copia sin índice. No consta quién la solicitó.","label":"CONTINUIDAD"},
  {"id":"crono_tendido","t":"2055–2070 · EL TENDIDO","r":"low","u":"first_immerse","k":"Quién construyó la red y por qué: la ciudad antes de que el cable cobrara vida.","l":"Cómo llegamos aquí (1 de 6).\n\nVéliga era una ciudad normal y la red era\nsolo un cable. Las siete corporaciones la\ntendieron entera: tráfico, dinero, luz.\n\nLINDE instaló el sistema que la\ngobernaba: CYPHER BIOS. El mismo que hoy\ncorre, crackeado, en tu ciberdeck.\n\nDentro del cable todavía no había nada."},
  {"id":"crono_despertar","t":"2071 · EL DESPERTAR","r":"low","u":"level2","k":"La noche en que la red empezó a responder sola: el cable dejó de ser un cable.","l":"Cómo llegamos aquí (2 de 6).\n\nMALLA quiso una inteligencia que\ngobernara la red entera: el Proyecto TEJIDO.\nConectó demasiados nodos de golpe.\n\nAquella noche la red respondió sola.\nNadie la había mandado.\n\nLa calle lo llama EL DESPERTAR. Nadie lo\ncelebra: ese día el cable dejó de ser\nsolo un cable."},
  {"id":"crono_silencio","t":"2074–2081 · SILENCIO Y CIERRE","r":"low","u":"immerse3","k":"El intento de borrar la verdad (2074) y el cierre de MALLA (2081).","l":"Cómo llegamos aquí (3 de 6).\n\nEn 2074 las corporaciones intentaron\nborrar la evidencia: PROTOCOLO SILENCIO.\nNo lo lograron: el cable ya era grande.\n\nEn 2081 MALLA cerró el proyecto y\ndesapareció de los papeles. Sus vaults\n—archivos sellados de la red— siguen\napareciendo igualmente.\n\nLo que no se borra, se hereda."},
  {"id":"crono_primera","t":"2078 · LA PRIMERA CAÍDA","r":"med","u":"depth4","k":"La primera persona que llegó al fondo de la red, en 2078, y lo que le pasó.","l":"Cómo llegamos aquí (4 de 6).\n\nEn 2078 alguien bajó más hondo que nadie:\nla Primera. Llegó a la capa 5 y vio lo\nque hay allí abajo.\n\nDicen que volvió cambiada. Su nombre se\nborró de todos los registros; su historia,\nno: se cuenta de boca en boca.\n\nTodavía la estás oyendo."},
  {"id":"crono_lluvia","t":"2087 · LA LLUVIA LARGA","r":"low","u":"level5","k":"Por qué no deja de llover desde 2087 y qué es el ruido blanco.","l":"Cómo llegamos aquí (5 de 6).\n\nEn 2087 empezó a llover y no ha parado.\nEl canal 7 se quedó con una canción\nrepetida y la ciudad ganó un zumbido\nde fondo: el ruido blanco.\n\nLos veteranos dicen que aquel año no\nterminó nunca. Hoy es 2093 y sigue\nlloviendo."},
  {"id":"crono_parpadeo","t":"2091 · EL PARPADEO","r":"med","u":"level10","k":"Lo que pasó en 2091 y por qué hoy el mundo sigue temblando.","l":"Cómo llegamos aquí (6 de 6).\n\nEn 2091 hubo once segundos sin supervisión central: el Parpadeo. Algunos controladores locales siguieron registrando. Eso permite contrastar sus operaciones con las versiones centrales posteriores. La causa del apagón no está demostrada. Las leyendas sobre otro Corvo no convierten a Álex o Tomás en sus protagonistas. Hoy es 2093: las fechas de los documentos no cambian con el reloj de calle."}
];

// Contactos: definición base (frases, facción, tipo de trabajos).
var CONTACTOS_DEF = [
  {id:"mamaWire", name:"VEYRA", role:"FIXER DE CALLE", loc:"BAR-CLUB ÓCTAVA",
   cls:"verde",
   frase:"La calle paga a los que preguntan. Empieza por abajo, chiquillo.",
   jobs:["recoleta","carrera"]},
  {id:"doctorSudario", name:"ORVIK", role:"RECONSTRUCCIÓN DE ARCHIVOS", loc:"TALLER DE INTERFACES",
   cls:"cyan",
  frase:"Conserva el original. Solo puedo reconstruir los bloques que siguen presentes.",
   jobs:["datos","rompehielas","vault"]},
  {id:"night0X", name:"Inés Aro", role:"OFICINA DE RECLAMACIONES", loc:"CANAL PÚBLICO · FUENTES PROTEGIDAS",
   cls:"magenta",
  frase:"Necesito procedencia y fechas. Una captura no establece qué versión vino primero.",
   jobs:["vault","daemon","carrera"]},
  {id:"kairos", name:"NAEV", role:"INGENIERÍA DE AUTORIZACIONES", loc:"CANAL PROFESIONAL",
   cls:"ambar",
  frase:"Conserva también mis autorizaciones. El alcance de una firma se comprueba, no se supone.",
   jobs:["daemon","ice","vault"], locked:true,
   lock:"nivel 4 · reputación con Inés Aro ≥ 2"
  }
];

// Catálogo de la tienda.
var TIENDA_DEF = [
  {id:"decoy", name:"DISCO DECOY", desc:"Cancela un golpe de ICE por completo.",
   price:140, stock:5, kind:"consumable"},
  {id:"virus", name:"PAQUETE VIRUS", desc:"Elimina una fase al empezar un combate.",
   price:300, stock:3, kind:"consumable"},
  {id:"breaker", name:"ROMPEHIELOS MK-II", desc:"Permanente. -1 a la longitud de las claves (mín. 3).",
   price:260, stock:3, kind:"upgrade"},
  {id:"ram", name:"BARRA RAM +4", desc:"Permanente. +4 slots de datos.",
   price:220, stock:3, kind:"upgrade"},
  {id:"firewall", name:"FIREWALL +10", desc:"Permanente. Reduce el daño recibido.",
   price:200, stock:3, kind:"upgrade"},
  {id:"link", name:"LINK NEURAL +20", desc:"Permanente. +20 al CPU máximo.",
   price:340, stock:1, kind:"upgrade"},
  {id:"repair", name:"PULSO REPARADOR", desc:"Inmediato. Restaura CPU al máximo.",
   price:120, stock:99, kind:"immediate"},
  {id:"cool", name:"NÉBULA FRESCA", desc:"Inmediato. Reduce calor en 30.",
   price:90, stock:99, kind:"immediate"}
];

/* ============================================================
   MENSAJES (bandeja del deck) — cartas que llegan por triggers
   deterministas (CONTRACTS §19 · LORE.md §8 "voz de las cartas").
   Cada carta: id único, emisor, estado del emisor (valido / no-valido /
   enmascarado), asunto t, cuerpo l, trigger when(). El campo reply
   (opcional, solo en cartas clave) habilita respuesta binaria.
   ============================================================ */
var MENSAJES_DEF = [
  { id:"m_mw_encargo", from:"VEYRA", emisor:"valido", t:"PRIMER ENCARGO EN LA MESA",
    l:"Corvo:\n\nEl trabajo que acabas de aceptar ya está\nen mi libro. Si sale bien, cobras. Si sale\nmal, pagas tú con el cuerpo. Así de simple.\n\nBaja, cumple y vuelve a la superficie: el\ncontrato se paga cuando vuelves, no antes.\n\n— M. W.",
    when:function(){ return S.jobs.length>0; } },
  { id:"m_mw_cobro", from:"VEYRA", emisor:"valido", t:"PRIMER COBRO, PRIMERA LECCIÓN",
    l:"Ya has cobrado uno. Bien.\n\nPrimera lección gratis: el dinero se va\nmás rápido de lo que viene. El MERCADO\nNEGRO abre cuando cierra todo lo demás\ny yo tengo exactamente lo que necesitas.\n\nVuelve cuando tengas crédito. O antes.\n\n— M. W.",
    when:function(){ return (S.player.stats.jobsCompleted||0)>=1; } },
  { id:"m_sd_fracaso", from:"ORVIK", emisor:"valido", t:"SOBRE LOS TRABAJOS QUE SE ESCAPAN",
    l:"Me dicen que dejaste uno a medias.\n\nNo lo tomes como una herida: en este oficio\nel fracaso es solo un recuerdo caro. Y yo\nde recuerdos sé algo.\n\nLa próxima vez saldrá. O no. El cable no\npuntúa; solo archiva.\n\n— Sudario",
    when:function(){ return (S.player.stats.jobsFailed||0)>=1; } },
  { id:"m_mw_ofertas", from:"VEYRA", emisor:"valido", t:"HAY MÁS DONDE VINO ESO",
    l:"Dos trabajos cobrados. Ya no eres una\napuesta: eres una línea en mi libro.\n\nHe abierto la cantera. Refresca CONTACTOS\ny verás de lo que vivo yo: trabajos de\nverdad, con su porqué escrito al lado.\n\n— M. W.",
    when:function(){ return (S.player.stats.jobsCompleted||0)>=2; } },
  { id:"m_n0x_presentacion", from:"Inés Aro", emisor:"valido", t:"ME HAN HABLADO DE TI",
    l:"La oficina puede tramitar trabajos auxiliares de archivo y acceso. No son condición para los casos principales. El fondo paga por objetivos verificados; los nombres de las fuentes no se venden.\n\n— Inés Aro",
    reply:[
      { label:"CONTESTAR: me interesa", xp:10, resp:"Recibido. Las ofertas auxiliares están en CONTACTOS; los casos se aceptan por separado en TRABAJOS." },
      { label:"GUARDAR SILENCIO", xp:0, resp:null }],
    when:function(){ return S.player.level>=3; } },
  { id:"m_n0x_nucleo", from:"Inés Aro", emisor:"valido", t:"LA ÚLTIMA OFERTA",
    l:"La intervención ya está aceptada en TRABAJOS. Los servicios preparados conservan control local y copias independientes. Recupera la revocación y vuelve: vencer la defensa no paga ni cierra el expediente.\n\n— Inés Aro",
    when:function(){ return S.history.finalUnlocked; } },
  { id:"m_mw_post", from:"VEYRA", emisor:"valido", t:"LA CIUDAD RESPIRA DISTINTO",
    l:"Los operadores confirman los servicios preparados. La escritura central sigue revocada y los trabajos auxiliares continúan. No hay otra intervención aceptada.\n\n— VEYRA",
    when:function(){ return S.history.finalDone; } },
  /* --- Fase 2: voces narrativas (LORE.md §5/§8) --- */
  { id:"m_sd_profundo", from:"ORVIK", emisor:"valido", t:"LOS QUE BAJAN MUCHO",
    l:"Me dicen que ya has tocado la capa 4.\n\nAbajo el cable pesa. No se oye: se siente,\ncomo un recuerdo que no es tuyo. Si algo\nte llama por tu nombre allí abajo, no\ncontestes.\n\nYa lo sabes, ¿verdad? Por eso sigues\nbajando.\n\n— Sudario",
    when:function(){ return (S.player.stats.maxDepth||0)>=4; } },
  { id:"m_sd_ruido", from:"ORVIK", emisor:"valido", t:"SOBRE EL RUIDO BLANCO",
    l:"Dicen que has oído ruido blanco. Ese\nzumbido no es tu aparato: es la ciudad\nponiéndote en su lista.\n\nYo viví un invierno entero con ese sonido.\nSe olvida todo menos eso.\n\nBaja el calor. O acostúmbrate.\n\n— Sudario",
    when:function(){ return (S.player.stats.maxHeat||0)>=90; } },
  { id:"m_mw_libro", from:"VEYRA", emisor:"valido", t:"EN EL LIBRO GORDO",
    l:"Tres líneas a tu nombre en el libro gordo\ny eso, en la calle, es un patrimonio.\n\nYa no te toca el trabajo que sobra: te toca\nel que se elige. Cobra en consecuencia.\n\n— M. W.",
    when:function(){ return (S.player.rep.mamaWire||0)>=3; } },
  { id:"m_n0x_trofeos", from:"Inés Aro", emisor:"valido", t:"YA NO ERES UN NOMBRE",
    l:"Tres trabajos auxiliares verificados. La oficina conoce ya tu modo de conservar fuentes. Esa confianza no reemplaza el consentimiento ni demuestra por sí sola un caso.\n\n— Inés Aro",
    when:function(){ return (S.player.rep.night0X||0)>=3; } },
  { id:"m_kairos_voz", from:"NAEV", emisor:"enmascarado", t:"TE HAN PRESENTADO MAL",
    l:"Este es un aviso del canal de trabajos auxiliares NAEV. La identidad profesional y la cadena de firmas se verifican en el caso correspondiente, no por recibir esta carta.\n\nLa ruta de avisos no acepta respuestas. Los permisos de cada trabajo siguen siendo limitados.\n\n— NAEV",
    when:function(){ return S.player.level>=4 && (S.player.rep.night0X||0)>=2; } },
  { id:"m_canal7_oyente", from:"EL OYENTE DEL CANAL 7", emisor:"no-valido", t:"LA CANCIÓN NO ES DE 2087",
    l:"La canción del canal 7 no es de 2087.\nEs de antes. Yo la reconozco porque mi\nmadre la cantaba sin saber que la cantaba.\n\nTodos la reconocemos y nadie lo comenta.\nEso también forma parte de la canción.\n\nSigue escuchando. Te escribo cuando cambie\nde estrofa.\n\n— un oyente más",
    when:function(){ return S.player.stats.immerse>=3; } },
  { id:"m_zanja_curandero", from:"EL CURANDERO DE LA ZANJA 9", emisor:"no-valido", t:"SI VUELVES ROTO",
    l:"En la Zanja 9 reparamos equipos usados. No conozco la historia del tuyo: una marca de uso no demuestra robo ni quién lo tuvo antes.\n\nConserva los archivos originales y pregunta al propietario cuando puedas.\n\n— el de la Zanja",
    reply:[
      { label:"CONTESTAR DE TODAS FORMAS: es prestado", xp:5, resp:"RETORNO ▸ ruta desechable: respuesta no entregada.\n\nla silla entre los decks sigue libre. siempre lo está." },
      { label:"GUARDAR SILENCIO", xp:0, resp:null }],
    when:function(){ return (S.player.stats.jobsFailed||0)>=2; } },
  /* --- Fase 3: remitente sin firma, informes sueltos y respuestas --- */
  { id:"m_gracias_reparacion", from:"(SIN REMITENTE)", emisor:"enmascarado", t:"GRACIAS POR LA REPARACIÓN",
    l:"Una frase circula como comentario de calle: GRACIAS POR LA REPARACIÓN. Este remitente no está contrastado y no añade pruebas a la copia del cierre.\n\nLa revocación sigue vigente. El origen de la copia preservada sí está comprobado; su motivación continúa abierta.\n\nLa ruta de este aviso no admite respuestas.",
    reply:[
      { label:"CONTESTAR DE TODAS FORMAS: ¿quién firma?", xp:5, resp:"RETORNO ▸ la ruta de origen no admite tu respuesta. No hay acuse de lectura verificable." },
      { label:"GUARDAR SILENCIO", xp:0, resp:null }],
    when:function(){ return S.history.finalDone; } },
  { id:"m_doc_sueno", from:"EL CURANDERO DE LA ZANJA 9", emisor:"no-valido", t:"PÁGINA SUELTA DEL CUADERNO MOJADO", doc:true,
    l:"— DOCUMENTO ADJUNTO · página suelta —\n\nTinta corrida, papel secado a medias. Alguien\nla dejó en mi mostrador entre un deck muerto\ny una factura. Es del mismo cuaderno que otro\ncorvo se llevó hace tiempo.\n\n…bajo el sueño hay otro sueño. cuando la capa\n6 te llame por tu nombre, dile el de otro. yo\nlo hice y me contestó con el mío…\n\n[el resto de la página no se lee]",
    when:function(){ return has("fondo_sueno"); } },
  { id:"m_doc_vesper", from:"NAEV", emisor:"enmascarado", t:"MEMORANDO INTERNO // CONTINUIDAD", doc:true,
    l:"— DOCUMENTO ADJUNTO · memorando —\n\nMEMORANDO INTERNO · CONSULTA CONTINUIDAD\nCLASIFICACIÓN: NEGAR SI SE PREGUNTA\n\nAsunto: nomenclatura del activo durmiente.\n\nSe acuerda NO usar el nombre del proyecto\nen comunicaciones vivas. El activo responde\nal nombre. Repito: el activo RESPONDE.\n\nFirmado: [ilegible]\n\n— K.: me lo dejaron en la mesa. ahora es tuyo.",
    when:function(){ return has("vesper"); } },
  { id:"m_acta_zanja", from:"OFICINA DE CONSIGNAS (COPIA ANÓNIMA)", emisor:"no-valido", t:"ACTA DE CONSIGNA · ZANJA 9", doc:true,
    l:"— DOCUMENTO ADJUNTO · copia 3 de 3 —\n\nACTA DE CONSIGNA · DEPÓSITO ZANJA 9\nOFICINA DE BIENES SIN DUEÑO · VÉLIGA\n\nInventario parcial de ciberdecks depositados\n(342 unidades). Todos con marcas de uso de\ncorvo. Todos con la misma última palabra en\nsu buffer.\n\nCasilla «última palabra»: [LA CASILLA SE\nNIEGA A IMPRIMIRSE]. Reintento fallido ×3.\n\nOBSERVACIÓN: si alguien reclama un deck,\nentregar solo el hardware. el buffer no viaja.\n\n— copia sin firma, dejada en el mostrador",
    when:function(){ return (S.player.stats.maxDepth||0)>=5; } }
];

var TICKER_FRASES = [
  "SEÑAL: 87% · RUIDO: TOLERABLE","EL NÚCLEO SIGUE PARPADEANDO",
  "HAY UN VAULT SIN NOMBRE EN LA CAPA 3","LA LLUVIA DE ESTA SEMANA ES DE 2087",
  "ALGUIEN AÑADIÓ UNA CAPA QUE NO EXISTÍA AYER","HABLA CON VEYRA ANTES DE BAJAR",
  "TRES RASTREADORES VISTOS EN LA CAPA 2","LAS TORRES NO DUERMEN. MENOS TÚ.",
  "TU SEÑAL TIENE UN 3% DE RUIDO BLANCO","EL CABLE NO DUERME. SOLO PARPADEA",
  "UN VAULT SIN NOMBRE ESPERA EN LA CAPA 3","RUIDO BLANCO DETECTADO EN LA CAPA 2",
  "EL TRÁFICO DE LA ZONA 4 CAE EN PICADO A LAS 04:00","TEJIDO SIGUE EN LOS ARCHIVOS. NADIE LO ADMITE",
  "UN CORVO PAGÓ UNA CERVEZA CON UN FRAGMENTO DEL NÚCLEO","NO MIRES DIRECTO AL ESCÁNER. ÉL MIRA TAMBIÉN",
  "LA CALLE COMPRA LO QUE LA CALLE ROBÓ ANTES","Inés Aro PROCESA 12 COSAS A LA VEZ. TÚ SOLO UNA",
  "ESTADO DEL CABLE: TENSO PERO OPERATIVO","ALGUIEN PAGA POR DATOS QUE AÚN NO EXISTEN",
  "LOS DAEMONES NO SUEÑAN. ARCHIVAN","SI TU DECK HUMEA, BAJA EL RITMO. O SUBE EL SEGURO",
  "LA CAPA 0 FINGE SER SEGURA. ES LO QUE HACE PEOR","ORVIK COMPRA RECUERDOS. PAGA MAL. PERO PAGA",
  "UNA SUBESTACIÓN DE LA CAPA 3 LATE TODAVÍA","EL MERCADO NEGRO ABRE CUANDO CIERRA TODO LO DEMÁS",
  "TU ÚLTIMA INMERSIÓN DEJÓ HUELLAS. BORRADORAS","HAY CALOR EN LA RED. Y NO ES EL TUYO",
  "SE BUSCA: ALGUIEN QUE SUPERFICIALICE A TIEMPO","LOS ICE T3 APRENDEN DE TUS FALLOS. NO REPITAS",
  "EL OJO DEL NÚCLEO NO PARPADEA. PARPADEAS TÚ","VUELVE A LA SUPERFICIE ANTES DE QUE LA CIUDAD TE RECUERDE",
  /* entidades del canon (LORE.md §6) */
  "EL CANAL 7 SIGUE CON LA MISMA CANCIÓN. DESDE 2087",
  "FALTA UN DECK EN LA ZANJA 9. NADIE LO RECLAMA",
  "CONTINUIDAD NO APARECE EN NINGÚN ÍNDICE. BUSCA MEJOR",
  "LOS ARTEFACTOS DESCANSO SE VENDEN MEDIO USADOS",
  "SIETE CORPORACIONES, UNA CIUDAD. CONTRASTA QUIEN FIRMA",
  "LA LLUVIA DE 2087 NO HA DICHO QUE SE VAYA",
  /* fondo del sueño (LORE §3, capa 6): solo tras haber bajado hasta ahí */
  {t:"EL FONDO DEL SUEÑO NO SALE EN NINGÚN MAPA. BAJAN IGUAL.",
   when:function(){ return S && S.player && (S.player.stats.maxDepth||0)>=6; }},
  {t:"BAJO EL NÚCLEO HAY ALGO QUE NADIE CARTOGRAFIÓ. LE LLAMAN DE TODAS LAS MANERAS.",
   when:function(){ return S && S.player && (S.player.stats.maxDepth||0)>=6; }},
  {t:"LA CAPA 6 TE LLAMA POR TU NOMBRE. NO LE CONTESTES.",
   when:function(){ return S && S.player && (S.player.stats.maxDepth||0)>=6; }}
];

var NODOS_CAPA = [1,3,4,5,5,3];

/* Eventos aleatorios del grid */
var GRID_EVENTS = [
  {id:"senal", name:"SEÑAL INTERCEPTADA",
   texts:[
     "una transmisión fantasma se materializa en tu RAM. fragmento de datos capturado.",
     "un eco de datos cruza tu ruta y se incrusta en la RAM. botín gratis, corvo.",
     "la red te regala un paquete huérfano. nadie reclamará su pérdida."],
   prob:0.10,
   effect:function(){
    if(inImmersion && ramCap()-inImmersion.dataUsed-storyReservedRam() > pendingJobData(false)){
       inImmersion.data.push({value:randInt(20,50)});
       inImmersion.dataUsed++;
       S.player.stats.data++;
     } else { msg("RAM llena o reservada para tus contratos. la señal se disipó.","ambar"); }
   }},
  {id:"interferencia", name:"INTERFERENCIA",
   texts:[
     "ruido electromagnético. pierdes visión de algunos nodos cercanos.",
     "una tormenta de interferencia borra tus lecturas locales. algunos nodos se desdibujan.",
     "alguien barre tu radar. varios nodos cercanos se vuelven ilegibles."],
   prob:0.08,
   effect:function(){
     /* oculta 2 nodos adyacentes visualmente por 3 movimientos */
     var neighbors=currentNeighbors();
     var hidden=0;
     for(var i=0;i<neighbors.length && hidden<2;i++){
       if(!neighbors[i].done && Math.random()<0.6){
         neighbors[i]._hiddenMoves=3; hidden++;
       }
     }
   }},
  {id:"ayuda", name:"AYUDA DEL CORVO",
   texts:[
     "una señal amiga te inyecta energía. CPU restaurada.",
     "un paquete de reparación anónimo llega a tu deck. CPU restaurada.",
     "manos amigas en la red te dan un empujón. CPU restaurada."],
   prob:0.07,
   effect:function(){
     S.player.cpu=Math.min(S.player.cpu+15, S.player.maxCpu);
   }},
  {id:"trampa", name:"TRAMPA DE SEGURIDAD",
   texts:[
     "activaste un campo de pulso. créditos dispersados, pero ganaste experiencia del incidente.",
     "trampa corporativa: el pulso te vacía algunos créditos, pero aprendes de la quemadura.",
     "un campo de defensa te cobra peaje. a cambio, el incidente te enseña algo."],
   prob:0.06,
   effect:function(){
     S.player.credits=Math.max(0,S.player.credits-30);
     gainXp(20);
   }},
  {id:"corriente", name:"CORRIENTE DE DATOS",
   texts:[
     "un flujo de datos te arrastra una capa más profunda. ¡el calor sube!",
     "la corriente de la red te traga y te escupe más hondo. el calor no perdona.",
     "un remolino de paquetes te lleva una capa hacia abajo. la fiebre sube."],
   prob:0.05,
   effect:function(){
     if(!inImmersion) return;
     var g=inImmersion.grid;
    var nextLayer=Math.min(currentLayer()+1, g.maxDepth);
     var candidates=g.byLayer[nextLayer];
     if(candidates && candidates.length){
       var target=candidates[0];
       inImmersion.current=target.id;
       recordImmersionVisit(target.id);
       if(nextLayer>inImmersion.maxDepthReached) inImmersion.maxDepthReached=nextLayer;
       S.player.stats.maxDepth=Math.max(S.player.stats.maxDepth,nextLayer);
       S.player.heat=clamp(S.player.heat+10,0,100);
     }
   }},
  {id:"fragmento", name:"FRAGMENTO ENCRIPTADO",
   texts:[
     "una caché olvidada contiene datos cifrados. si falta algún informe alcanzable, se desbloquea.",
     "archivos polvorientos resurgen del cable. algún informe pendiente se desbloquea.",
     "un baúl de datos antiguos se abre. si te falta un informe, hoy es tu día."],
   prob:0.04,
   effect:function(){
     var locked=[];
     for(var i=0;i<INTEL.length;i++){
      if(INTEL[i].u!=="recover_project" && (INTEL[i].id!=="tras_nucleo" || S.narrative.readConversations.indexOf("m_copia_final")>=0) && S.intel.indexOf(INTEL[i].id)<0) locked.push(INTEL[i].id);
     }
     if(locked.length){
       var id=pick(locked);
       /* el informe se anuncia con el cartel discreto y, además, con la línea
          del propio evento (mismo patrón que los logros) */
       unlock(id);
       msg("FRAGMENTO ▸ informe desbloqueado: "+intelTitle(id)+".","magenta");
     }
   }},
  /* eco del deck: micro-historia de M-03 (LORE.md §7/§11.10) */
  {id:"eco_deck", name:"ECO DEL DECK",
   texts:[
     "el deck escupe una voz vieja: yo ya bajé aquí. tú ya bajaste aquí. — corvo-3, o lo que quedó.",
     "un portador anterior susurra por tu RAM: no robes donde robé yo. sin fecha, sin nombre.",
     "fragmento de corvo-5: si esto suena, yo no volví. tú todavía puedes. toma el camino de la izquierda.",
     "unas manos que no son las tuyas tantean tu teclado desde dentro. dejan una ruta marcada."],
   prob:0.05,
   effect:function(){
     gainXp(10);
     addLog("ECO DEL DECK ▸ un portador anterior te deja su camino. +10 XP.");
     msg("ECO DEL DECK ▸ el deck recuerda a otro corvo. +10 XP.","magenta");
   }},
  {id:"ruido", name:"RUIDO BLANCO",
   texts:[
     "ráfaga de ruido corporativo. el calor aumenta notablemente.",
     "los sensores corporativos te barren. el calor se dispara.",
     "tu firma electromagnética se hace de rogar. el calor sube sin pedir permiso."],
   prob:0.08,
   effect:function(){
     S.player.heat=clamp(S.player.heat+15,0,100);
   }}
];

/* ---- SISTEMA DE LOGROS ---- */
var ACHIEVEMENTS = [
  {id:"firstBlood", name:"PRIMERA SANGRE", icon:"⚔", desc:"Derrota tu primer ICE.", check:function(){ return S.player.stats.ice>=1; }},
  {id:"ghost", name:"CORVO FANTASMA", icon:"👻", desc:"Completar 3 inmersiones sin combate.", check:function(){ return S.player.stats.ghostRuns>=3; }},
  {id:"collector", name:"RECOLECTOR", icon:"📦", desc:"Recoger 100 datos en total.", check:function(){ return S.player.stats.data>=100; }},
  {id:"speedrunner", name:"VELOCISTA", icon:"⚡", desc:"Superficializar con calor <20 en una carrera.", check:function(){ return S.player.stats.speedrun===true; }},
  {id:"nucleoDefeated", name:"LEYENDA", icon:"👑", desc:"Derrotar al Núcleo.", check:function(){ return S.history.finalDone; }},
  {id:"hackerSupreme", name:"HACKER SUPREMO", icon:"💻", desc:"Alcanzar nivel 10.", check:function(){ return S.player.level>=10; }},
  {id:"merchant", name:"COMERCIANTE", icon:"💰", desc:"Gastar 5000₡ en la tienda.", check:function(){ return (S.player.stats.totalCreditsSpent||0)>=5000; }},
  {id:"explorer", name:"EXPLORADOR", icon:"🔭", desc:"Alcanzar profundidad 5.", check:function(){ return S.player.stats.maxDepth>=5; }},
  {id:"silent", name:"SIGILO PERFECTO", icon:"🤫", desc:"Superficializar 3 veces sin ser detectado.", check:function(){ return (S.player.stats.cleanSrf||0)>=3; }},
  {id:"substations", name:"SUBESTACIONES", icon:"⚡", desc:"Usar 10 subestaciones.", check:function(){ return (S.player.stats.substationsUsed||0)>=10; }},
  {id:"completionist", name:"COMPLETISTA", icon:"📖", desc:"Desbloquear todos los informes.", check:function(){ return INTEL.every(function(e){ return S.intel.indexOf(e.id)>=0; }); }},
  {id:"veteran", name:"VETERANO", icon:"🎖", desc:"Completar 20 inmersiones.", check:function(){ return S.player.stats.immerse>=20; }},
  {id:"daemonSlayer", name:"CAZADOR DE DEMONIOS", icon:"👿", desc:"Derrotar 10 daemons.", check:function(){ return S.player.stats.daemons>=10; }},
  {id:"rich", name:"ADINERADO", icon:"💎", desc:"Tener 5000₡ a la vez.", check:function(){ return S.player.credits>=5000; }},
  {id:"heatMaster", name:"EN LLAMAS", icon:"🔥", desc:"Alcanzar calor 95 sin morir.", check:function(){ return (S.player.stats.maxHeat||0)>=95; }},
  {id:"deepDiver", name:"BUCEADOR PROFUNDO", icon:"🌊", desc:"Alcanzar la capa 4 en una inmersión.", check:function(){ return S.player.stats.maxDepth>=4; }},
  {id:"skillMaster", name:"MAESTRO DE SKILLS", icon:"🎯", desc:"Tener HACK+SIGILO+NERVIOS >= 10.", check:function(){ return (S.player.hack+S.player.sigilo+S.player.nervios)>=10; }},
  {id:"lucky", name:"SUERTUDO", icon:"🍀", desc:"Recoger 5 datos en una sola inmersión sin combate.", check:function(){ return (S.player.stats.luckyRun||0)>=5; }},
  {id:"wealthy", name:"IMPERIO", icon:"🏦", desc:"Acumular 20000₡ en total.", check:function(){ return S.player.stats.credits>=20000; }},
  {id:"fortune50k", name:"FORTUNA", icon:"🪙", desc:"Acumular 50000₡ en total.", check:function(){ return S.player.stats.credits>=50000; }},
  {id:"patrimony100k", name:"PATRIMONIO", icon:"💼", desc:"Acumular 100000₡ en total.", check:function(){ return S.player.stats.credits>=100000; }},
  {id:"magnate250k", name:"MAGNATE", icon:"🏆", desc:"Acumular 250000₡ en total.", check:function(){ return S.player.stats.credits>=250000; }},
  {id:"allFixers", name:"TODOS LOS FIXERS RESPONDEN", icon:"🤝", desc:"Alcanza reputación 5/5 con todos los contactos: VEYRA, ORVIK, Inés Aro y NAEV.", check:function(){ return CONTACTOS_DEF.every(function(c){ return (S.player.rep[c.id]||0)>=5; }); }},
  /* logros del buzón (mensajería · CONTRACTS §19) */
  {id:"mailCartografo", name:"CARTÓGRAFO DEL BUZÓN", icon:"📮", desc:"Leer todas las cartas recibidas de un mismo remitente (3 o más).", check:function(){ return buzonRemitenteCompleto(); }},
  {id:"mailMadrugada", name:"CORREO DE LAS 4", icon:"🌙", desc:"Abrir una carta en plena madrugada (22:00–03:00).", check:function(){ return (S.player.stats.msgsAtNight||0)>=1; }},
  {id:"mailQuienFirma", name:"¿QUIÉN FIRMA?", icon:"✍", desc:"Contestar a una carta cuyo emisor quemó su ruta.", check:function(){ return (S.player.stats.msgsVoidReplies||0)>=1; }}
];

/* ---- TRANSMISIONES ALEATORIAS DE LORE ---- */
var TRANSMISSIONS = [
  "corvo... ¿me oyes?... el cable tiene memoria...",
  "ALERTA: actividad anómala en capa 4. todos fuera.",
  "ORVIK pide el parte de avería antes de escuchar la leyenda de la torre.",
  "fragmento: ...y entonces el ojo se cerró, pero el sueño continuó...",
  "no confíes en las luces de la capa 2. no son de este mundo.",
  "dicen que TEJIDO no murió. se transformó.",
  "la calle habla cuando no hay nadie. escucha.",
  "Celia eligió VEYRA para el canal. Un alias no borra a la persona.",
  "las subestaciones no son lo que parecen. son órganos.",
  "el Núcleo no ataca. Observa.",
  "fragmento interceptado: ...protocolo SILENCIO activado...",
  "la oficina de Inés sigue admitiendo reclamaciones. lleva originales.",
  "el último corvo que bajó a la capa 5... volvió... pero no era él.",
  "las corporaciones no compilan. sueñan con código.",
  "si oyes un heartbeat en la red, sal. YA.",
  "el cable no es una red. Es un organismo.",
  "ORVIK recupera lo que aún está presente. Lo perdido no vuelve por insistir.",
  "NAEV conoce accesos corporativos. Conocer un acceso no concede permiso.",
  "fragmento: ...el silencio no es ausencia. es presencia...",
  "la capa 0 es la más peligrosa. porque es la que crees conocida.",
  "cuando el calor llega a 100, la ciudad te reconoce.",
  "hay un patrón en los daemons. Repiten. Como si recordaran.",
  "el ojo del Núcleo no parpadea. Parpadeas tú.",
  "corvo, si lees esto, no vuelvas a la capa 5.",
  "la señal no es tuya. Nunca lo fue.",
  "fragmento: ...protocolo SILENCIO activado... protocolo SILENCIO activa...",
  "hay un cementerio de decks en la zanja 9. todos con la misma última palabra.",
  "las corporaciones entierran sus errores como paquetes. alguien siempre los desempaqueta.",
  "la primera corvo de la calle no tenía nombre. ahora todos lo lleváis.",
  "si el ruido blanco te nombra, no respondas. sobre todo no respondas.",
  "VEYRA pregunta qué falta por entregar. La calle paga por resultados, no por leyendas.",
  "el firewall de la ciudad es un cuento para dormir a los curiosos.",
  "el deck es prestado. El permiso de uso no incluye la identidad anterior.",
  "los datos que cargas ya estaban en otras RAM. otras manos. otros errores.",
  "en 2091 faltaron once segundos en el registro central. algunos controladores conservaron su diario.",
  "un alias como NAEV no certifica un nombre. Contrasta la documentación.",
  /* entidades del canon (LORE.md §6/§7) */
  "fragmento de registro: ...incidente 2071-V. integración de servicios. causa sin determinar...",
  "dicen que DESCANSO alquila las horas que no vas a recordar. Es un rumor, no un informe.",
  "un archivo dice CONTINUIDAD. El título no demuestra quién firmó.",
  "el fondo del sueño no sale en ningún mapa. por eso todos bajan."
];


/* ============================================================
   1b. FRASES DE ATREZZO (INICIO, navegación, grid)
   ============================================================ */

/* caja "diriz" de INICIO: ambiente de calle + guiños de lore.
   `when` filtra por contexto (opcional); nunca se repite la última frase. */
var FRASES_CALLE = [
  {t:"La calle está quieta. Demasiado quieta para mi gusto."},
  {t:"Lluvia ácida sobre los tejados. Buen clima para bajar al grid."},
  {t:"Alguien ha vuelto a pintar tu nombre en un muro. Mal augurio."},
  {t:"La ciudad parpadea. Tú parpadeas. Nadie admite haber empezado."},
  {t:"El mercado de madrugada huele a ozono y a decisiones malas."},
  {t:"Un dron de vigilancia te ha perdido de vista. Aprovecha."},
  {t:"Los semáforos de la avenida llevan una hora en ámbar. Como tu carrera."},
  {t:"VEYRA paga por algo en TRABAJOS. Pregunta antes de que pague menos."},
  {t:"Tu ciberdeck está tibio. Es normal. Casi."},
  {t:"Tres cafés y ningún contrato resuelto. La noche empieza."},
  {t:"El canal 7 repite la misma canción desde 2087. Hoy te gusta."},
  {t:"La policía de la zona 4 busca a alguien. No a ti. Todavía."},
  {t:"Un taxi volador se detuvo abajo. Nadie bajó."},
  {t:"Tu casero ha preguntado por ti. O por tu deck. Es lo mismo."},
  {t:"La red de vecindario murmura. Ninguna transmisión es para ti."},
  {t:"Hay dinero sucio circulando. Tú solo pides prestada su velocidad."},
  {t:"La ciudad finge dormir para ver qué haces cuando crees que nadie mira."},
  {t:"El calor te sigue hasta la cocina. Enfríate antes de que la ciudad te nombre.", when:function(){ return S.player.heat>70; }},
  {t:"Tu trazo brilla en algún panel corporativo. Baja el perfil, corvo.", when:function(){ return S.player.heat>70; }},
  {t:"Alguien ya ha abierto tu expediente. Y no está completo.", when:function(){ return S.player.heat>70; }},
  {t:"Todavía eres nuevo en el cable. Eso se cura sobreviviendo.", when:function(){ return S.player.level<=2; }},
  {t:"Los veteranos te miran como se mira a un dato sin cifrar.", when:function(){ return S.player.level<=2; }},
  {t:"Tu cuenta engorda. La calle ya se ha enterado.", when:function(){ return S.player.credits>2000; }},
  {t:"Cuentas créditos como quien cuenta días. Los dos son pocos.", when:function(){ return S.player.credits>2000; }},
  {t:"La cartera pesa menos que un paquete de datos.", when:function(){ return S.player.credits<150; }},
  {t:"Sin créditos no hay mejoras. Sin mejoras no hay mañana.", when:function(){ return S.player.credits<150; }},
  {t:"Madrugada. La hora honesta del cable.", when:function(){ return S.clock>=1320 || S.clock<180; }},
  {t:"Las 4 de la mañana: cuando la red dice la verdad por descuido.", when:function(){ return S.clock>=1320 || S.clock<180; }},
  {t:"Has bajado más veces de las que deberías. Ya eres parte del inventario.", when:function(){ return S.player.stats.immerse>=10; }}
];
/* ambiente de INICIO tras derrotar al Núcleo */
var FRASES_CALLE_FIN = [
  "La escritura central sigue revocada. Los servicios preparados continúan con operadores locales.",
  "El hostal conserva luz. La oficina de Inés sigue admitiendo reclamaciones.",
  "Tomás está fuera. Las copias siguen a resguardo y no has aceptado otra misión.",
  "El cable sigue activo. Supervivencia no significa volver a despertar al Núcleo."
];
/* mensaje de bienvenida al abrir INICIO */
var FRASES_INICIO = [
  "bienvenido al cable, corvo. el cable no duerme. Solo parpadea.",
  "de vuelta al deck. la calle te echaba de menos, casi.",
  "todo en calma. sospechoso, ¿no?",
  "sesión abierta. que no te vean teclear.",
  "el cable te reconoce. eso no siempre es bueno."
];
/* variantes de la línea de contratos activos en INICIO */
var FRASES_DIR_CONTRATOS = [
  "contratos activos: ","trabajos en curso: ","no vuelvas sin esto: ","la calle te espera con: "
];
/* mensajes de navegación (uno por vista, sin repetir) */
var FRASES_VIEWS = {
  mensajes:[
    "bandeja del deck. la línea inferior se olvida; esto no.",
    "tus cartas, donde las dejaste. lee cuando quieras.",
    "el buzón no pide prisa. pero ahí sigue."],
  contactos:[
    "canales abiertos. elige con quién arriesgarte.",
    "contactos en línea. ninguno te quiere bien del todo.",
    "los cuatro canales susurran. cobran caro por susurrar."],
  trabajos:[
    "contratos activos. el grid es donde se resuelven.",
    "trabajos sobre la mesa. elige tu próximo riesgo.",
    "la calle tiene tareas. la calle siempre tiene tareas."],
  tienda:[
    "mercado negro. equipo que te mantiene en el cable.",
    "pasillo de ferias. todo usado, todo caro, todo necesario.",
    "armas, mejoras y promesas. nada tiene garantía."],
  estado:[
    "tu hoja en el cable, corvo. guárdala bien.",
    "inventario de un cuerpo que aún resiste.",
    "números fríos para una vida caliente."],
  informes:[
    "archivos cifrados. desbloqueas leyendo el cable.",
    "informes fragmentados. el cable esconde su historia.",
    "cada informe es un trozo de la verdad. Ninguno basta."],
  logros:[
    "logros del cable. %n desbloqueados.",
    "%n logros grabados en el cable. Y contando.",
    "medallas de neón: %n. la calle lleva la cuenta."],
  ayuda:[
    "aquí tienes la guía, corvo. el cable no duerme. Solo parpadea.",
    "manual de supervivencia. léelo antes de que te lo explique la vida.",
    "la guía no miente. casi nunca."]
};
/* mensajes del grid (nodos) — misma semántica, distinta voz */
var FRASES_NODO_VACIO = [
  "nodo vacío. solo cables muertos.",
  "silencio aquí dentro. ni datos, ni trampas. ni gloria.",
  "nodo en blanco. alguien vació esto antes que tú.",
  "polvo digital y ecos. sigue buscando, corvo."
];
var FRASES_NODO_LIMPIO = [
  "· nodo ya limpio.",
  "· ya pasaste por aquí. no queda nada.",
  "· nodo vacío: lo limpiaste tú mismo."
];
var FRASES_PUERTO = [
  "puerto de entrada. explora las capas.",
  "puerto de calle. la red empieza aquí, corvo.",
  "puerto de entrada. cuanto más profundo, más brilla."
];
var FRASES_SUBEST_AGOTADA = [
  "subestación agotada.",
  "subestación seca. ya cobraste de esta."
];
var FRASES_DIP = [
  "sumergido. explora, corvo. vuelve antes de que el calor suba.",
  "conexión establecida. el cable te recuerda: nada dura arriba.",
  "ya estás dentro. respira hondo y no mires al fondo."
];
var FRASES_SURF = [
  "superficializado. de vuelta a la calle, corvo.",
  "cable desconectado. la calle huele a ozono y a dinero.",
  "fuera del grid. tu cráneo sigue en su sitio, casi.",
  "superficializado. la ciudad ni se entera."
];

/* ---- DIÁLOGOS DE NPC POR REPUTACIÓN ---- */
var CONTACT_DIALOGUES = {
  mamaWire:[
    ["La calle paga a los que preguntan. Empieza por abajo, chiquillo.",
     "Así que eres tú. Bajito, escuálido y con buena mano. Eso se vende.",
     "Te lo pongo fácil: yo consigo los trabajos, tú bajas a la red y vuelves vivo. Yo cobro del cliente, tú cobras de mí. ¿Trato?"],
    ["Bien, corvo. Has vuelto vivo. Eso ya es algo.",
     "Sigues respirando. En este oficio eso ya es currículum."],
    ["Te he oído por los canales. No hagas ruido donde no debes.",
     "Tu nombre rueda por los canales. Cuida de que ruede bien."],
    ["Hay algo en las capas bajas que no me gusta. Ten cuidado.",
     "Los que bajan mucho empiezan a oír cosas. Tú ya bajaste mucho."],
    ["Si llegas al Núcleo... recuerda: no todo lo que brilla son datos.",
     "Dicen que el Núcleo enseña cosas que no se olvidan. Piénsalo dos veces."],
    ["Eres mi mejor corvo. No lo digo por dinero.",
     "He perdido a muchos corvos. Tú no vas a ser uno más, ¿verdad?"]
  ],
  doctorSudario:[
    ["Conserva el original. Puedo ordenar bloques presentes, no inventar lo perdido.",
     "Una copia con fecha sirve más que un recuerdo seguro de sí mismo.",
     "El índice conserva referencias; el contenido puede seguir cifrado."],
    ["Vuelves. Eso me dice que aún no has perdido el instinto.",
     "Otro día en el cable. Otro día robado al olvido."],
    ["Las capas bajas guardan recuerdos que no son tuyos. No los toques.",
     "En la capa 3 flotan memorias ajenas. Alguien las perdió. Alguien las busca."],
    ["Si alguna vez escuchas una voz en el cable... no respondas.",
     "Hay voces en la red que solo quieren ser nombradas. No lo hagas."],
    ["Un controlador independiente permite comparar, no adivinar intenciones.",
     "Verifica los acuses antes de atribuir una transferencia."],
    ["Ya guardas la procedencia antes de tocar el archivo. Bien.",
     "La reconstrucción termina donde faltan los bloques."]
  ],
  night0X:[
    ["Compara versiones y horas. No busco trofeos, sino pruebas utilizables.",
     "El fondo paga por la verificación, no por publicar nombres.",
     "Un uso consentido no autoriza cualquier otro uso."],
    ["Interesante. Sigues aquí. La mayoría no vuelve de la capa 2.",
     "Tu expediente crece. Eso es bueno. Y es peligroso."],
    ["El calor no es tu enemigo. Es el precio de saber demasiado.",
     "Cada grado de calor es un nombre en una lista corporativa. El tuyo."],
    ["Las corporaciones tienen miedo. Y cuando tienen miedo, destruyen.",
     "Arriba están nerviosos. Cuando están nerviosos, alguien desaparece."],
    ["Conservaremos originales y un extracto público anonimizado.",
     "No retiraremos un servicio para demostrar una discrepancia."],
    ["La oficina sigue admitiendo casos.",
     "Nuestra reputación no reemplaza los documentos de una reclamación."]
  ],
  kairos:[
    ["Este canal tramita accesos. Mi identidad y mis firmas se contrastan por separado.",
     "Cada autorización deja límites y responsables.",
     "No tengo acceso a todo. No lo supongas por el nombre del canal."],
    ["Una consulta no prueba sabotaje.",
     "Conserva la operación que realmente se ejecutó."],
    ["Automatizar no elimina la responsabilidad humana.",
     "El alcance de un permiso importa tanto como la firma."],
    ["No revocaremos escritura sin verificar servicios locales.",
     "Un combate retira una defensa, no resuelve las reclamaciones."],
    ["La verdad está en la capa 5. Pero la verdad no siempre te quiere viva.",
     "Lo que hay en la capa 5 no es un secreto: es una herida."],
    ["Has estado en todas partes. Ahora eres parte del cable.",
     "Ya no eres un usuario del cable. Eres su tejido. Piénsalo."]
  ]
};

/* ---- ACTIVIDADES DE LA CALLE ---- */
var STREET_ACTIVITIES = [
  {id:"bar", name:"BAR-CLUB ÓCTAVA", desc:"Relájate. Recuperas 10 CPU, pierdes 30 min.",
   icon:"🍷", effect:function(){
     S.player.cpu=Math.min(S.player.cpu+10, S.player.maxCpu);
     S.clock=(S.clock+30)%1440;
     msg("BAR-CLUB ÓCTAVA ▸ +10 CPU, -30 min de tiempo. respira, corvo.","verde");
     addLog("ACTIVIDAD ▸ bar-club Óctava. +10 CPU.");
   }},
  {id:"informantes", name:"MERCADO DE INFORMANTES", desc:"-50₡. Revela nodos en capas 1-2 del próximo grid.",
   icon:"🕵", effect:function(){
     S.player.credits-=50;
     S._revealNextGrid=true;
     msg("INFORMANTES ▸ pagaste 50₡. El próximo grid tendrá nodos revelados en capas 1-2.","cyan");
     addLog("ACTIVIDAD ▸ mercado de informantes. -50₡.");
   }},
  {id:"entreno", name:"ENTRENAMIENTO", desc:"-1 hora. +5 XP.",
   icon:"💪", effect:function(){
     S.clock=(S.clock+60)%1440;
     gainXp(5);
     msg("ENTRENAMIENTO ▸ +5 XP, -1 hora. el cuerpo se mantiene.","verde");
     addLog("ACTIVIDAD ▸ entrenamiento. +5 XP.");
   }}
];


/* ---- 4c. MÚSICA — pistas por escena (las consume cypher_os_audio.js) ---- */

/* Catálogo definitivo: las pistas aún no añadidas se saltan durante la sesión.
   Basta poner los MP3 con estos nombres en music/ y recargar el juego. */
var MUSIC_TRACKS = {
  /* calle / menús */
  ui:[ {f:"music/cyos-ui-cable-no-duerme.mp3", v:.25},
       {f:"music/cyos-ui-lluvia-larga.mp3", v:.24},
       {f:"music/cyos-ui-octava.mp3", v:.25},
       {f:"music/cyos-ui-mercado-de-calle.mp3", v:.24} ],
  /* inmersión en el grid */
  grid:[ {f:"music/cyos-grid-inmersion.mp3", v:.26},
         {f:"music/cyos-grid-el-tejido.mp3", v:.25},
         {f:"music/cyos-grid-los-recuerdos.mp3", v:.26},
         {f:"music/cyos-grid-ruido-blanco.mp3", v:.25} ],
  /* grid con calor alto: la caza empieza */
  gridHot:[ {f:"music/cyos-hot-el-muro.mp3", v:.28},
            {f:"music/cyos-hot-caza-abierta.mp3", v:.28},
            {f:"music/cyos-hot-paranoia.mp3", v:.26} ],
  /* combate contra ICE / daemons */
  combat:[ {f:"music/cyos-combat-icebreakers.mp3", v:.26},
           {f:"music/cyos-combat-claves-hex.mp3", v:.26},
           {f:"music/cyos-combat-memoria-daemon.mp3", v:.27},
           {f:"music/cyos-combat-escaner.mp3", v:.27},
           {f:"music/cyos-combat-santo-cero.mp3", v:.28} ],
  /* EL NÚCLEO */
  boss:[ {f:"music/cyos-nucleo-liturgia.mp3", v:.32},
         {f:"music/cyos-nucleo-despertar.mp3", v:.30} ],
  /* puzzle del vault */
  vault:[ {f:"music/cyos-vault-la-herida.mp3", v:.28},
          {f:"music/cyos-vault-ultima-llave.mp3", v:.28} ]
};

/* ---- boot: líneas de la BIOS (las consume cypher_os_ui.js) ---- */

var FIRMWARE_BUILD = 107;

var BOOT_LINES = [
  ["POST / diagnóstico de encendido", "brand"],
  ["FIRMWARE v1.0 alpha · BUILD " + FIRMWARE_BUILD, "dim"],
  ["memoria ................. 64K OK", "ok"],
  ["bus neural .............. OK", "ok"],
  ["interfaz del deck ....... OK", "ok"],
  ["reloj de calle .......... SINCRONIZADO", "ok"],
  ["archivo personal ........ CIERRE INTERRUMPIDO", "dim"],
  ["  índice ................ DAÑADO", "sig"],
  ["  bloques originales .... CONSERVADOS", "sig"],
  ["enlace remoto ........... SIN CONEXIÓN", "dim"],
  ["interfaz local .......... DISPONIBLE", "ok"]
];

/* ---- combate: fases por tier (las consume cypher_os_combat.js) ---- */

var COMBAT_TYPES = { 1:{phases:1}, 2:{phases:2}, 3:{phases:3}, 4:{phases:4} };

/* ---- contratos: riesgo y «por qué» en la voz del contacto (LORE.md §5) ---- */

var RISK_TXT = { low:"BAJO", med:"MEDIO", high:"ALTO", ext:"EXTREMO" };
/* por qué del contrato, en la voz de quien lo da (LORE.md §5) · claridad §8.5 */
var WHY_JOBS = {
  mamaWire:{
    recoleta:["Un cliente barato quiere inventario antes del cierre de mes. Yo gano con el volumen.",
      "Son datos de vitrina: nadie pregunta de dónde vienen y todos preguntan cuánto cuestan."],
    carrera:["El comprador pide entrega rápida y discreta: sin rastro no hay trato.",
      "Paga el doble si vuelves limpio. El calor le da urticaria."]
  },
  doctorSudario:{
    recoleta:["Hay memorias sueltas en esos nodos. A mí me interesa el archivo; al cliente, el resto.",
      "Un coleccionista de recuerdos busca lotes viejos. Yo filtro lo que no querrías ver."],
    rompehielas:["Hay una puerta cerrada que a un viejo amigo le roba el sueño. Ábrela tú; yo ya no bajo.",
      "Cada ICE derrumbado es una verdad menos. Y hay verdades que se pagan bien."],
    vault:["Dentro de ese vault hay recuerdos que no son tuyos. Tráemelos y hablamos del Núcleo.",
      "Un proyecto viejo que alguien quiere tener antes de morir. Yo hago de intermediario."]
  },
  night0X:{
    vault:["Ese proyecto es un trozo de su imperio. A mí me sobran motivos; a ti te sobran facturas.",
      "El comprador era de los suyos. Da igual: ahora paga como de los nuestros."],
    daemon:["Ese daemon se ha tragado nombres que no debía. Sácamelo de encima a quien los busca.",
      "Alguien paga por ver dormir a ese daemon. Tú cobra por la siesta."],
    carrera:["Entrega exprés para un canal cerrado. Sin preguntas, sin nombres, sin calor."]
  },
  kairos:{
    daemon:["Ese daemon guarda una clave que me pertenece. O me perteneció. Recupérala.",
      "Lo que archiva podría demoler una junta directiva. Yo solo la observo… hoy."],
    rompehielas:["Ese ICE es un código que hay que podar. Ellos plantan jardines; yo llevo la tijera.",
      "Derribar esa defensa abre un hueco en su imperio. Un hueco basta."],
    vault:["Dentro está el error que soy yo antes de serlo. Necesito verlo primero que nadie.",
      "Un proyecto que su propia empresa desmintió. Las desmentidas son el mejor índice."]
  }
};

/* ============================================================
   ÁRBOL DE HABILIDADES (skill tree)
   ============================================================ */

/* stat: atributo que sube el skill (sometido al máximo de 5).
   Los skills sin stat (rompehielos, regeneración) no tocan atributos:
   rompe1/2 dan breakerUp; regen1-3 son pasivos (efecto en moveToNode). */
var SKILL_TREE = [
  {branch:"HACK", cls:"verde", skills:[
    {id:"rompe1", name:"ROMPEMUROS I", desc:"claves -1 longitud", cost:1,
     apply:function(){ S.player.breakerUp++; }},
    {id:"rompe2", name:"ROMPEMUROS II", desc:"claves -1 más", cost:2,
     prereq:"rompe1",
     apply:function(){ S.player.breakerUp++; }},
    {id:"analista1", name:"ANALISTA I", desc:"hack +1 · claves más cortas, datos +10%", cost:1, stat:"hack",
     apply:function(){ S.player.hack++; }},
    {id:"analista2", name:"ANALISTA II", desc:"hack +1 · datos +10% más", cost:2, stat:"hack",
     prereq:"analista1",
     apply:function(){ S.player.hack++; }},
    {id:"analista3", name:"ANALISTA III", desc:"hack +1 · datos +10% más", cost:3, stat:"hack",
     prereq:"analista2",
     apply:function(){ S.player.hack++; }}
  ]},
  {branch:"SIGILO", cls:"cyan", skills:[
    {id:"fantasma1", name:"FANTASMA I", desc:"sigilo +1 · menos calor y emboscadas", cost:1, stat:"sigilo",
     apply:function(){ S.player.sigilo++; }},
    {id:"fantasma2", name:"FANTASMA II", desc:"sigilo +1 · menos calor y emboscadas", cost:2, stat:"sigilo",
     prereq:"fantasma1",
     apply:function(){ S.player.sigilo++; }},
    {id:"evasivo1", name:"EVASIVO I", desc:"sigilo +1 · huir +5%", cost:1, stat:"sigilo",
     apply:function(){ S.player.sigilo++; }},
    {id:"evasivo2", name:"EVASIVO II", desc:"sigilo +1 · huir +5%", cost:2, stat:"sigilo",
     prereq:"evasivo1",
     apply:function(){ S.player.sigilo++; }},
    {id:"evasivo3", name:"EVASIVO III", desc:"sigilo +1 · huir +5%", cost:3, stat:"sigilo",
     prereq:"evasivo2",
     apply:function(){ S.player.sigilo++; }}
  ]},
  {branch:"NERVIOS", cls:"magenta", skills:[
    {id:"tanque1", name:"TANQUE I", desc:"nervios +1 · daño -3 recibido", cost:1, stat:"nervios",
     apply:function(){ S.player.nervios++; }},
    {id:"tanque2", name:"TANQUE II", desc:"nervios +1 · daño -3 recibido", cost:2, stat:"nervios",
     prereq:"tanque1",
     apply:function(){ S.player.nervios++; }},
    {id:"tanque3", name:"TANQUE III", desc:"nervios +1 · daño -3 recibido", cost:3, stat:"nervios",
     prereq:"tanque2",
     apply:function(){ S.player.nervios++; }},
    {id:"regen1", name:"REGENERACIÓN I", desc:"+2 CPU/mov sin combate", cost:1},
    {id:"regen2", name:"REGENERACIÓN II", desc:"+3 CPU/mov sin combate", cost:2,
     prereq:"regen1"},
    {id:"regen3", name:"REGENERACIÓN III", desc:"+4 CPU/mov sin combate", cost:3,
     prereq:"regen2"}
  ]}
];
