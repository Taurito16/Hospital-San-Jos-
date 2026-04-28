const express = require('express');
const cors = require('cors');
const { validarSeguro } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/validar-seguro', async (req, res) => {
    const t0 = Date.now();
    const { dni, codigo_verificacion, fecha_nacimiento } = req.body;

    if (!dni || !codigo_verificacion || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (dni, codigo_verificacion, fecha_nacimiento)' });
    }

    // Normalizar formato de fecha a DD/MM/YYYY requerido por EsSalud
    let fecha_formateada = fecha_nacimiento;
    if (fecha_nacimiento.includes('-')) {
        const parts = fecha_nacimiento.split('-');
        if (parts[0].length === 4) fecha_formateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else if (fecha_nacimiento.includes('/')) {
        const parts = fecha_nacimiento.split('/');
        if (parts[0].length === 4) fecha_formateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    console.log(`[${new Date().toISOString()}] [API] Solicitud DNI: ${dni} | Fecha: ${fecha_formateada}`);

    const result = await validarSeguro(dni, codigo_verificacion, fecha_formateada);

    const elapsed = Date.now() - t0;
    console.log(`[${new Date().toISOString()}] [API] Respuesta DNI: ${dni} → ${result.success ? 'OK' : 'FALLO'} (${elapsed}ms total)`);

    if (result.success) {
        res.json({ success: true, tipo_seguro_extraido: result.data });
    } else {
        res.status(500).json({ success: false, error: result.error, message: result.message });
    }
});

// Endpoint de health check — útil para el keep-alive de Render
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] RPA Backend escuchando en el puerto ${PORT}`);
});
