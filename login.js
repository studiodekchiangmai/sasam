const LIFF_ID = "YOUR_LIFF_ID_HERE"; // Replace with your LIFF ID (Optional for testing in browser)

const { createApp } = Vue;

createApp({
    data() {
        return {
            loginUsername: "",
            loading: true
        }
    },
    async mounted() {
        // If already logged in locally, redirect to main app
        if (localStorage.getItem('sasam_user')) {
            window.location.href = 'index.html';
            return;
        }

        try {
            if (LIFF_ID !== "YOUR_LIFF_ID_HERE") {
                await liff.init({ liffId: LIFF_ID });
                if (liff.isLoggedIn()) {
                    await this.handleLINELogin();
                    return;
                }
            }
        } catch (e) {
            console.error('LIFF init failed', e);
        }
        
        this.loading = false;
    },
    methods: {
        async handleLINELogin() {
            this.loading = true;
            const profile = await liff.getProfile();
            const user = { user_id: profile.userId, display_name: profile.displayName };
            localStorage.setItem('sasam_user', JSON.stringify(user));
            window.location.href = 'index.html';
        },
        async loginWithLINE() {
            if (LIFF_ID === "YOUR_LIFF_ID_HERE") {
                alert("กรุณาตั้งค่า LIFF ID ก่อนใช้งานฟีเจอร์ล็อกอินด้วย LINE");
                return;
            }
            if (!liff.isLoggedIn()) {
                liff.login();
            } else {
                await this.handleLINELogin();
            }
        },
        loginManually() {
            if (!this.loginUsername.trim()) return alert("กรุณากรอกชื่อผู้ใช้งาน");
            
            const username = this.loginUsername.trim();
            const user = { user_id: username, display_name: username };
            
            localStorage.setItem('sasam_user', JSON.stringify(user));
            window.location.href = 'index.html';
        }
    }
}).mount('#login-app');
