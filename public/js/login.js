document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const toggle = document.getElementById('toggle-password');
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('login-btn');
    const spinner = btn.querySelector('.spinner');
    const btnText = btn.querySelector('.btn-text');
    const remember = document.getElementById('remember');
    const icon = toggle.querySelector('i');

    sessionStorage.removeItem('userRole');

    toggle.addEventListener('click', () => {
        const isHidden = password.type === 'password';
        password.type = isHidden ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    const setLoading = (state) => {
        btn.disabled = state;
        spinner.classList.toggle('hidden', !state);
        btnText.style.visibility = state ? 'hidden' : 'visible';
    };

    if (localStorage.getItem('rememberEmail')) {
        email.value = localStorage.getItem('rememberEmail');
        remember.checked = true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.textContent = '';
        const emailVal = email.value.trim();
        const passVal = password.value.trim();

        if (!emailVal || !passVal) {
            errorMsg.textContent = 'Completa todos los campos.';
            return;
        }

        setLoading(true);

        try {
            const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
                email: emailVal,
                password: passVal
            });

            if (error) {
                if (error.message.includes('Invalid login')) {
                    errorMsg.textContent = 'Correo o contraseña incorrectos.';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMsg.textContent = 'Debes confirmar tu correo.';
                } else {
                    errorMsg.textContent = 'Error al iniciar sesión.';
                }
                setLoading(false);
                return;
            }

            const { data: profile } = await supabaseClient
                .from('perfiles')
                .select('nombre_completo, roles(nombre)')
                .eq('id_usuario', authData.user.id)
                .single();

            if (profile) {
                sessionStorage.setItem('userRole', profile.roles ? profile.roles.nombre : 'Usuario');
                sessionStorage.setItem('userName', profile.nombre_completo || authData.user.email);
            } else {
                sessionStorage.setItem('userRole', 'Usuario');
                sessionStorage.setItem('userName', authData.user.email);
            }

            if (remember.checked) {
                localStorage.setItem('rememberEmail', emailVal);
            } else {
                localStorage.removeItem('rememberEmail');
            }

            window.location.href = 'menu.html';

        } catch (err) {
            errorMsg.textContent = 'Error inesperado.';
            setLoading(false);
        }
    });
});