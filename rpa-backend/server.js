const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'active', service: 'RPA Backend - Hospital San José', timestamp: new Date().toISOString() });
});

// Configuración de Estrategia
const BATCH_SIZE = 5;

// Lista de User-Agents rotativos
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
];

function getRandomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Lanzar navegador ligero optimizado para cloud
 */
async function launchBrowser() {
    console.log('[Browser] Lanzando Chromium ligero...');
    const browser = await puppeteer.launch({
        args: chromium.args.concat([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]),
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
    });
    console.log('[Browser] Listo.');
    return browser;
}

/**
 * Scraping de un solo DNI en el portal de EsSalud
 */
async function scrapeDni(dni, browser) {
    const page = await browser.newPage();
    await page.setUserAgent(getRandomUA());

    try {
        console.log(`[RPA] Iniciando consulta DNI: ${dni}`);

        // Navigation con timeout robusto
        await page.goto('https://ww1.essalud.gob.pe/sisep/postulante/postulante/postulante_informacion.htm', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Action Delay: simular humano
        await delay(1000);

        // Escribir DNI en el campo
        await page.waitForSelector('#txtDocumento', { timeout: 12000 });
        await page.type('#txtDocumento', dni, { delay: 80 });
        await delay(500);

        // Click en buscar
        await page.click('#btnBuscar');

        // Esperar resultado
        await page.waitForSelector('#txtNombre', { timeout: 15000 });
        await delay(1000);

        // Extraer datos
        const data = await page.evaluate(() => {
            const nombre = document.querySelector('#txtNombre')?.value || '';
            const tipoSeguro = document.querySelector('#txtTipoSeguro')?.value || 'NO ENCONTRADO';
            const cobertura = document.querySelector('#txtCobertura')?.value || 'DESCONOCIDO';
            const estado = document.querySelector('#txtEstado')?.value || 'DESCONOCIDO';
            return { nombre, seguro: tipoSeguro, cobertura, estado };
        });

        console.log(`[RPA] DNI ${dni} → ${data.seguro} | ${data.cobertura}`);
        return { dni, success: true, ...data };

    } catch (error) {
        console.error(`[RPA] Error DNI ${dni}:`, error.message);
        return { dni, success: false, seguro: 'ERROR', error: error.message };
    } finally {
        await page.close();
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== ENDPOINTS ====================

// Validación individual
app.post('/validate', async (req, res) => {
    const { dni } = req.body;
    if (!dni) return res.status(400).json({ error: 'DNI requerido' });

    let browser;
    try {
        browser = await launchBrowser();
        const result = await scrapeDni(dni, browser);
        res.json({ success: true, result });
    } catch (err) {
        console.error('[API] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

// Validación en lote (máx 50 pacientes)
app.post('/validate-batch', async (req, res) => {
    const { dnis } = req.body;
    if (!Array.isArray(dnis) || dnis.length === 0) {
        return res.status(400).json({ error: 'Lista de DNIs requerida' });
    }

    console.log(`[RPA] Solicitud batch: ${dnis.length} pacientes`);

    let browser;
    try {
        browser = await launchBrowser();
        const results = [];

        // Batching: procesar de a BATCH_SIZE para no saturar RAM
        for (let i = 0; i < dnis.length; i += BATCH_SIZE) {
            const batch = dnis.slice(i, i + BATCH_SIZE);
            console.log(`[RPA] Lote ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} DNIs)`);

            // Procesar secuencialmente dentro del lote para ahorrar RAM
            for (const dni of batch) {
                const result = await scrapeDni(dni, browser);
                results.push(result);
            }

            // Pausa entre lotes para estabilizar
            if (i + BATCH_SIZE < dnis.length) {
                console.log('[RPA] Pausa entre lotes...');
                await delay(2000);
            }
        }

        const exitosos = results.filter(r => r.success).length;
        console.log(`[RPA] Completado: ${exitosos}/${results.length} exitosos`);

        res.json({ success: true, total: results.length, exitosos, results });
    } catch (err) {
        console.error('[API] Error batch:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`[Server] RPA Backend escuchando en puerto ${PORT}`);
    console.log(`[Server] Endpoints: POST /validate | POST /validate-batch`);
});
