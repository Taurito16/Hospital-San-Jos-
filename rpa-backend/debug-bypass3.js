const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2' });
    
    // Type info
    await page.type('input[formcontrolname="documento"]', '71945405');
    await page.type('input[formcontrolname="digito"]', '1'); 
    await page.type('input[formcontrolname="fechaNacimiento"]', '01/01/1990');
    
    // Try clicking the exact input using Puppeteer
    console.log("Clicking checkbox...");
    await page.click('input[formcontrolname="politicaPrivacidad"]');
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Find modal and click aceptar
    const accepted = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const aceptarBtn = btns.find(b => b.textContent.includes('Aceptar'));
        if (aceptarBtn) {
            aceptarBtn.click();
            return true;
        }
        return false;
    });
    console.log("Modal accepted?", accepted);
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking Consultar...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const consultarBtn = btns.find(b => b.textContent.toLowerCase().includes('consultar'));
        if (consultarBtn) consultarBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 5000));
    const html = await page.content();
    console.log("Result contains swal?", html.includes('swal2'));
    console.log("Result contains app-resultado?", html.includes('app-resultado') || html.includes('mat-card'));
    
    await browser.close();
})();
