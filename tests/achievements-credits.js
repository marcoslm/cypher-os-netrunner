/* F09B: hitos económicos por ingresos históricos de la partida. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame,clickAction}=require('./harness');
const clone=value=>JSON.parse(JSON.stringify(value));
async function run(options={}) {
  let passes=0,fails=0;
  async function check(label,fn) {
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub'});
    try {
      g.run('S=nuevoEstado();ensureStateIntegrity();_deckPrefs.snd=false;_deckPrefs.mus=false;S._tutorialDone=true;');
      await fn(g);passes++;console.log('  ✔ '+label);
    }catch(error){fails++;console.log('  ✖ '+label+': '+error.stack);}
    finally{g.dispose();}
  }
  const has=(g,id)=>g.run('S.achievements').includes(id);
  /* ADINERADO mide saldo a la vez; los nuevos miden ingresos históricos. */
  const ids=['wealthy','fortune50k','patrimony100k','magnate250k'];
  const thresholds={wealthy:20000,fortune50k:50000,patrimony100k:100000,magnate250k:250000};
  console.log('\nLOGROS · créditos acumulados F09B…');
  await check('los hitos acumulados tienen umbrales exactos 20k/50k/100k/250k',g=>{
    for(const id of ids) assert.ok(g.run('ACHIEVEMENTS.some(function(a){return a.id==="'+id+'";})'),id);
    for(const id of ids) {
      g.run('S').achievements=[];g.run('S').player.stats.credits=thresholds[id]-1;g.run('checkAchievements();');
      assert.equal(has(g,id),false,id+' no se gana un crédito antes');
      g.run('S').player.stats.credits=thresholds[id];g.run('checkAchievements();');
      assert.equal(has(g,id),true,id+' se gana al llegar');
    }
  });
  await check('saldo, ADINERADO y récord heredado no cuentan como ingresos acumulados',g=>{
    g.run('S').player.credits=999999;g.run('S').best.credits=999999;g.run('checkAchievements();');
    assert.equal(has(g,'rich'),true,'ADINERADO sigue midiendo saldo a la vez');
    for(const id of ['fortune50k','patrimony100k','magnate250k']) assert.equal(has(g,id),false,id);
    g.run('S').player.stats.credits=250000;g.run('checkAchievements();');
    for(const id of ids) assert.equal(has(g,id),true,id);
  });
  await check('checkAchievements celebra una sola vez y la recarga lo conserva',g=>{
    g.run('S').player.stats.credits=250000;g.run('checkAchievements();');
    const before=clone(g.run('S.achievements'));g.run('checkAchievements();');
    assert.deepEqual(clone(g.run('S.achievements')),before);
    g.run('save();afterBoot();');
    assert.deepEqual(clone(g.run('S.achievements')),before);
  });
  await check('NUEVO REGISTRO reinicia ingresos y logros acumulados sin heredar best',g=>{
    g.run('S').player.stats.credits=250000;g.run('checkAchievements();');
    g.run('S').best.credits=250000;g.run('save();');
    clickAction(g,'newRecord');clickAction(g,'confirmYes');
    assert.equal(g.run('S.player.stats.credits'),0);assert.equal(g.run('S.best.credits'),250000);
    g.run('checkAchievements();');
    for(const id of ids) assert.equal(has(g,id),false,id+' se reinicia');
  });
  console.log(`Logros/créditos: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
