const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2' });
    
    // Type info
    await page.type('input[formcontrolname="documento"]', '71945405');
    await page.type('input[formcontrolname="digito"]', '1'); // fake cui
    await page.type('input[formcontrolname="fechaNacimiento"]', '01/01/1990');
    
    // Bypass checkbox via JS
    await page.evaluate(() => {
        const cbx = document.querySelector('input[formcontrolname="politicaPrivacidad"]');
        if (cbx) {
            cbx.checked = true;
            cbx.dispatchEvent(new Event('change', { bubbles: true }));
            cbx.dispatchEvent(new Event('click', { bubbles: true })); // Some frameworks need click
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Find and click Consultar
    const clicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Consultar'));
        if (btn) {
            btn.disabled = false;
            btn.click();
            return true;
        }
        return false;
    });
    console.log("Clicked Consultar?", clicked);
    
    // Check if error or result
    await new Promise(r => setTimeout(r, 2000));
    const html = await page.content();
    console.log(html.includes('swal2') ? 'Error modal appeared (good, means form submitted)' : 'No response');
    
    await browser.close();
})();
