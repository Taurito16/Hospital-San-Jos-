const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2' });
    
    const html = await page.evaluate(() => {
        const input = document.querySelector('input[formcontrolname="politicaPrivacidad"]');
        if (input) {
            let parent = input;
            for(let i=0; i<4; i++) { if(parent.parentElement) parent = parent.parentElement; }
            return parent.outerHTML;
        }
        return "Not found";
    });
    console.log(html);
    await browser.close();
})();
