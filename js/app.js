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
        async switchNav(view) {
            this.activeNav = view;
            this.currentView = view;
            
            // Reset sub-view when switching main nav
            if (view === 'profile') this.profileSubView = 'portfolio';

            this.loading = true;
            try {
                if (view === 'home') await this.loadHomeData();
                else if (view === 'market') await this.loadMarketData();
                else if (view === 'gacha') await this.loadGachaData();
                else if (view === 'collection') await this.loadCollectionData();
                else if (view === 'profile') await this.loadProfileData();
                else if (view === 'album') await this.loadCollectionData(); // album shares collection data
            } catch (e) {
                console.error("Error loading tab data", e);
            }
            this.loading = false;
        },

        async loadHomeData() {
            const promises = [];
            if (this.user) promises.push(this.apiCall('getUserData').then(res => { if(res && res.user) this.user = res.user; }));
            if (this.cards.length === 0) promises.push(this.apiCall('getCards').then(res => { if(res && res.cards) this.cards = res.cards; }));
            if (this.collections.length === 0) promises.push(this.apiCall('getCollections').then(res => { 
                if(res && res.collections) {
                    this.collections = res.collections;
                    if (this.collections.length > 0 && !this.selectedCollectionForGacha) {
                        this.selectedCollectionForGacha = this.collections[0].collection_id;
                    }
                }
            }));
            if (this.user && this.inventory.length === 0) promises.push(this.apiCall('getUserInventory').then(res => { if(res && res.inventory) this.inventory = res.inventory; }));
            await Promise.all(promises);
        },

        async loadMarketData() {
            const promises = [this.apiCall('getMarketplace').then(res => { if(res && res.marketplace) this.marketplace = res.marketplace; })];
            if (this.cards.length === 0) promises.push(this.apiCall('getCards').then(res => { if(res && res.cards) this.cards = res.cards; }));
            if (this.user) promises.push(this.apiCall('getUserData').then(res => { if(res && res.user) this.user = res.user; }));
            await Promise.all(promises);
        },

        async loadGachaData() {
            const promises = [];
            if (this.collections.length === 0) promises.push(this.apiCall('getCollections').then(res => { 
                if(res && res.collections) {
                    this.collections = res.collections;
                    if (this.collections.length > 0 && !this.selectedCollectionForGacha) {
                        this.selectedCollectionForGacha = this.collections[0].collection_id;
                    }
                } 
            }));
            if (this.user) promises.push(this.apiCall('getUserData').then(res => { if(res && res.user) this.user = res.user; }));
            await Promise.all(promises);
        },

        async loadCollectionData() {
            const promises = [];
            if (this.collections.length === 0) promises.push(this.apiCall('getCollections').then(res => { if(res && res.collections) this.collections = res.collections; }));
            if (this.cards.length === 0) promises.push(this.apiCall('getCards').then(res => { if(res && res.cards) this.cards = res.cards; }));
            if (this.user) promises.push(this.apiCall('getUserInventory').then(res => { if(res && res.inventory) this.inventory = res.inventory; }));
            await Promise.all(promises);
        },

        async loadProfileData() {
            const promises = [];
            if (this.user) {
                promises.push(this.apiCall('getUserData').then(res => { if(res && res.user) this.user = res.user; }));
                promises.push(this.apiCall('getUserInventory').then(res => { if(res && res.inventory) this.inventory = res.inventory; }));
            }
            if (this.cards.length === 0) promises.push(this.apiCall('getCards').then(res => { if(res && res.cards) this.cards = res.cards; }));
            if (this.collections.length === 0) promises.push(this.apiCall('getCollections').then(res => { if(res && res.collections) this.collections = res.collections; }));
            promises.push(this.apiCall('getMarketplace').then(res => { if(res && res.marketplace) this.marketplace = res.marketplace; }));
            await Promise.all(promises);
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
            if (API_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                alert("โปรดตั้งค่า API_URL ก่อนใช้งาน");
                return;
            }
            await this.switchNav(this.currentView);
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


    }
}).mount('#app');
