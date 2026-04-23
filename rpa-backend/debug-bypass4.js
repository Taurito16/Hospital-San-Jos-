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
    
    console.log("Clicking checkbox...");
    await page.click('input[formcontrolname="politicaPrivacidad"]');
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Scroll modal and click
    const accepted = await page.evaluate(async () => {
        const modalBody = document.querySelector('.mat-mdc-dialog-content') || document.querySelector('.mat-dialog-content') || document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.scrollTo(0, modalBody.scrollHeight + 5000);
        }
        
        await new Promise(r => setTimeout(r, 1000)); // wait for button to enable
        
        const btns = Array.from(document.querySelectorAll('button'));
        const aceptarBtn = btns.find(b => b.textContent.includes('Aceptar'));
        if (aceptarBtn && !aceptarBtn.disabled) {
            aceptarBtn.click();
            return true;
        }
        return false;
    });
    console.log("Modal scrolled and accepted?", accepted);
    
    await new Promise(r => setTimeout(r, 1000)); // wait for modal to disappear
    
    console.log("Clicking Consultar via Puppeteer click...");
    // Try to click Consultar natively via Puppeteer to ensure it behaves like a real user
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
    
    await new Promise(r => setTimeout(r, 6000));
    const html = await page.content();
    console.log("Result contains swal?", html.includes('swal2'));
    console.log("Result contains app-resultado?", html.includes('app-resultado') || html.includes('mat-card'));
    
    // What error did it show?
    if (html.includes('swal2')) {
        const text = await page.evaluate(() => document.querySelector('.swal2-html-container')?.textContent);
        console.log("Error text:", text);
    }
    
    await browser.close();
})();
