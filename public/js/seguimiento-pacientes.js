document.addEventListener('DOMContentLoaded', async () => {
    const client = typeof supabaseClient !== 'undefined' ? supabaseClient : supabase;
    const { data: { session } } = await client.auth.getSession();

    if (!session) {
        window.location.href = '../../index.html';
        return;
    }

    // DOM
    const searchInput = document.getElementById('search-input');
    const btnSearch = document.getElementById('btn-search');
    const btnClear = document.getElementById('btn-clear');
    const tbody = document.getElementById('tabla-pacientes');
    const loadingIndicator = document.getElementById('loading-indicator');
    const tableElement = document.getElementById('table-element');
    const toast = document.getElementById('toast');

    // Inline History DOM
    const viewHistoryInline = document.getElementById('view-history-inline');
    const historyPatientName = document.getElementById('history-patient-name');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const historyKpis = document.getElementById('history-kpis');
    const historyRecordsButtons = document.getElementById('history-records-buttons');
    const historyTimelineContainer = document.getElementById('history-timeline-container');

    // State
    let currentPage = 1;
    let rowsPerPage = 5;
    let totalRecords = 0;
    let searchQuery = '';
    let selectedPatient = null;

    const normalizeText = (text) => {
        if (!text) return '';
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

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

    const loadPacientes = async () => {
        try {
            loadingIndicator.style.display = 'block';
            tableElement.style.display = 'none';

            const availableHeight = window.innerHeight - 450;
            let calculatedRows = Math.floor(availableHeight / 60);
            rowsPerPage = calculatedRows > 2 ? calculatedRows : 3;

            const startRange = (currentPage - 1) * rowsPerPage;
            const endRange = startRange + rowsPerPage - 1;

            let queryObj = client
                .from('pacientes')
                .select('*', { count: 'exact' })
                .order('creado_en', { ascending: false })
                .range(startRange, endRange);

            if (searchQuery) {
                const normQuery = normalizeText(searchQuery);
                queryObj = queryObj.or('dni.ilike.%' + normQuery + '%,apellidos.ilike.%' + normQuery + '%,nombres.ilike.%' + normQuery + '%');
            }

            const { data: pacientes, count, error } = await queryObj;
            if (error) throw error;

            totalRecords = count || 0;

            if (pacientes && pacientes.length > 0) {
                const ids = pacientes.map(p => p.id);
                const { data: eventos } = await client
                    .from('historial_eventos')
                    .select('paciente_id, tipo_evento, fecha_evento')
                    .in('paciente_id', ids)
                    .order('fecha_evento', { ascending: true });

                const eventosMap = {};
                if (eventos) {
                    eventos.forEach(e => {
                        if (!eventosMap[e.paciente_id]) eventosMap[e.paciente_id] = [];
                        eventosMap[e.paciente_id].push(e);
                    });
                }
                renderTable(pacientes, eventosMap);
            } else {
                renderTable([], {});
            }
            renderPagination();
        } catch (error) {
            console.error('Error cargando pacientes:', error.message);
            showToast('Error al cargar pacientes', '#ef4444');
        } finally {
            loadingIndicator.style.display = 'none';
            tableElement.style.display = 'table';
        }
    };

    const calcularDiasTotales = (eventos, condicion) => {
        if (!eventos || eventos.length === 0) return 0;
        let total = 0;
        let ingreso = null;
        const evs = [...eventos].sort((a, b) => new Date(a.fecha_evento) - new Date(b.fecha_evento));
        evs.forEach(ev => {
            if (ev.tipo_evento === 'Hospitalizado') ingreso = new Date(ev.fecha_evento);
            else if ((ev.tipo_evento === 'Alta' || ev.tipo_evento === 'Fallecido') && ingreso) {
                total += Math.max(0, Math.ceil((new Date(ev.fecha_evento) - ingreso) / (1000 * 60 * 60 * 24)));
                ingreso = null;
            }
        });
        if (ingreso && condicion === 'Hospitalizado') {
            total += Math.max(0, Math.ceil((new Date() - ingreso) / (1000 * 60 * 60 * 24)));
        }
        return total;
    };

    const renderTable = (items, eventosMap) => {
        tbody.innerHTML = '';
        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#94a3b8;">No se encontraron pacientes.</td></tr>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            const condClass = item.condicion === 'Hospitalizado' ? 'cond-hospitalizado' : (item.condicion === 'Fallecido' ? 'cond-fallecido' : 'cond-alta');
            const totalDias = calcularDiasTotales(eventosMap[item.id] || [], item.condicion);

            row.innerHTML = `
                <td><strong>${item.dni}</strong></td>
                <td>${item.apellidos}, ${item.nombres}</td>
                <td>${item.historia_clinica}</td>
                <td><span class="seguro-badge">${item.tipo_seguro}</span></td>
                <td><span class="condicion-badge ${condClass}">${item.condicion}</span></td>
                <td><span class="dias-badge ${item.condicion === 'Hospitalizado' ? 'dias-activo' : 'dias-alta'}">${totalDias} d\u00EDas</span></td>
                <td style="text-align: center;">
                    <button class="btn-module primary btn-history" data-id="${item.id}" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fa-solid fa-timeline"></i> Historial
                    </button>
                </td>
            `;
            
            // Click en fila para ver detalle completo
            row.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.location.href = `paciente-detalle.html?id=${item.id}`;
                }
            });

            tbody.appendChild(row);
        });

        document.querySelectorAll('.btn-history').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const p = items.find(x => x.id == id);
                if (p) openHistoryInline(p);
            });
        });
    };

    const openHistoryInline = async (p) => {
        selectedPatient = p;
        viewHistoryInline.style.display = 'block';
        historyPatientName.textContent = `HISTORIAL: ${p.apellidos}, ${p.nombres}`;
        window.scrollTo({ top: viewHistoryInline.offsetTop - 100, behavior: 'smooth' });

        // Cargar eventos
        const { data: eventos, error } = await client
            .from('historial_eventos')
            .select('*')
            .eq('paciente_id', p.id)
            .order('fecha_evento', { ascending: true });

        if (error) return;

        renderHistoryContent(eventos || []);
    };

    const renderHistoryContent = (eventos) => {
        // Separar por registros (ciclos de Hospitalizado -> Alta/Fallecido)
        const registros = [];
        let currentReg = null;

        eventos.forEach(ev => {
            if (ev.tipo_evento === 'Hospitalizado') {
                if (currentReg) registros.push(currentReg);
                currentReg = { inicio: ev, fin: null, eventos: [ev] };
            } else if (currentReg) {
                currentReg.eventos.push(ev);
                if (ev.tipo_evento === 'Alta' || ev.tipo_evento === 'Fallecido') {
                    currentReg.fin = ev;
                    registros.push(currentReg);
                    currentReg = null;
                }
            }
        });
        if (currentReg) registros.push(currentReg);

        // KPIs
        const totalDias = calcularDiasTotales(eventos, selectedPatient.condicion);
        const numIngresos = registros.length;
        historyKpis.innerHTML = `
            <div class="detail-item" style="background:white; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                <label style="font-size:10px; color:#64748b; font-weight:700;">D\u00CDAS TOTALES</label>
                <span style="font-size:18px; font-weight:800; color:#3b82f6;">${totalDias}</span>
            </div>
            <div class="detail-item" style="background:white; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                <label style="font-size:10px; color:#64748b; font-weight:700;">INGRESOS</label>
                <span style="font-size:18px; font-weight:800; color:#10b981;">${numIngresos}</span>
            </div>
            <div class="detail-item" style="background:white; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                <label style="font-size:10px; color:#64748b; font-weight:700;">CONDICI\u00D3N</label>
                <span style="font-size:18px; font-weight:800;">${selectedPatient.condicion}</span>
            </div>
        `;

        // Botones de Registros
        historyRecordsButtons.innerHTML = '';
        registros.forEach((reg, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn-module';
            btn.style.background = reg.fin ? '#f1f5f9' : '#dcfce7';
            btn.style.color = reg.fin ? '#475569' : '#166534';
            btn.innerHTML = `<i class="fa-solid fa-folder-open"></i> Registro ${idx + 1} ${reg.fin ? '(Cerrado)' : '(Activo)'}`;
            btn.onclick = () => renderTimelineInline(reg.eventos);
            historyRecordsButtons.appendChild(btn);
        });

        // Boton Nuevo Registro (Si el ultimo esta cerrado y no ha fallecido)
        const ultimoCerrado = registros.length === 0 || registros[registros.length-1].fin !== null;
        if (ultimoCerrado && selectedPatient.condicion !== 'Fallecido') {
            const btnNew = document.createElement('button');
            btnNew.className = 'btn-module primary';
            btnNew.innerHTML = `<i class="fa-solid fa-plus"></i> Nuevo Registro`;
            btnNew.onclick = () => window.location.href = `verificacion-paciente.html?dni=${selectedPatient.dni}`;
            historyRecordsButtons.appendChild(btnNew);
        }

        // Renderizar ultimo por defecto
        if (registros.length > 0) {
            renderTimelineInline(registros[registros.length - 1].eventos);
        } else {
            historyTimelineContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No hay eventos registrados.</p>';
        }
    };

    const renderTimelineInline = (eventos) => {
        historyTimelineContainer.innerHTML = '';
        eventos.forEach(ev => {
            const date = new Date(ev.fecha_evento);
            const item = document.createElement('div');
            item.className = 'timeline-event';
            item.style.marginBottom = '15px';
            item.style.paddingLeft = '30px';
            item.style.position = 'relative';
            item.style.borderLeft = '2px solid #e2e8f0';
            
            item.innerHTML = `
                <div style="position:absolute; left:-7px; top:0; width:12px; height:12px; border-radius:50%; background:#3b82f6; border:2px solid white;"></div>
                <div style="font-size:12px; color:#64748b; font-weight:600;">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <div style="font-weight:700; color:#1e293b;">${ev.tipo_evento}</div>
                <div style="font-size:13px; color:#475569;">${ev.detalle || ''}</div>
            `;
            historyTimelineContainer.appendChild(item);
        });
    };

    btnCloseHistory.addEventListener('click', () => {
        viewHistoryInline.style.display = 'none';
        selectedPatient = null;
    });

    // Paginacion y Busqueda (igual que antes)
    const renderPagination = () => {
        const totalPages = Math.ceil(totalRecords / rowsPerPage);
        const container = document.getElementById('pagination-container');
        container.innerHTML = '';
        if (totalPages <= 1) return;
        const btnPrev = document.createElement('button');
        btnPrev.className = 'pagination-btn';
        btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        btnPrev.disabled = currentPage === 1;
        btnPrev.onclick = () => { currentPage--; loadPacientes(); };
        container.appendChild(btnPrev);
        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.innerHTML = `P\u00E1gina <span class="seguro-badge">${currentPage}</span> de ${totalPages}`;
        container.appendChild(info);
        const btnNext = document.createElement('button');
        btnNext.className = 'pagination-btn';
        btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        btnNext.disabled = currentPage === totalPages;
        btnNext.onclick = () => { currentPage++; loadPacientes(); };
        container.appendChild(btnNext);
    };

    btnSearch.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        btnClear.style.display = searchQuery ? 'block' : 'none';
        loadPacientes();
    });

    btnClear.addEventListener('click', () => {
        searchQuery = '';
        searchInput.value = '';
        btnClear.style.display = 'none';
        currentPage = 1;
        loadPacientes();
    });

    loadPacientes();
});
