const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    console.log("Navigating...");
    await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check what HTML is there
    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(el => ({
            id: el.id,
            name: el.name,
            formcontrolname: el.getAttribute('formcontrolname'),
            type: el.type
        }));
    });
    console.log("Inputs found:", inputs);
    await browser.close();
    console.log("Done.");
})();
