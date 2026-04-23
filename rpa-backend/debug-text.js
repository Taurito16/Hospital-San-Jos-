const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2' });
    
    await page.type('input[formcontrolname="documento"]', '71945405');
    await page.type('input[formcontrolname="digito"]', '1'); 
    await page.type('input[formcontrolname="fechaNacimiento"]', '06/05/2004'); 
    
    await page.click('input[formcontrolname="politicaPrivacidad"]');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(async () => {
        const modalBody = document.querySelector('.mat-mdc-dialog-content') || document.querySelector('.mat-dialog-content');
        if (modalBody) modalBody.scrollTo(0, 9000);
        await new Promise(r => setTimeout(r, 1000)); 
        const btns = Array.from(document.querySelectorAll('button'));
        const aceptarBtn = btns.find(b => b.textContent.includes('Aceptar'));
        if (aceptarBtn && !aceptarBtn.disabled) aceptarBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    const btnHandle = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.toLowerCase().includes('consultar'));
    });
    await btnHandle.click();
    
    await new Promise(r => setTimeout(r, 4000));
    
    const text = await page.evaluate(() => document.body.innerText);
    console.log("PAGE TEXT DUMP:\n", text);
    
    await browser.close();
})();
