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
            <img src="${bp}img/logotipo_transparent.png" alt="Logo MINSA" class="sidebar-logo">
            <div class="sidebar-header-text">
                <h2>Hospital San José</h2>
                <p>Unidad de Seguros (SIS)</p>
            </div>
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

            <div class="nav-item has-sub ${currentPage.includes('seguimiento') || currentPage.includes('verificacion') || currentPage.includes('detalle-paciente') ? 'active' : ''}">
                <div class="nav-link">
                    <i class="fa-solid fa-bed-pulse"></i>
                    <span>Seguimiento de Pacientes</span>
                </div>
                <div class="sub-menu">
                    <a href="${bp}modulos/seguimiento/seguimiento-pacientes.html" class="${currentPage.includes('seguimiento') || currentPage.includes('detalle-paciente') ? 'selected' : ''}">Búsqueda Pacientes</a>
                    <a href="${bp}modulos/seguimiento/verificacion-paciente.html" class="${currentPage.includes('verificacion') ? 'selected' : ''}">Verificación - Actualización</a>
                </div>
            </div>

            <div class="nav-item ${currentPage === 'reportes.html' ? 'active' : ''}">
                <a href="${bp}modulos/reportes/reportes.html" class="nav-link">
                    <i class="fa-solid fa-chart-bar"></i>
                    <span>Reportes</span>
                </a>
            </div>
        </nav>
        <div class="sidebar-footer">
            <button class="logout-btn" id="sidebar-logout-btn">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span class="logout-text">Cerrar Sesión</span>
            </button>
        </div>
    `;

    const aside = document.createElement('aside');
    aside.className = 'sidebar collapsible-sidebar';
    aside.innerHTML = sidebarHTML;

    const userName = sessionStorage.getItem('userName') || '';

    // Cabecera Global Uniforme para TODAS las vistas
    let headerHTML = `
        <div class="header-left">
            <h1 class="welcome-text">Bienvenido</h1>
        </div>
        <div class="header-right">
            <div class="profile-dropdown">
                <button class="profile-btn" id="profile-btn" style="display: flex; align-items: center; gap: 12px; background: transparent; border: none; cursor: pointer; padding: 5px 10px; border-radius: 8px;">
                    <i class="fa-solid fa-circle-user profile-icon" style="font-size: 2rem; color: #64748b;"></i>
                    <div class="user-info-text" style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                        <span class="user-email" id="global-user-name" style="font-size: 13px; font-weight: 600; color: #1e293b; text-transform: uppercase;">${userName}</span>
                        <span class="user-role-soft" id="global-user-role" style="font-size: 12px; color: #64748b;">${rolNombre !== '...' ? rolNombre : 'Cargando...'}</span>
                    </div>
                </button>
                <div class="dropdown-menu" id="dropdown-menu" style="right: 10px; top: calc(100% + 10px);">
                    <a href="#"><i class="fa-solid fa-user-pen"></i> Editar Perfil</a>
                    <a href="#" id="global-logout-btn" class="logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Cerrar Sesión</a>
                </div>
            </div>
        </div>
    `;

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

    const setupLogout = (btnId) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);
                if (client) {
                    await client.auth.signOut();
                    sessionStorage.removeItem('userRole');
                    sessionStorage.removeItem('userEmail');
                    sessionStorage.removeItem('userName');
                    window.location.href = `${bp}index.html`;
                }
            });
        }
    };

    setupLogout('global-logout-btn');
    setupLogout('sidebar-logout-btn');

    const loadGlobalRole = async () => {
        const roleSpan = document.getElementById('global-user-role');
        const nameSpan = document.getElementById('global-user-name');
        const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
        if (!client) return;

        try {
            if (sessionStorage.getItem('userRole') && sessionStorage.getItem('userName')) return; 

            const { data: { session } } = await client.auth.getSession();
            if (!session) return;
            const user = session.user;

            const { data: profile } = await client.from('perfiles')
                .select('nombre_completo, roles(nombre)')
                .eq('id_usuario', user.id)
                .single();

            if (profile) {
                const fetchedRole = profile.roles ? profile.roles.nombre : 'Usuario';
                const fetchedName = (profile.nombre_completo && profile.nombre_completo.trim() !== '') ? profile.nombre_completo.toUpperCase() : user.email.toUpperCase();
                
                sessionStorage.setItem('userRole', fetchedRole);
                sessionStorage.setItem('userName', fetchedName);
                
                if (roleSpan) roleSpan.textContent = fetchedRole;
                if (nameSpan) nameSpan.textContent = fetchedName;
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (rolNombre === '...' || !userName) {
        loadGlobalRole();
    }
});

// OFFLINE HANDLING
window.addEventListener('offline', () => {
    let offlineDiv = document.getElementById('global-offline-banner');
    if (!offlineDiv) {
        offlineDiv = document.createElement('div');
        offlineDiv.id = 'global-offline-banner';
        document.body.appendChild(offlineDiv);
    }
    offlineDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(255,255,255,0.8); backdrop-filter: blur(5px); z-index: 99999; display: flex; align-items: center; justify-content: center;';
    offlineDiv.innerHTML = '<div style="background: #ef4444; color: white; padding: 20px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.2);"><i class="fa-solid fa-wifi" style="margin-right: 12px;"></i> Estás sin conexión a internet. Reconectando...</div>';
    document.body.style.overflow = 'hidden';
});

window.addEventListener('online', () => {
    const offlineDiv = document.getElementById('global-offline-banner');
    if(offlineDiv) {
        offlineDiv.innerHTML = '<div style="background: #22c55e; color: white; padding: 20px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.2);"><i class="fa-solid fa-check" style="margin-right: 12px;"></i> Conexión restaurada</div>';
        setTimeout(() => {
            offlineDiv.remove();
            document.body.style.overflow = 'auto';
        }, 3000);
    }
});