/* Dificultad editable solo desde la intro; ESTADO es informativo. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();__invoiceResolvedFixture();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      await fn(g);passes++;console.log('  ✔ '+label);
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const buttons=g=>g.sb.document.querySelectorAll('#panel-scroll [data-action="setDifficulty"]');
  const confirm=g=>g.run('confirmOpen()');
  function selectDifficulty(g,diff){
    clickAction(g,'backToIntro');assert.equal(confirm(g),true);
    clickAction(g,'confirmYes');
    g.sb.document.querySelectorAll('input[name="diff"]').forEach(radio=>{
      radio.checked=radio.getAttribute('value')===diff;
    });
    g.emitElement('intro-start','click');
    assert.equal(g.sb.document.getElementById('intro').classList.contains('hidden'),true);
  }
  console.log('\nDIFICULTAD · selección exclusiva en intro…');
  await check('ESTADO muestra la dificultad actual sin panel ni acción de cambio',g=>{
    for(const diff of ['normal','hardcore','legendario']){
      g.run(`S.difficulty="${diff}";renderEstado();`);
      assert.equal(buttons(g).length,0);
      const panels=Array.from(g.sb.document.querySelector('.deck-columns-state').children).filter(element=>element.classList.contains('deck-panel'));
      const panel=panels[0];
      const row=Array.from(panel.querySelectorAll('.row')).find(element=>element.querySelector('.key').textContent==='DIFICULTAD');
      assert.ok(row);assert.equal(row.querySelector('.val').textContent,diff.toUpperCase());
      assert.equal(panels.length,8);
      assert.equal(Array.from(g.sb.document.querySelectorAll('.panel-h')).some(element=>element.textContent==='DIFICULTAD'),false);
    }
    assert.equal(g.run('typeof ACTIONS.setDifficulty'),'undefined');
  });
  await check('cancelar el retorno conserva la sesión; elegir en intro guarda sin perder progreso',g=>{
    g.run('S.player.credits=4321;save();renderEstado();');
    const before=clone(g.run('S'));
    clickAction(g,'backToIntro');
    assert.equal(confirm(g),true);assert.equal(g.run('S.difficulty'),'normal');
    clickAction(g,'confirmNo');assert.deepEqual(clone(g.run('S')),before);
    assert.equal(g.saved().difficulty,'normal');
    selectDifficulty(g,'hardcore');
    assert.equal(g.run('S.difficulty'),'hardcore');assert.equal(g.saved().difficulty,'hardcore');
    assert.deepEqual(clone(g.run('S.player')),before.player);
    assert.deepEqual(clone(g.run('S.jobs')),before.jobs);
    assert.deepEqual(clone(g.run('S.narrative')),before.narrative);
  });
  await check('inmersión y combate impiden volver al selector sin tocar dificultad ni guardado',g=>{
    const before=g.run('S.difficulty');g.run('startImmersion(4);');
    g.run('renderEstado();');assert.equal(buttons(g).length,0);
    clickAction(g,'backToIntro');
    assert.equal(confirm(g),false);assert.equal(g.run('S.difficulty'),before);assert.equal(g.saved().difficulty,before);
    g.run('startCombat({node:{type:"ice",tier:1,name:"TEST"},onWin:onNodeDefeated});');
    clickAction(g,'backToIntro');
    assert.equal(confirm(g),false);assert.equal(g.run('S.difficulty'),before);
  });
  await check('LEGENDARIO exige derrotar al Núcleo incluso al seleccionar desde intro',g=>{
    g.run('_pendingDifficulty="legendario";afterBoot();');
    assert.equal(confirm(g),false);assert.equal(g.run('S.difficulty'),'normal');
    g.run('S.best.finalDone=true;save();');
    selectDifficulty(g,'legendario');
    assert.equal(g.run('S.difficulty'),'legendario');assert.equal(g.saved().difficulty,'legendario');
  });
  await check('recarga conserva el cambio y el enfriamiento usa la dificultad nueva',g=>{
    selectDifficulty(g,'hardcore');
    g.run('save();afterBoot();');assert.equal(g.run('S.difficulty'),'hardcore');
    g.run('S.player.heat=100;gameLoop();');assert.ok(Math.abs(g.run('S.player.heat')-(100-1/28))<1e-9);
    selectDifficulty(g,'normal');
    g.run('S.player.heat=100;gameLoop();');assert.ok(Math.abs(g.run('S.player.heat')-(100-1/20))<1e-9);
  });
  await check('HARDCORE sin RECONEXIÓN; NORMAL tras cambio vivo la permite al morir',g=>{
    selectDifficulty(g,'hardcore');
    g.run('save();S.player.cpu=1;flatline();');assert.equal(g.run('S.difficulty'),'hardcore');
    assert.ok(!g.sb.document.getElementById('flatline').innerHTML.includes('RECONEXIÓN'));
    g.run('_pendingDifficulty="normal";afterBoot();');
    assert.equal(g.run('S.difficulty'),'hardcore');assert.equal(g.run('S.player.cpu'),0);
    assert.ok(!g.sb.document.getElementById('flatline').innerHTML.includes('RECONEXIÓN'));
    clickAction(g,'newRecord');clickAction(g,'confirmYes');
    g.run('ACTIONS.storySkip();finishIntroBoot();ACTIONS.storyRecover();');
    assert.equal(g.run('S.difficulty'),'normal');
    selectDifficulty(g,'hardcore');
    assert.equal(g.run('S.difficulty'),'hardcore');
    selectDifficulty(g,'normal');
    assert.equal(g.run('S.difficulty'),'normal');
    g.run('save();S.player.cpu=1;flatline();');
    assert.ok(g.sb.document.getElementById('flatline').innerHTML.includes('RECONEXIÓN'));
    const jobs=clone(g.run('S.jobs'));g.run('ACTIONS.reconnect();');
    assert.equal(g.run('S.difficulty'),'normal');assert.ok(g.run('S.player.cpu')>0);
    assert.deepEqual(clone(g.run('S.jobs')),jobs);
  });
  await check('F-04: una red restaurada conserva su dificultad aunque la intro elija otro modo',g=>{
    g.run('startImmersion(4);save();'); /* snapshot vivo con red y dificultad normal */
    const graph=JSON.stringify(g.run('inImmersion.grid'));
    g.run('inImmersion=null;_pendingDifficulty="hardcore";afterBoot();');
    assert.equal(g.run('S.difficulty'),'normal','la red no cambia de reglas al restaurarse');
    assert.ok(g.run('inImmersion'),'la inmersión se restaura igual');
    assert.equal(JSON.stringify(g.run('inImmersion.grid')),graph,'el grafo no se regenera');
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/conserva su dificultad/);
    assert.match(g.sb.document.getElementById('msg').getAttribute('aria-label'),/intro desde PARTIDA/);
    assert.equal(g.sb.document.getElementById('msg').getAttribute('aria-label').includes('ESTADO'),false);
    assert.equal(g.run('_pendingDifficulty'),null,'la selección se consume');
  });
  await check('F-04: en calle la selección de la intro sí se aplica con normalidad',g=>{
    g.run('_pendingDifficulty="hardcore";afterBoot();');
    assert.equal(g.run('S.difficulty'),'hardcore');
    assert.equal(g.run('inImmersion'),null);
    assert.ok(!g.sb.document.getElementById('msg').getAttribute('aria-label').includes('conserva su dificultad'));
  });
  console.log(`Dificultad en intro: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
