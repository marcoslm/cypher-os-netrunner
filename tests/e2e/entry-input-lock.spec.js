'use strict';
const {test,expect}=require('./fixtures');
const chords=['Control+g','Control+k',...Array.from({length:9},(_,i)=>`Control+${i+1}`)];
async function introFocus(page){
 expect(await page.evaluate(()=>document.getElementById('intro').contains(document.activeElement))).toBe(true);
}
async function backToIntro(page,game){
 await game.openSaveTools();await page.locator('#btn-intro').click();
 await page.locator('#confirm-overlay [data-action="confirmYes"]').click();
 await expect(page.locator('#intro')).toBeVisible();
}
test('entrada: intro inicial contiene Tab y consume atajos sin inicializar el juego',async({page,game})=>{
 await game.freeze();await expect(page.locator('#intro-start')).toBeFocused();
 expect(await page.locator('#os').evaluate(el=>el.inert)).toBe(true);
 for(const chord of chords){await page.keyboard.press(chord);await introFocus(page);}
 await page.keyboard.press('Control+s');
 for(let i=0;i<16;i++){await page.keyboard.press('Tab');await introFocus(page);}
 await page.keyboard.press('Shift+Tab');await introFocus(page);
 const after=await game.snapshot();expect(after.state).toBeNull();expect(after.immersion).toBeNull();expect(after.saved).toBeNull();
 await expect(page.locator('#boot')).toBeHidden();
});
test('entrada: retornar bloquea gameplay y conserva Ctrl+S, controles y foco',async({page,game})=>{
 await game.setup({state:{offers:[]},player:{credits:4321}});await backToIntro(page,game);
 const before=await game.snapshot();await expect(page.locator('#intro-start')).toBeFocused();
 for(const chord of chords){await page.keyboard.press(chord);await introFocus(page);}
 await page.keyboard.press('Control+s');
 const after=await game.snapshot();expect(after.immersion).toBeNull();expect(after.gridRender).toBe(false);
 expect(after.state.player).toEqual(before.state.player);expect(after.saved.player.credits).toBe(4321);
 expect(after.saved._inImmersion).toBeNull();expect(after.view).toBe(before.view);
 expect(await page.locator('#os').evaluate(el=>el.inert)).toBe(true);
 const control=page.locator('#intro [data-action="openControls"]');await control.click();
 await expect(page.locator('#controls-overlay')).toBeVisible();
 await page.keyboard.press('Escape');await expect(control).toBeFocused();
 await expect(page.locator('#controls-overlay')).toBeHidden();
 expect(await page.locator('#os').evaluate(el=>el.inert)).toBe(true);
});
test('entrada: BIOS viva bloquea Ctrl y controles, Enter continúa y libera la sesión',async({page,game})=>{
 await game.setup({state:{offers:[]},player:{credits:4321}});await backToIntro(page,game);
 await page.locator('#intro-start').click();await page.clock.runFor(600);
 await expect(page.locator('#intro')).toBeHidden();await expect(page.locator('#boot')).toBeVisible();
 const before=await game.snapshot();
 for(const chord of [...chords,'Control+s'])await page.keyboard.press(chord);
 await expect(page.locator('#boot')).toBeVisible();
 expect(await page.evaluate(()=>document.activeElement.id)).toBe('boot');
 const after=await game.snapshot();expect(after.immersion).toBeNull();expect(after.state.player).toEqual(before.state.player);
 await expect(page.locator('#controls-overlay')).toBeHidden();
 await page.keyboard.press('Enter');await page.clock.runFor(600);
 await expect(page.locator('#boot')).toBeHidden();
 expect(await page.locator('#os').evaluate(el=>el.inert)).toBe(false);
 await page.keyboard.press('Control+k');await expect(page.locator('#cmd')).toBeFocused();
 await page.locator('.navbtn[data-view="red"]').click();
 await page.locator('[data-action="dipGrid"]').click();
 expect((await game.snapshot()).immersion).not.toBeNull();
});
