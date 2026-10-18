'use strict';
const { test, expect } = require('./fixtures');
const action = (page, name) => page.locator(`[data-action="${name}"]`);
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
