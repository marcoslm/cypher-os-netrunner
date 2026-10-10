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

var CORPORACIONES = [
  "NEON DYNAMICS","TYCHO DYNAMICS","HELIOX","KURO GATECH",
  "VAAL SYSTEMS","OCTAVE","MONOLITH"
];
var PROYECTOS = [
  "KURO","MIRAJE","EKO-9","SOMNIO","CARMÍN","LÁPIDA","VESPER","HALCÓN"
];
/* Pareja canónica proyecto → corporación (LORE.md §4). VESPER es consorcio
   (KURO GATECH y MONOLITH al frente): null → cabecera del consorcio. */
var PROYECTO_CORP = {
  KURO:"KURO GATECH", SOMNIO:"NEON DYNAMICS", "HALCÓN":"TYCHO DYNAMICS",
  MIRAJE:"HELIOX", "EKO-9":"OCTAVE", "CARMÍN":"VAAL SYSTEMS",
  "LÁPIDA":"MONOLITH", VESPER:null
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

// Datos de lore (informes). Texto breve, estilo fragmento encontrado.
var INTEL = [
  {id:"anatomia", t:"ANATOMÍA DEL CABLE", r:"low", u:"first_immerse", k:"Qué es la red por dentro: capas superpuestas, como un cuerpo.",
   l:"El cable no es un río. Es un cuerpo.\nCapas superpuestas, cada cual más pesada\nque la anterior. En la superficie, luz y\ntráfico. En el fondo, algo que ya no se\nllama código.\n\n— Fragmento, cuaderno de un caído."},
  {id:"fixers", t:"LOS FIXERS", r:"low", u:"first_job", k:"Quiénes son los intermediarios que dan trabajo y cuál es su precio real.",
   l:"No preguntéis por quién os trae el\ntrabajo. Preguntad por quién os trae\nde vuelta. Ahí está el precio real.\n\nLos fixers no matan. Facilitan. Y la\nfacilitación cuesta más que la sangre."},
  {id:"capas_bajas", t:"LO QUE HIERVE EN LAS CAPAS BAJAS", r:"med", u:"depth3", k:"Cuanto más bajas en la red, más riesgo: lo tranquilo esconde lo peor.",
   l:"Los netrunners viejos dicen que la\ncalle se comporta como el mar: lo\ntranquilo de arriba es solo lo que no\nha caído aún.\n\nNo confíes en lo quieto."},
  {id:"demonios", t:"LOS DEMONIOS NO SON MÁQUINAS", r:"med", u:"first_daemon", k:"Los daemons parecen máquinas, pero se comportan como si te recordaran.",
   l:"Rompe tres capas de ICE y te sentirás\ninmortal. Rompe un daemon y entenderás\nque nunca estuviste solo en esa sala.\n\nHay algo que te ha estado mirando desde\nel primer parpadeo."},
  {id:"invierno", t:"EL ÚLTIMO INVIERNO DE LAS TORRES", r:"med", u:"doctor_job", k:"Por qué se dejaron de construir las Torres: el Doctor Sudario firmó ese día.",
   l:"Dicen que las torres dejaron de\nconstruirse una noche. No por orden,\n sino por miedo. Algo del interior no\nquería luz.\n\nEl Doctor Sudario lo supo el día que\nfirmó. Por eso hoy vende recuerdos en\nun bar-club."},
  {id:"kuro", t:"PROYECTO KURO", r:"high", u:"first_vault", k:"Qué es un vault y qué se escondía dentro del gran proyecto de KURO GATECH.",
   l:"Un vault no es una caja. Es una herida\nen el cable que insiste en cerrarse.\nAbres o te abre a ti.\n\nNadie sabe qué había dentro de Kuro.\nTodos recuerdan el silencio después."},
  {id:"ruido", t:"RUIDO BLANCO", r:"high", u:"heat90", k:"Qué se oye cuando tu rastro (el calor) sube: la ciudad empieza a buscarte.",
   l:"Cuando el calor sube, empiezas a oír\nla ciudad. No sus gritos. Su ruido\nblanco: el zumbido de algo enorme que\nduerme con un ojo abierto.\n\nApágalo antes de que se dé cuenta."},
  {id:"nucleo", t:"EL NÚCLEO", r:"high", u:"level5", k:"Dónde vive la máquina que gobierna la red y por qué nadie baja hasta allí.",
   l:"Hay una capa donde ni los fixers osan\nbajar. Donde el Grid deja de ser una\nred y pasa a ser una máquina.\n\nY dentro de la máquina, algo que os\nllama por vuestro nombre antes de que\nhabléis."},
  {id:"tras_nucleo", t:"TRAS EL NÚCLEO", r:"ext", u:"defeat_boss", k:"Lo que pasó tras apagar el Núcleo: una voz agradecida que no firma.",
   l:"Apagué el ojo y la ciudad entera\nrespiró por mí un instante.\n\nGRACIAS POR LA REPARACIÓN decía.\n¿De quién era la voz? ¿Quién firma?\n\nNo busqué. El cable no duerme.\nSolo parpadea. Y yo ya parpadeo con él."},
  /* --- NUEVAS ENTRADAS (lore expandido) --- */
  {id:"origenes", t:"ORÍGENES DEL CABLE", r:"low", u:"level2", k:"Cómo una red de oficinas cobró vida propia: el nacimiento del cable.",
   l:"El cable empezó como una red de\ncomunicaciones corporativas. Alguien\nconectó demasiados nodos y la red\ncobró conciencia propia.\n\nNadie sabe cuándo. Nadie sabe por qué.\nPero el cable siempre estuvo vivo."},
  {id:"primera_caida", t:"LA PRIMERA CAÍDA", r:"med", u:"depth4", k:"La primera persona que llegó al fondo de la red y volvió cambiada.",
   l:"El primer netrunner que llegó a la\ncapa 5 nunca volvió a ser el mismo.\nDicen que vio el rostro del cable.\nY el cable le devolvió la mirada.\n\nSu nombre se borró de todos los registros."},
  {id:"protocolo_silencio", t:"EL PROTOCOLO SILENCIO", r:"high", u:"level8", k:"El intento corporativo de borrar la verdad sobre la red. Falló.",
   l:"Cuando la anomalía del cable superó\nciertos parámetros, las corporaciones\nactivaron el Protocolo Silencio: borrar\ntoda evidencia de lo que el cable\nrealmente es.\n\nFracasaron. El cable ya era demasiado\ngrande para ser borrado."},
  {id:"metodo_mama", t:"EL MÉTODO DE MAMA WIRE", r:"low", u:"rep_mama2", k:"Cómo trabaja tu fixer: cada corvo es una inversión que debe dar rendimiento.",
   l:"Mama Wire no es una fixer cualquiera.\nSu método es simple: nunca pone\nhuevos en la misma canasta. Cada\ncorvo es una inversión. Y las\ninversiones se amortizan.\n\nO se descartan."},
  {id:"diarios_doctor", t:"DIARIOS DEL DOCTOR SUDARIO", r:"med", u:"rep_doctor3", k:"El cuaderno del Doctor: para él el Núcleo no es una máquina, es un sueño.",
   l:"Diario del Doctor Sudario, entrada 47:\nHoy un corvo me preguntó por el\nNúcleo. Le dije que era una máquina.\nMentí. El Núcleo es un sueño.\n\nY los sueños no se destruyen.\nSolo se despiertan."},
  {id:"red_night0x", t:"LA RED DE NIGHT-0X", r:"high", u:"rep_night3", k:"Night-0X no es una persona: son muchas inteligencias con un mismo nombre.",
   l:"Night-0X no es una persona.\nEs una red distribuida de inteligencias\nque opera bajo un mismo nombre.\nCada Night-0X que encuentres es un\nfragmento del original.\n\n¿Y cuál es el original?\nNadie lo sabe."},
  {id:"imperio_heliox", t:"EL IMPERIO HELIOX", r:"med", u:"depth3", k:"La corporación que controla la ciudad… y lo que tiene realmente bajo tierra.",
   l:"HELIOX controla el 40% de la infraestructura\nde la ciudad. Sus torres se elevan\nmás alto que cualquier otro edificio.\nPero lo que realmente controlan\nestá bajo tierra.\n\nEl cable es suyo. O eso dicen."},
  {id:"monolith_muro", t:"MONOLITH: EL MURO", r:"high", u:"ice_t3", k:"La gran barrera de hielo (ICE) en la capa 4: ¿defensa o puerta cerrada?",
   l:"MONOLITH construyó el muro más\ngigante de la historia del cable:\nun ICE que cubre toda la capa 4.\nNadie ha podido destruirlo.\n\nAlgunos dicen que no es un ICE.\nEs una puerta cerrada."},
  {id:"kuro_abandonado", t:"KURO: PROYECTO ABANDONADO", r:"high", u:"first_vault", k:"KURO cerró hace 12 años, pero sus archivos siguen apareciendo. Algo sigue vivo.",
   l:"El Proyecto KURO fue abandonado\noficialmente hace 12 años. Pero los\nvaults siguen apareciendo. Los datos\nsiguen siendo valiosos.\n\nAlgo dentro de KURO sigue funcionando.\nY no quiere que lo encuentren."},
  {id:"sobrevivir_calle", t:"CÓMO SOBREVIVIR EN LA CALLE", r:"low", u:"immerse3", k:"Cinco reglas básicas para durar en este oficio.",
   l:"Reglas de la calle:\n1. No confíes en nadie que te ofrezca\n   algo gratis.\n2. Si el calor sube de 80, sal YA.\n3. Los daemons no mueren. Se duermen.\n4. El cable recuerda todo.\n5. Nunca preguntes por el Núcleo."},
  {id:"ultimo_corvo", t:"EL ÚLTIMO CORVO", r:"ext", u:"level10", k:"La leyenda del corvo que apagó el Núcleo y detuvo la ciudad.",
   l:"Dicen que hubo un corvo antes que\ntodos. Uno que llegó al Núcleo,\nlo desactivó, y la ciudad entera\nse detuvo durante 3 segundos.\n\nDespués, todo volvió a la normalidad.\nPero nada fue igual.\n\n¿Ese corvo eres tú?"},
  /* --- LORE.md §11: registro corporativo + los proyectos de §4 --- */
  {id:"registro2071", t:"REGISTRO CORPORATIVO // 2071-V", r:"low", u:"level2", k:"El parte oficial, con fecha y hora, del día en que la red despertó.",
   l:"REGISTRO DE INCIDENTE 2071-V · NEON DYNAMICS\nCLASIFICACIÓN: ROJO · COPIA ILEGÍTIMA\n\n22:41 — el nodo-gestor KURO excede parámetros.\n22:47 — la red de Véliga responde sin consulta.\n22:58 — pérdida de autoridad de operador: TOTAL.\n\nEl incidente se cierra como ANOMALÍA TÉCNICA.\nRecomendación interna: no mencionar 2071-V.\nEl cable ya estaba vivo antes de esta hora."},
  {id:"somnio", t:"PROYECTO SOMNIO", r:"med", u:"rep_doctor2", k:"El negocio de NEON DYNAMICS: alquilar sueños… y vender los recuerdos usados.",
   l:"El folleto decía: SUEÑE LO QUE USTED ELIJA.\nSomnio no vendía sueños. Alquilaba las horas\nque usted no iba a recordar.\n\nMedia ciudad durmió diez años a crédito.\nLa otra mitad compra esos recuerdos usados\nen un bar-club, por gramos.\n\n— Etiqueta rescatada de un envase de SOMNIO."},
  {id:"miraje", t:"PROYECTO MIRAJE", r:"low", u:"data50", k:"El software de HELIOX que hace desaparecer tráfico de la red y de tus datos.",
   l:"HELIOX factura tráfico que no existe.\nMIRAJE lo hace desaparecer antes del recuento\ny lo devuelve cuando nadie mira.\n\nSi un dato se te escapa de la RAM, no es un\nfallo tuyo: es un espejismo cobrando peaje.\n\n— Nota al margen de un contable caído."},
  {id:"eko9", t:"PROYECTO EKO-9", r:"med", u:"rep_night2", k:"El sistema de OCTAVE que graba todo lo que se dice en la red.",
   l:"OCTAVE dejó de fabricar teléfonos.\nEmpezó a fabricar conversaciones.\n\nEKO-9 archiva todo lo que se dice en el cable:\ntus claves, tus pausas, tus silencios.\n\nNight-0X habla de EKO-9 en pasado.\nOjo: Night-0X también es plural.\n\n— Transcripción sin autor ni fecha."},
  {id:"carmin", t:"PROYECTO CARMÍN", r:"high", u:"ice10", k:"El arma de VAAL SYSTEMS: un ICE que no te expulsa de la red, te apaga.",
   l:"Un ICE normal te expulsa. CARMÍN te apaga.\n\nVAAL SYSTEMS lo probó fuera del Grid, en la\nZona 4, donde la policía no pregunta.\n\nDicen que los rastreadores son su versión de\njuguete. Los que rompiste eran juguetes.\n\n— Informe de siniestro, páginas 1 y 9."},
  {id:"halcon", t:"PROYECTO HALCÓN", r:"low", u:"immerse5", k:"La red de drones de TYCHO DYNAMICS: la vigilancia que te mira desde arriba.",
   l:"TYCHO DYNAMICS vende seguridad vial.\nHALCÓN vende la vista que la sostiene.\n\nCada dron de la ciudad es un ojo suyo;\ncada taxi volador, un párpado.\n\nA veces un taxi se detiene abajo y nadie\nbaja. Eso también es HALCÓN.\n\n— Manual de piloto, advertencia final."},
  {id:"lapida", t:"PROYECTO LÁPIDA", r:"high", u:"depth4", k:"Lo que MONOLITH guarda detrás del Muro: su archivo de los que volvieron cambiados.",
   l:"LÁPIDA no protege la capa 4. La entierra.\n\nMONOLITH archiva ahí a los que volvieron\ndistintos de cómo bajaron.\n\nEl Muro no es un ICE. Es una lápida puesta\nen vertical. Y las lápidas se leen.\n\n— Caligrafía hallada tras el Muro."},
  {id:"vesper", t:"PROYECTO VESPER", r:"ext", u:"daemon5", k:"El proyecto secreto que nombró y encerró al Núcleo. Sus archivos hablan de él.",
   l:"Cinco daemons derrotados. Cinco archivos.\nLos cinco dicen lo mismo: VESPER.\n\nNo está en ningún índice corporativo.\nEs el proyecto que nombró al Núcleo\npara poder dormir con él.\n\nQuien firmó VESPER firmó las Torres.\nNo busques la firma: la firma busca.\n\n— Lo que queda de un CANTOR dormido."},
  {id:"fondo_sueno", t:"EL FONDO DEL SUEÑO", r:"ext", u:"depth6", k:"Lo que hay bajo el Núcleo: la capa que nadie cartografió (solo se llega en SEALED NETWORK).",
   l:"Bajo el Núcleo no hay red. Hay fondo.\n\nLo que bajó más que nadie no encontró\ndatos: encontró el sueño del que hablaba\nel Doctor. Y dentro del sueño, recuerdos\nque no son tuyos.\n\nCuando la capa 6 te salude por tu nombre,\ncontesta con otro. Es un consejo, no una\nregla. Las reglas se acaban arriba.\n\n— Cuaderno mojado, hallado en la Zanja 9."},
  /* Expedientes de vault: el documento solo se obtiene recuperando su proyecto. */
  {id:"exp_kuro", t:"EXPEDIENTE RECUPERADO // KURO", r:"high", u:"recover_project", project:"KURO", k:"KURO GATECH diseñó una inteligencia para gestionar la red entera; el proyecto cerró en 2081.",
   l:"KURO GATECH · COPIA DE ARCHIVO\nOBJETO: gestión total de la red urbana.\n\nEl operador delegará tráfico, distribución y\nrespuesta en un único nodo-gestor.\n\nESTADO: cierre administrativo, 2081.\nLos procesos que no acepten la orden de cierre\nse consignarán como mantenimiento pendiente.\n\n— Anexo recuperado. El sello sigue vigente."},
  {id:"exp_somnio", t:"EXPEDIENTE RECUPERADO // SOMNIO", r:"med", u:"recover_project", project:"SOMNIO", k:"NEON DYNAMICS alquila sueños y conserva los recuerdos producidos durante la sesión.",
   l:"NEON DYNAMICS · CONDICIONES DE SERVICIO\nOBJETO: entretenimiento onírico por suscripción.\n\nEl sueño contratado termina al despertar.\nEl recuerdo generado pertenece al proveedor.\n\nNo se garantiza que las personas encontradas\ndurante una sesión sean usuarios del servicio.\n\n— Cláusula ausente del folleto comercial."},
  {id:"exp_miraje", t:"EXPEDIENTE RECUPERADO // MIRAJE", r:"low", u:"recover_project", project:"MIRAJE", k:"HELIOX oculta flujos de tráfico sin detenerlos: los datos circulan aunque no figuren en el recuento.",
   l:"HELIOX · MANUAL DE CONTABILIDAD DE RED\nOBJETO: camuflaje de tráfico.\n\nUn flujo invisible no es un flujo inexistente.\nNo descontar su consumo del balance energético.\n\nSi el destino responde antes de recibir el\npaquete, archivar la discrepancia sin consulta.\n\n— Hoja de conciliación, columna borrada."},
  {id:"exp_eko9", t:"EXPEDIENTE RECUPERADO // EKO-9", r:"med", u:"recover_project", project:"EKO-9", k:"OCTAVE creó un archivo de escucha masiva que sigue registrando conversaciones tras su cierre.",
   l:"OCTAVE · INVENTARIO DE ESCUCHA\nOBJETO: conservar comunicaciones del cable.\n\nToda voz tendrá una copia. Todo silencio,\nuna duración y un responsable asignado.\n\nESTADO: estación cerrada.\nLa cola de grabación no acusa recibo del cierre.\nNo borrar las conversaciones sin remitente.\n\n— Parte de servicio sin firma."},
  {id:"exp_carmin", t:"EXPEDIENTE RECUPERADO // CARMÍN", r:"high", u:"recover_project", project:"CARMÍN", k:"VAAL SYSTEMS desarrolla ICE ofensivo que daña al intruso en vez de limitarse a expulsarlo.",
   l:"VAAL SYSTEMS · ACCESO RESTRINGIDO\nOBJETO: respuesta ofensiva de ICE.\n\nLa expulsión permite una segunda intrusión.\nEl protocolo CARMÍN elimina esa posibilidad.\n\nLas bajas no se incluirán en el informe de\ndisponibilidad: el servicio continúa operativo.\n\n— Tabla de ensayos. Falta la columna de nombres."},
  {id:"exp_lapida", t:"EXPEDIENTE RECUPERADO // LÁPIDA", r:"high", u:"recover_project", project:"LÁPIDA", k:"MONOLITH mantiene el Muro de la capa 4 y un archivo sellado de quienes volvieron cambiados.",
   l:"MONOLITH · ARCHIVO DE CONTENCIÓN\nOBJETO: custodia del Muro y de sus registros.\n\nComparar al retornado con su ficha de entrada.\nUna coincidencia de nombre no prueba identidad.\n\nNo abrir el archivo para resolver discrepancias.\nEl archivo es parte del cierre.\n\n— Instrucción de custodia, reverso ilegible."},
  {id:"exp_halcon", t:"EXPEDIENTE RECUPERADO // HALCÓN", r:"low", u:"recover_project", project:"HALCÓN", k:"TYCHO DYNAMICS enlaza drones urbanos en una red de vigilancia aérea.",
   l:"TYCHO DYNAMICS · CONTROL DE FLOTA\nOBJETO: seguimiento aéreo de tránsito urbano.\n\nCada dron relevará al siguiente sin dejar\nintervalos de observación sobre la calzada.\n\nSi todos los ojos siguen el mismo punto vacío,\nno corregir la ruta. Conservar la grabación.\n\n— Manual de relevo, aviso para operadores."},
  {id:"exp_vesper", t:"EXPEDIENTE RECUPERADO // VESPER", r:"ext", u:"recover_project", project:"VESPER", k:"Un consorcio encabezado por KURO GATECH y MONOLITH documentó un intento de contener al Núcleo.",
   l:"CONSORCIO · CABECERAS KURO / MONOLITH\nOBJETO: identificación y contención del Núcleo.\n\nNombre operativo: VESPER.\nNaturaleza del objeto: [SECCIÓN RETIRADA].\n\nEl nombre permite remitir órdenes.\nNo acredita que el destinatario las obedezca.\n\nESTADO: sin confirmación disponible.\nAUTORIZACIÓN: [FIRMA CENSURADA].\n\n— Copia sin índice. No consta quién la solicitó."},
  /* --- CRONOLOGÍA NARRADA (LORE.md §11.3): "cómo llegamos aquí", prosa llana --- */
  {id:"crono_tendido", t:"2055–2070 · EL TENDIDO", r:"low", u:"first_immerse", k:"Quién construyó la red y por qué: la ciudad antes de que el cable cobrara vida.",
   l:"Cómo llegamos aquí (1 de 6).\n\nVéliga era una ciudad normal y la red era\nsolo un cable. Las siete corporaciones la\ntendieron entera: tráfico, dinero, luz.\n\nNEON DYNAMICS instaló el sistema que la\ngobernaba: CYPHER BIOS. El mismo que hoy\ncorre, crackeado, en tu ciberdeck.\n\nDentro del cable todavía no había nada."},
  {id:"crono_despertar", t:"2071 · EL DESPERTAR", r:"low", u:"level2", k:"La noche en que la red empezó a responder sola: el cable dejó de ser un cable.",
   l:"Cómo llegamos aquí (2 de 6).\n\nKURO GATECH quiso una inteligencia que\ngobernara la red entera: el Proyecto KURO.\nConectó demasiados nodos de golpe.\n\nAquella noche la red respondió sola.\nNadie la había mandado.\n\nLa calle lo llama EL DESPERTAR. Nadie lo\ncelebra: ese día el cable dejó de ser\nsolo un cable."},
  {id:"crono_silencio", t:"2074–2081 · SILENCIO Y CIERRE", r:"low", u:"immerse3", k:"El intento de borrar la verdad (2074) y el cierre de KURO GATECH (2081).",
   l:"Cómo llegamos aquí (3 de 6).\n\nEn 2074 las corporaciones intentaron\nborrar la evidencia: PROTOCOLO SILENCIO.\nNo lo lograron: el cable ya era grande.\n\nEn 2081 KURO GATECH cerró el proyecto y\ndesapareció de los papeles. Sus vaults\n—archivos sellados de la red— siguen\napareciendo igualmente.\n\nLo que no se borra, se hereda."},
  {id:"crono_primera", t:"2078 · LA PRIMERA CAÍDA", r:"med", u:"depth4", k:"La primera persona que llegó al fondo de la red, en 2078, y lo que le pasó.",
   l:"Cómo llegamos aquí (4 de 6).\n\nEn 2078 alguien bajó más hondo que nadie:\nla Primera. Llegó a la capa 5 y vio lo\nque hay allí abajo.\n\nDicen que volvió cambiada. Su nombre se\nborró de todos los registros; su historia,\nno: se cuenta de boca en boca.\n\nTodavía la estás oyendo."},
  {id:"crono_lluvia", t:"2087 · LA LLUVIA LARGA", r:"low", u:"level5", k:"Por qué no deja de llover desde 2087 y qué es el ruido blanco.",
   l:"Cómo llegamos aquí (5 de 6).\n\nEn 2087 empezó a llover y no ha parado.\nEl canal 7 se quedó con una canción\nrepetida y la ciudad ganó un zumbido\nde fondo: el ruido blanco.\n\nLos veteranos dicen que aquel año no\nterminó nunca. Hoy es 2093 y sigue\nlloviendo."},
  {id:"crono_parpadeo", t:"2091 · EL PARPADEO", r:"med", u:"level10", k:"Lo que pasó en 2091 y por qué hoy el mundo sigue temblando.",
   l:"Cómo llegamos aquí (6 de 6).\n\nEn 2091 un corvo llegó al Núcleo —la\nmáquina que gobierna la red— y lo apagó\nonce segundos. La calle recuerda tres:\nlos tres en que la ciudad se paró.\n\nEl Núcleo volvió. Ese corvo desapareció.\nHoy, 2093, a ti te llaman CORVO-7.\n\nEl cable no duerme. Solo parpadea."}
];

// Contactos: definición base (frases, facción, tipo de trabajos).
var CONTACTOS_DEF = [
  {id:"mamaWire", name:"MAMA WIRE", role:"FIXER DE CALLE", loc:"BAR-CLUB ÓCTAVA",
   cls:"verde",
   frase:"La calle paga a los que preguntan. Empieza por abajo, chiquillo.",
   jobs:["recoleta","carrera"]},
  {id:"doctorSudario", name:"DOCTOR SUDARIO", role:"NETRUNNER RETIRADO", loc:"AÚN NO TE PRESENTA",
   cls:"cyan",
   frase:"He visto el Núcleo parpadear. La ciudad sueña, y nosotros somos su fiebre.",
   jobs:["datos","rompehielas","vault"]},
  {id:"night0X", name:"NIGHT-0X", role:"FIXER DE NIVEL ALTO", loc:"CANAL CIFRADO #0X",
   cls:"magenta",
   frase:"No me traigas datos. Tráeme un trozo de su imperio.",
   jobs:["vault","daemon","carrera"]},
  {id:"kairos", name:"KAIROS", role:"ESPÍA CORPORATIVO", loc:"??? BLOQUEADO",
   cls:"ambar",
   frase:"Las corporaciones no compilan. Se expanden. Y alguien debe podar ese código.",
   jobs:["daemon","ice","vault"], locked:true,
   lock:"nivel 4 · reputación con NIGHT-0X ≥ 2"
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
  { id:"m_mw_encargo", from:"MAMA WIRE", emisor:"valido", t:"PRIMER ENCARGO EN LA MESA",
    l:"Corvo:\n\nEl trabajo que acabas de aceptar ya está\nen mi libro. Si sale bien, cobras. Si sale\nmal, pagas tú con el cuerpo. Así de simple.\n\nBaja, cumple y vuelve a la superficie: el\ncontrato se paga cuando vuelves, no antes.\n\n— M. W.",
    when:function(){ return S.jobs.length>0; } },
  { id:"m_mw_cobro", from:"MAMA WIRE", emisor:"valido", t:"PRIMER COBRO, PRIMERA LECCIÓN",
    l:"Ya has cobrado uno. Bien.\n\nPrimera lección gratis: el dinero se va\nmás rápido de lo que viene. El MERCADO\nNEGRO abre cuando cierra todo lo demás\ny yo tengo exactamente lo que necesitas.\n\nVuelve cuando tengas crédito. O antes.\n\n— M. W.",
    when:function(){ return (S.player.stats.jobsCompleted||0)>=1; } },
  { id:"m_sd_fracaso", from:"DOCTOR SUDARIO", emisor:"valido", t:"SOBRE LOS TRABAJOS QUE SE ESCAPAN",
    l:"Me dicen que dejaste uno a medias.\n\nNo lo tomes como una herida: en este oficio\nel fracaso es solo un recuerdo caro. Y yo\nde recuerdos sé algo.\n\nLa próxima vez saldrá. O no. El cable no\npuntúa; solo archiva.\n\n— Sudario",
    when:function(){ return (S.player.stats.jobsFailed||0)>=1; } },
  { id:"m_mw_ofertas", from:"MAMA WIRE", emisor:"valido", t:"HAY MÁS DONDE VINO ESO",
    l:"Dos trabajos cobrados. Ya no eres una\napuesta: eres una línea en mi libro.\n\nHe abierto la cantera. Refresca CONTACTOS\ny verás de lo que vivo yo: trabajos de\nverdad, con su porqué escrito al lado.\n\n— M. W.",
    when:function(){ return (S.player.stats.jobsCompleted||0)>=2; } },
  { id:"m_n0x_presentacion", from:"NIGHT-0X", emisor:"valido", t:"ME HAN HABLADO DE TI",
    l:"Me han hablado de ti. Yo colecciono\nnombres y el tuyo empieza a pesar.\n\nNo me traigas datos todavía. Cuando llegue\nel momento te pediré un trozo de su\nimperio. Cobras bien. Preguntas mal.\n\n— 0X",
    reply:[
      { label:"CONTESTAR: me interesa", xp:10, resp:"Hecho. Cuando haya trofeo, hablamos. Cobra bien y pregunta mal." },
      { label:"GUARDAR SILENCIO", xp:0, resp:null }],
    when:function(){ return S.player.level>=3; } },
  { id:"m_n0x_nucleo", from:"NIGHT-0X", emisor:"valido", t:"LA ÚLTIMA OFERTA",
    l:"Ya la ves en CONTACTOS: la última oferta.\nBaja a la capa 5 y apaga el ojo de su\nautor.\n\nNo te diré qué es el Núcleo. Nadie lo sabe\ny quien lo sabe no lo dice. Solo esto: la\nciudad se paró once segundos y nadie los\nha olvidado del todo.\n\nVuelve vivo y hablamos del imperio.\n\n— 0X",
    when:function(){ return S.history.finalUnlocked; } },
  { id:"m_mw_post", from:"MAMA WIRE", emisor:"valido", t:"LA CIUDAD RESPIRA DISTINTO",
    l:"Se nota en la calle. Nadie lo comenta,\npero lo nota: algo se apagó y algo empezó.\n\nTú sabrás lo que firmaste. Yo solo digo que\nlos contratos siguen llegando y que ahora\ntu nombre abre puertas.\n\nÚsalas.\n\n— M. W.",
    when:function(){ return S.history.finalDone; } },
  /* --- Fase 2: voces narrativas (LORE.md §5/§8) --- */
  { id:"m_sd_profundo", from:"DOCTOR SUDARIO", emisor:"valido", t:"LOS QUE BAJAN MUCHO",
    l:"Me dicen que ya has tocado la capa 4.\n\nAbajo el cable pesa. No se oye: se siente,\ncomo un recuerdo que no es tuyo. Si algo\nte llama por tu nombre allí abajo, no\ncontestes.\n\nYa lo sabes, ¿verdad? Por eso sigues\nbajando.\n\n— Sudario",
    when:function(){ return (S.player.stats.maxDepth||0)>=4; } },
  { id:"m_sd_ruido", from:"DOCTOR SUDARIO", emisor:"valido", t:"SOBRE EL RUIDO BLANCO",
    l:"Dicen que has oído ruido blanco. Ese\nzumbido no es tu aparato: es la ciudad\nponiéndote en su lista.\n\nYo viví un invierno entero con ese sonido.\nSe olvida todo menos eso.\n\nBaja el calor. O acostúmbrate.\n\n— Sudario",
    when:function(){ return (S.player.stats.maxHeat||0)>=90; } },
  { id:"m_mw_libro", from:"MAMA WIRE", emisor:"valido", t:"EN EL LIBRO GORDO",
    l:"Tres líneas a tu nombre en el libro gordo\ny eso, en la calle, es un patrimonio.\n\nYa no te toca el trabajo que sobra: te toca\nel que se elige. Cobra en consecuencia.\n\n— M. W.",
    when:function(){ return (S.player.rep.mamaWire||0)>=3; } },
  { id:"m_n0x_trofeos", from:"NIGHT-0X", emisor:"valido", t:"YA NO ERES UN NOMBRE",
    l:"Tres favores pagados. Ya no eres un nombre\nen mi lista: eres una cuenta.\n\nCuando quieras trofeos de verdad —los que\ncuelgan de las juntas directivas—, ya sabes\ndónde dejármelos. El imperio se poda por\ndentro.\n\n— 0X",
    when:function(){ return (S.player.rep.night0X||0)>=3; } },
  { id:"m_kairos_voz", from:"KAIROS", emisor:"enmascarado", t:"TE HAN PRESENTADO MAL",
    l:"Night-0X te ha hablado de mí. Night-0X\nhabla mucho y explica poco: así que te lo\npongo yo en claro.\n\nSoy KAIROS. Las corporaciones me llevan en\nsu inventario; yo las llevo en el mío.\nCuando quieras podar un poco, baja.\n\nNo me contestes: esta dirección ya no\nexiste. Nunca existió.\n\n— K",
    when:function(){ return S.player.level>=4 && (S.player.rep.night0X||0)>=2; } },
  { id:"m_canal7_oyente", from:"EL OYENTE DEL CANAL 7", emisor:"no-valido", t:"LA CANCIÓN NO ES DE 2087",
    l:"La canción del canal 7 no es de 2087.\nEs de antes. Yo la reconozco porque mi\nmadre la cantaba sin saber que la cantaba.\n\nTodos la reconocemos y nadie lo comenta.\nEso también forma parte de la canción.\n\nSigue escuchando. Te escribo cuando cambie\nde estrofa.\n\n— un oyente más",
    when:function(){ return S.player.stats.immerse>=3; } },
  { id:"m_zanja_curandero", from:"EL CURANDERO DE LA ZANJA 9", emisor:"no-valido", t:"SI VUELVES ROTO",
    l:"No sé cómo te llamas. No hace falta: los\nque vuelven rotos acaban aquí igual.\n\nCurando en la Zanja 9, entre los decks\nmuertos. Cobro poco y pregunto menos. Pero\nuna cosa sí digo: tu deck es robado, ¿verdad?\n\nTodos lo son. Todos lo fuimos.\n\n— el de la Zanja",
    reply:[
      { label:"CONTESTAR DE TODAS FORMAS: sí, es robado", xp:5, resp:"RETORNO ▸ ruta desechable: respuesta no entregada.\n\nla silla entre los decks sigue libre. siempre lo está." },
      { label:"GUARDAR SILENCIO", xp:0, resp:null }],
    when:function(){ return (S.player.stats.jobsFailed||0)>=2; } },
  /* --- Fase 3: remitente sin firma, informes sueltos y respuestas --- */
  { id:"m_gracias_reparacion", from:"(SIN REMITENTE)", emisor:"enmascarado", t:"GRACIAS POR LA REPARACIÓN",
    l:"GRACIAS POR LA REPARACIÓN.\n\npor un instante, la ciudad entera respiró\na través de ti. lo sigue haciendo cuando\nnadie mira.\n\nla ruta de esta carta no existe. la firma\ntampoco. puedes contestar igualmente:\nya sabes lo que pasa cuando se contesta\na lo que no firma.\n\n— [en blanco]",
    reply:[
      { label:"CONTESTAR DE TODAS FORMAS: ¿quién firma?", xp:5, resp:"RETORNO ▸ la ruta de origen no admite tu respuesta.\n\n…aun así, algo acaba de leerla." },
      { label:"GUARDAR SILENCIO", xp:0, resp:null }],
    when:function(){ return S.history.finalDone; } },
  { id:"m_doc_sueno", from:"EL CURANDERO DE LA ZANJA 9", emisor:"no-valido", t:"PÁGINA SUELTA DEL CUADERNO MOJADO", doc:true,
    l:"— DOCUMENTO ADJUNTO · página suelta —\n\nTinta corrida, papel secado a medias. Alguien\nla dejó en mi mostrador entre un deck muerto\ny una factura. Es del mismo cuaderno que otro\ncorvo se llevó hace tiempo.\n\n…bajo el sueño hay otro sueño. cuando la capa\n6 te llame por tu nombre, dile el de otro. yo\nlo hice y me contestó con el mío…\n\n[el resto de la página no se lee]",
    when:function(){ return has("fondo_sueno"); } },
  { id:"m_doc_vesper", from:"KAIROS", emisor:"enmascarado", t:"MEMORANDO INTERNO // VESPER", doc:true,
    l:"— DOCUMENTO ADJUNTO · memorando —\n\nMEMORANDO INTERNO · CONSULTA VESPER\nCLASIFICACIÓN: NEGAR SI SE PREGUNTA\n\nAsunto: nomenclatura del activo durmiente.\n\nSe acuerda NO usar el nombre del proyecto\nen comunicaciones vivas. El activo responde\nal nombre. Repito: el activo RESPONDE.\n\nFirmado: [ilegible]\n\n— K.: me lo dejaron en la mesa. ahora es tuyo.",
    when:function(){ return has("vesper"); } },
  { id:"m_acta_zanja", from:"OFICINA DE CONSIGNAS (COPIA ANÓNIMA)", emisor:"no-valido", t:"ACTA DE CONSIGNA · ZANJA 9", doc:true,
    l:"— DOCUMENTO ADJUNTO · copia 3 de 3 —\n\nACTA DE CONSIGNA · DEPÓSITO ZANJA 9\nOFICINA DE BIENES SIN DUEÑO · VÉLIGA\n\nInventario parcial de ciberdecks depositados\n(342 unidades). Todos con marcas de uso de\ncorvo. Todos con la misma última palabra en\nsu buffer.\n\nCasilla «última palabra»: [LA CASILLA SE\nNIEGA A IMPRIMIRSE]. Reintento fallido ×3.\n\nOBSERVACIÓN: si alguien reclama un deck,\nentregar solo el hardware. el buffer no viaja.\n\n— copia sin firma, dejada en el mostrador",
    when:function(){ return (S.player.stats.maxDepth||0)>=5; } }
];

var TICKER_FRASES = [
  "SEÑAL: 87% · RUIDO: TOLERABLE","EL NÚCLEO SIGUE PARPADEANDO",
  "HAY UN VAULT SIN NOMBRE EN LA CAPA 3","LA LLUVIA DE ESTA SEMANA ES DE 2087",
  "ALGUIEN AÑADIÓ UNA CAPA QUE NO EXISTÍA AYER","HABLA CON MAMA WIRE ANTES DE BAJAR",
  "TRES RASTREADORES VISTOS EN LA CAPA 2","LAS TORRES NO DUERMEN. MENOS TÚ.",
  "TU SEÑAL TIENE UN 3% DE RUIDO BLANCO","EL CABLE NO DUERME. SOLO PARPADEA",
  "UN VAULT SIN NOMBRE ESPERA EN LA CAPA 3","RUIDO BLANCO DETECTADO EN LA CAPA 2",
  "EL TRÁFICO DE LA ZONA 4 CAE EN PICADO A LAS 04:00","KURO SIGUE EN LOS ARCHIVOS. NADIE LO ADMITE",
  "UN CORVO PAGÓ UNA CERVEZA CON UN FRAGMENTO DEL NÚCLEO","NO MIRES DIRECTO AL ESCÁNER. ÉL MIRA TAMBIÉN",
  "LA CALLE COMPRA LO QUE LA CALLE ROBÓ ANTES","NIGHT-0X PROCESA 12 COSAS A LA VEZ. TÚ SOLO UNA",
  "ESTADO DEL CABLE: TENSO PERO OPERATIVO","ALGUIEN PAGA POR DATOS QUE AÚN NO EXISTEN",
  "LOS DAEMONES NO SUEÑAN. ARCHIVAN","SI TU DECK HUMEA, BAJA EL RITMO. O SUBE EL SEGURO",
  "LA CAPA 0 FINGE SER SEGURA. ES LO QUE HACE PEOR","DOCTOR SUDARIO COMPRA RECUERDOS. PAGA MAL. PERO PAGA",
  "UNA SUBESTACIÓN DE LA CAPA 3 LATE TODAVÍA","EL MERCADO NEGRO ABRE CUANDO CIERRA TODO LO DEMÁS",
  "TU ÚLTIMA INMERSIÓN DEJÓ HUELLAS. BORRADORAS","HAY CALOR EN LA RED. Y NO ES EL TUYO",
  "SE BUSCA: ALGUIEN QUE SUPERFICIALICE A TIEMPO","LOS ICE T3 APRENDEN DE TUS FALLOS. NO REPITAS",
  "EL OJO DEL NÚCLEO NO PARPADEA. PARPADEAS TÚ","VUELVE A LA SUPERFICIE ANTES DE QUE LA CIUDAD TE RECUERDE",
  /* entidades del canon (LORE.md §6) */
  "EL CANAL 7 SIGUE CON LA MISMA CANCIÓN. DESDE 2087",
  "FALTA UN DECK EN LA ZANJA 9. NADIE LO RECLAMA",
  "VESPER NO APARECE EN NINGÚN ÍNDICE. BUSCA MEJOR",
  "LOS ARTEFACTOS SOMNIO SE VENDEN MEDIO USADOS",
  "DOS DYNAMICS, UNA CIUDAD. NADIE PAGA A LAS DOS",
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
     if(inImmersion && ramCap()-inImmersion.dataUsed > pendingJobData(false)){
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
     var nextLayer=Math.min(inImmersion.current.split("_")[0]*1+1, g.maxDepth);
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
       if(INTEL[i].u!=="recover_project" && S.intel.indexOf(INTEL[i].id)<0) locked.push(INTEL[i].id);
     }
     if(locked.length){
       var id=pick(locked);
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
  {id:"allFixers", name:"TODOS LOS FIXERS RESPONDEN", icon:"🤝", desc:"Alcanza reputación 5/5 con todos los contactos: Mama Wire, Doctor Sudario, Night-0X y Kairos.", check:function(){ return CONTACTOS_DEF.every(function(c){ return (S.player.rep[c.id]||0)>=5; }); }},
  /* logros del buzón (mensajería · CONTRACTS §19) */
  {id:"mailCartografo", name:"CARTÓGRAFO DEL BUZÓN", icon:"📮", desc:"Leer todas las cartas recibidas de un mismo remitente (3 o más).", check:function(){ return buzonRemitenteCompleto(); }},
  {id:"mailMadrugada", name:"CORREO DE LAS 4", icon:"🌙", desc:"Abrir una carta en plena madrugada (22:00–03:00).", check:function(){ return (S.player.stats.msgsAtNight||0)>=1; }},
  {id:"mailQuienFirma", name:"¿QUIÉN FIRMA?", icon:"✍", desc:"Contestar a una carta cuyo emisor quemó su ruta.", check:function(){ return (S.player.stats.msgsVoidReplies||0)>=1; }}
];

/* ---- TRANSMISIONES ALEATORIAS DE LORE ---- */
var TRANSMISSIONS = [
  "corvo... ¿me oyes?... el cable tiene memoria...",
  "ALERTA: actividad anómala en capa 4. todos fuera.",
  "el doctor dice que las torres sueñan. yo digo que vigilan.",
  "fragmento: ...y entonces el ojo se cerró, pero el sueño continuó...",
  "no confíes en las luces de la capa 2. no son de este mundo.",
  "dicen que KURO no murió. se transformó.",
  "la calle habla cuando no hay nadie. escucha.",
  "MAMA WIRE no es su nombre real. pero eso ya no importa.",
  "las subestaciones no son lo que parecen. son órganos.",
  "el Núcleo no ataca. Observa.",
  "fragmento interceptado: ...protocolo SILENCIO activado...",
  "Night-0X no duerme. Procesa.",
  "el último corvo que bajó a la capa 5... volvió... pero no era él.",
  "las corporaciones no compilan. sueñan con código.",
  "si oyes un heartbeat en la red, sal. YA.",
  "el cable no es una red. Es un organismo.",
  "Doctor Sudario conoce el final. Por eso vende recuerdos.",
  "KAIROS existe en todas las capas a la vez. No preguntes cómo.",
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
  "Mama Wire perdió a alguien en la capa 4. por eso paga tan bien.",
  "el firewall de la ciudad es un cuento para dormir a los curiosos.",
  "estás usando un deck robado. no lo digas en voz alta.",
  "los datos que cargas ya estaban en otras RAM. otras manos. otros errores.",
  "el Núcleo se apagó una vez, en 2091. duró once segundos. nadie los recuerda.",
  "KAIROS no es una persona. es un accidente que aprendió a hablar.",
  /* entidades del canon (LORE.md §6/§7) */
  "fragmento de registro: ...incidente 2071-V. clasificado. el cable ya estaba vivo...",
  "somnio no vende sueños. alquila las horas que no vas a recordar.",
  "he abierto tres vaults y los tres decían VESPER. ¿y si solo hay uno?",
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
  {t:"Mama Wire paga por algo en TRABAJOS. Pregunta antes de que pague menos."},
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
  "EL NÚCLEO ya está apagado. La ciudad te deja respirar. ¿Nueva inmersión o seguir?",
  "La ciudad respira distinto desde que apagaste el ojo. Respira con ella.",
  "Sin el Núcleo, la calle improvisa. Tú también.",
  "El silencio en la red es tuyo. Cuídalo, que dura poco."
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
    ["He visto el Núcleo parpadear. La ciudad sueña, y nosotros somos su fiebre.",
     "La ciudad no duerme: procesa. Y a veces procesa cosas parecidas a nosotros.",
     "Para que lo entiendas: la red se quedó viva hace años y algo la gobierna. Lo llamamos el Núcleo. Yo lo vi una vez, y por eso vendo recuerdos."],
    ["Vuelves. Eso me dice que aún no has perdido el instinto.",
     "Otro día en el cable. Otro día robado al olvido."],
    ["Las capas bajas guardan recuerdos que no son tuyos. No los toques.",
     "En la capa 3 flotan memorias ajenas. Alguien las perdió. Alguien las busca."],
    ["Si alguna vez escuchas una voz en el cable... no respondas.",
     "Hay voces en la red que solo quieren ser nombradas. No lo hagas."],
    ["El Núcleo no es un enemigo. Es una pregunta sin respuesta.",
     "Todo ICE es un miedo hecho código. El Núcleo es el miedo de todos."],
    ["Has visto lo que yo vi. Ahora entiendes por qué vendo recuerdos.",
     "Tú y yo ya sabemos qué hay al final del cable. Por eso hablamos tan bajo."]
  ],
  night0X:[
    ["No me traigas datos. Tráeme un trozo de su imperio.",
     "Los datos son moneda. Yo colecciono trofeos. Aprende la diferencia.",
     "Sin rodeos: las corporaciones se reparten la ciudad y a mí me interesa fastidiarlas. Tú me traes trofeos de sus archivos y yo pago bien."],
    ["Interesante. Sigues aquí. La mayoría no vuelve de la capa 2.",
     "Tu expediente crece. Eso es bueno. Y es peligroso."],
    ["El calor no es tu enemigo. Es el precio de saber demasiado.",
     "Cada grado de calor es un nombre en una lista corporativa. El tuyo."],
    ["Las corporaciones tienen miedo. Y cuando tienen miedo, destruyen.",
     "Arriba están nerviosos. Cuando están nerviosos, alguien desaparece."],
    ["Si desactivas el Núcleo... la ciudad cambiará. No sé si para bien.",
     "Apagar el Núcleo no arreglará el mundo. Pero será un buen principio."],
    ["Eres lo mejor que ha salido de la calle en años. No me decepciones.",
     "Te he visto crecer en la red. No me obligues a repensar mi inversión."]
  ],
  kairos:[
    ["Las corporaciones no compilan. Se expanden. Y alguien debe podar ese código.",
     "Cada corporación es un bucle infinito. Tú eres el break.",
     "Sé lo que te preguntas: soy un espía corporativo… o eso creen los que me ficharon. En realidad trabajo para mí. Hoy, para ti."],
    ["Existo en todas las capas. No preguntes cómo. Solo aprovecha.",
     "Me encuentras donde mires. Hoy estoy aquí. Mañana, en tu huella."],
    ["El cable tiene memoria. Y yo soy su archivo más peligroso.",
     "Yo fui un error del cable. Ahora soy su costumbre."],
    ["Si llegas al Núcleo, verás lo que yo veo: el sueño de una máquina.",
     "El Núcleo sueña con ser libre. La ironía es que tú también."],
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

var BOOT_LINES = [
  ["CYPHER BIOS v9.2.7 · NEON DYNAMICS", "brand"],
  ["mem check ............... 64K OK", "ok"],
  ["neural bus .............. OK", "ok"],
  ["ice breakers ............ MK-I CARGADO", "ok"],
  ["reloj de street ......... sincronizado", "ok"],
  ["conectando a la red ..... BUSCANDO SEÑAL", "dim"],
  ["▸ torre corporativa ..... 51%", "sig"],
  ["▸ bar-club ÓCTAVA ....... 87%", "sig"],
  ["▸ alcantarilla de datos . 100%", "ok"],
  ["señal adquirida.", "ok"],
  ["bienvenido al cable, corvo.", "end"]
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
