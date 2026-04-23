const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function validarSeguro(dni, cui, fecha_nacimiento) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    try {
        try {
            await page.goto('https://dondemeatiendo.essalud.gob.pe/#/consulta', { waitUntil: 'networkidle2', timeout: 30000 });
        } catch (gotoErr) {
            console.error("Error cargando página EsSalud:", gotoErr.message);
            return { success: false, error: 'CONNECTION_ERROR', message: 'Servicio de EsSalud no disponible' };
        }
        // Wait for DNI input
        await page.waitForSelector('input[formcontrolname="documento"]', { timeout: 10000 });
        
        // Type inputs
        await page.type('input[formcontrolname="documento"]', dni);
        await page.type('input[formcontrolname="digito"]', cui);
        await page.type('input[formcontrolname="fechaNacimiento"]', fecha_nacimiento);
        
        // Función auxiliar para pausas (waitForTimeout fue removido en Puppeteer v22)
        const delay = ms => new Promise(res => setTimeout(res, ms));

        // Click en el Checkbox para abrir el modal
        try {
            await page.click('input[formcontrolname="politicaPrivacidad"]');
        } catch (e) {
            // Si el input está cubierto, damos click en el texto
            await page.evaluate(() => {
                const span = document.querySelector('.texto-acepto');
                if (span) span.click();
            });
        }
        
        await delay(1500); // Esperar a que el modal aparezca
        
        // Modal: Scroll y Aceptar
        try {
            const accepted = await page.evaluate(async () => {
                // Hacer scroll hasta el fondo del modal para habilitar el botón
                const modalBody = document.querySelector('.mat-mdc-dialog-content') || document.querySelector('.mat-dialog-content') || document.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.scrollTo(0, modalBody.scrollHeight + 5000);
                }
                
                // Pequeña pausa asíncrona dentro del navegador para que Angular detecte el scroll
                await new Promise(r => setTimeout(r, 1000));
                
                // Buscar y dar click al botón Aceptar
                const btns = Array.from(document.querySelectorAll('button'));
                const aceptarBtn = btns.find(b => b.textContent.includes('Aceptar'));
                if (aceptarBtn && !aceptarBtn.disabled) {
                    aceptarBtn.click();
                    return true;
                }
                return false;
            });
            console.log("Modal interactuado:", accepted);
        } catch (modalErr) {
            console.log("Modal error:", modalErr);
        }
        
        await delay(1000); // Esperar a que el modal se cierre
        
        // Click "Consultar" usando Puppeteer Nativo para que dispare eventos reales
        try {
            const btnHandle = await page.evaluateHandle(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.find(b => b.textContent.toLowerCase().includes('consultar'));
            });
            await btnHandle.click();
        } catch(e) {
            await page.click('button.ess-btn-primary'); // fallback
        }
        
        // Check for captcha or results
        // Usamos una función que evalúa el DOM constantemente buscando la tabla de resultados o mensajes de error
        const firstToHappen = await page.waitForFunction(() => {
            // Éxito:
            const textL = document.body.innerText.toLowerCase();
            if (document.querySelector('.table-responsive') || document.querySelector('app-resultado') || textL.includes('afiliado a') || textL.includes('no tiene derecho de cobertura')) {
                return 'success';
            }
            // Error Swal:
            const swal = document.querySelector('.swal2-html-container');
            if (swal && swal.innerText.trim() !== '') return 'error_swal';
            
            // Error Texto incrustado:
            if (textL.includes('incorrectos') || textL.includes('no encontrado') || textL.includes('captcha')) {
                return 'error_text';
            }
            return false;
        }, { timeout: 15000 }).then(res => res.jsonValue()).catch(() => 'timeout');
        
        if (firstToHappen === 'error_swal' || firstToHappen === 'error_text') {
            const errorText = await page.evaluate(() => {
                const swal = document.querySelector('.swal2-html-container');
                if (swal) return swal.innerText;
                
                // Buscar el texto rojo o la alerta en la pantalla
                const els = document.querySelectorAll('mat-error, .alert, .error-text, span, div');
                for (let e of els) {
                    if (e.innerText && (e.innerText.toLowerCase().includes('incorrectos') || e.innerText.toLowerCase().includes('no encontrado') || e.innerText.toLowerCase().includes('captcha'))) {
                        return e.innerText;
                    }
                }
                return 'Datos incorrectos';
            });
            
            if (errorText.toLowerCase().includes('captcha')) {
                return { success: false, error: 'CAPTCHA_REQUIRED', message: 'Se detectó Captcha. Requiere validación manual.' };
            }
            return { success: false, error: 'CONSULTA_ERROR', message: errorText };
        }
        
        if (firstToHappen === 'timeout') {
            return { success: false, error: 'TIMEOUT', message: 'Datos incorrectos' };
        }
        
        // Extract data
        const extractedData = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        // Parsear el texto para encontrar "Afiliado a" o "NO TIENE DERECHO DE COBERTURA"
        let afiliado_a = null;
        const lines = extractedData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        for (let i = 0; i < lines.length; i++) {
            const lineToLower = lines[i].toLowerCase();
            
            // Caso 1: Paciente no tiene cobertura vigente según texto explícito
            if (lineToLower.includes('no tiene derecho de cobertura')) {
                return { success: true, data: 'NO TIENE DERECHO DE COBERTURA' };
            }
            
            // Caso 2: Buscar a qué seguro está afiliado
            if (lineToLower.includes('afiliado a')) {
                // Puede estar en formato "Afiliado a: ESSALUD"
                if (lineToLower.includes(':')) {
                    const parts = lines[i].split(':');
                    if (parts.length > 1 && parts[1].trim().length > 0) {
                        afiliado_a = parts[1].trim();
                        break;
                    }
                }
                // O puede estar en la línea siguiente: "Afiliado a\nESSALUD"
                if (i + 1 < lines.length) {
                    afiliado_a = lines[i + 1].trim();
                    if (!afiliado_a.includes(':') && afiliado_a.length < 50) {
                        break;
                    }
                }
            }
        }
        
        return { success: true, data: afiliado_a };
        
    } catch (error) {
        console.error("Scraping error:", error);
        return { success: false, error: 'SCRAPER_ERROR', message: error.message };
    } finally {
        await browser.close();
    }
}

module.exports = { validarSeguro };
