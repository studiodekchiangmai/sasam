const API_URL = "https://script.google.com/macros/s/AKfycbw9jnudlYoLv9q704VwyG6hmQHQc4u5291_QcbbOKZeyLMSJymdbEJ7giHUaThBobBR/exec";
const LIFF_ID = "YOUR_LIFF_ID_HERE";

const { createApp } = Vue;

createApp({
    data() {
        return {
            user: null,
            profilePic: null,
            cards: [],
            inventory: [],
            marketplace: [],
            currentView: 'hub',
            activeNav: 'hub',
            albumTitle: '',
            loading: true,
            gachaResult: null,
            selectedCardModal: null,
            modalMessage: '',
            sellSelectedInv: "",
            sellPrice: 100,
            marketSearch: ""
        }
    },
    computed: {
        completionPercent() {
            if (this.cards.length === 0) return 0;
            return Math.round((this.inventory.length / this.cards.length) * 100);
        },
        filteredMarketplace() {
            if (!this.marketSearch) return this.marketplace;
            const q = this.marketSearch.toLowerCase();
            return this.marketplace.filter(item => {
                const card = this.getCardById(item.card_id);
                return card.name && card.name.toLowerCase().includes(q);
            });
        }
    },
    async mounted() {
        const savedUser = localStorage.getItem('sasam_user');
        if (!savedUser) {
            window.location.href = 'login.html';
            return;
        }

        this.user = JSON.parse(savedUser);

        try {
            if (LIFF_ID !== "YOUR_LIFF_ID_HERE") {
                await liff.init({ liffId: LIFF_ID });
                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    this.profilePic = profile.pictureUrl;
                }
            }
        } catch (e) {
            console.error('LIFF init failed', e);
        }

        await this.fetchData();
    },
    methods: {
        // Navigation
        switchNav(view) {
            this.activeNav = view;
            this.currentView = view;
            if (view === 'market') this.loadMarketplace();
        },
        openAlbum(categoryKey, title) {
            this.albumTitle = title || 'อัลบั้ม';
            this.currentView = 'album';
        },
        countByRegion() {
            return this.inventory.length;
        },

        // Auth
        logout() {
            if (!confirm('ต้องการออกจากระบบหรือไม่?')) return;
            localStorage.removeItem('sasam_user');
            if (typeof liff !== 'undefined' && LIFF_ID !== "YOUR_LIFF_ID_HERE" && liff.isLoggedIn()) {
                liff.logout();
            }
            window.location.href = 'login.html';
        },

        // API
        async apiCall(action, payload = {}) {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                console.warn("API_URL is not set. Using mock behavior.");
                return null;
            }
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action, payload }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                return await response.json();
            } catch (e) {
                console.error("API Error", e);
                alert("การเชื่อมต่อ API ล้มเหลว");
                return null;
            }
        },

        async fetchData() {
            this.loading = true;
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                this.loadMockData();
                this.loading = false;
                return;
            }

            const cardsRes = await this.apiCall('getCards');
            if (cardsRes && cardsRes.cards) this.cards = cardsRes.cards;

            if (this.user) {
                const userRes = await this.apiCall('getUserData', { userId: this.user.user_id, display_name: this.user.display_name });
                if (userRes && userRes.user) {
                    this.user = userRes.user;
                    localStorage.setItem('sasam_user', JSON.stringify(this.user));
                }

                const invRes = await this.apiCall('getUserInventory', { userId: this.user.user_id });
                if (invRes && invRes.inventory) this.inventory = invRes.inventory;
            }

            await this.loadMarketplace();
            this.loading = false;
        },

        async loadMarketplace() {
            const mktRes = await this.apiCall('getMarketplace');
            if (mktRes && mktRes.marketplace) this.marketplace = mktRes.marketplace;
        },

        // Helpers
        hasCard(cardId) {
            return this.inventory.some(i => i.card_id === cardId);
        },
        getCardById(cardId) {
            return this.cards.find(c => c.card_id === cardId) || { name: '???', rarity: '', image_drive_id: '' };
        },
        getDriveImageUrl(driveId) {
            if (!driveId || driveId === "1A2B3C4D5E6F7G8H9I") {
                return 'https://picsum.photos/200/280?random=' + Math.floor(Math.random() * 999);
            }
            return `https://drive.google.com/uc?export=view&id=${driveId}`;
        },

        // Card Modal
        openCardModal(card) {
            this.modalMessage = '';
            this.selectedCardModal = card;
        },

        // Gacha
        async spinGacha() {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
                return;
            }
            this.loading = true;
            this.gachaResult = null;
            const res = await this.apiCall('gachaSpin', { userId: this.user.user_id });
            if (res && res.status === 'success') {
                this.gachaResult = res.obtained;
                this.user.coins = res.coins;
                localStorage.setItem('sasam_user', JSON.stringify(this.user));
                // Show result in modal
                this.modalMessage = '🎉 ยินดีด้วย! คุณได้รับการ์ดใหม่!';
                this.selectedCardModal = res.obtained;
                await this.fetchData();
            } else if (res) {
                alert("Error: " + res.error);
            }
            this.loading = false;
        },

        // GPS Check-in
        async mockGPSCheckIn() {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
                return;
            }
            this.loading = true;
            const res = await this.apiCall('checkInGPS', { userId: this.user.user_id, cardId: 'TH-50', lat: 18.788, lng: 98.985 });
            if (res && res.status === 'success') {
                alert(res.message);
                await this.fetchData();
            }
            this.loading = false;
        },

        // Quiz
        async playQuiz() {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
                return;
            }
            const ans = confirm("ทายปัญหา: ดอยอินทนนท์ อยู่จังหวัดอะไร?\nกด OK = เชียงใหม่, Cancel = กรุงเทพ");
            this.loading = true;
            const res = await this.apiCall('submitQuiz', { userId: this.user.user_id, isCorrect: ans });
            if (res && res.status === 'success') {
                alert(res.message);
                if (res.coins) {
                    this.user.coins = res.coins;
                    localStorage.setItem('sasam_user', JSON.stringify(this.user));
                }
            }
            this.loading = false;
        },

        // Marketplace
        async sellItem() {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") return alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
            if (!this.sellSelectedInv || !this.sellPrice) return alert("กรุณาเลือกการ์ดและราคา");
            this.loading = true;
            const res = await this.apiCall('sellMarketplace', { userId: this.user.user_id, inventoryId: this.sellSelectedInv, price: parseInt(this.sellPrice) });
            if (res && res.status === 'success') {
                alert(res.message);
                this.sellSelectedInv = "";
                await this.fetchData();
            }
            this.loading = false;
        },
        async buyMarket(item) {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") return alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
            if (!confirm(`ยืนยันการซื้อ ${this.getCardById(item.card_id).name} ในราคา ${item.price_coins} 🪙?`)) return;
            this.loading = true;
            const res = await this.apiCall('buyMarketplace', { userId: this.user.user_id, listingId: item.listing_id });
            if (res && res.status === 'success') {
                alert(res.message);
                await this.fetchData();
            } else if (res) {
                alert(res.error);
            }
            this.loading = false;
        },

        // Mock Data
        loadMockData() {
            if (this.user) {
                this.user.coins = 1000;
            } else {
                this.user = { user_id: 'guest123', display_name: 'Guest Tester', coins: 1000 };
            }
            this.cards = [
                { card_id: 'TH-10', name: 'กรุงเทพมหานคร', region: 'Central', rarity: 'Rare', slogan: 'กรุงเทพฯ ดุจเทพสร้าง...', stat_tourism: 95, stat_culture: 90, attraction_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
                { card_id: 'TH-50', name: 'เชียงใหม่', region: 'North', rarity: 'Common', slogan: 'ดอยสุเทพเป็นศรี ประเพณีเป็นสง่า...', stat_tourism: 99, stat_culture: 85, attraction_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
                { card_id: 'TH-83', name: 'ภูเก็ต', region: 'South', rarity: 'Secret', slogan: 'ไข่มุกอันดามัน สวรรค์เมืองใต้...', stat_tourism: 99, stat_culture: 80, attraction_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
            ];
            this.inventory = [
                { id: 'INV-1', user_id: this.user.user_id, card_id: 'TH-10' }
            ];
            this.marketplace = [
                { listing_id: 'MKT-1', seller_id: 'otherUser', inventory_id: 'INV-X', card_id: 'TH-83', price_coins: 500, status: 'Active' }
            ];
        }
    }
}).mount('#app');
