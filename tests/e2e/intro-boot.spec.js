'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('./fixtures');
const action = (page, name) => page.locator(`[data-action="${name}"]`);
async function installBackgroundFixtures(page, testInfo, { broken = false } = {}) {
    const pictures = await page.evaluate(() => ['#d7b474', '#79bdca', '#d79199'].map(color => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600; canvas.height = 900;
        const context = canvas.getContext('2d');
        context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height);
        for (let column = 0; column < 8; column++) {
            context.fillStyle = column % 2 ? '#648267' : '#b6d3dc';
            context.fillRect(column * 200, 130 + column * 35, 130, 500);
        }
        return canvas.toDataURL('image/webp', 0.85);
    }));
    fs.mkdirSync(testInfo.outputDir, { recursive: true });
    const sources = pictures.map((picture, index) => {
        const filename = testInfo.outputPath(`synthetic-background-${index}.webp`);
        fs.writeFileSync(filename, Buffer.from(picture.split(',')[1], 'base64'));
        return pathToFileURL(filename).href;
    });
    await page.evaluate(({ sources, broken }) => {
        INTRO_BACKGROUNDS.menu.forEach((scene, index) => {
            scene.src = broken && index === 1 ? 'data:image/webp;base64,AA==' : sources[index];
        });
        INTRO_BACKGROUNDS.prologue.forEach((scene, index) => { scene.src = sources[index]; });
        clearIntroBackground(); syncIntroBackground();
    }, { sources, broken });
    await expect.poll(() => page.locator('#intro-background img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth > 0).length)).toBe(broken ? 2 : 3);
    await expect(page.locator('#intro')).toHaveClass(/has-background/);
    return sources;
}
async function diagnostic(page, game) {
    await game.freeze();
    await page.locator('#intro-start').click();
    await action(page, 'storySkip').click();
    if (await page.locator('#intro-skip').isVisible()) await page.locator('#intro-skip').click();
    await expect(action(page, 'storyRecover')).toBeVisible();
}
test('F2: menu, tres pasajes, POST local y recuperacion explicita', async ({ page, game }, testInfo) => {
    await game.freeze();
    await expect(page.locator('#intro .intro-logo')).toBeVisible();
    await expect(page.locator('#boot')).toBeHidden();
    expect((await game.snapshot()).state).toBeNull();
    await page.locator('#intro-start').click();
    await expect(page.locator('#story-heading')).toBeFocused();
    await expect(page.locator('#story-entry')).toContainText('Dejaste la llave');
    await action(page, 'storyContinue').click();
    await expect(page.locator('#story-entry')).toContainText('Una semana, Álex');
    await action(page, 'storyContinue').click();
    await expect(page.locator('#story-entry')).toContainText('Quizá se averió');
    await action(page, 'storyContinue').click();
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.locator('#deck-entry')).toBeVisible();
    await expect(page.locator('#intro-skip')).toBeFocused();
    await expect(page.locator('#os')).toHaveJSProperty('inert', false);
    for (const id of ['topbar', 'sidebar', 'panel-scroll', 'msgbar', 'term']) {
        await expect(page.locator('#' + id)).toHaveJSProperty('inert', true);
    }
    await page.clock.runFor(320);
    const first = page.locator('#boot-body .line').first();
    await expect(first).toBeVisible();
    const anchor = await first.boundingBox();
    await page.clock.runFor(180);
    expect((await first.boundingBox()).y).toBe(anchor.y);
    await page.screenshot({ path: testInfo.outputPath('post-local.png') });
    await page.locator('#intro-skip').click();
    await expect(page.locator('#deck-entry-heading')).toBeFocused();
    const deckBox = await page.locator('#panel').boundingBox();
    for (const key of ['Control+g', 'Control+k', 'Control+1', 'Tab', 'Shift+Tab', 'Control+s']) {
        await page.keyboard.press(key);
        expect(await page.locator('#deck-entry').evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    expect((await game.snapshot()).immersion).toBeNull();
    expect((await game.snapshot()).saved.narrative.recoveryStage).toBe('not_started');
    expect(await page.evaluate(() => loopId)).toBeNull();
    await action(page, 'storyRecover').click();
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.locator('#deck-entry')).toBeHidden();
    expect(await page.locator('#panel').boundingBox()).toEqual(deckBox);
    for (const id of ['topbar', 'sidebar', 'panel-scroll', 'msgbar', 'term']) {
        await expect(page.locator('#' + id)).toHaveJSProperty('inert', false);
    }
    await expect(page.locator('#panel-scroll h1')).toHaveText('ARCHIVOS');
    expect((await game.snapshot()).saved.narrative.aliasAcquired).toBe(false);
});
test('F2: Ctrl+S, foco, recarga de pasaje y diagnostico sin repetir POST', async ({ page, game }) => {
    await game.freeze(); await page.locator('#intro-start').click();
    await action(page, 'storyContinue').click();
    for (const key of ['Control+g', 'Control+k', 'Control+1', 'Tab', 'Shift+Tab', 'Control+s']) {
        await page.keyboard.press(key);
        expect(await page.locator('#intro').evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    expect((await game.snapshot()).saved.narrative.prologuePage).toBe(1);
    await page.reload(); await page.locator('#intro-start').click();
    await expect(page.locator('#story-heading')).toHaveText('Hostal La Bajante');
    await expect(page.locator('#boot-body .line')).toHaveCount(0);
    await action(page, 'storySkip').click();
    await page.locator('#intro-skip').click();
    await page.reload(); await page.locator('#intro-start').click();
    await expect(action(page, 'storyRecover')).toBeVisible();
    await expect(page.locator('#boot-body .line')).toHaveCount(0);
    expect(await page.evaluate(() => loopId)).toBeNull();
    expect((await game.snapshot()).immersion).toBeNull();
});
test('F2: reduccion de movimiento completa POST pero no recupera', async ({ page, game }) => {
    await game.freeze(); await page.locator('#intro-start').click();
    await action(page, 'storySkip').click();
    await page.clock.runFor(500); await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(action(page, 'storyRecover')).toBeVisible();
    expect(await page.evaluate(() => _introBootTimer)).toBeNull();
    expect(await page.evaluate(() => loopId)).toBeNull();
    expect((await game.snapshot()).state.narrative.entry).toBe('diagnostic');
});
test('F2: volver al menu desde el tercer pasaje reinicia el prologo', async ({ page, game }) => {
    await game.freeze(); await page.locator('#intro-start').click();
    await action(page, 'storyContinue').click(); await action(page, 'storyContinue').click();
    expect((await game.snapshot()).saved.narrative.prologuePage).toBe(2);
    const before = (await game.snapshot()).state;
    await action(page, 'storyMenu').click();
    await expect(page.locator('#intro-start')).toBeFocused();
    expect((await game.snapshot()).saved.narrative.prologuePage).toBe(0);
    await page.locator('#intro-start').click();
    await expect(page.locator('#story-entry')).toContainText('Dejaste la llave');
    await expect(action(page, 'storyPrevious')).toBeDisabled();
    const after = (await game.snapshot()).state;
    expect(after.narrative).toEqual({ ...before.narrative, prologuePage: 0 });
    expect(after.player).toEqual(before.player);
    expect(await page.evaluate(() => loopId)).toBeNull();
});
test('F2: archivos y correo anterior tienen una sola lectura, fuente y fecha', async ({ page, game }) => {
    await diagnostic(page, game); await action(page, 'storyRecover').click();
    const before = (await game.snapshot()).state.player;
    await expect(action(page, 'openArchive')).toHaveCount(3);
    await expect(page.locator('#panel-scroll')).toContainText('Falta reconstrucción');
    await expect(page.locator('#panel-scroll')).not.toContainText('Registro de custodia');
    await page.locator('#archive-filter').selectOption('pending');
    await expect(page.locator('#archive-filter')).toBeFocused();
    await expect(action(page, 'openArchive')).toHaveCount(0);
    await expect(page.locator('#panel-scroll')).toContainText('Indice de mantenimiento');
    await page.locator('#archive-filter').selectOption('all');
    await page.locator('[data-action="openArchive"][data-id="l_revision"]').click();
    await expect(page.locator('#archive-heading')).toBeFocused();
    await expect(page.locator('.archive-document')).toContainText('LB-2093-10');
    await expect(page.locator('.archive-document')).toContainText('07-10-2093 18:12');
    await page.locator('.navbtn[data-view="mensajes"]').click();
    await page.locator('[data-action="mailTab"][data-tab="previous"]').click();
    await action(page, 'openArchive').click();
    await expect(page.locator('.archive-document')).toContainText('copia enviada, sin ruta de respuesta');
    const after = await game.snapshot();
    expect(after.state.player).toEqual(before);
    expect(after.saved.narrative.readFiles).toEqual(['l_revision', 'l_contacto']);
    await action(page, 'closeArchive').click();
    await expect(page.locator('[data-action="openArchive"][data-id="l_contacto"]')).toBeFocused();
    await expect(page.locator('.navbtn[data-view="mensajes"]')).toHaveClass(/active/);
    await page.locator('.navbtn[data-view="archivos"]').click();
    await page.locator('[data-action="archiveTab"][data-tab="recovered"]').click();
    await expect(page.locator('#panel-scroll')).toContainText('No hay archivos');
    await game.reload();
    await expect(page.locator('.navbtn[data-view="archivos"]')).toHaveClass(/active/);
    expect((await game.snapshot()).saved.narrative.readFiles).toEqual(['l_revision', 'l_contacto']);
});
test('F2: relectura desde AYUDA pausa y no cambia la partida', async ({ page, game }) => {
    await game.boot(); await page.locator('.navbtn[data-view="ayuda"]').click();
    const before = (await game.snapshot()).state;
    await action(page, 'replayPrologue').click();
    await action(page, 'storyContinue').click();
    await page.clock.runFor(12000);
    expect(await page.evaluate(() => loopId)).toBeNull();
    expect((await game.snapshot()).state).toEqual(before);
    await action(page, 'storySkip').click();
    await expect(action(page, 'replayPrologue')).toBeFocused();
    expect((await game.snapshot()).state).toEqual(before);
});
for (const width of [320, 375, 768, 1280, 1920]) {
    test(`F2: ${width}px entrada y archivo sin texto o controles solapados`, async ({ page, game }, testInfo) => {
        const height = width < 768 ? 667 : (width === 1280 ? 720 : (width === 768 ? 1024 : 1080));
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await game.freeze();
        const menu = page.locator('#intro-menu');
        const menuBox = await menu.boundingBox();
        expect(Math.abs(menuBox.x + menuBox.width / 2 - width / 2)).toBeLessThanOrEqual(1);
        if (menuBox.height + 96 <= height) {
            expect(Math.abs(menuBox.y + menuBox.height / 2 - height / 2)).toBeLessThanOrEqual(1);
        }
        for (const selector of ['.intro-identity', '.intro-session', '#intro-start', '.intro-settings']) {
            const box = await menu.locator(selector).boundingBox();
            expect(Math.abs(box.x + box.width / 2 - width / 2), selector).toBeLessThanOrEqual(1);
        }
        await expect(menu).toHaveCSS('text-align', 'center');
        await expect(menu.locator('.intro-session')).toHaveCSS('border-top-width', '1px');
        await expect(menu.locator('.intro-settings')).toHaveCSS('border-top-width', '0px');
        const sessionBox = await menu.locator('.intro-session').boundingBox();
        const startBox = await page.locator('#intro-start').boundingBox();
        expect(Math.abs(sessionBox.width - startBox.width)).toBeLessThanOrEqual(1);
        expect(await menu.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
        await page.locator('#intro-start').click(); await action(page, 'storyContinue').click();
        expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await expect(page.locator('#story-heading')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`prologue-${width}.png`), fullPage: true });
        await action(page, 'storyContinue').scrollIntoViewIfNeeded(); await action(page, 'storyContinue').click();
        await action(page, 'storyContinue').click();
        await expect(action(page, 'storyRecover')).toBeVisible();
        expect(await page.locator('#deck-entry').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await expect(page.locator('#deck-entry-heading')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`diagnostic-${width}.png`) });
        const panelBox = await page.locator('#panel').boundingBox();
        await action(page, 'storyRecover').click();
        expect(await page.locator('#panel').boundingBox()).toEqual(panelBox);
        await page.screenshot({ path: testInfo.outputPath(`recovery-${width}.png`) });
        await page.locator('[data-action="openArchive"][data-id="l_contacto"]').click();
        expect(await page.locator('#panel-scroll').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await expect(page.locator('.archive-document')).toContainText('ARCHIVO DEL ANTERIOR USUARIO');
        await page.screenshot({ path: testInfo.outputPath(`archive-${width}.png`) });
    });
}
for (const viewport of [{ width: 320, height: 667 }, { width: 1280, height: 450 }]) {
    test(`F2: POST animado ${viewport.width}x${viewport.height} con controles accesibles`, async ({ page, game }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await game.freeze();
        await page.locator('#intro-start').click();
        await action(page, 'storySkip').click();
        await page.clock.runFor(2000);
        const panelBox = await page.locator('#panel').boundingBox();
        const skipBox = await page.locator('#intro-skip').boundingBox();
        expect(skipBox.x).toBeGreaterThanOrEqual(0);
        expect(skipBox.x + skipBox.width).toBeLessThanOrEqual(viewport.width);
        expect(skipBox.y + skipBox.height).toBeLessThanOrEqual(viewport.height);
        expect(await page.locator('#deck-entry').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.keyboard.press('Tab');
        await expect(page.locator('#intro-skip')).toBeFocused();
        await page.screenshot({ path: testInfo.outputPath(`post-${viewport.width}x${viewport.height}.png`) });
        await page.keyboard.press('Enter');
        await expect(page.locator('#deck-entry-heading')).toBeFocused();
        expect(await page.locator('#panel').boundingBox()).toEqual(panelBox);
        expect(await page.evaluate(() => _introBootTimer)).toBeNull();
        expect(await page.evaluate(() => loopId)).toBeNull();
        await action(page, 'storyMenu').scrollIntoViewIfNeeded();
        await action(page, 'storyMenu').click();
        await expect(page.locator('#intro')).toBeVisible();
        await expect(page.locator('#deck-entry')).toBeHidden();
        await page.locator('#intro-start').click();
        await expect(page.locator('#deck-entry-heading')).toBeFocused();
        await expect(page.locator('#boot-body .line')).toHaveCount(await page.evaluate(() => _introBootIndex));
        await page.screenshot({ path: testInfo.outputPath(`diagnostic-${viewport.width}x${viewport.height}.png`) });
    });
}
test('F2: texto al 200 por ciento conserva entrada, scroll y acciones', async ({ page, game }, testInfo) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await game.freeze();
    await page.addStyleTag({ content: '#intro .intro-logo{font-size:60px} #intro-body p{font-size:28px} #story-entry h1{font-size:46px} #intro-body button,#intro-body label{font-size:22px} #deck-entry p,#deck-entry .btn,#boot{font-size:26px} #deck-entry .panel-h{font-size:28px} #deck-entry .bios-heading{font-size:22px} #deck-entry .deck-power{font-size:20px}' });
    expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.locator('#intro-start').click();
    await action(page, 'storySkip').scrollIntoViewIfNeeded();
    await action(page, 'storySkip').click();
    await page.clock.runFor(2000);
    expect(await page.locator('#deck-entry').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.locator('#intro-skip').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('post-text-200.png') });
    await page.locator('#intro-skip').click();
    await expect(page.locator('#deck-entry-heading')).toBeFocused();
    await action(page, 'storyRecover').scrollIntoViewIfNeeded();
    expect(await page.locator('#deck-entry').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('diagnostic-text-200.png') });
    await action(page, 'storyRecover').click();
    await expect(page.locator('#deck-entry')).toBeHidden();
    await expect(page.locator('#panel-scroll h1')).toHaveText('ARCHIVOS');
});

test('Fondos: archivos locales, fundido, carga parcial y movimiento reducido', async ({ page, game }, testInfo) => {
    await game.freeze();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await installBackgroundFixtures(page, testInfo, { broken: true });
    await page.clock.runFor(2000);
    const image = page.locator('#intro-background .is-visible');
    const firstSource = await image.getAttribute('src');
    const startBox = await page.locator('#intro-start').boundingBox();
    await expect(page.locator('#intro-background')).toHaveAttribute('aria-hidden', 'true');
    await expect(image).toHaveCSS('opacity', '1');
    await expect(image).toHaveCSS('object-fit', 'cover');
    await expect(image).toHaveAttribute('alt', '');
    await expect(image).toHaveCSS('transition-duration', '1.6s');
    expect((await game.snapshot()).state).toBeNull();
    await page.clock.runFor(10000);
    expect(await image.getAttribute('src')).not.toBe(firstSource);
    await expect(image).toHaveCSS('opacity', '1');
    expect(await page.locator('#intro-start').boundingBox()).toEqual(startBox);
    await expect(page.locator('#intro-start')).toBeFocused();
    const stillSource = await image.getAttribute('src');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveClass(/motion-off/);
    expect(await page.evaluate(() => _introBackgroundTimer)).toBeNull();
    await page.clock.runFor(30000);
    expect(await image.getAttribute('src')).toBe(stillSource);
    expect(await page.evaluate(() => _introBackgroundTimer)).toBeNull();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('html')).not.toHaveClass(/motion-off/);
    await page.locator('#intro [data-action="openControls"]').click();
    await page.locator('[data-pref="animations"]').click();
    await expect(page.locator('[data-pref="animations"]')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => _introBackgroundTimer)).toBeNull();
    await page.locator('#controls-overlay .control-close').click();
    await page.locator('#intro-start').click();
    await expect(page.locator('#intro-background img')).toHaveCount(1);
    await expect(page.locator('#intro')).toHaveClass(/has-background/);
    await action(page, 'storySkip').click();
    await expect(page.locator('#intro-background img')).toHaveCount(0);
    expect(await page.evaluate(() => _introBackgroundTimer)).toBeNull();
});

for (const viewport of [{ width: 320, height: 667 }, { width: 1280, height: 720 }]) {
    test(`Fondos: ${viewport.width}px posicion estable antes y despues de cargar cada pasaje`, async ({ page, game }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await game.freeze();
        await installBackgroundFixtures(page, testInfo);
        await page.evaluate(() => {
            window.presentIntroBackground = showIntroBackground;
            window.pendingIntroBackground = null;
            showIntroBackground = function(index) { window.pendingIntroBackground = index; };
        });
        await page.locator('#intro-start').click();
        for (let scene = 0; scene < 3; scene++) {
            await expect(page.locator('#intro')).not.toHaveClass(/has-background/);
            const selectors = ['#intro-body', '#story-entry', '.story-actions', '[data-action="storyMenu"]'];
            const before = await Promise.all(selectors.map(selector => page.locator(selector).boundingBox()));
            const padding = await page.locator('#intro').evaluate(el => parseFloat(getComputedStyle(el).paddingLeft));
            expect(before[1].x).toBe(padding);
            await expect.poll(() => page.evaluate(() => window.pendingIntroBackground)).toBe(0);
            await page.screenshot({ path: testInfo.outputPath(`pending-${scene}-${viewport.width}.png`) });
            await page.evaluate(() => { window.presentIntroBackground(window.pendingIntroBackground); window.pendingIntroBackground = null; });
            await page.clock.runFor(1800);
            await expect(page.locator('#intro')).toHaveClass(/has-background/);
            const after = await Promise.all(selectors.map(selector => page.locator(selector).boundingBox()));
            expect(after).toEqual(before);
            expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
            await page.screenshot({ path: testInfo.outputPath(`loaded-${scene}-${viewport.width}.png`) });
            await action(page, 'storyContinue').click();
        }
        await expect(page.locator('#intro')).toBeHidden();
    });
    test(`Fondos PNG: ${viewport.width}px recursos generados y lectura del prologo`, async ({ page, game }, testInfo) => {
        const scenes = await page.evaluate(() => INTRO_BACKGROUNDS);
        test.skip(![...scenes.menu, ...scenes.prologue].every(scene => fs.existsSync(path.resolve(__dirname, '../..', scene.src))), 'Los fondos artisticos son opcionales en una copia sin recursos');
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await game.freeze();
        const frames = page.locator('#intro-background img');
        await expect.poll(() => frames.evaluateAll(images => images.filter(image => image.complete && image.naturalWidth > 0).length)).toBe(3);
        for (let index = 0; index < 3; index++) {
            await expect(frames.nth(index)).toHaveAttribute('src', scenes.menu[index].src);
            await expect(frames.nth(index)).toHaveAttribute('src', /\.png$/);
        }
        const visible = page.locator('#intro-background .is-visible');
        await expect(visible).toHaveCSS('opacity', '1');
        await expect(page.locator('#intro-start')).toBeFocused();
        await page.screenshot({ path: testInfo.outputPath(`menu-png-${viewport.width}.png`) });
        await page.locator('#intro-start').click();
        for (let index = 0; index < 3; index++) {
            await expect(visible).toHaveAttribute('src', scenes.prologue[index].src);
            await expect.poll(() => visible.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
            await expect(visible).toHaveCSS('opacity', '1');
            await expect(page.locator('#story-heading')).toBeFocused();
            expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
            await action(page, 'storyContinue').scrollIntoViewIfNeeded();
            await expect(action(page, 'storyContinue')).toBeInViewport();
            await page.screenshot({ path: testInfo.outputPath(`prologue-png-${index}-${viewport.width}.png`) });
            await action(page, 'storyContinue').click();
        }
        await expect(page.locator('#intro')).toBeHidden();
        await expect(frames).toHaveCount(0);
        await expect(action(page, 'storyRecover')).toBeVisible();
    });
}

for (const viewport of [{ width: 320, height: 667 }, { width: 768, height: 1024 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    test(`Fondos: ${viewport.width}px menu y tres escenas con imagen real cargada`, async ({ page, game }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await game.freeze();
        const sources = await installBackgroundFixtures(page, testInfo);
        const background = page.locator('#intro-background .is-visible');
        await expect(background).toHaveCSS('opacity', '1');
        expect(await background.boundingBox()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
        await page.screenshot({ path: testInfo.outputPath(`synthetic-menu-${viewport.width}.png`) });
        await page.locator('#intro-start').click();
        for (let scene = 0; scene < 3; scene++) {
            await expect(background).toHaveAttribute('src', sources[scene]);
            await expect(background).toHaveCSS('opacity', '1');
            expect(await background.evaluate(image => image.naturalWidth)).toBe(1600);
            expect(await background.boundingBox()).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
            expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
            await expect(page.locator('#story-heading')).toBeFocused();
            if (viewport.width >= 768) {
                const textBox = await page.locator('#story-entry').boundingBox();
                expect(textBox.x).toBeLessThan(60);
                expect(textBox.width).toBeLessThanOrEqual(600);
            }
            await action(page, 'storyContinue').scrollIntoViewIfNeeded();
            await expect(action(page, 'storyContinue')).toBeInViewport();
            const saved = (await game.snapshot()).saved;
            await page.clock.runFor(20000);
            expect((await game.snapshot()).saved).toEqual(saved);
            await expect(background).toHaveAttribute('src', sources[scene]);
            await page.screenshot({ path: testInfo.outputPath(`synthetic-prologue-${scene}-${viewport.width}.png`) });
            await action(page, 'storyContinue').click();
        }
        await expect(page.locator('#intro')).toBeHidden();
        await expect(action(page, 'storyRecover')).toBeVisible();
        await expect(page.locator('#intro-background img')).toHaveCount(0);
        await action(page, 'storyRecover').click();
        await page.locator('.navbtn[data-view="ayuda"]').click();
        const before = (await game.snapshot()).state;
        await action(page, 'replayPrologue').click();
        await expect(background).toHaveAttribute('src', sources[0]);
        await expect(background).toHaveCSS('opacity', '1');
        await action(page, 'storyContinue').click();
        await expect(background).toHaveAttribute('src', sources[1]);
        await action(page, 'storyPrevious').click();
        await expect(background).toHaveAttribute('src', sources[0]);
        await action(page, 'storySkip').click();
        expect((await game.snapshot()).state).toEqual(before);
        await expect(action(page, 'replayPrologue')).toBeFocused();
        await expect(page.locator('#intro-background img')).toHaveCount(0);
    });
}
