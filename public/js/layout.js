document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    
    if (window.location.pathname.includes('index.html') || body.classList.contains('no-layout')) return;

    const currentPage = window.location.pathname.split('/').pop() || 'menu.html';
    const rolNombre = sessionStorage.getItem('userRole') || '...';
    
    const isAdminMode = rolNombre === 'Desarrollador'; 
    const isHighAccess = rolNombre === 'Desarrollador' || rolNombre === 'Administrador';

    const bp = window.location.pathname.includes('/modulos/') ? '../../' : '';

    const adminBtnHTML = isAdminMode ? `<a href="${bp}modulos/usuarios/gestion-admin.html" class="${currentPage === 'gestion-admin.html' ? 'selected' : ''}">Administrador</a>` : '';
    
    const userBtnHTML = isHighAccess 
        ? `<a href="${bp}modulos/usuarios/gestion-user.html" class="${currentPage === 'gestion-user.html' ? 'selected' : ''}">Usuarios</a>`
        : `<a href="#" class="blocked-link" onclick="event.preventDefault(); alert('Su nivel de acceso (Usuario) no le permite ingresar a este submódulo administrativo.');">Usuarios</a>`;

    const sidebarHTML = `
        <div class="sidebar-header">
            <h2>Hospital San José</h2>
            <p>Unidad de Seguros (SIS)</p>
        </div>
        <hr class="sidebar-divider">
        <nav class="sidebar-nav">
            <div class="nav-item ${currentPage === 'menu.html' ? 'active' : ''}">
                <a href="${bp}menu.html" class="nav-link">
                    <i class="fa-solid fa-house"></i>
                    <span>Inicio</span>
                </a>
            </div>
            
            <div class="nav-item has-sub ${['gestion-admin.html', 'gestion-user.html'].includes(currentPage) ? 'active' : ''}">
                <div class="nav-link">
                    <i class="fa-solid fa-users"></i>
                    <span>Gestión de Usuarios</span>
                </div>
                <div class="sub-menu">
                    ${adminBtnHTML}
                    ${userBtnHTML}
                </div>
            </div>

            <div class="nav-item ${currentPage === 'tramite.html' ? 'active' : ''}">
                <a href="${bp}modulos/tramite/tramite.html" class="nav-link">
                    <i class="fa-solid fa-file-signature"></i>
                    <span>Trámite Documentario</span>
                </a>
            </div>

            <div class="nav-item ${currentPage === 'registro-pacientes.html' ? 'active' : ''}">
                <a href="${bp}modulos/pacientes/registro-pacientes.html" class="nav-link">
                    <i class="fa-solid fa-user-plus"></i>
                    <span>Registro Pacientes Hospitalizados</span>
                </a>
            </div>

            <div class="nav-item has-sub ${currentPage.includes('seguimiento') || currentPage.includes('verificacion') ? 'active' : ''}">
                <div class="nav-link">
                    <i class="fa-solid fa-bed-pulse"></i>
                    <span>Seguimiento Pacientes Hospitalizados</span>
                </div>
                <div class="sub-menu">
                    <a href="${bp}modulos/seguimiento/seguimiento-pacientes.html" class="${currentPage === 'seguimiento-pacientes.html' ? 'selected' : ''}">Búsqueda Pacientes</a>
                    <a href="${bp}modulos/seguimiento/verificacion-paciente.html" class="${currentPage === 'verificacion-paciente.html' ? 'selected' : ''}">Verificación - Actualización</a>
                </div>
            </div>

            <div class="nav-item ${currentPage === 'reportes.html' ? 'active' : ''}">
                <a href="${bp}modulos/reportes/reportes.html" class="nav-link">
                    <i class="fa-solid fa-chart-bar"></i>
                    <span>Reportes</span>
                </a>
            </div>
        </nav>
    `;

    const aside = document.createElement('aside');
    aside.className = 'sidebar';
    aside.innerHTML = sidebarHTML;

    let headerHTML = '';

    if (currentPage === 'menu.html') {
        // Cabecera de Inicio Clásica
        headerHTML = `
            <div class="header-right">
                <div class="user-role-badge">
                    <span id="global-user-role">${rolNombre !== '...' ? rolNombre : 'Cargando...'}</span>
                </div>
                <div class="profile-dropdown">
                    <button class="profile-btn" id="profile-btn">
                        <i class="fa-solid fa-circle-user profile-icon"></i>
                    </button>
                    <div class="dropdown-menu" id="dropdown-menu">
                        <a href="#"><i class="fa-solid fa-user-pen"></i> Editar Perfil</a>
                        <a href="#" id="global-logout-btn" class="logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Cerrar Sesión</a>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Cabecera Operativa (SPA de Modulos)
        headerHTML = `
            <div class="header-left" style="display: flex; flex: 1;">
                <div class="global-search-box">
                    <input type="text" placeholder="Buscar registros por DNI..." class="global-search-input">
                    <button class="global-search-btn"><i class="fa-solid fa-magnifying-glass"></i></button>
                </div>
            </div>
            <div class="header-right">
                <button class="btn-module primary action-btn" id="global-new-patient-btn"><i class="fa-solid fa-plus"></i> Nuevo Paciente</button>
            </div>
        `;
    }

    const header = document.createElement('header');
    header.className = 'top-header';
    header.innerHTML = headerHTML;

    body.insertBefore(aside, body.firstChild);
    
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) {
        wrapper.insertBefore(header, wrapper.firstChild);
    }
    
    const profileBtn = document.getElementById('profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            if (dropdownMenu.classList.contains('show')) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    const logoutBtn = document.getElementById('global-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);
            if (client) {
                await client.auth.signOut();
                sessionStorage.removeItem('userRole');
                window.location.href = `${bp}index.html`;
            }
        });
    }

    const loadGlobalRole = async () => {
        const roleSpan = document.getElementById('global-user-role');
        const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
        if (!client) return;

        try {
            if (sessionStorage.getItem('userRole')) return; 

            const { data: { session } } = await client.auth.getSession();
            if (!session) return;
            const user = session.user;

            const { data: profile } = await client.from('perfiles')
                .select('roles(nombre)')
                .eq('id_usuario', user.id)
                .single();

            if (profile && profile.roles) {
                const fetchedRole = profile.roles.nombre;
                sessionStorage.setItem('userRole', fetchedRole);
                if (roleSpan) roleSpan.textContent = fetchedRole;
                window.location.reload(); 
            } else {
                sessionStorage.setItem('userRole', 'Usuario');
                if (roleSpan) roleSpan.textContent = 'Usuario';
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (rolNombre === '...') {
        loadGlobalRole();
    }
});
