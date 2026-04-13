document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (!session || error) {
            window.location.href = 'index.html';
        }
        
        const rolNombre = sessionStorage.getItem('userRole') || '';
        const adminBtn = document.getElementById('admin-action-btn');
        const userBtn = document.getElementById('user-action-btn');
        
        if (adminBtn) {
            if (rolNombre !== 'Desarrollador') {
                adminBtn.style.display = 'none';
            }
        }
        
        if (userBtn) {
            if (rolNombre === 'Usuario') {
                userBtn.classList.add('blocked-link');
                userBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('Su nivel de acceso (Usuario) no le permite ingresar a este submódulo administrativo.');
                });
            }
        }

    } catch (e) {
        window.location.href = 'index.html';
    }
});