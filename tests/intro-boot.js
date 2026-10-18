'use strict';
const assert = require('node:assert/strict');
const { loadGame } = require('./harness');
const clone = value => JSON.parse(JSON.stringify(value));
async function run(options = {}) {
    let passes = 0, fails = 0;
    async function check(label, action, extra = {}) {
        const game = loadGame({ timers: 'virtual', strictDOM: true, canvas: 'stub', audio: true, seed: 2093, ...extra });
        try { await action(game); passes++; console.log('  OK ' + label); }
        catch (error) { fails++; console.log('  FAIL ' + label + ': ' + error.stack); }
        finally { game.dispose(); }
    }
    const click = (game, action) => game.emitElement(game.sb.document.querySelector('[data-action="' + action + '"]'), 'click');
    function diagnostic(game) {
        game.emitElement('intro-start', 'click'); click(game, 'storySkip');
        game.emitElement('intro-skip', 'click');
    }
    function insideDeck(game) {
        const document = game.sb.document;
        const entry = document.getElementById('deck-entry');
        assert.ok(entry, 'El arranque tiene una superficie dentro del deck');
        assert.equal(entry.parentNode.id, 'panel');
        assert.equal(entry.hidden, false);
        assert.equal(document.getElementById('intro').classList.contains('hidden'), true);
        assert.equal(game.run('gameInputLayer().id'), 'deck-entry');
        for (const id of ['os', 'main', 'panel', 'deck-entry']) {
            assert.equal(!!document.getElementById(id).inert, false, id + ' permite alcanzar la entrada');
        }
        for (const id of ['topbar', 'sidebar', 'save-tools', 'panel-scroll', 'msgbar', 'term']) {
            assert.equal(document.getElementById(id).inert, true, id + ' bloqueado');
        }
        assert.equal(game.run('loopId'), null);
        assert.equal(game.run('backgroundAudioAllowed()'), false);
    }
    console.log('\nF2 · entrada narrativa y archivo local');
    await check('menu no diegetico sin POST, partida, reloj ni audio', game => {
        game.advance(10000);
        assert.equal(game.run('entryMode()'), 'intro');
        assert.equal(game.run('S'), null);
        assert.equal(game.run('loopId'), null);
        assert.equal(game.sb.document.querySelectorAll('#boot-body .line').length, 0);
        assert.equal(game.sb.document.activeElement.id, 'intro-start');
        assert.equal(game.sb.document.getElementById('os').inert, true);
        assert.equal(game.audio.nodes.length, 0);
    });
    await check('paginas, anterior y reanudar conservan el pasaje exacto', game => {
        game.emitElement('intro-start', 'click'); click(game, 'storyContinue');
        assert.equal(game.saved().narrative.prologuePage, 1);
        click(game, 'storyMenu'); game.emitElement('intro-start', 'click');
        assert.equal(game.run('entryMode()'), 'prologue');
        assert.equal(game.run('S.narrative.prologuePage'), 1);
        click(game, 'storyPrevious');
        assert.equal(game.saved().narrative.prologuePage, 0);
        assert.equal(game.run('loopId'), null);
    });
    await check('hallazgo inicia un POST local y omitirlo no recupera', game => {
        game.emitElement('intro-start', 'click');
        for (let page = 0; page < 3; page++) click(game, 'storyContinue');
        assert.equal(game.run('entryMode()'), 'boot');
        insideDeck(game);
        assert.equal(game.sb.document.activeElement.id, 'intro-skip');
        game.advance(320);
        const first = game.sb.document.querySelector('#boot-body .line');
        game.advance(180);
        assert.equal(game.sb.document.querySelector('#boot-body .line'), first);
        game.emitElement('intro-skip', 'click');
        assert.equal(game.run('entryMode()'), 'diagnostic');
        insideDeck(game);
        assert.equal(game.sb.document.activeElement.id, 'deck-entry-heading');
        assert.equal(game.run('S.narrative.recoveryStage'), 'not_started');
        const lines = game.sb.document.querySelectorAll('#boot-body .line');
        assert.equal(lines.length, 11);
        assert.match(lines[1].textContent, /^FIRMWARE v1\.0 alpha · BUILD [1-9]\d*$/);
        assert.equal(lines[1].textContent, 'FIRMWARE v1.0 alpha · BUILD ' + game.run('FIRMWARE_BUILD'));
        assert.equal(lines[10].textContent, 'interfaz local .......... DISPONIBLE');
        assert.equal(game.run('loopId'), null);
    });
    await check('diagnostico reanuda sin repetir POST y exige accion explicita', game => {
        diagnostic(game);
        click(game, 'storyMenu');
        game.run('document.getElementById("boot-body").innerHTML="";');
        game.emitElement('intro-start', 'click');
        assert.equal(game.run('entryMode()'), 'diagnostic');
        insideDeck(game);
        assert.equal(game.sb.document.querySelectorAll('#boot-body .line').length, 0);
        const clock = game.run('S.clock'); game.advance(10000); game.run('gameLoop();');
        assert.equal(game.run('S.clock'), clock);
        assert.equal(game.run('loopId'), null);
        click(game, 'storyRecover');
        assert.equal(game.run('entryMode()'), null);
        assert.equal(game.run('currentView'), 'archivos');
        assert.equal(game.run('S.narrative.entry'), 'active');
        assert.equal(game.sb.document.getElementById('deck-entry').hidden, true);
        for (const id of ['topbar', 'sidebar', 'panel-scroll', 'msgbar', 'term']) {
            assert.equal(game.sb.document.getElementById(id).inert, false, id + ' habilitado');
        }
        assert.equal(game.list().filter(timer => timer.type === 'interval' && timer.ms === 1000).length, 1);
        assert.equal(game.run('storyBeginRecovery()'), false);
    });
    await check('reduccion sobrevenida termina POST sin iniciar recuperacion', game => {
        game.emitElement('intro-start', 'click'); click(game, 'storySkip');
        game.advance(500); game.run('setDeckPref("animations",false);');
        assert.equal(game.run('entryMode()'), 'diagnostic');
        assert.equal(game.run('_introBootTimer'), null);
        assert.equal(game.run('S.narrative.entry'), 'diagnostic');
        assert.equal(game.run('loopId'), null);
    });
    await check('POST natural y doble omision no activan la sesion', game => {
        game.emitElement('intro-start', 'click'); click(game, 'storySkip');
        game.advance(10000);
        insideDeck(game);
        assert.equal(game.run('entryMode()'), 'diagnostic');
        assert.equal(game.run('_introBootTimer'), null);
        const before = clone(game.run('S'));
        game.run('finishIntroBoot();finishIntroBoot();');
        assert.deepEqual(clone(game.run('S')), before);
        click(game, 'storyMenu');
        assert.equal(game.sb.document.getElementById('deck-entry').hidden, true);
        assert.equal(game.sb.document.getElementById('os').inert, true);
        game.emitElement('intro-start', 'click');
        insideDeck(game);
    });
    await check('lote inicial contiene solo tres piezas legibles y un indice danado', game => {
        diagnostic(game); click(game, 'storyRecover');
        const panel = game.sb.document.getElementById('panel-scroll');
        assert.equal(panel.querySelectorAll('[data-action="openArchive"]').length, 3);
        assert.match(panel.textContent, /Falta reconstrucción/);
        assert.doesNotMatch(panel.textContent, /Registro de custodia|Copia preservada|Cadena de autorizaciones/);
        assert.equal(game.run('S.narrative.readFiles.length'), 0);
        assert.equal(game.run('S.narrative.aliasAcquired'), false);
    });
    await check('abrir marca solo una pieza, no paga y el correo no suplanta al huesped', game => {
        diagnostic(game); click(game, 'storyRecover');
        const original = clone(game.run('S.player'));
        const row = game.sb.document.querySelector('[data-action="openArchive"][data-id="l_contacto"]');
        game.emitElement(row, 'click');
        assert.deepEqual(Array.from(game.run('S.narrative.readFiles')), ['l_contacto']);
        assert.deepEqual(clone(game.run('S.player')), original);
        assert.match(game.sb.document.getElementById('overlay-inner').textContent, /copia enviada, sin ruta de respuesta/);
        assert.equal(game.saved().narrative.readFiles.length, 1);
        game.run('afterBoot();');
        assert.equal(game.run('currentView'), 'archivos');
    });
    await check('releer pausa el reloj sin mutar narrativa, saldo o lecturas', game => {
        diagnostic(game); click(game, 'storyRecover');
        game.run('showView("ayuda");save();'); const before = clone(game.run('S'));
        click(game, 'replayPrologue'); click(game, 'storyContinue');
        game.advance(10000); game.run('gameLoop();');
        assert.equal(game.run('loopId'), null);
        assert.deepEqual(clone(game.run('S')), before);
        click(game, 'storySkip');
        assert.equal(game.run('entryMode()'), null);
        assert.deepEqual(clone(game.run('S')), before);
    });
    await check('importar fase pendiente conserva capa y no inicia reloj', game => {
        diagnostic(game); const pending = clone(game.run('S'));
        click(game, 'storyRecover');
        game.sb.pendingState = pending;
        assert.equal(game.run('importGameState(window.pendingState)'), true);
        assert.equal(game.run('entryMode()'), 'diagnostic');
        assert.equal(game.run('loopId'), null);
        insideDeck(game);
    });
    await check('importacion fallida restaura diagnostico, foco y reloj detenido', game => {
        diagnostic(game);
        const before = clone(game.run('S'));
        const active = clone(before);
        game.sb.activeCandidate = active;
        game.run('var pendingOriginal=S;S=window.activeCandidate;storyBeginRecovery();S=pendingOriginal;');
        game.run('var originalShowView=showView;showView=function(){throw new Error("fallo de vista");};');
        assert.equal(game.run('importGameState(window.activeCandidate)'), false);
        game.run('showView=originalShowView;');
        assert.deepEqual(clone(game.run('S')), before);
        insideDeck(game);
        assert.equal(game.sb.document.activeElement.id, 'deck-entry-heading');
    });
    console.log(`Entrada F2: ${passes} correctas · ${fails} fallos`);
    return options.summary ? { passes, fails, total: passes + fails } : fails;
}
if (require.main === module) run().then(fails => { process.exitCode = fails ? 1 : 0; }, error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
