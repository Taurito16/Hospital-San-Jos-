document.addEventListener('DOMContentLoaded', async () => {
    // Inicialización y Auth
    const client = typeof supabaseClient !== 'undefined' ? supabaseClient : supabase;
    const { data: { session } } = await client.auth.getSession();
    
    if (!session) {
        window.location.href = '../../index.html';
        return;
    }

    // Referencias del DOM - Filtros
    const filterDni = document.getElementById('filter-dni');
    const filterHc = document.getElementById('filter-hc');
    const filterApellidos = document.getElementById('filter-apellidos');
    const filterNombres = document.getElementById('filter-nombres');
    const btnSearch = document.getElementById('btn-search');
    const btnClear = document.getElementById('btn-clear');

    // Referencias del DOM - Vistas
    const viewResultados = document.getElementById('view-resultados');
    const viewCalendario = document.getElementById('view-calendario');
    const tablePacientes = document.getElementById('table-pacientes');
    const tbodyPacientes = document.getElementById('tbody-pacientes');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Referencias del DOM - Calendario
    const daysGrid = document.getElementById('days-grid');
    const bannerNombre = document.getElementById('banner-paciente-nombre');
    const bannerInfo = document.getElementById('banner-paciente-info');
    const btnBackToList = document.getElementById('btn-back-to-list');
    const statusUpdatePanel = document.getElementById('status-update-panel');
    const selectedDayLabel = document.getElementById('selected-day-label');
    const toast = document.getElementById('toast');

    let selectedPatient = null;
    let selectedDay = null;

    // ============================================
    // LÓGICA DE BÚSQUEDA
    // ============================================
    const searchPacientes = async () => {
        const dni = filterDni.value.trim();
        const hc = filterHc.value.trim();
        const apellidos = filterApellidos.value.trim().toUpperCase();
        const nombres = filterNombres.value.trim().toUpperCase();

        if (!dni && !hc && !apellidos && !nombres) {
            showToast('Por favor, ingrese al menos un criterio de búsqueda', '#ef4444');
            return;
        }

        try {
            loadingIndicator.style.display = 'block';
            tablePacientes.style.display = 'none';
            tbodyPacientes.innerHTML = '';

            let query = client.from('pacientes').select('*');

            if (dni) query = query.ilike('dni', `%${dni}%`);
            if (hc) query = query.ilike('historia_clinica', `%${hc}%`);
            if (apellidos) query = query.ilike('apellidos', `%${apellidos}%`);
            if (nombres) query = query.ilike('nombres', `%${nombres}%`);

            const { data, error } = await query.limit(10);

            if (error) throw error;

            renderTable(data);
        } catch (error) {
            console.error('Error buscando pacientes:', error.message);
            showToast('Error al buscar pacientes', '#ef4444');
        } finally {
            loadingIndicator.style.display = 'none';
            tablePacientes.style.display = 'table';
        }
    };

    const renderTable = (items) => {
        if (!items || items.length === 0) {
            tbodyPacientes.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color:#94a3b8;">No se encontraron pacientes con esos criterios.</td></tr>`;
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.dni}</strong></td>
                <td>${item.apellidos}, ${item.nombres}</td>
                <td>${item.historia_clinica}</td>
                <td><span class="seguro-badge">${item.tipo_seguro}</span></td>
                <td>${item.servicio || '-'}</td>
                <td><span class="condicion-badge ${getCondicionClass(item.condicion)}">${item.condicion}</span></td>
                <td style="text-align: center;">
                    <button class="btn-module primary btn-select-patient" data-id="${item.id}" style="padding: 5px 10px; font-size: 12px;">
                        <i class="fa-solid fa-calendar-check"></i> Verificar
                    </button>
                </td>
            `;
            tbodyPacientes.appendChild(row);
        });

        // Eventos para seleccionar paciente
        document.querySelectorAll('.btn-select-patient').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const patient = items.find(p => p.id == id);
                if (patient) openCalendar(patient);
            });
        });
    };

    const getCondicionClass = (condicion) => {
        if (condicion === 'Hospitalizado') return 'cond-hospitalizado';
        if (condicion === 'Alta') return 'cond-alta';
        if (condicion === 'Fallecido') return 'cond-fallecido';
        return 'cond-cambio';
    };

    // ============================================
    // LÓGICA DEL CALENDARIO
    // ============================================
    const openCalendar = (patient) => {
        selectedPatient = patient;
        viewResultados.style.display = 'none';
        document.querySelector('.search-filters-container').style.display = 'none';
        
        bannerNombre.textContent = `PACIENTE: ${patient.apellidos}, ${patient.nombres}`;
        bannerInfo.textContent = `DNI: ${patient.dni} | HC: ${patient.historia_clinica} | SERVICIO: ${patient.servicio || 'N/A'}`;
        
        generateDays();
        viewCalendario.style.display = 'block';
    };

    const generateDays = () => {
        daysGrid.innerHTML = '';
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        
        document.getElementById('current-month-year').textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

        for (let i = 1; i <= daysInMonth; i++) {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.dataset.day = i;
            
            // Simular algunos estados aleatorios (Solo visual como pidió el usuario)
            if (i < now.getDate() && i % 5 === 0) {
                dayCard.classList.add('status-hosp');
            }

            dayCard.innerHTML = `
                <span class="day-number">${i}</span>
                <span class="day-name">${getDayName(now.getFullYear(), now.getMonth(), i)}</span>
                <div class="status-indicator"></div>
            `;

            dayCard.addEventListener('click', () => {
                selectDay(i, dayCard);
            });

            daysGrid.appendChild(dayCard);
        }
    };

    const getDayName = (year, month, day) => {
        const date = new Date(year, month, day);
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return days[date.getDay()];
    };

    const selectDay = (day, element) => {
        selectedDay = day;
        document.querySelectorAll('.day-card').forEach(d => d.classList.remove('selected'));
        element.classList.add('selected');
        
        selectedDayLabel.textContent = `Actualizar estado para el día ${day}:`;
        statusUpdatePanel.style.display = 'block';
        statusUpdatePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // ============================================
    // MANEJO DE ESTADOS (VISUAL)
    // ============================================
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const status = opt.getAttribute('data-status');
            const dayElement = document.querySelector(`.day-card[data-day="${selectedDay}"]`);
            
            // Limpiar clases previas
            dayElement.classList.remove('status-hosp', 'status-alta', 'status-cambio');
            
            // Aplicar nueva clase visual
            if (status === 'Hospitalizado') dayElement.classList.add('status-hosp');
            else if (status === 'Alta') dayElement.classList.add('status-alta');
            else if (status === 'Cambio Cobertura') dayElement.classList.add('status-cambio');
            
            showToast(`Estado del día ${selectedDay} actualizado (Visual)`, '#10b981');
        });
    });

    // ============================================
    // UTILIDADES Y EVENTOS
    // ============================================
    const showToast = (text, color) => {
        document.getElementById('toast-text').textContent = text;
        toast.style.display = 'flex';
        toast.style.background = color;
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 400);
        }, 3000);
    };

    btnSearch.addEventListener('click', searchPacientes);
    
    [filterDni, filterHc, filterApellidos, filterNombres].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchPacientes();
        });
    });

    btnClear.addEventListener('click', () => {
        filterDni.value = '';
        filterHc.value = '';
        filterApellidos.value = '';
        filterNombres.value = '';
        tbodyPacientes.innerHTML = '';
        tablePacientes.style.display = 'none';
    });

    btnBackToList.addEventListener('click', () => {
        viewCalendario.style.display = 'none';
        viewResultados.style.display = 'block';
        document.querySelector('.search-filters-container').style.display = 'grid';
        statusUpdatePanel.style.display = 'none';
    });
});
