const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    // Set a large viewport so we see everything
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2' });
    
    // Type info exactly as the user provides
    await page.type('input[formcontrolname="documento"]', '71945405');
    // I don't know the exact CUI, let's just type 1
    await page.type('input[formcontrolname="digito"]', '1'); 
    await page.type('input[formcontrolname="fechaNacimiento"]', '06/05/2004'); // correct format
    
    console.log("Clicking checkbox...");
    await page.click('input[formcontrolname="politicaPrivacidad"]');
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Scroll modal and click
    const accepted = await page.evaluate(async () => {
        const modalBody = document.querySelector('.mat-mdc-dialog-content') || document.querySelector('.mat-dialog-content') || document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.scrollTo(0, modalBody.scrollHeight + 5000);
        }
        
        await new Promise(r => setTimeout(r, 1000)); 
        
        const btns = Array.from(document.querySelectorAll('button'));
        const aceptarBtn = btns.find(b => b.textContent.includes('Aceptar'));
        if (aceptarBtn && !aceptarBtn.disabled) {
            aceptarBtn.click();
            return true;
        }
        return false;
    });
    console.log("Modal scrolled and accepted?", accepted);
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking Consultar via Puppeteer click...");
    try {
        const btnHandle = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.toLowerCase().includes('consultar'));
        });
        await btnHandle.click();
        console.log("Clicked Consultar natively");
    } catch (e) {
        console.error("Failed to click Consultar natively", e.message);
    }
    
    // Wait to see what happens
    await new Promise(r => setTimeout(r, 4000));
    
    await page.screenshot({ path: 'essalud-debug.png' });
    console.log("Screenshot saved to essalud-debug.png");
    
    await browser.close();
})();
