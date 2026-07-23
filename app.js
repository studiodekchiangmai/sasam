const API_URL = "https://script.google.com/macros/s/AKfycbw9jnudlYoLv9q704VwyG6hmQHQc4u5291_QcbbOKZeyLMSJymdbEJ7giHUaThBobBR/exec"; // Replace with your deployed Web App URL
const LIFF_ID = "YOUR_LIFF_ID_HERE"; // Replace with your LIFF ID (Optional for testing in browser)

const { createApp } = Vue;

createApp({
    data() {
        return {
            user: null,
            profilePic: null,
            cards: [],
            inventory: [],
            marketplace: [],
            currentTab: 'collection',
            loading: true,
            gachaResult: null,
            selectedCardModal: null,
            sellSelectedInv: "",
            sellPrice: 100
        }
    },
    async mounted() {
        await this.initLIFF();
        await this.fetchData();
    },
    methods: {
        async initLIFF() {
            try {
                if (LIFF_ID !== "YOUR_LIFF_ID_HERE") {
                    await liff.init({ liffId: LIFF_ID });
                    if (liff.isLoggedIn()) {
                        const profile = await liff.getProfile();
                        this.user = { user_id: profile.userId, display_name: profile.displayName };
                        this.profilePic = profile.pictureUrl;
                    } else {
                        liff.login();
                    }
                } else {
                    // Fallback for local browser testing without LIFF
                    this.user = { user_id: 'guest123', display_name: 'Guest Tester', coins: 1000 };
                }
            } catch (e) {
                console.error('LIFF init failed', e);
                this.user = { user_id: 'guest123', display_name: 'Guest Tester', coins: 1000 };
            }
        },
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
            if (cardsRes) this.cards = cardsRes.cards;

            if (this.user) {
                const userRes = await this.apiCall('getUserData', { userId: this.user.user_id, display_name: this.user.display_name });
                if (userRes) this.user = userRes.user;

                const invRes = await this.apiCall('getUserInventory', { userId: this.user.user_id });
                if (invRes) this.inventory = invRes.inventory;
            }

            const mktRes = await this.apiCall('getMarketplace');
            if (mktRes) this.marketplace = mktRes.marketplace;

            this.loading = false;
        },
        hasCard(cardId) {
            return this.inventory.some(i => i.card_id === cardId);
        },
        getCardById(cardId) {
            return this.cards.find(c => c.card_id === cardId) || {};
        },
        getDriveImageUrl(driveId) {
            return driveId && driveId !== "1A2B3C4D5E6F7G8H9I" 
                ? `https://drive.google.com/uc?export=view&id=${driveId}` 
                : 'https://via.placeholder.com/150?text=Sasam'; // Fallback
        },
        viewCardDetails(card) {
            this.selectedCardModal = card;
        },
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
                await this.fetchData();
            } else if (res) {
                alert("Error: " + res.error);
            }
            this.loading = false;
        },
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
                if (res.coins) this.user.coins = res.coins;
            }
            this.loading = false;
        },
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
            } else {
                alert(res.error);
            }
            this.loading = false;
        },
        loadMockData() {
            this.user = { user_id: 'guest123', display_name: 'Guest Tester', coins: 1000 };
            this.cards = [
                { card_id: 'TH-10', name: 'กรุงเทพมหานคร', region: 'Central', rarity: 'Rare', slogan: 'กรุงเทพฯ ดุจเทพสร้าง...', stat_tourism: 95, stat_culture: 90, attraction_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
                { card_id: 'TH-50', name: 'เชียงใหม่', region: 'North', rarity: 'Common', slogan: 'ดอยสุเทพเป็นศรี ประเพณีเป็นสง่า...', stat_tourism: 99, stat_culture: 85, attraction_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
                { card_id: 'TH-83', name: 'ภูเก็ต', region: 'South', rarity: 'Secret', slogan: 'ไข่มุกอันดามัน สวรรค์เมืองใต้...', stat_tourism: 99, stat_culture: 80, attraction_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
            ];
            this.inventory = [
                { id: 'INV-1', user_id: 'guest123', card_id: 'TH-10' }
            ];
            this.marketplace = [
                { listing_id: 'MKT-1', seller_id: 'otherUser', inventory_id: 'INV-X', card_id: 'TH-83', price_coins: 500, status: 'Active' }
            ];
        }
    }
}).mount('#app');
