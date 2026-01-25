class AuthManager {
    constructor() {
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDb;
        this.user = null;
    }

    async init() {
        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            if (user) {
                if (window.HistoryManager) {
                    window.HistoryManager.syncLocalToCloud(user.uid);
                }
            } else {
                if (window.HistoryManager) {
                    window.HistoryManager.render();
                }
            }
            this.updateUI();
        });
    }

    async signUp(email, password, username) {
        try {
            // 1. Create user in Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. Update profile with username
            await user.updateProfile({
                displayName: username
            });

            // 3. Send email verification
            await user.sendEmailVerification();

            // 4. Store user data in Realtime Database for username-email mapping
            await this.db.ref('users/' + username.toLowerCase()).set({
                email: email,
                uid: user.uid
            });

            return user;
        } catch (error) {
            throw error;
        }
    }

    async signIn(usernameOrEmail, password) {
        try {
            let email = usernameOrEmail;

            // If it's a username (no @), look up the email
            if (!usernameOrEmail.includes('@')) {
                const snapshot = await this.db.ref('users/' + usernameOrEmail.toLowerCase()).once('value');
                const data = snapshot.val();
                if (data && data.email) {
                    email = data.email;
                } else {
                    throw new Error('User not found');
                }
            }

            return await this.auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            throw error;
        }
    }

    async signOut() {
        return await this.auth.signOut();
    }

    async resetPassword(email) {
        return await this.auth.sendPasswordResetEmail(email);
    }

    updateUI() {
        const authBtn = document.getElementById('auth-nav-btn');
        const userDropdown = document.getElementById('userDropdown');
        const dropdownUsername = document.getElementById('dropdown-username');
        if (!authBtn) return;

        if (this.user) {
            const username = this.user.displayName || this.user.email.split('@')[0];
            authBtn.innerHTML = `<i data-lucide="user"></i> <span>${username}</span>`;
            authBtn.onclick = (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            };
            if (dropdownUsername) dropdownUsername.textContent = username;
        } else {
            authBtn.innerHTML = `<i data-lucide="log-in"></i> <span>Login</span>`;
            authBtn.onclick = () => this.showAuthModal();
            if (userDropdown) userDropdown.classList.remove('active');
        }

        if (window.lucide) window.lucide.createIcons();
    }

    showAuthModal() {
        document.getElementById('authModal').classList.add('active');
        this.switchTab('login');
    }

    switchTab(tab) {
        const authSlider = document.getElementById('authSlider');
        const loginTab = document.getElementById('tab-btn-login');
        const signupTab = document.getElementById('tab-btn-signup');

        if (tab === 'login') {
            authSlider?.classList.remove('is-flipped');
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
        } else {
            authSlider?.classList.add('is-flipped');
            loginTab.classList.remove('active');
            signupTab.classList.add('active');
        }
    }

    setupListeners() {
        const closeBtn = document.getElementById('closeAuthModal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('authModal').classList.remove('active');
            };
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                try {
                    await this.signIn(username, password);
                    document.getElementById('authModal').classList.remove('active');
                } catch (err) {
                    alert(err.message);
                }
            };
        }

        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.onsubmit = async (e) => {
                e.preventDefault();
                const username = document.getElementById('signup-username').value.trim();
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;

                if (username.length < 3) {
                    alert('Username must be at least 3 characters long');
                    return;
                }

                try {
                    await this.signUp(email, password, username);

                    // Hide Auth Modal
                    document.getElementById('authModal').classList.remove('active');

                    // Show Cat Verification Popup
                    const verifyPopup = document.getElementById('verifyPopup');
                    verifyPopup.classList.add('active');

                    // Fireworks Celebration!
                    if (window.confetti) {
                        const count = 200;
                        const defaults = { origin: { y: 0.7 }, zIndex: 3000, colors: ['#00fbff', '#8b5cf6', '#d946ef'] };
                        function fire(particleRatio, opts) {
                            confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
                        }
                        fire(0.25, { spread: 26, startVelocity: 55 });
                        fire(0.2, { spread: 60 });
                        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
                        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
                        fire(0.1, { spread: 120, startVelocity: 45 });
                    }
                } catch (err) {
                    alert(err.message);
                }
            };
        }

        // Forgot Password Listeners
        const forgotLink = document.getElementById('forgotPasswordLink');
        const resetModal = document.getElementById('resetModal');
        const closeReset = document.getElementById('closeResetModal');
        const resetForm = document.getElementById('reset-form');

        if (forgotLink) {
            forgotLink.onclick = (e) => {
                e.preventDefault();
                document.getElementById('authModal').classList.remove('active');
                resetModal.classList.add('active');
            };
        }

        if (closeReset) closeReset.onclick = () => resetModal.classList.remove('active');

        if (resetForm) {
            resetForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('reset-email').value;
                try {
                    await this.resetPassword(email);
                    alert('Password reset link sent! Please check your Gmail.');
                    resetModal.classList.remove('active');
                } catch (err) {
                    alert(err.message);
                }
            };
        }

        // Verify Popup Listeners
        const closeVerify = document.getElementById('closeVerifyPopup');
        const verifyDone = document.getElementById('verifyDoneBtn');
        const verifyPopup = document.getElementById('verifyPopup');

        if (closeVerify) closeVerify.onclick = () => verifyPopup.classList.remove('active');
        if (verifyDone) verifyDone.onclick = () => verifyPopup.classList.remove('active');

        // Dropdown interactions
        const userDropdown = document.getElementById('userDropdown');
        document.addEventListener('click', (e) => {
            if (userDropdown && !userDropdown.contains(e.target) && e.target.id !== 'auth-nav-btn') {
                userDropdown.classList.remove('active');
            }
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                try {
                    await this.signOut();
                    alert('Logged out successfully');
                } catch (err) {
                    alert(err.message);
                }
            };
        }
    }
}

window.authManager = new AuthManager();

// Manual check if already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authManager.init();
        window.authManager.setupListeners();
    });
} else {
    window.authManager.init();
    window.authManager.setupListeners();
}
