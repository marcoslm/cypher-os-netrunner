/* F07A: dificultad en caliente, solo en calle con confirmación propia. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;save();afterBoot();');
      await fn(g);passes++;console.log('  ✔ '+label);
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const buttons=g=>g.sb.document.querySelectorAll('#panel-scroll [data-action="setDifficulty"]');
  const btn=(g,diff)=>g.sb.document.querySelector(`#panel-scroll [data-action="setDifficulty"][data-diff="${diff}"]`);
  const confirm=g=>g.run('confirmOpen()');
  console.log('\nDIFICULTAD EN CALLE · cambio seguro F07A…');
  await check('ESTADO muestra los tres modos con estado actual y LEGENDARIO bloqueado',g=>{
    g.run('renderEstado();');const list=buttons(g);assert.equal(list.length,3);
    assert.equal(btn(g,'normal').getAttribute('aria-pressed'),'true');
    assert.equal(btn(g,'hardcore').getAttribute('aria-pressed'),'false');
    assert.equal(btn(g,'legendario').disabled,true);
    assert.match(g.sb.document.getElementById('panel-scroll').textContent,/cambia solo en calle y con confirmación/);
  });
  await check('confirmación cancela el cambio; aplicar guarda la nueva dificultad',g=>{
    g.run('renderEstado();');clickAction(g,'setDifficulty',{'data-diff':'hardcore'});
    assert.equal(confirm(g),true);assert.equal(g.run('S.difficulty'),'normal');
    g.run('resolveConfirm(false);');assert.equal(g.run('S.difficulty'),'normal');
    assert.equal(g.saved().difficulty,'normal');
    clickAction(g,'setDifficulty',{'data-diff':'hardcore'});g.run('resolveConfirm(true);');
    assert.equal(g.run('S.difficulty'),'hardcore');assert.equal(g.saved().difficulty,'hardcore');
    assert.equal(btn(g,'hardcore').getAttribute('aria-pressed'),'true');
    clickAction(g,'setDifficulty',{'data-diff':'hardcore'});
    assert.equal(confirm(g),false,'ya estando en el modo, no vuelve a preguntar');
  });
  await check('inmersión y combate rechazan el cambio sin tocar dificultad ni guardado',g=>{
    const before=g.run('S.difficulty');g.run('startImmersion(4);');
    assert.equal(btn(g,'normal'),null,'los controles de dificultad no se muestran durante RED');
    clickAction(g,'setDifficulty',{'data-diff':'hardcore'});
    assert.equal(confirm(g),false);assert.equal(g.run('S.difficulty'),before);assert.equal(g.saved().difficulty,before);
    g.run('startCombat({node:{type:"ice",tier:1,name:"TEST"},onWin:onNodeDefeated});');
    clickAction(g,'setDifficulty',{'data-diff':'hardcore'});
    assert.equal(confirm(g),false);assert.equal(g.run('S.difficulty'),before);
  });
  await check('LEGENDARIO exige derrotar al Núcleo y no se fuerza con handler directo',g=>{
    g.run('renderEstado();');assert.equal(btn(g,'legendario').disabled,true);
    clickAction(g,'setDifficulty',{'data-diff':'legendario'});
    assert.equal(confirm(g),false);assert.equal(g.run('S.difficulty'),'normal');
    g.run('S.history.finalDone=true;save();renderEstado();');
    assert.equal(btn(g,'legendario').disabled,false);
    clickAction(g,'setDifficulty',{'data-diff':'legendario'});g.run('resolveConfirm(true);');
    assert.equal(g.run('S.difficulty'),'legendario');assert.equal(g.saved().difficulty,'legendario');
  });
  await check('recarga conserva el cambio y el enfriamiento usa la dificultad nueva',g=>{
    g.run('renderEstado();');clickAction(g,'setDifficulty',{'data-diff':'hardcore'});g.run('resolveConfirm(true);');
    g.run('save();afterBoot();');assert.equal(g.run('S.difficulty'),'hardcore');
    g.run('S.player.heat=100;gameLoop();');assert.ok(Math.abs(g.run('S.player.heat')-(100-1/28))<1e-9);
    clickAction(g,'setDifficulty',{'data-diff':'normal'});g.run('resolveConfirm(true);');
    g.run('S.player.heat=100;gameLoop();');assert.ok(Math.abs(g.run('S.player.heat')-(100-1/20))<1e-9);
  });
  await check('HARDCORE sin RECONEXIÓN; NORMAL tras cambio vivo la permite al morir',g=>{
    g.run('renderEstado();');clickAction(g,'setDifficulty',{'data-diff':'hardcore'});g.run('resolveConfirm(true);');
    g.run('save();S.player.cpu=1;flatline();');assert.equal(g.run('S.difficulty'),'hardcore');
    assert.ok(!g.sb.document.getElementById('flatline').innerHTML.includes('RECONEXIÓN'));
    clickAction(g,'newRecord');clickAction(g,'confirmYes');
    assert.equal(g.run('S.difficulty'),'normal');
    g.run('renderEstado();');clickAction(g,'setDifficulty',{'data-diff':'hardcore'});g.run('resolveConfirm(true);');
    assert.equal(g.run('S.difficulty'),'hardcore');
    clickAction(g,'setDifficulty',{'data-diff':'normal'});g.run('resolveConfirm(true);');
    assert.equal(g.run('S.difficulty'),'normal');
    g.run('save();S.player.cpu=1;flatline();');
    assert.ok(g.sb.document.getElementById('flatline').innerHTML.includes('RECONEXIÓN'));
    const jobs=clone(g.run('S.jobs'));g.run('ACTIONS.reconnect();');
    assert.equal(g.run('S.difficulty'),'normal');assert.ok(g.run('S.player.cpu')>0);
    assert.deepEqual(clone(g.run('S.jobs')),jobs);
  });
  console.log(`Dificultad en calle: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
