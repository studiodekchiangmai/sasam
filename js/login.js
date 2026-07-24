const API_URL = "https://script.google.com/macros/s/AKfycbw9jnudlYoLv9q704VwyG6hmQHQc4u5291_QcbbOKZeyLMSJymdbEJ7giHUaThBobBR/exec";
const LIFF_ID = "YOUR_LIFF_ID_HERE";

const { createApp } = Vue;

createApp({
    data() {
        return {
            loginUsername: "",
            loading: true
        }
    },
    async mounted() {
        // If already logged in locally and has token, redirect to main app
        if (localStorage.getItem('sasam_user') && localStorage.getItem('sasam_token')) {
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
        async apiCall(action, payload = {}) {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") return null;
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action, payload }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                return await response.json();
            } catch (e) {
                console.error("API Error", e);
                return null;
            }
        },

        async processLogin(userId, displayName) {
            let userData = { user_id: userId, display_name: displayName, coins: 500 };
            const res = await this.apiCall('authLogin', { userId: userId, displayName: displayName });
            if (res && res.user) {
                userData = res.user;
            }
            if (res && res.token) {
                localStorage.setItem('sasam_token', res.token);
            }
            localStorage.setItem('sasam_user', JSON.stringify(userData));
            window.location.href = 'index.html';
        },

        async handleLINELogin() {
            this.loading = true;
            try {
                const profile = await liff.getProfile();
                await this.processLogin(profile.userId, profile.displayName);
            } catch (e) {
                console.error("LINE Login Error", e);
                this.loading = false;
            }
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

        async loginManually() {
            const username = this.loginUsername.trim();
            if (!username) return alert("กรุณากรอกชื่อผู้ใช้งาน");
            
            this.loading = true;
            await this.processLogin(username, username);
        },

        loginAsTest() {
            const testUser = {
                user_id: 'test_user',
                display_name: 'ผู้ทดสอบระบบ',
                coins: 9999
            };
            localStorage.setItem('sasam_token', 'mock_token_12345');
            localStorage.setItem('sasam_user', JSON.stringify(testUser));
            window.location.href = 'index.html';
        }
    }
}).mount('#login-app');
