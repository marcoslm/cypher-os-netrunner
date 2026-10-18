/* Catálogo definitivo y reproducción parcial: no requiere MP3 locales. */
'use strict';
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');

async function run(options = {}) {
  let passes = 0, fails = 0;
  async function check(label, fn) {
    const g = loadGame({ timers: 'virtual', seed: 2087, strictDOM: true, canvas: 'stub', audio: true });
    try {
      g.run('S=nuevoEstado();__invoiceResolvedFixture();S.snd=false;S.amb=false;S.mus=true;S._tutorialDone=true;document.getElementById("intro").classList.add("hidden");');
      await fn(g);
      passes++; console.log('  ✔ ' + label);
    } catch (error) { fails++; console.log('  ✖ ' + label + ': ' + error.stack); }
    finally { g.dispose(); }
  }
  const music = g => g.run('MUSIC');
  const emit = (g, type) => g.emitElement(music(g).el, type);
  console.log('\nMÚSICA · catálogo nuevo y archivos opcionales…');

  await check('21 pistas nuevas, siete escenas y volúmenes de producción', g => {
    const catalog = JSON.parse(JSON.stringify(g.run('MUSIC_TRACKS')));
    const expected = {
      prologue: [['prologo-antes-del-cable', .24]],
      ui: [['ui-cable-no-duerme', .25], ['ui-lluvia-larga', .24], ['ui-octava', .25], ['ui-mercado-de-calle', .24]],
      grid: [['grid-inmersion', .26], ['grid-el-tejido', .25], ['grid-los-recuerdos', .26], ['grid-ruido-blanco', .25]],
      gridHot: [['hot-el-muro', .28], ['hot-caza-abierta', .28], ['hot-paranoia', .26]],
      combat: [['combat-icebreakers', .26], ['combat-claves-hex', .26], ['combat-memoria-daemon', .27], ['combat-escaner', .27], ['combat-santo-cero', .28]],
      boss: [['nucleo-liturgia', .32], ['nucleo-despertar', .30]],
      vault: [['vault-la-herida', .28], ['vault-ultima-llave', .28]]
    };
    for (const scene of Object.keys(expected)) {
      assert.deepEqual(catalog[scene], expected[scene].map(([name, v]) => ({ f: 'assets/music/cyos-' + name + '.mp3', v })));
    }
    assert.equal(new Set(Object.values(catalog).flat().map(t => t.f)).size, 21);
  });

  await check('el prólogo y su relectura usan su propia escena sin ambiente', g => {
    g.run('S=nuevoEstado();S.mus=true;S._tutorialDone=true;stopMusic();renderStoryEntry();');
    assert.equal(g.run('entryMode()'),'prologue');
    assert.equal(g.run('musicScene()'),'prologue');
    assert.equal(music(g).scene,'prologue');
    assert.equal(music(g).playing.prologue.t.f,'assets/music/cyos-prologo-antes-del-cable.mp3');
    assert.equal(music(g).el.paused,false);
    assert.equal(g.run('backgroundAudioAllowed()'),false);
    assert.equal(g.run('backgroundAudioAllowed(true)'),true);
    g.run('MUSIC.el.duration=400;MUSIC.el.currentTime=42;S.narrative.prologuePage=1;renderStoryEntry();');
    assert.equal(music(g).scene,'prologue');
    assert.equal(music(g).el.currentTime,42);
    g.run('_storyReplay=true;_storyReplayPage=0;renderStoryEntry();');
    assert.equal(g.run('musicScene()'),'prologue');
    assert.equal(music(g).scene,'prologue');
    g.run('_storyReplay=false;storyFinishPrologue();runBoot();');
    assert.equal(music(g).el.paused,true);
    assert.equal(g.run('MUSIC.scene'),null);
  });

  await check('la bolsa rota todas las pistas y no repite en el cambio de bolsa', g => {
    g.run('playMusicScene("ui",false);');
    const seen = new Set();
    for (let i = 0; i < 4; i++) { seen.add(music(g).el.src); if (i < 3) emit(g, 'ended'); }
    assert.equal(seen.size, 4);
    const last = music(g).el.src;
    emit(g, 'ended'); assert.notEqual(music(g).el.src, last);
    assert.equal(music(g).el.loop, false);
  });

  await check('calor alto salta las dos pistas pendientes y conserva El muro', g => {
    g.run('playMusicScene("gridHot",false);');
    const m = music(g), available = 'assets/music/cyos-hot-el-muro.mp3';
    for (let i = 0; i < 9; i++) {
      if (m.el.src !== available) emit(g, 'error');
      else emit(g, 'ended');
    }
    assert.equal(m.el.src, available);
    assert.equal(Object.keys(m.unavailable).length, 2);
    assert.equal(m.el.paused, false);
    assert.equal(m.el.volume, .28);
  });

  await check('sin MP3 una escena queda en silencio, sin reintentos ni arrastre de menús', g => {
    g.run('playMusicScene("ui",false);playMusicScene("combat",false);');
    const m = music(g), attempted = new Set();
    for (let i = 0; i < 5; i++) { attempted.add(m.el.src); emit(g, 'error'); }
    assert.equal(attempted.size, 5);
    assert.equal(m.playing.combat.t, null);
    assert.equal(m.el.paused, true);
    g.run('combatActive=true;for(var i=0;i<100;i++)updateMusic();');
    assert.equal(m.scene, 'combat'); assert.equal(m.playing.combat.t, null);
    const serial = m.serial;
    emit(g, 'error'); emit(g, 'ended'); assert.equal(m.serial, serial);
    g.run('combatActive=false;updateMusic();');
    assert.equal(m.scene, 'ui'); assert.equal(m.el.paused, false);
  });

  await check('sin ningún archivo todos los intentos son acotados y no alteran la partida', g => {
    const before = JSON.stringify(g.run('S'));
    for (const scene of ['prologue', 'ui', 'grid', 'gridHot', 'combat', 'boss', 'vault']) {
      g.run(`playMusicScene(${JSON.stringify(scene)},false);`);
      while (music(g).playing[scene].t) emit(g, 'error');
      assert.equal(music(g).el.paused, true);
    }
    assert.equal(Object.keys(music(g).unavailable).length, 21);
    assert.equal(JSON.stringify(g.run('S')), before);
    assert.equal(g.pending(), 0);
  });

  await check('volver a una escena reanuda la posición y una pista única reinicia al terminar', g => {
    g.run('playMusicScene("ui",false);MUSIC.el.duration=400;MUSIC.el.currentTime=37;playMusicScene("grid",false);');
    const m = music(g), uiTrack = m.playing.ui.t;
    g.run('MUSIC.el.currentTime=19;playMusicScene("ui",false);');
    emit(g, 'loadedmetadata');
    assert.equal(m.playing.ui.t, uiTrack); assert.equal(m.el.currentTime, 37);
    assert.equal(m.playing.grid.pos, 19);
    g.run('MUSIC.unavailable["assets/music/cyos-hot-caza-abierta.mp3"]=true;MUSIC.unavailable["assets/music/cyos-hot-paranoia.mp3"]=true;playMusicScene("gridHot",false);');
    emit(g, 'loadedmetadata'); m.el.currentTime = 399;
    emit(g, 'ended'); assert.equal(m.el.currentTime, 0);
  });

  await check('mute/flatline y callbacks obsoletos no restauran ni rotan música', async g => {
    g.run('ensureMusicEl();');
    let reject;
    music(g).el.play = function () { this.paused = false; return new Promise((resolve, r) => { reject = r; }); };
    g.run('playMusicScene("ui",false);');
    const oldMeta = music(g).onMeta, oldReject = reject;
    music(g).el.play = function () { this.paused = false; return Promise.resolve(); };
    g.run('playMusicScene("grid",false);MUSIC.el.currentTime=12;MUSIC.el.duration=400;');
    oldMeta(); assert.equal(music(g).el.currentTime, 12);
    oldReject({ name: 'NotAllowedError' }); await Promise.resolve();
    assert.equal(music(g).scene, 'grid');
    g.run('S.mus=false;updateMusic();');
    emit(g, 'ended'); emit(g, 'error');
    assert.equal(music(g).scene, null); assert.equal(music(g).el.paused, true);
    g.run('S.mus=true;updateMusic();S.player.cpu=0;updateMusic();');
    emit(g, 'ended'); emit(g, 'error');
    assert.equal(music(g).scene, null); assert.equal(music(g).el.paused, true);
  });

  await check('las siete escenas conservan prioridades e histéresis de calor', g => {
    assert.equal(g.run('musicScene()'), 'ui');
    g.run('_entryMode="prologue";'); assert.equal(g.run('musicScene()'), 'prologue');
    g.run('_entryMode="replay";'); assert.equal(g.run('musicScene()'), 'prologue');
    g.run('_entryMode=null;');
    g.run('inImmersion={};S.player.heat=71;'); assert.equal(g.run('musicScene()'), 'grid');
    g.run('S.player.heat=72;'); assert.equal(g.run('musicScene()'), 'gridHot');
    g.run('MUSIC.scene="gridHot";S.player.heat=68;'); assert.equal(g.run('musicScene()'), 'gridHot');
    g.run('S.player.heat=67;'); assert.equal(g.run('musicScene()'), 'grid');
    g.run('combatActive=true;'); assert.equal(g.run('musicScene()'), 'combat');
    g.run('COM={node:{boss:true}};'); assert.equal(g.run('musicScene()'), 'boss');
    g.run('VAULT_PUZZLE={};'); assert.equal(g.run('musicScene()'), 'vault');
  });
  await check('intro/BIOS bloquean arranque directo, preferencias y callbacks sin alterar MUS/AMB', g => {
    g.run('initAudio();setDeckPref("amb",true);updateAmbient();MUSIC.el.currentTime=23;MUSIC.el.duration=400;');
    const oldMeta=music(g).onMeta;
    g.run('runBoot();');
    assert.equal(music(g).el.paused,true);assert.equal(g.run('AMBIENT.activeMode'),null);
    assert.equal(g.run('MUSIC.playing.ui.pos'),23);
    const serial=music(g).serial;
    g.run('setDeckPref("mus",true);setDeckPref("amb",true);setDeckPref("musVolume",60);startAmbient("street");playMusicScene("grid",false);updateAmbient();playCanal7();');
    emit(g,'ended');emit(g,'error');oldMeta();
    assert.equal(music(g).scene,null);assert.equal(music(g).el.paused,true);
    assert.equal(music(g).serial,serial);assert.equal(g.run('AMBIENT.activeMode'),null);
    assert.equal(g.run('_musicTones.length'),0);
    assert.equal(g.run('_deckPrefs.mus && _deckPrefs.amb && S.mus && S.amb'),true);
    g.run('S.narrative.entry="diagnostic";finishIntroBoot();');
    assert.equal(g.run('entryMode()'),'diagnostic');
    assert.equal(g.sb.document.getElementById('intro').classList.contains('hidden'),true);
    assert.equal(g.run('backgroundAudioAllowed()'),false);
    g.run('updateMusic();updateAmbient();playCanal7();startAmbient("street");playMusicScene("ui",false);');
    emit(g,'ended');emit(g,'error');oldMeta();
    assert.equal(music(g).scene,null);assert.equal(music(g).el.paused,true);
    assert.equal(g.run('AMBIENT.activeMode'),null);assert.equal(g.run('_musicTones.length'),0);
  });

  await check('retornar detiene canal 7 y MP3; COMENZAR reanuda posición y ambiente sin cambiar preferencias', g => {
    g.run('ensureStateIntegrity();S._tutorialDone=true;initAudio();setDeckPref("amb",true);setDeckPref("snd",false);updateAmbient();MUSIC.el.currentTime=31;MUSIC.el.duration=400;playCanal7();');
    const tones=g.run('_musicTones.slice()');assert.equal(tones.length,16);
    const track=music(g).playing.ui.t;
    g.run('ACTIONS.backToIntro();resolveConfirm(true);');
    assert.equal(music(g).el.paused,true);assert.equal(g.run('AMBIENT.activeMode'),null);
    assert.equal(g.run('_musicTones.length'),0);
    for(const tone of tones){assert.equal(tone.osc.stopped,true);assert.equal(tone.osc.disconnected,true);}
    g.run('applyChannelVolumes();updateAmbient();playCanal7();');
    assert.equal(g.run('MUS_BUS.gain.value'),0);assert.equal(music(g).scene,null);
    g.run('beginIntro();');
    assert.equal(music(g).scene,'ui');assert.equal(music(g).el.paused,false);
    assert.equal(music(g).playing.ui.t,track);assert.equal(music(g).el.currentTime,31);
    assert.equal(g.run('AMBIENT.activeMode'),'street');
    assert.equal(g.run('_deckPrefs.mus && _deckPrefs.amb && S.mus && S.amb'),true);
  });
  console.log(`Música: ${passes} correctas · ${fails} fallos`);
  return options.summary ? { passes, fails, total: passes + fails } : fails;
}
if (require.main === module) run().then(fails => { process.exitCode = fails ? 1 : 0; }, error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
