/* Reporte F-03: textos y atributos de partidas importadas nunca inyectan HTML/JS. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
const clone=v=>JSON.parse(JSON.stringify(v));
async function run(options={}){
 let passes=0,fails=0;
 async function check(label,fn){
  const g=loadGame({timers:'virtual',strictDOM:true,canvas:'stub',seed:2093});
  try{
   g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();document.getElementById("intro").style.display="none";');
   await fn(g);passes++;console.log('  ✔ '+label);
  }catch(e){fails++;console.log('  ✖ '+label+': '+e.stack);}
  finally{g.dispose();}
 }
 console.log('\nIMPORTACIÓN · textos y atributos seguros…');
 await check('título/descripción/por qué importados se renderizan como texto literal',g=>{
  const cand=clone(g.run('S'));
  cand.offers=[{id:'safe-job-1',type:'recoleta',n:1,contact:'mamaWire',reward:10,xp:0,risk:'low',
    title:'<button id="audit-inject" onclick="window.__auditInjected=true">MARCADOR</button>',
    desc:'<svg id="audit-svg" onload="window.__auditInjected=true"></svg> desc',
    why:'<img id="audit-img" src=x onerror="window.__auditInjected=true"> why'}];
  assert.equal(g.run('importGameState('+JSON.stringify(cand)+')'),true);
  g.run('showView("contactos");');
  const doc=g.sb.document;
  assert.equal(doc.getElementById('audit-inject'),null,'el botón inyectado no existe');
  assert.equal(doc.getElementById('audit-svg'),null,'el SVG inyectado no existe');
  assert.equal(doc.getElementById('audit-img'),null,'la imagen inyectada no existe');
  const html=doc.getElementById('panel-scroll').innerHTML;
  assert.ok(html.indexOf('&lt;button')>=0,'el marcador se muestra escapado');
  assert.ok(html.indexOf('&lt;svg')>=0,'el SVG se muestra escapado');
  assert.ok(html.indexOf('&lt;img')>=0,'la imagen se muestra escapada');
  assert.equal(g.run('typeof window.__auditInjected'), 'undefined');
 });
 await check('ids con comillas o etiquetas se rechazan antes de renderizar',g=>{
  for(const id of ['a" onclick="x','a<b>','a b','x'.repeat(65),'']){
   const cand=clone(g.run('S'));
   cand.offers=[{id,type:'recoleta',n:1,contact:'mamaWire',reward:10,xp:0,risk:'low',title:'T',desc:'D'}];
   assert.equal(g.run('importGameState('+JSON.stringify(cand)+')'),false,'id rechazado: '+id);
  }
  assert.equal(g.run('S.offers.length'),0,'la partida se conserva sin sustituir');
 });
 await check('enums dañados de riesgo, contacto y proyecto se rechazan',g=>{
  const cases=[
   [{risk:'low"><b>x'},'riesgo'],
   [{contact:'mamaWire><script'},'contacto'],
   [{type:'vault',n:1,project:'" onmouseover="x',targetDepth:3},'proyecto']
  ];
  for(const c of cases){
   const cand=clone(g.run('S'));
   cand.offers=[Object.assign({id:'safe-job-2',type:'recoleta',n:1,contact:'mamaWire',reward:10,xp:0,risk:'low',title:'T',desc:'D'},c[0])];
   assert.equal(g.run('importGameState('+JSON.stringify(cand)+')'),false,c[1]+' rechazado');
  }
  const ok=clone(g.run('S'));
  ok.offers=[{id:'safe-job-3',type:'vault',n:1,contact:'mamaWire',reward:10,xp:0,risk:'high',title:'VAULT',desc:'D',project:'KURO',targetDepth:3}];
  assert.equal(g.run('importGameState('+JSON.stringify(ok)+')'),true,'vault válido sigue aceptándose');
 });
 await check('textos enormes no abusan de la interfaz',g=>{
  const cand=clone(g.run('S'));
  cand.offers=[{id:'safe-job-4',type:'recoleta',n:1,contact:'mamaWire',reward:10,xp:0,risk:'low',
    title:'x'.repeat(201),desc:'D'}];
  assert.equal(g.run('importGameState('+JSON.stringify(cand)+')'),false);
  assert.equal(g.run('importText("x".repeat(81),80)'),false,'nombre de nodo acotado por la primitiva');
  g.run('window.__grid=generateGrid(2,false);');
  const inm={grid:g.run('window.__grid'),depth:2,current:g.run('window.__grid.entry'),dataUsed:0,data:[],
    maxDepthReached:1,moves:0,combatOccurred:false,enemiesDefeated:0,
    enemyCounts:{ice:0,daemons:0,trackers:0,nucleo:0},enemyCountsPartial:false,
    visited:[g.run('window.__grid.entry')],visitsPartial:false,exploredNotified:false,exhaustedNotified:false};
  const good=JSON.parse(JSON.stringify(inm));
  assert.equal(g.run('validImportImmersion('+JSON.stringify(good)+',6)'),true,'una red válida sigue aceptándose');
  const bad=JSON.parse(JSON.stringify(inm));
  bad.grid.nodes[1].name='x'.repeat(81);
  assert.equal(g.run('validImportImmersion('+JSON.stringify(bad)+',6)'),false,'nombre de nodo enorme rechazado');
 });
 await check('modal de superficializar y HUD escapan títulos y nombres de nodo',g=>{
  g.run('S.jobs=[{id:"j1",title:"<b id=\\"audit-modal\\">X</b>",desc:"D",type:"recoleta",n:1,contact:"mamaWire",reward:10,xp:0,risk:"low",prog:{gathered:0},done:false,failed:false}];');
  g.run('startImmersion(4);');
  const cur=g.run('inImmersion.grid.nodes').find(n=>n.id===g.run('inImmersion.current'));
  cur.name='<img id="audit-node" src=x>';
  g.run('renderGridHud();superficializar();');
  const doc=g.sb.document;
  assert.equal(doc.getElementById('audit-modal'),null,'el título inyectado del modal no existe');
  assert.equal(doc.getElementById('audit-node'),null,'el nombre de nodo inyectado no existe');
  assert.ok(doc.getElementById('overlay-inner').innerHTML.indexOf('&lt;b')>=0,'el modal muestra el título escapado');
  assert.ok(doc.getElementById('adjlist').innerHTML.indexOf('&lt;img')>=0,'el HUD muestra el nombre escapado');
 });
 await check('el lore y los textos internos siguen renderizándose normales',g=>{
  g.run('generateOffers();showView("contactos");');
  const html=g.sb.document.getElementById('panel-scroll').innerHTML;
  assert.ok(html.indexOf('ACEPTAR')>=0,'las ofertas internas conservan su botón');
  assert.ok(html.indexOf('&amp;lt;')<0,'sin doble escape de los textos internos');
  assert.ok(g.run('offerHtml(buildOffer("mamaWire","recoleta"),CONTACTOS_DEF[0])').indexOf('offer-why')>=0);
 });
 console.log(`Importación segura: ${passes} correctas · ${fails} fallos`);
 return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(f=>{process.exitCode=f?1:0;},e=>{console.error(e);process.exitCode=1;});
module.exports={run};
