const API_URL = "https://script.google.com/macros/s/AKfycbw9jnudlYoLv9q704VwyG6hmQHQc4u5291_QcbbOKZeyLMSJymdbEJ7giHUaThBobBR/exec";
const LIFF_ID = "YOUR_LIFF_ID_HERE";

const { createApp } = Vue;

createApp({
    data() {
        return {
            user: null,
            profilePic: null,
            cards: [],
            collections: [],
            inventory: [],
            marketplace: [],
            currentView: 'home',
            activeNav: 'home',
            // Profile sub-views: 'portfolio' | 'stats' | 'settings'
            profileSubView: 'portfolio',
            albumTitle: '',
            albumIcon: '',
            selectedCollection: '',
            selectedCollectionForGacha: '77THCC',
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
        uniqueOwnedCount() {
            return this.cards.filter(c => this.hasCard(c.card_id)).length;
        },
        completionPercent() {
            if (this.cards.length === 0) return 0;
            return Math.round((this.uniqueOwnedCount / this.cards.length) * 100);
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
        const token = localStorage.getItem('sasam_token');
        if (!savedUser || !token) {
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
            // Reset sub-view when switching main nav
            if (view === 'profile') this.profileSubView = 'portfolio';
        },
        openAlbum(collectionId, icon, title) {
            this.selectedCollection = collectionId;
            this.albumIcon = icon || '';
            this.albumTitle = title || 'อัลบั้มการ์ด';
            this.currentView = 'album';
        },
        filteredCards() {
            if (!this.selectedCollection) return this.cards;
            return this.cards.filter(c => c.collection_id === this.selectedCollection);
        },
        countByCollection(collectionId) {
            const collectionCards = !collectionId 
                ? this.cards 
                : this.cards.filter(c => c.collection_id === collectionId);
            const owned = collectionCards.filter(c => this.hasCard(c.card_id)).length;
            return `${owned}/${collectionCards.length}`;
        },
        collectionPercent(collectionId) {
            const collectionCards = this.cards.filter(c => c.collection_id === collectionId);
            if (collectionCards.length === 0) return 0;
            const owned = collectionCards.filter(c => this.hasCard(c.card_id)).length;
            return Math.round((owned / collectionCards.length) * 100);
        },
        collectionOwnedCount(collectionId) {
            const collectionCards = this.cards.filter(c => c.collection_id === collectionId);
            return collectionCards.filter(c => this.hasCard(c.card_id)).length;
        },

        // Auth
        logout() {
            if (!confirm('ต้องการออกจากระบบหรือไม่?')) return;
            localStorage.removeItem('sasam_user');
            localStorage.removeItem('sasam_token');
            if (typeof liff !== 'undefined' && LIFF_ID !== "YOUR_LIFF_ID_HERE" && liff.isLoggedIn()) {
                liff.logout();
            }
            window.location.href = 'login.html';
        },

        // API Connection
        async apiCall(action, payload = {}) {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                console.warn("API_URL is not set. Using mock behavior.");
                return null;
            }
            const token = localStorage.getItem('sasam_token');
            if (token) {
                payload.token = token;
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

            // 1. Fetch Collections & Cards
            const colRes = await this.apiCall('getCollections');
            if (colRes && colRes.collections) {
                this.collections = colRes.collections;
                if (this.collections.length > 0) {
                    this.selectedCollectionForGacha = this.collections[0].collection_id;
                }
            }

            const cardsRes = await this.apiCall('getCards');
            if (cardsRes && cardsRes.cards) this.cards = cardsRes.cards;

            // 2. Fetch User & Inventory
            if (this.user) {
                const userRes = await this.apiCall('getUserData');
                if (userRes && userRes.user) {
                    this.user = userRes.user;
                    localStorage.setItem('sasam_user', JSON.stringify(this.user));
                }

                const invRes = await this.apiCall('getUserInventory');
                if (invRes && invRes.inventory) this.inventory = invRes.inventory;
            }

            // 3. Fetch Marketplace
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
            if (!driveId || driveId === "1A2B3C4D5E6F7G8H9I" || driveId.startsWith("http")) {
                if (driveId && driveId.startsWith("http")) return driveId;
                // เปลี่ยน Placeholder เป็นตัวอื่นเนื่องจาก via.placeholder.com อาจจะล่มหรือโดนบล็อก
                return 'https://placehold.co/200x280/151a23/00ff87?text=Sasam';
            }
            // ห้ามใช้ /view?usp=sharing เพราะมันคือหน้าเว็บ ไม่ใช่ไฟล์รูปภาพ
            // ใช้ลิงก์ thumbnail ของ Google Drive แทน (ใช้งานเป็น img src ได้)
            return `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
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
            const res = await this.apiCall('gachaSpin', { collectionId: this.selectedCollectionForGacha });
            if (res && res.status === 'success') {
                this.gachaResult = res.obtained;
                this.user.coins = res.coins;
                localStorage.setItem('sasam_user', JSON.stringify(this.user));
                this.modalMessage = '<i class="fa-solid fa-gift"></i> ยินดีด้วย! คุณได้รับการ์ดใหม่!';
                this.selectedCardModal = res.obtained;
                await this.fetchData();
            } else if (res) {
                alert("Error: " + res.error);
            }
            this.loading = false;
        },



        // Marketplace
        async sellItem() {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") return alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
            if (!this.sellSelectedInv || !this.sellPrice) return alert("กรุณาเลือกการ์ดและราคา");
            this.loading = true;
            const res = await this.apiCall('sellMarketplace', { inventoryId: this.sellSelectedInv, price: parseInt(this.sellPrice) });
            if (res && res.status === 'success') {
                alert(res.message);
                this.sellSelectedInv = "";
                await this.fetchData();
            }
            this.loading = false;
        },
        async buyMarket(item) {
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") return alert("โปรดตั้งค่า API_URL เพื่อใช้งานฟีเจอร์นี้");
            if (!confirm(`ยืนยันการซื้อ ${this.getCardById(item.card_id).name} ในราคา ${item.price_coins} เหรียญ?`)) return;
            this.loading = true;
            const res = await this.apiCall('buyMarketplace', { listingId: item.listing_id });
            if (res && res.status === 'success') {
                alert(res.message);
                await this.fetchData();
            } else if (res) {
                alert(res.error);
            }
            this.loading = false;
        },

        // Fallback Mock Data
        loadMockData() {
            if (this.user) {
                this.user.coins = 1000;
            } else {
                this.user = { user_id: 'guest123', display_name: 'Guest Tester', coins: 1000 };
            }
            this.collections = [
                { collection_id: '77THCC', collection_name: '77 จังหวัดประเทศไทย', description: 'สะสมการ์ดจังหวัดประจำประเทศไทย', icon: 'fa-solid fa-flag', total_cards: 77 },
                { collection_id: '711FOOD', collection_name: 'ของกิน 7-11', description: 'ของกินยอดฮิตในร้านสะดวกซื้อ', icon: 'fa-solid fa-bowl-food', total_cards: 50 },
                { collection_id: '90S', collection_name: 'ไอเทมยุค 90s', description: 'ของเล่นและขนมในความทรงจำ', icon: 'fa-solid fa-gamepad', total_cards: 30 }
            ];
            this.cards = [
                { collection_id: '77THCC', card_id: '77THCC-01', name: 'กรุงเทพมหานคร', category_tag: 'Central', rarity: 'Rare', slogan: 'กรุงเทพฯ ดุจเทพสร้าง...', stat_1_label: 'ท่องเที่ยว', stat_1_val: 95, stat_2_label: 'วัฒนธรรม', stat_2_val: 90, link_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
                { collection_id: '77THCC', card_id: '77THCC-02', name: 'เชียงใหม่', category_tag: 'North', rarity: 'Common', slogan: 'ดอยสุเทพเป็นศรี ประเพณีเป็นสง่า...', stat_1_label: 'ท่องเที่ยว', stat_1_val: 99, stat_2_label: 'วัฒนธรรม', stat_2_val: 85, link_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' },
                { collection_id: '711FOOD', card_id: '711FOOD-01', name: 'ข้าวกล่องกะเพราหมูสับ', category_tag: 'Food', rarity: 'Common', slogan: 'อร่อยด่วนทันใจ...', stat_1_label: 'ความอร่อย', stat_1_val: 80, stat_2_label: 'แคลอรี', stat_2_val: 550, link_url: '#', image_drive_id: '1A2B3C4D5E6F7G8H9I' }
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
