/* F09A: COMPLETISTA exige todos los ids de informes, no solo cantidad. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
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
  const completionist=g=>g.run('ACHIEVEMENTS.filter(function(a){return a.id==="completionist";})[0].check()');
  console.log('\nLOGROS · informes completos F09A…');
  await check('COMPLETISTA exige los 43 ids canónicos, no una longitud cualquiera',g=>{
    const ids=g.run('INTEL.map(function(e){return e.id;})');
    assert.equal(ids.length,43);
    g.run('S').intel=ids.slice(0,42).concat(['inventado']);
    assert.equal(completionist(g),false,'43 entradas con un id falso no cuentan');
    g.run('S').intel=ids.slice(0,42);
    assert.equal(completionist(g),false);
    g.run('S').intel=ids.slice();assert.equal(completionist(g),true);
  });
  await check('ids duplicados o desconocidos no desbloquean el logro por volumen',g=>{
    const ids=g.run('INTEL.map(function(e){return e.id;})');
    g.run('S').intel=ids.slice(0,41).concat(['extra','extra','extra']);
    assert.equal(completionist(g),false);
    g.run('S').intel=ids.concat(['extra']);
    assert.equal(completionist(g),true,'los ids canónicos completos siguen siendo suficientes');
  });
  await check('checkAchievements celebra una sola vez y lo conserva al recargar',g=>{
    const ids=g.run('INTEL.map(function(e){return e.id;})');
    g.run('S').intel=ids.slice();g.run('checkAchievements();');
    assert.ok(g.run('S.achievements').includes('completionist'));
    const before=clone(g.run('S.achievements'));g.run('checkAchievements();');
    assert.deepEqual(clone(g.run('S.achievements')),before);
    g.run('save();afterBoot();');
    assert.ok(g.run('S.achievements').includes('completionist'));
    assert.deepEqual(clone(g.run('S.achievements')),before);
  });
  console.log(`Logros/informes: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(fails=>{process.exitCode=fails?1:0;},error=>{console.error(error);process.exitCode=1;});
module.exports={run};
