/* Preferencias de dispositivo, mezcla real del grafo y panel sin dependencias. */
'use strict';
const assert=require('node:assert/strict');
const {loadGame}=require('./harness');
const KEY='cypher_os_controls_v1';
async function run(options={}){
  let passes=0,fails=0;
  async function check(label,fn,extra={}){
    const g=loadGame({timers:'virtual',seed:2093,strictDOM:true,canvas:'stub',audio:true,...extra});
    try{await fn(g);passes++;console.log('  ✔ '+label);}
    catch(e){fails++;console.log('  ✖ '+label+': '+e.stack);}
    finally{g.dispose();}
  }
  const prefs=g=>g.run('_deckPrefs');
  const setup=g=>g.run('S=nuevoEstado();ensureStateIntegrity();S._tutorialDone=true;msgEl=document.getElementById("msg");');
  const input=(g,key,value)=>{const el=g.sb.document.getElementById('control-'+key);el.value=String(value);g.emitElement(el,'input');};
  const click=(g,selector)=>{const el=g.sb.document.querySelector(selector);assert.ok(el,selector);g.emitElement(el,'click');};
  console.log('\nPANEL DE CONTROL · audio, display y persistencia local…');
  await check('fábrica conserva calibración sonora, brillo y canales independientes',g=>{
    assert.deepEqual(JSON.parse(JSON.stringify(prefs(g))),{snd:true,amb:false,mus:true,fxVolume:100,ambVolume:100,musVolume:100,crt:true,glow:true,animations:true,reducedMotion:false});
    assert.equal(g.run('_brillo'),1);assert.equal(g.sb.document.documentElement.style.filter,'brightness(1.28)');
  });
  await check('migración lee solo el registro local antes de COMENZAR y persiste una vez',g=>{
    assert.equal(g.run('S'),null);assert.equal(prefs(g).snd,false);assert.equal(prefs(g).amb,true);assert.equal(prefs(g).mus,false);
    assert.equal(JSON.parse(g.sb.localStorage.getItem(KEY)).snd,false);
    g.run('initAudio();sound.bootStart();sound.bootLine();sound.bootEnd();');g.advance(1000);
    assert.equal(g.audio.nodes.length,0);
    g.sb.localStorage.setItem('cypher_os_save_v9','{"snd":true,"amb":false,"mus":true}');
    assert.equal(g.run('loadDeckPrefs().snd'),false);
  },{storage:{initial:{cypher_os_save_v9:'{"snd":false,"amb":true,"mus":false}'}}});
  await check('preferencias guardadas validan tipos, límites y claves sin coerción',g=>{
    assert.equal(prefs(g).snd,true);assert.equal(prefs(g).amb,false);
    assert.equal(prefs(g).fxVolume,100);assert.equal(prefs(g).ambVolume,0);assert.equal(prefs(g).musVolume,100);
    assert.equal(prefs(g).crt,false);assert.equal(prefs(g).glow,true);
    g.run('setDeckPref("fxVolume",NaN);setDeckPref("snd","false");setDeckPref("unknown",1);');
    assert.equal(prefs(g).fxVolume,100);assert.equal(prefs(g).snd,true);assert.equal(prefs(g).unknown,undefined);
  },{storage:{initial:{[KEY]:JSON.stringify({snd:'false',amb:1,fxVolume:200,ambVolume:-15,musVolume:'20',crt:false,glow:null})}}});
  await check('storage bloqueado y JSON corrupto dejan fábrica y permiten sesión',g=>{
    assert.equal(prefs(g).snd,true);setup(g);g.run('setDeckPref("snd",false);setDeckPref("musVolume",34);setBrillo(1.2);');
    assert.equal(prefs(g).snd,false);assert.equal(prefs(g).musVolume,34);assert.equal(g.run('_brillo'),1.2);
  },{storage:{fail:true}});
  await check('datos locales corruptos no heredan audio de un archivo ajeno',g=>{
    assert.equal(prefs(g).snd,true);assert.equal(prefs(g).mus,true);
  },{storage:{initial:{[KEY]:'{roto',cypher_os_save_v9:'{"snd":false,"mus":false}'}}});
  await check('FX usa bus propio y mute silencia fuentes ya lanzadas',g=>{
    setup(g);g.run('initAudio();beep(440,1,"sine",.05);setDeckPref("fxVolume",35);');
    const bus=g.run('FX_BUS');assert.equal(bus.gain.value,.35);
    const source=g.audio.nodes.find(n=>n.source);assert.ok(source.started);
    g.run('setDeckPref("snd",false);');assert.equal(bus.gain.value,0);assert.equal(prefs(g).fxVolume,35);
    g.run('setDeckPref("snd",true);');assert.equal(bus.gain.value,.35);
  });
  await check('callbacks FX suspendidos revalidan mute antes de generar fuentes',async g=>{
    setup(g);let ready;g.audio.ac.state='suspended';g.audio.ac.resume=()=>new Promise(r=>{ready=r;});
    g.run('initAudio();sound.click();setDeckPref("snd",false);');ready();await Promise.resolve();
    assert.equal(g.audio.nodes.length,0);
  });
  await check('ambiente mezcla drone, ruido y latido por el mismo master y limpia todo',g=>{
    setup(g);g.run('setDeckPref("snd",false);setDeckPref("mus",false);setDeckPref("ambVolume",22);setDeckPref("amb",true);startAmbient("combat");');
    const master=g.run('AMBIENT.master');assert.equal(master.gain.value,.22);
    const direct=g.audio.nodes.filter(n=>n.connections && n.connections.includes(g.audio.ac.destination));
    assert.deepEqual(direct,[master]);
    g.run('setDeckPref("ambVolume",0);');assert.equal(master.gain.value,0);
    g.run('setDeckPref("amb",false);');assert.ok(g.audio.nodes.every(n=>n.disconnected));
    assert.ok(g.audio.nodes.filter(n=>n.source).every(n=>n.stopped));
    assert.equal(g.run('AMBIENT.master'),null);
  });
  await check('música multiplica volumen de producción sin rotar ni perder posición',g=>{
    setup(g);g.run('playMusicScene("ui",false);MUSIC.el.currentTime=27;setDeckPref("musVolume",40);');
    const m=g.run('MUSIC'),track=m.playing.ui.t;
    assert.equal(m.el.volume,track.v*.4);assert.equal(m.el.currentTime,27);
    g.run('setDeckPref("mus",false);');assert.equal(m.el.paused,true);assert.equal(prefs(g).musVolume,40);
    g.run('MUSIC.el.duration=300;setDeckPref("mus",true);');
    assert.equal(m.playing.ui.t,track);assert.equal(m.el.currentTime,27);assert.equal(m.el.volume,track.v*.4);
  });
  await check('canal 7 es MUS: volumen/mute reales, ajenos a FX y AMB',g=>{
    setup(g);g.run('initAudio();setDeckPref("snd",false);setDeckPref("musVolume",18);playCanal7();');
    const bus=g.run('MUS_BUS');assert.equal(bus.gain.value,.18);assert.equal(g.run('FX_BUS'),null);
    g.run('setDeckPref("mus",false);');assert.equal(bus.gain.value,0);
    const nodes=g.audio.nodes.length;g.run('playCanal7();');assert.equal(g.audio.nodes.length,nodes);
  });
  await check('intro tiene panel funcional sin empezar BIOS y restaura foco',g=>{
    const opener=g.sb.document.querySelector('#intro [data-action="openControls"]');opener.focus();g.emitElement(opener,'click');
    assert.equal(g.run('controlPanelOpen()'),true);assert.equal(g.run('_bootStarted'),false);
    assert.equal(g.sb.document.getElementById('intro').inert,true);
    input(g,'fxVolume',41);assert.equal(prefs(g).fxVolume,41);
    click(g,'#controls-overlay [data-pref="snd"]');assert.equal(prefs(g).snd,false);
    g.emitDocument('keydown',{key:'Escape'});assert.equal(g.run('controlPanelOpen()'),false);
    assert.equal(g.sb.document.activeElement,opener);assert.equal(g.run('S'),null);
  });
  await check('panel aplica sliders y conserva mute, porcentajes y foco',g=>{
    setup(g);click(g,'#h-controls');input(g,'musVolume',35);input(g,'ambVolume',0);input(g,'brillo',120);
    assert.equal(prefs(g).musVolume,35);assert.equal(prefs(g).amb,false);assert.equal(g.run('_brillo'),1.2);
    assert.equal(g.sb.document.getElementById('value-musVolume').textContent,'35%');
    assert.equal(g.sb.document.getElementById('control-brillo').style.getPropertyValue('--level'),'70%');
    click(g,'#controls-overlay [data-pref="mus"]');assert.equal(prefs(g).mus,false);assert.equal(prefs(g).musVolume,35);
    assert.equal(g.sb.document.getElementById('h-mus').getAttribute('aria-pressed'),'false');
  });
  await check('panel bloquea gameplay y atajos pero no Ctrl+S ni enfriamiento',g=>{
    setup(g);g.run('S.player.heat=50;');click(g,'#h-controls');
    const clock=g.run('S.clock');g.run('gameLoop();');assert.equal(g.run('S.clock'),(clock+1)%1440);assert.ok(g.run('S.player.heat')<50);
    g.emitDocument('keydown',{key:'g',ctrlKey:true});assert.equal(g.run('inImmersion'),null);
    g.emitDocument('keydown',{key:'s',ctrlKey:true});assert.ok(g.saved());
    assert.equal(g.sb.document.getElementById('os').inert,true);
    g.run('combatActive=true;syncGameInputLock();');assert.equal(g.run('controlPanelOpen()'),false);
    g.run('openControlPanel();');assert.equal(g.run('controlPanelOpen()'),false);
  });
  await check('importar y nuevo registro conservan preferencias sin heredar flags ajenos',g=>{
    setup(g);g.run('setDeckPref("snd",false);setDeckPref("amb",true);setDeckPref("mus",false);setDeckPref("musVolume",35);setDeckPref("crt",false);setBrillo(1.3);');
    const before=JSON.stringify(prefs(g));
    g.run('var incoming=nuevoEstado();incoming.player.credits=4321;incoming.snd=true;incoming.amb=false;incoming.mus=true;importGameState(incoming);');
    assert.equal(g.run('S.player.credits'),4321);assert.equal(g.run('S.snd'),false);assert.equal(g.run('S.amb'),true);assert.equal(g.run('S.mus'),false);
    assert.equal(JSON.stringify(prefs(g)),before);assert.equal(g.run('_brillo'),1.3);
    g.run('ACTIONS.newRecord();resolveConfirm(true);');assert.equal(g.run('S.player.credits'),500);
    assert.equal(JSON.stringify(prefs(g)),before);assert.equal(g.run('_brillo'),1.3);
  });
  await check('restablecer requiere confirmación y no toca progreso ni fullscreen',g=>{
    setup(g);g.run('S.player.credits=4321;setDeckPref("fxVolume",19);setDeckPref("crt",false);setBrillo(.7);setFsWants(true);');
    click(g,'#h-controls');click(g,'#controls-overlay [data-action="resetControls"]');
    assert.equal(prefs(g).fxVolume,19);g.run('resolveConfirm(false);');assert.equal(prefs(g).fxVolume,19);
    click(g,'#controls-overlay [data-action="resetControls"]');g.run('resolveConfirm(true);');
    assert.equal(prefs(g).fxVolume,100);assert.equal(prefs(g).crt,true);assert.equal(g.run('_brillo'),1);
    assert.equal(g.run('S.player.credits'),4321);assert.equal(g.run('_fsWants'),true);assert.equal(g.run('controlPanelOpen()'),true);
  });
  await check('reducir movimiento termina avisos y decoraciones sin alterar red',g=>{
    setup(g);g.run('startImmersion(4);msg("aviso largo");spawnRipple(10,20,"#fff");startGlitchLoop();');
    const grid=JSON.stringify(g.run('inImmersion.grid'));
    assert.ok(g.run('_msgTypeTimer')!==null);g.run('setDeckPref("reducedMotion",true);');
    assert.equal(g.run('_msgTypeTimer'),null);assert.equal(g.run('_glitchId'),null);assert.equal(g.run('gridFx.length'),0);assert.equal(g.run('particles.length'),0);
    assert.equal(g.sb.document.getElementById('msg-text').textContent,'aviso largo');
    assert.equal(JSON.stringify(g.run('inImmersion.grid')),grid);assert.ok(g.sb.document.documentElement.classList.contains('motion-off'));
    g.run('setDeckPref("reducedMotion",false);setDeckPref("snd",false);');assert.equal(g.run('decorativeMotion()'),true);
    assert.ok(g.run('_glitchId')!==null,'mute no controla glitches');
    g.run('_displayMotion.matches=true;onDisplayMotionChange();');assert.equal(g.run('decorativeMotion()'),false);
  });
  console.log(`Panel de control: ${passes} correctas · ${fails} fallos`);
  return options.summary?{passes,fails,total:passes+fails}:fails;
}
if(require.main===module)run().then(f=>{process.exitCode=f?1:0;},e=>{console.error(e);process.exitCode=1;});
module.exports={run};
