
        /* --- STATE & MOCK DATA --- */
        const MOCK_USERS = {
            'user1': { id: 'user1', role: 'user', name: 'Ahmet Yılmaz', email: 'ahmet@test.com' },
            'dealer1': { id: 'dealer1', role: 'dealer', name: 'Kapalıçarşı Döviz', verified: true, city: 'İstanbul', address: 'Beyazıt Mah. Çadırcılar Cad.', phone: '0212 555 11 22', hours: '09:00 - 18:00', rating: 4.8, reviewsCount: 124, lat: 41.0108, lng: 28.9680 },
            'dealer2': { id: 'dealer2', role: 'dealer', name: 'Ankara Merkez Finans', verified: true, city: 'Ankara', address: 'Kızılay Meydanı No:5', phone: '0312 444 33 22', hours: '08:30 - 17:30', rating: 4.5, reviewsCount: 56, lat: 39.9208, lng: 32.8541 },
            'dealer3': { id: 'dealer3', role: 'dealer', name: 'Ege Kur İzmir', verified: false, city: 'İzmir', address: 'Alsancak Kıbrıs Şehitleri', phone: '0232 333 44 55', hours: '09:00 - 19:00', rating: 4.2, reviewsCount: 18, lat: 38.4385, lng: 27.1425 }
        };

        const INITIAL_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'AED', 'SAR', 'RUB'];
        const INITIAL_METALS = ['XAU', 'XAG', 'CEY']; // XAU: Ons, XAG: Gümüş, CEY: Çeyrek
        const INITIAL_CRYPTO = ['BTC', 'ETH', 'SOL'];
        const BASE_RATES = { 
            'USD': 45.35, 'EUR': 49.20, 'GBP': 56.50, 'CHF': 49.60, 'JPY': 0.28, 'AED': 12.35, 'SAR': 12.10, 'RUB': 0.48,
            'XAU': 4668.50, // Ons Altın (USD) - Görseldeki değer
            'XAG': 52.80,   // Ons Gümüş (USD)
            'CEY': 11137.00, // Çeyrek Altın (TRY) - Görseldeki değer
            'BTC': 125000.00, // USD
            'ETH': 4200.00,   // USD
            'SOL': 250.00     // USD
        };
        
        let state = {
            currentUser: null,
            theme: localStorage.getItem('theme') || 'light',
            favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
            currencies: {}, 
            metals: {}, // New category
            listings: [
                { id: 'L1', dealerId: 'dealer1', currency: 'USD', amount: 10000, price: 32.40, urgent: true, city: 'İstanbul', date: Date.now() - 3600000 },
                { id: 'L2', dealerId: 'dealer1', currency: 'EUR', amount: 5000, price: 34.75, urgent: false, city: 'İstanbul', date: Date.now() - 7200000 },
                { id: 'L3', dealerId: 'dealer2', currency: 'USD', amount: 25000, price: 32.42, urgent: false, city: 'Ankara', date: Date.now() - 86400000 },
                { id: 'L4', dealerId: 'dealer3', currency: 'GBP', amount: 2000, price: 40.45, urgent: true, city: 'İzmir', date: Date.now() - 1800000 },
                { id: 'L5', dealerId: 'dealer2', currency: 'EUR', amount: 15000, price: 34.70, urgent: false, city: 'Ankara', date: Date.now() - 5000000 },
            ],
            chats: {
                'chat1': { id: 'chat1', dealerId: 'dealer1', userId: 'user1', messages: [
                    { sender: 'dealer1', text: 'Merhaba, 10.000 USD için son fiyattır.', time: '10:30' },
                    { sender: 'user1', text: 'Ofise gelip elden alabilir miyim?', time: '10:35' }
                ]}
            },
            activeChatId: null,
            notifications: [
                { id: 'n1', type: 'message', text: 'Kapalıçarşı Döviz size bir mesaj gönderdi.', read: false, time: '10 dk önce' },
                { id: 'n2', type: 'system', text: 'USD ilanınızın süresi 2 saat içinde dolacak.', read: false, time: '1 saat önce' },
                { id: 'n3', type: 'review', text: 'Mağazanıza yeni bir değerlendirme yapıldı.', read: true, time: '1 gün önce' }
            ],
            priceHistory: {}, // dealerId -> [prices]
            editingListingId: null,
            crypto: {},
            portfolio: JSON.parse(localStorage.getItem('portfolio') || '[]'),
            alerts: []
        };

        // Initialize currency data with fallback mock rates
        INITIAL_CURRENCIES.forEach(c => {
            const base = BASE_RATES[c];
            state.currencies[c] = {
                buy: base,
                sell: base * 1.01,
                history: Array.from({length: 10}, () => base + (Math.random() - 0.5) * base * 0.05)
            };
        });

        INITIAL_METALS.forEach(m => {
            const base = BASE_RATES[m];
            state.metals[m] = {
                buy: base,
                sell: base * 1.01,
                history: Array.from({length: 10}, () => base + (Math.random() - 0.5) * base * 0.05)
            };
        });

        INITIAL_CRYPTO.forEach(c => {
            const base = BASE_RATES[c];
            state.crypto[c] = {
                buy: base * BASE_RATES['USD'], // Convert to TRY using base USD rate
                sell: base * BASE_RATES['USD'] * 1.001,
                history: Array.from({length: 10}, () => (base + (Math.random() - 0.5) * base * 0.08) * BASE_RATES['USD'])
            };
        });

        async function fetchLiveRates() {
            try {
                const cached = localStorage.getItem('apiRatesCache');
                if (cached) {
                    const parsedCache = JSON.parse(cached);
                    if (Date.now() - parsedCache.timestamp < 3600000) {
                        applyRatesToState(parsedCache.rates);
                        console.log("Kurlar cache'den yüklendi.");
                        return;
                    }
                }

                // Vercel Proxy denemesi
                let response;
                try {
                    response = await fetch('/api/rates');
                } catch (e) {
                    // Yerel geliştirme için eski yöntem
                    const apiKey = window.ENV.EXCHANGE_RATE_API_KEY;
                    response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
                }

                const data = await response.json();
                if(data.result === 'success' || data.conversion_rates) {
                    const rates = data.conversion_rates;
                    localStorage.setItem('apiRatesCache', JSON.stringify({
                        timestamp: Date.now(),
                        rates: rates
                    }));
                    applyRatesToState(rates);
                }
            } catch (err) {
                console.error("API kur verisi çekilemedi.", err);
                const cached = localStorage.getItem('apiRatesCache');
                if (cached) applyRatesToState(JSON.parse(cached).rates);
            }
        }

        async function fetchHistoricalRates() {
            try {
                const d = new Date();
                const endDate = d.toISOString().split('T')[0];
                d.setDate(d.getDate() - 7);
                const startDate = d.toISOString().split('T')[0];
                
                // Frankfurter API (Free, No Key required for major currencies)
                const res = await fetch(`https://api.frankfurter.app/${startDate}..${endDate}?from=USD`);
                const data = await res.json();
                
                if(data && data.rates) {
                    const dates = Object.keys(data.rates).sort();
                    INITIAL_CURRENCIES.forEach(c => {
                        const cur = state.currencies[c];
                        if(cur && c !== 'USD') {
                            const newHistory = [];
                            dates.forEach(date => {
                                const usdToTry = data.rates[date]['TRY'];
                                const usdToC = data.rates[date][c];
                                if(usdToTry && usdToC) newHistory.push(usdToTry / usdToC);
                            });
                            if(newHistory.length > 0) {
                                newHistory.push(cur.buy); // Append latest real rate
                                cur.history = newHistory;
                            }
                        }
                    });
                    
                    const usdCur = state.currencies['USD'];
                    const usdHistory = [];
                    dates.forEach(date => {
                        if(data.rates[date]['TRY']) usdHistory.push(data.rates[date]['TRY']);
                    });
                    usdHistory.push(usdCur.buy);
                    usdCur.history = usdHistory;

                    if(document.getElementById('view-kurlar').classList.contains('active')) renderCurrencies();
                }
            } catch(e) {
                console.warn("Geçmiş veri çekilemedi, simülasyon devam ediyor.", e);
            }
        }

        function applyRatesToState(rates) {
            const tryRate = rates['TRY'];
            if(tryRate) {
                INITIAL_CURRENCIES.forEach(c => {
                    if(rates[c]) {
                        const realRate = tryRate / rates[c];
                        const cur = state.currencies[c];
                        cur.buy = realRate;
                        cur.sell = realRate * 1.01;
                        // Build a smoothed fake history leading up to the real rate for currencies without real history yet
                        const fakeHist = [];
                        let tempRate = realRate * 0.98;
                        for(let i=0; i<9; i++) {
                            fakeHist.push(tempRate);
                            tempRate += (Math.random() - 0.4) * realRate * 0.01;
                        }
                        fakeHist.push(realRate);
                        cur.history = fakeHist;
                    }
                });

                // Update metals based on USD rates
                if(rates['USD']) {
                    INITIAL_METALS.forEach(m => {
                        // For metals, API might not give XAU/XAG directly in free tier, but we can mock relative to USD
                        const usdToTry = tryRate;
                        const metal = state.metals[m];
                        
                        const baseUsd = BASE_RATES[m];
                        const currentUsd = baseUsd + (Math.random() - 0.5) * baseUsd * 0.005;

                        if(m === 'XAU') { // Gram Altın (Görseldeki 6811 seviyesine uygun hesaplama)
                            const gramGoldTry = (currentUsd * usdToTry) / 31.1035;
                            metal.buy = gramGoldTry;
                            metal.sell = gramGoldTry * 1.002;
                            metal.history.push(gramGoldTry);
                        } else if(m === 'XAG') { // Gümüş
                            const gramSilverTry = (currentUsd * usdToTry) / 31.1035;
                            metal.buy = gramSilverTry;
                            metal.sell = gramSilverTry * 1.01;
                            metal.history.push(gramSilverTry);
                        } else if(m === 'CEY') { // Çeyrek Altın
                            const currentCey = BASE_RATES['CEY'] + (Math.random() - 0.5) * 50;
                            metal.buy = currentCey;
                            metal.sell = currentCey * 1.02;
                            metal.history.push(currentCey);
                        }
                        if(metal.history.length > 20) metal.history.shift();
                    });

                    // Update Crypto based on USD rates
                    INITIAL_CRYPTO.forEach(c => {
                        const usdToTry = tryRate;
                        const cr = state.crypto[c];
                        const baseUsd = BASE_RATES[c];
                        const currentUsd = baseUsd + (Math.random() - 0.5) * baseUsd * 0.02;
                        const tryVal = currentUsd * usdToTry;
                        cr.buy = tryVal;
                        cr.sell = tryVal * 1.002;
                        cr.history.push(tryVal);
                        if(cr.history.length > 20) cr.history.shift();
                    });
                }
                
                const now = new Date();
                document.getElementById('last-updated').innerText = now.toLocaleTimeString('tr-TR');
                
                if (typeof calculateCurrency === 'function') calculateCurrency();
                if(document.getElementById('view-kurlar').classList.contains('active')) {
                    renderCurrencies();
                }
            }
        }

        /* --- CORE FUNCTIONS --- */
        function init() {
            document.documentElement.setAttribute('data-theme', state.theme);
            if(state.theme === 'dark') document.getElementById('theme-icon').innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
            
            // Dinamik olarak Google Maps Script'ini yükle
            if (window.ENV && window.ENV.GOOGLE_MAPS_API_KEY) {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${window.ENV.GOOGLE_MAPS_API_KEY}`;
                document.head.appendChild(script);
            }

            // Modal close
            document.getElementById('listing-modal').addEventListener('click', (e) => {
                if(e.target.id === 'listing-modal') closeModal();
            });

            // Start live updates for mock fluctuations
            setInterval(updateCurrencies, 10000);

            // Fetch real live rates from API, then historical data
            fetchLiveRates().then(() => fetchHistoricalRates());

            // Check if already logged in (mock)
            const savedUser = localStorage.getItem('currentUser');
            if(savedUser) {
                state.currentUser = JSON.parse(savedUser);
                showApp();
            } else {
                showLogin();
            }
        }

        function showToast(msg, type='success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                ${type === 'success' ? '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'}
                <span>${msg}</span>
            `;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function generateSparkline(data, color) {
            const width = 120, height = 40;
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const points = data.map((d, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - ((d - min) / range) * (height - 10) - 5;
                return `${x},${y}`;
            }).join(' ');
            return `<svg class="sparkline" viewBox="0 0 ${width} ${height}">
                <polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }

        function generateBarChart(data) {
            if(!data || data.length === 0) return '<p class="text-muted">Veri yok</p>';
            const width = 300, height = 150;
            const max = Math.max(...data) * 1.05;
            const bars = data.map((d, i) => {
                const x = (i / data.length) * width + 5;
                const barHeight = (d / max) * (height - 20);
                const y = height - barHeight;
                const barWidth = (width / data.length) - 10;
                return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="var(--primary)" rx="4"/>
                        <text x="${x + barWidth/2}" y="${y - 5}" font-size="10" fill="var(--text-muted)" text-anchor="middle">${d}</text>`;
            }).join('');
            return `<div class="chart-container"><svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg></div>`;
        }

        /* --- AUTH & NAV --- */
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            // Tek kullanıcı girişi - her zaman dealer olarak giriş
            state.currentUser = MOCK_USERS['dealer1'];
            localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
            showToast('Başarıyla giriş yapıldı');
            showApp();
        });

        function logout() {
            state.currentUser = null;
            localStorage.removeItem('currentUser');
            document.getElementById('app-wrapper').style.display = 'none';
            document.getElementById('view-login').classList.add('active');
            showToast('Çıkış yapıldı');
        }

        function showLogin() {
            document.getElementById('app-wrapper').style.display = 'none';
            document.getElementById('view-login').classList.add('active');
        }

        function showApp() {
            document.getElementById('view-login').classList.remove('active');
            document.getElementById('app-wrapper').style.display = 'block';
            updateBadges();
            navigate('kurlar');
        }

        function navigate(viewId, params = {}) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            const targetView = document.getElementById(`view-${viewId}`);
            if(targetView) targetView.classList.add('active');
            
            const targetLink = document.querySelector(`.nav-link[data-target="${viewId}"]`);
            if(targetLink) targetLink.classList.add('active');
            
            document.getElementById('nav-links').classList.remove('mobile-active'); // close mobile menu

            // Render logic
            if(viewId === 'kurlar') renderCurrencies();
            if(viewId === 'portfoy') renderPortfolio();
            if(viewId === 'ilanlar') {
                if(params.filterCurrency) {
                    document.getElementById('filter-currency').value = params.filterCurrency;
                }
                renderListings();
            }
            if(viewId === 'profil') renderProfile();
            if(viewId === 'mesajlar') renderMessages();
            if(viewId === 'bildirimler') renderNotifications();
            if(viewId === 'shop') renderShopProfile(params.dealerId);
        }

        document.getElementById('theme-toggle').addEventListener('click', () => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', state.theme);
            document.documentElement.setAttribute('data-theme', state.theme);
            const icon = document.getElementById('theme-icon');
            if(state.theme === 'dark') {
                icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
            } else {
                icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
            }
        });

        /* --- CURRENCIES --- */
        function updateCurrencies() {
            let changed = false;
            
            // Fluctuate Currencies
            Object.keys(state.currencies).forEach(c => {
                if(Math.random() > 0.4) {
                    const cur = state.currencies[c];
                    const change = (Math.random() - 0.5) * cur.buy * 0.005;
                    cur.buy = Math.max(0.01, cur.buy + change);
                    cur.sell = cur.buy * 1.01;
                    cur.history.push(cur.buy);
                    if(cur.history.length > 20) cur.history.shift();
                    changed = true;
                }
            });

            // Fluctuate Metals
            Object.keys(state.metals).forEach(m => {
                if(Math.random() > 0.4) {
                    const metal = state.metals[m];
                    const change = (Math.random() - 0.5) * metal.buy * 0.005;
                    metal.buy = Math.max(0.01, metal.buy + change);
                    metal.sell = metal.buy * (m === 'XAU' ? 1.005 : 1.01);
                    metal.history.push(metal.buy);
                    if(metal.history.length > 20) metal.history.shift();
                    changed = true;
                }
            });

            // Fluctuate Crypto
            Object.keys(state.crypto).forEach(c => {
                if(Math.random() > 0.3) {
                    const cr = state.crypto[c];
                    const change = (Math.random() - 0.5) * cr.buy * 0.02; // Crypto is more volatile (2%)
                    cr.buy = Math.max(0.01, cr.buy + change);
                    cr.sell = cr.buy * 1.002;
                    cr.history.push(cr.buy);
                    if(cr.history.length > 20) cr.history.shift();
                    changed = true;
                }
            });
            
            const now = new Date();
            const lastUpdatedElem = document.getElementById('last-updated');
            if(lastUpdatedElem) lastUpdatedElem.innerText = now.toLocaleTimeString('tr-TR');
            
            if (typeof calculateCurrency === 'function') calculateCurrency();

            if(changed && document.getElementById('view-kurlar').classList.contains('active')) {
                renderCurrencies();
            }
            
            if(changed && document.getElementById('view-portfoy').classList.contains('active')) {
                renderPortfolio();
            }
        }

        function toggleFavorite(currency) {
            if(state.favorites.includes(currency)) {
                state.favorites = state.favorites.filter(c => c !== currency);
            } else {
                state.favorites.push(currency);
            }
            localStorage.setItem('favorites', JSON.stringify(state.favorites));
            renderCurrencies();
        }

        function renderCurrencies() {
            const grid = document.getElementById('currencies-grid');
            grid.innerHTML = '';
            
            // Sort to put favorites first
            const sortedCurrencies = Object.keys(state.currencies).sort((a, b) => {
                const aFav = state.favorites.includes(a);
                const bFav = state.favorites.includes(b);
                if(aFav && !bFav) return -1;
                if(!aFav && bFav) return 1;
                return 0;
            });

            sortedCurrencies.forEach(c => {
                const data = state.currencies[c];
                const isFav = state.favorites.includes(c);
                const hist = data.history;
                const trend = hist[hist.length-1] >= hist[hist.length-2] ? 'trend-up' : 'trend-down';
                const trendIcon = trend === 'trend-up' ? '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';
                const color = trend === 'trend-up' ? 'var(--success)' : 'var(--danger)';

                grid.innerHTML += `
                    <div class="card currency-card">
                        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${c}')">
                            <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </button>
                        <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
                            <div class="flex items-center gap-2">
                                <div style="width: 40px; height: 40px; background: var(--bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid var(--border)">${c}</div>
                                <div>
                                    <h3 class="font-bold">${c}/TRY</h3>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-between items-end" style="margin-bottom: 1rem;">
                            <div>
                                <p class="text-sm text-muted">Alış</p>
                                <p class="text-xl font-bold">${data.buy.toFixed(4)} ₺</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm text-muted">Satış</p>
                                <p class="text-xl font-bold">${data.sell.toFixed(4)} ₺</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="${trend} flex items-center gap-2 text-sm font-bold">
                                ${trendIcon} ${(Math.abs(hist[hist.length-1] - hist[hist.length-2]) / hist[hist.length-2] * 100).toFixed(2)}%
                            </div>
                            ${generateSparkline(hist, color)}
                        </div>
                        <div class="currency-card-actions">
                            <button class="btn btn-primary btn-sm flex-1" onclick="openCurrencyDetail('${c}')">Detaylı İncele</button>
                            <button class="btn btn-outline btn-sm" onclick="navigate('ilanlar', {filterCurrency: '${c}'})">İlanlar</button>
                        </div>
                    </div>
                `;
            });

            // --- Render Metals ---
            const metalsGrid = document.getElementById('metals-grid');
            if(metalsGrid) {
                metalsGrid.innerHTML = '';
                Object.keys(state.metals).forEach(m => {
                    const data = state.metals[m];
                    const hist = data.history;
                    const trend = hist[hist.length-1] >= hist[hist.length-2] ? 'trend-up' : 'trend-down';
                    const trendIcon = trend === 'trend-up' ? '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';
                    const color = trend === 'trend-up' ? 'var(--success)' : 'var(--danger)';
                    let label = m;
                    if(m === 'XAU') label = 'Gram Altın';
                    else if(m === 'XAG') label = 'Gram Gümüş';
                    else if(m === 'CEY') label = 'Çeyrek Altın';

                    metalsGrid.innerHTML += `
                        <div class="card currency-card" style="border-top: 4px solid ${m === 'XAU' ? '#f59e0b' : '#94a3b8'}">
                            <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
                                <div class="flex items-center gap-2">
                                    <div style="width: 40px; height: 40px; background: ${m === 'XAU' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #94a3b8, #475569)'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" fill="currentColor"/></svg>
                                    </div>
                                    <div>
                                        <h3 class="font-bold">${label}</h3>
                                        <p class="text-xs text-muted">${m}/TRY</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-between items-end" style="margin-bottom: 1rem;">
                                <div>
                                    <p class="text-sm text-muted">Alış</p>
                                    <p class="text-xl font-bold">${data.buy.toFixed(2)} ₺</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-muted">Satış</p>
                                    <p class="text-xl font-bold">${data.sell.toFixed(2)} ₺</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="${trend} flex items-center gap-2 text-sm font-bold">
                                    ${trendIcon} ${(Math.abs(hist[hist.length-1] - hist[hist.length-2]) / hist[hist.length-2] * 100).toFixed(2)}%
                                </div>
                                ${generateSparkline(hist, color)}
                            </div>
                            <div class="currency-card-actions">
                                <button class="btn btn-primary btn-sm flex-1" onclick="openCurrencyDetail('${m}')">Detaylı İncele</button>
                                <button class="btn btn-outline btn-sm" onclick="navigate('ilanlar', {filterCurrency: '${m}'})">İlanlar</button>
                            </div>
                        </div>
                    `;
                });
            }

            // --- Render Crypto ---
            const cryptoGrid = document.getElementById('crypto-grid');
            if(cryptoGrid) {
                cryptoGrid.innerHTML = '';
                Object.keys(state.crypto).forEach(c => {
                    const data = state.crypto[c];
                    const hist = data.history;
                    const trend = hist[hist.length-1] >= hist[hist.length-2] ? 'trend-up' : 'trend-down';
                    const trendIcon = trend === 'trend-up' ? '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';
                    const color = trend === 'trend-up' ? 'var(--success)' : 'var(--danger)';
                    let label = c === 'BTC' ? 'Bitcoin' : c === 'ETH' ? 'Ethereum' : 'Solana';
                    let iconGradient = c === 'BTC' ? 'linear-gradient(135deg, #f7931a, #d97706)' : c === 'ETH' ? 'linear-gradient(135deg, #627eea, #4b62b3)' : 'linear-gradient(135deg, #14f195, #9945ff)';

                    cryptoGrid.innerHTML += `
                        <div class="card currency-card" style="border-top: 4px solid ${c === 'BTC' ? '#f7931a' : c === 'ETH' ? '#627eea' : '#14f195'}">
                            <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
                                <div class="flex items-center gap-2">
                                    <div style="width: 40px; height: 40px; background: ${iconGradient}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                                        ${c.substring(0,1)}
                                    </div>
                                    <div>
                                        <h3 class="font-bold">${label}</h3>
                                        <p class="text-xs text-muted">${c}/TRY</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-between items-end" style="margin-bottom: 1rem;">
                                <div>
                                    <p class="text-sm text-muted">Fiyat</p>
                                    <p class="text-xl font-bold">${data.buy.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})} ₺</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="${trend} flex items-center gap-2 text-sm font-bold">
                                    ${trendIcon} ${(Math.abs(hist[hist.length-1] - hist[hist.length-2]) / hist[hist.length-2] * 100).toFixed(2)}%
                                </div>
                                ${generateSparkline(hist, color)}
                            </div>
                            <div class="currency-card-actions">
                                <button class="btn btn-primary btn-sm flex-1" onclick="openCurrencyDetail('${c}')">Detaylı İncele</button>
                            </div>
                        </div>
                    `;
                });
            }
        }

        /* --- PORTFOLIO FUNCTIONS --- */
        function renderPortfolio() {
            const listContainer = document.getElementById('portfolio-assets-list');
            const totalElem = document.getElementById('portfolio-total-try');
            const changeElem = document.getElementById('portfolio-24h-change');
            if(!listContainer) return;

            if(state.portfolio.length === 0) {
                listContainer.innerHTML = '<div class="text-center text-muted p-4">Henüz portföyünüze varlık eklemediniz.</div>';
                totalElem.innerText = '0.00 ₺';
                changeElem.innerText = '0.00 ₺';
                return;
            }

            let totalTry = 0;
            let totalPastTry = 0; // Simulate 24h old value

            listContainer.innerHTML = state.portfolio.map((p, index) => {
                let data = state.currencies[p.asset] || state.metals[p.asset] || state.crypto[p.asset];
                if(!data) return '';
                
                let currentVal = data.buy * p.amount;
                let pastVal = data.history[0] * p.amount; // Use first history point as past
                totalTry += currentVal;
                totalPastTry += pastVal;
                
                let diff = currentVal - pastVal;
                let diffPercent = (diff / pastVal) * 100;
                let isUp = diff >= 0;

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);">
                        <div class="flex items-center gap-3">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--surface); display: flex; align-items: center; justify-content: center; font-weight: bold; border: 1px solid var(--border);">
                                ${p.asset}
                            </div>
                            <div>
                                <h4 class="font-bold">${p.amount} ${p.asset}</h4>
                                <p class="text-sm text-muted">Birim: ${data.buy.toLocaleString('tr-TR', {maximumFractionDigits:2})} ₺</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <p class="font-bold text-lg">${currentVal.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})} ₺</p>
                            <p class="text-sm ${isUp ? 'text-success' : 'text-danger'}">${isUp ? '+' : ''}${diff.toLocaleString('tr-TR', {maximumFractionDigits:2})} ₺ (${diffPercent.toFixed(2)}%)</p>
                            <button class="btn btn-outline btn-sm" style="margin-top:0.5rem; border-color: var(--danger); color: var(--danger);" onclick="deleteFromPortfolio(${index})">Sil</button>
                        </div>
                    </div>
                `;
            }).join('');

            totalElem.innerText = totalTry.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₺';
            let totalDiff = totalTry - totalPastTry;
            changeElem.className = totalDiff >= 0 ? 'text-xl font-bold text-success' : 'text-xl font-bold text-danger';
            changeElem.innerText = (totalDiff >= 0 ? '+' : '') + totalDiff.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₺';
        }

        function addToPortfolio() {
            const asset = document.getElementById('portfolio-add-asset').value;
            const amount = parseFloat(document.getElementById('portfolio-add-amount').value);
            
            if(!amount || amount <= 0) {
                showToast('Lütfen geçerli bir miktar girin', 'error');
                return;
            }

            state.portfolio.push({ asset, amount });
            localStorage.setItem('portfolio', JSON.stringify(state.portfolio));
            document.getElementById('portfolio-add-amount').value = '';
            showToast('Portföye eklendi');
            renderPortfolio();
        }

        function deleteFromPortfolio(index) {
            state.portfolio.splice(index, 1);
            localStorage.setItem('portfolio', JSON.stringify(state.portfolio));
            showToast('Varlık silindi');
            renderPortfolio();
        }

        function calculateCurrency() {
            const amountInput = document.getElementById('calc-amount');
            if(!amountInput) return;
            
            const amount = parseFloat(amountInput.value) || 0;
            const from = document.getElementById('calc-from').value;
            const to = document.getElementById('calc-to').value;
            
            let amountInTRY = 0;
            if(from === 'TRY') amountInTRY = amount;
            else {
                const rateData = state.currencies[from] || state.metals[from] || state.crypto[from];
                if(rateData) amountInTRY = amount * rateData.buy;
            }

            let result = 0;
            if(to === 'TRY') result = amountInTRY;
            else {
                const rateData = state.currencies[to] || state.metals[to] || state.crypto[to];
                if(rateData) result = amountInTRY / rateData.buy;
            }
            
            document.getElementById('calc-result').innerText = result.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + to;
        }

        function openCurrencyDetail(code) {
            const data = state.currencies[code] || state.metals[code] || state.crypto[code];
            if(!data) return;

            const modal = document.getElementById('listing-modal');
            const content = document.getElementById('listing-modal-content');
            
            const hist = data.history;
            const min = Math.min(...hist);
            const max = Math.max(...hist);
            const current = hist[hist.length - 1];
            const prev = hist[hist.length - 2] || current;
            const change = current - prev;
            const changePercent = (change / prev) * 100;
            const trendClass = change >= 0 ? 'trend-up' : 'trend-down';
            
            // Full names mapping
            const names = {
                'USD': 'Amerikan Doları',
                'EUR': 'Euro',
                'GBP': 'İngiliz Sterlini',
                'CHF': 'İsviçre Frangı',
                'JPY': 'Japon Yeni',
                'AED': 'Bae Dirhemi',
                'SAR': 'Suudi Arabistan Riyali',
                'RUB': 'Rus Rublesi',
                'XAU': 'Gram Altın',
                'XAG': 'Gram Gümüş',
                'CEY': 'Çeyrek Altın',
                'BTC': 'Bitcoin',
                'ETH': 'Ethereum',
                'SOL': 'Solana'
            };

            content.innerHTML = `
                <button class="modal-close" onclick="closeModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                
                <div class="currency-detail-header">
                    <div style="width: 60px; height: 60px; background: var(--primary); border-radius: 16px; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);">${code}</div>
                    <div>
                        <h2 class="text-2xl font-bold">${names[code] || code}</h2>
                        <div class="flex items-center gap-2">
                            <span class="text-muted text-sm">${code}/TRY Paritesi</span>
                            <span class="badge badge-primary">Canlı Veri</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-end justify-between" style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); border-radius: var(--radius); color: white;">
                    <div>
                        <p style="opacity: 0.8; font-size: 0.875rem; font-weight: 600;">GÜNCEL FİYAT</p>
                        <h1 style="font-size: 3rem; font-weight: 800; line-height: 1;">${data.buy.toFixed(4)} <span style="font-size: 1.5rem; opacity: 0.9;">₺</span></h1>
                    </div>
                    <div class="text-right">
                        <div class="flex items-center justify-end gap-1" style="font-size: 1.25rem; font-weight: 700;">
                            ${change >= 0 ? '▲' : '▼'} ${Math.abs(changePercent).toFixed(2)}%
                        </div>
                        <p style="opacity: 0.8; font-size: 0.875rem;">Son 24 Saat</p>
                    </div>
                </div>

                <div class="detail-chart-wrapper">
                    <div class="flex justify-between items-center" style="margin-bottom: 1rem;">
                        <h3 class="font-bold text-lg">Fiyat Grafiği (Son 20 Güncelleme)</h3>
                        <div class="flex gap-2">
                            <span class="badge badge-success">Sürekli Güncel</span>
                        </div>
                    </div>
                    <div id="detailed-chart-container" style="height: 200px; width: 100%;">
                        ${generateDetailedSVGChart(hist, change >= 0 ? '#10b981' : '#ef4444')}
                    </div>
                    <div class="chart-tooltip" id="chart-tooltip"></div>
                </div>

                <div class="currency-detail-grid">
                    <div class="stat-item">
                        <span class="stat-label">GÜNLÜK DÜŞÜK</span>
                        <div class="stat-value">${min.toFixed(4)} ₺</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">GÜNLÜK YÜKSEK</span>
                        <div class="stat-value">${max.toFixed(4)} ₺</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">MAKAS (SPREAD)</span>
                        <div class="stat-value">${(data.sell - data.buy).toFixed(4)} ₺</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">DEĞİŞİM</span>
                        <div class="stat-value ${trendClass}">${change >= 0 ? '+' : ''}${change.toFixed(4)} ₺</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4" style="margin-bottom: 2rem;">
                    <div class="card" style="padding: 1.25rem;">
                        <h4 class="font-bold text-sm text-muted uppercase mb-3" style="margin-bottom: 0.75rem;">Piyasa Yorumu</h4>
                        <p class="text-sm">
                            ${code} şu an ${change >= 0 ? 'yukarı yönlü' : 'aşağı yönlü'} bir trend izliyor. 
                            Destek noktası <strong>${(min * 0.995).toFixed(4)}</strong> seviyesindeyken, 
                            direnç <strong>${(max * 1.005).toFixed(4)}</strong> olarak gözlemleniyor. 
                            Piyasa hacmi stabil seyrediyor.
                        </p>
                    </div>
                    <div class="card" style="padding: 1.25rem;">
                        <h4 class="font-bold text-sm text-muted uppercase mb-3" style="margin-bottom: 0.75rem;">Teknik Göstergeler</h4>
                        <div class="flex flex-col gap-2">
                            <div class="flex justify-between text-sm">
                                <span>RSI (14):</span>
                                <span class="font-bold ${change >= 0 ? 'text-success' : 'text-danger'}">${(45 + Math.random() * 20).toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Moving Average:</span>
                                <span class="font-bold text-primary">${(min + (max-min)/2).toFixed(4)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span>Volatilite:</span>
                                <span class="badge badge-primary" style="padding: 0 4px; font-size: 0.6rem;">DÜŞÜK</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" style="background: var(--bg); border-color: var(--primary); border-style: dashed; margin-bottom: 2rem;">
                    <div class="flex items-center gap-3">
                        <div style="background: var(--primary); color: white; padding: 0.5rem; border-radius: 8px;">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div>
                            <h4 class="font-bold">Hızlı Hesapla</h4>
                            <p class="text-sm text-muted">100 ${code} şu an <strong>${(100 * data.buy).toFixed(2)} ₺</strong> ediyor.</p>
                        </div>
                        <button class="btn btn-primary btn-sm" style="margin-left: auto;" onclick="closeModal(); document.getElementById('calc-from').value='${code}'; document.getElementById('calc-to').value='TRY'; document.getElementById('calc-amount').value='100'; calculateCurrency(); window.scrollTo({top: 0, behavior: 'smooth'});">Hesap Makinesine Git</button>
                    </div>
                </div>

                <div class="flex gap-4">
                    <button class="btn btn-primary flex-1" onclick="closeModal(); navigate('ilanlar', {filterCurrency: '${code}'})">Bu Kurdaki İlanları Gör</button>
                    <button class="btn btn-outline flex-1" onclick="closeModal(); navigate('profil');">Yeni İlan Ver</button>
                </div>
            `;
            
            modal.classList.add('active');
            setupChartInteractivity();
        }

        function generateDetailedSVGChart(data, color) {
            const width = 800, height = 200;
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 0.1;
            const padding = 20;
            
            const points = data.map((d, i) => {
                const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                const y = height - ((d - min) / range) * (height - padding * 2) - padding;
                return `${x},${y}`;
            }).join(' ');

            const areaPoints = `0,${height} ${points} ${width},${height}`; // Simplified for visual
            
            // Grid lines
            const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => {
                const y = height - p * (height - padding * 2) - padding;
                return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4" />`;
            }).join('');

            return `
                <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width: 100%; height: 100%; overflow: visible;">
                    <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
                            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    ${gridLines}
                    <path d="M ${padding},${height} L ${points} L ${width-padding},${height} Z" fill="url(#chart-grad)" />
                    <polyline fill="none" stroke="${color}" stroke-width="3" points="${points}" stroke-linecap="round" stroke-linejoin="round" />
                    ${data.map((d, i) => {
                        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                        const y = height - ((d - min) / range) * (height - padding * 2) - padding;
                        return `<circle cx="${x}" cy="${y}" r="4" fill="var(--surface)" stroke="${color}" stroke-width="2" class="chart-point" data-val="${d.toFixed(4)}" />`;
                    }).join('')}
                </svg>
            `;
        }

        function setupChartInteractivity() {
            const points = document.querySelectorAll('.chart-point');
            const tooltip = document.getElementById('chart-tooltip');
            const container = document.querySelector('.detail-chart-wrapper');

            points.forEach(p => {
                p.addEventListener('mouseenter', (e) => {
                    const rect = container.getBoundingClientRect();
                    const val = p.getAttribute('data-val');
                    tooltip.style.display = 'block';
                    tooltip.innerText = `${val} ₺`;
                    tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
                    tooltip.style.top = (e.clientY - rect.top - 30) + 'px';
                    p.setAttribute('r', '6');
                });
                p.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                    p.setAttribute('r', '4');
                });
            });
        }

        /* --- LISTINGS --- */
        function toggleFilterPanel() {
            const panel = document.getElementById('filter-panel');
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        }

        function clearFilters() {
            document.getElementById('filter-currency').value = 'all';
            document.getElementById('filter-city').value = 'all';
            document.getElementById('filter-rating').value = '0';
            document.getElementById('filter-min-amount').value = '';
            document.getElementById('filter-max-amount').value = '';
            renderListings();
        }

        function renderListings() {
            const grid = document.getElementById('listings-grid');
            const fCur = document.getElementById('filter-currency').value;
            const fCity = document.getElementById('filter-city').value;
            const sort = document.getElementById('sort-listings').value;
            const minAmt = parseFloat(document.getElementById('filter-min-amount').value) || 0;
            const maxAmt = parseFloat(document.getElementById('filter-max-amount').value) || Infinity;
            const minRating = parseFloat(document.getElementById('filter-rating').value) || 0;

            let filtered = state.listings.filter(l => {
                if(fCur !== 'all' && l.currency !== fCur) return false;
                if(fCity !== 'all' && l.city !== fCity) return false;
                if(l.amount < minAmt) return false;
                if(l.amount > maxAmt) return false;
                
                const dealer = MOCK_USERS[l.dealerId];
                if(dealer && dealer.rating < minRating) return false;
                
                return true;
            });

            filtered.sort((a, b) => {
                if(sort === 'date') return b.date - a.date;
                if(sort === 'price_asc') return a.price - b.price;
                if(sort === 'price_desc') return b.price - a.price;
            });

            if(filtered.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1;">
                        <div class="empty-state card">
                            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            <h3>Arama kriterlerine uygun ilan bulunamadı.</h3>
                            <p>Filtreleri temizleyerek tekrar deneyin.</p>
                        </div>
                    </div>
                `;
                return;
            }

            grid.innerHTML = filtered.map(l => {
                const dealer = MOCK_USERS[l.dealerId];
                const isOwner = state.currentUser.id === l.dealerId;
                return `
                    <div class="card listing-card">
                        <div class="listing-header">
                            <div>
                                <span class="badge badge-primary">${l.currency}</span>
                                ${l.urgent ? '<span class="badge badge-danger" style="margin-left: 0.5rem;">ACİL</span>' : ''}
                                <h3 class="font-bold text-xl" style="margin-top: 0.5rem;">${l.amount.toLocaleString('tr-TR')} ${l.currency}</h3>
                            </div>
                            <div class="text-right">
                                <p class="text-sm text-muted">Birim Fiyat</p>
                                <p class="listing-price">${l.price.toFixed(4)} ₺</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-muted">
                            <svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${l.city} &bull; ${dealer.name} ${dealer.verified ? '<svg viewBox="0 0 24 24" style="width:14px;height:14px;color:var(--success);fill:currentColor;display:inline;"><path d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>' : ''}
                        </div>
                        <div class="flex items-center justify-between" style="margin-top: 0.5rem;">
                            <p class="text-xs text-muted">İlan Tarihi: ${new Date(l.date).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</p>
                            <div class="flex gap-2">
                                ${isOwner ? 
                                    `<button class="btn btn-warning" style="padding: 0.5rem; color: black;" onclick="editListing('${l.id}')">Düzenle</button>
                                     <button class="btn btn-outline" style="padding: 0.5rem;" onclick="deleteListing('${l.id}')">Sil</button>` : 
                                    `<button class="btn btn-outline" style="padding: 0.5rem;" onclick="openListingDetail('${l.id}')">İncele</button>
                                     <button class="btn btn-primary" style="padding: 0.5rem;" onclick="startChat('${l.dealerId}')">Mesaj</button>`
                                }
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function deleteListing(id) {
            if(confirm('İlanı silmek istediğinize emin misiniz?')) {
                state.listings = state.listings.filter(l => l.id !== id);
                showToast('İlan silindi.');
                renderListings();
                if(document.getElementById('view-profil').classList.contains('active')) renderProfile();
            }
        }

        function editListing(id) {
            const l = state.listings.find(x => x.id === id);
            if(!l) return;
            
            navigate('profil');
            
            setTimeout(() => {
                state.editingListingId = id;
                document.getElementById('new-l-curr').value = l.currency;
                document.getElementById('new-l-amount').value = l.amount;
                document.getElementById('new-l-price').value = l.price;
                document.getElementById('new-l-city').value = l.city;
                document.getElementById('new-l-urgent').checked = l.urgent || false;
                
                const formBtn = document.querySelector('#create-listing-form button[type="submit"]');
                if(formBtn) {
                    formBtn.innerText = 'İlanı Güncelle';
                    formBtn.classList.remove('btn-primary');
                    formBtn.classList.add('btn-warning');
                    formBtn.style.color = 'black';
                }
                
                const formTitle = document.getElementById('create-form-title');
                if(formTitle) formTitle.innerText = 'İlanı Düzenle';
                
                document.getElementById('create-listing-form').scrollIntoView({behavior: 'smooth'});
            }, 50);
        }

        function openListingDetail(id) {
            const l = state.listings.find(x => x.id === id);
            const dealer = MOCK_USERS[l.dealerId];
            
            const modal = document.getElementById('listing-modal');
            const content = document.getElementById('listing-modal-content');
            
            content.innerHTML = `
                <button class="modal-close" onclick="closeModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <div class="flex justify-between items-start" style="margin-bottom: 1.5rem;">
                    <div>
                        <span class="badge badge-primary">${l.currency}</span>
                        ${l.urgent ? '<span class="badge badge-danger">ACİL SATILIK</span>' : ''}
                        <h2 class="text-2xl font-bold" style="margin-top: 0.5rem;">${l.amount.toLocaleString('tr-TR')} ${l.currency} Alınacak</h2>
                    </div>
                    <div class="text-right">
                        <p class="text-muted">Teklif Edilen Kur</p>
                        <p class="text-2xl font-bold text-primary">${l.price.toFixed(4)} ₺</p>
                        <p class="text-sm text-muted" style="margin-top:0.25rem; opacity: 0.8;">Toplam: ${(l.amount * l.price).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})} ₺</p>
                    </div>
                </div>
                
                <div class="card bg-bg" style="margin-bottom: 1.5rem; background: var(--bg);">
                    <div class="flex justify-between items-center" style="margin-bottom: 1rem;">
                        <div class="flex items-center gap-2">
                            <div style="width:50px;height:50px;background:var(--primary);border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.2rem;">
                                ${dealer.name.charAt(0)}
                            </div>
                            <div>
                                <h4 class="font-bold cursor-pointer hover:text-primary" onclick="closeModal(); navigate('shop', {dealerId: '${dealer.id}'})">${dealer.name} ${dealer.verified ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;color:var(--success);fill:currentColor;display:inline;"><path d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>' : ''}</h4>
                                <p class="text-sm text-muted">⭐ ${dealer.rating} (${dealer.reviewsCount} Değerlendirme)</p>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm" style="margin-bottom: 1rem;">
                        <div><strong class="text-muted">Telefon:</strong><br>${dealer.phone}</div>
                        <div><strong class="text-muted">Çalışma Saatleri:</strong><br>${dealer.hours}</div>
                        <div style="grid-column: 1 / -1;"><strong class="text-muted">Adres:</strong><br>${dealer.city} - ${dealer.address}</div>
                    </div>
                    <div id="listing-map" style="height: 250px; background: var(--border); border-radius: var(--radius); overflow: hidden; margin-top: 1rem;"></div>
                </div>

                <div class="flex gap-4">
                    <button class="btn btn-primary flex-1" onclick="closeModal(); startChat('${dealer.id}')">Satıcıya Mesaj Gönder</button>
                    <button class="btn btn-outline" onclick="closeModal(); navigate('shop', {dealerId: '${dealer.id}'})">Mağaza Profiline Git</button>
                </div>
            `;
            
            modal.classList.add('active');

            if (dealer.lat && dealer.lng && window.google) {
                const map = new google.maps.Map(document.getElementById("listing-map"), {
                    zoom: 15,
                    center: { lat: dealer.lat, lng: dealer.lng },
                });
                new google.maps.Marker({
                    position: { lat: dealer.lat, lng: dealer.lng },
                    map: map,
                    title: dealer.name
                });
            }
        }

        function closeModal() {
            document.getElementById('listing-modal').classList.remove('active');
        }

        /* --- DEALER PROFILE / DASHBOARD --- */
        function renderProfile() {
            const container = document.getElementById('profile-content');
            {
                const myListings = state.listings.filter(l => l.dealerId === state.currentUser.id);
                // Demo price history for the dealer
                if(!state.priceHistory[state.currentUser.id]) {
                    state.priceHistory[state.currentUser.id] = [32.10, 32.25, 32.20, 32.40, 32.35, 32.50, 32.45];
                }

                container.innerHTML = `
                    <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
                        <h2 class="text-2xl font-bold">Profil & Mağaza Yönetimi</h2>
                        <button class="btn btn-danger" onclick="logout()">Çıkış Yap</button>
                    </div>

                    <!-- Profil Bölümü -->
                    <div class="flex gap-6 flex-wrap" style="align-items: flex-start; margin-bottom: 2rem;">
                        <!-- Sol: Profil Kartı & Hesap Ayarları -->
                        <div class="flex flex-col gap-6" style="flex: 1; min-width: 300px;">
                            <div class="card text-center flex flex-col items-center">
                                <div style="width:100px;height:100px;background:var(--primary);border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:bold;margin: 0 auto 1rem auto;">
                                    ${state.currentUser.name.charAt(0)}
                                </div>
                                <h3 class="font-bold text-xl">${state.currentUser.name}</h3>
                                <p class="text-muted text-sm">${state.currentUser.email || 'demo@dovizim.com'}</p>
                                <div style="margin-top: 1rem;">
                                    ${state.currentUser.verified ? '<span class="badge badge-success">✓ Doğrulanmış Döviz Bürosu</span>' : '<span class="badge badge-primary">Döviz Bürosu</span>'}
                                </div>
                            </div>

                            <div class="card">
                                <h3 class="font-bold text-lg" style="margin-bottom: 1rem;">Hesap Ayarları</h3>
                                <div class="flex flex-col gap-3">
                                    <div>
                                        <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Mağaza Adı</label>
                                        <input type="text" value="${state.currentUser.name}" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                    </div>
                                    <div>
                                        <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">E-posta Adresi</label>
                                        <input type="email" value="${state.currentUser.email || 'demo@dovizim.com'}" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                    </div>
                                    <div>
                                        <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Telefon Numarası</label>
                                        <input type="tel" value="${state.currentUser.phone || '0555 123 4567'}" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                    </div>
                                    <div>
                                        <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Çalışma Saatleri</label>
                                        <input type="text" value="${state.currentUser.hours || '09:00 - 18:00'}" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                    </div>
                                    <div>
                                        <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Adres</label>
                                        <input type="text" value="${state.currentUser.city || 'İstanbul'} - ${state.currentUser.address || 'Merkez Mh.'}" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                    </div>
                                    <button class="btn btn-primary" style="width:100%; margin-top: 0.5rem;" onclick="showToast('Bilgiler güncellendi.')">Değişiklikleri Kaydet</button>
                                </div>
                            </div>
                        </div>

                        <!-- Sağ: İstatistikler & Favori Kurlar -->
                        <div class="flex flex-col gap-6" style="flex: 2; min-width: 300px;">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="card flex items-center justify-between" style="padding: 1.5rem;">
                                    <div>
                                        <p class="text-sm text-muted">Aktif İlanlar</p>
                                        <p class="text-2xl font-bold text-primary">${myListings.length}</p>
                                    </div>
                                    <svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:var(--primary);stroke-width:1;fill:none;opacity:0.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                                </div>
                                <div class="card flex items-center justify-between" style="padding: 1.5rem;">
                                    <div>
                                        <p class="text-sm text-muted">Puanım</p>
                                        <p class="text-2xl font-bold text-warning">⭐ ${state.currentUser.rating}</p>
                                    </div>
                                    <svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:var(--warning);stroke-width:1;fill:none;opacity:0.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                </div>
                                <div class="card flex items-center justify-between" style="padding: 1.5rem;">
                                    <div>
                                        <p class="text-sm text-muted">Gelen Mesajlar</p>
                                        <p class="text-2xl font-bold text-primary">${Object.keys(state.chats).length}</p>
                                    </div>
                                    <svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:var(--primary);stroke-width:1;fill:none;opacity:0.2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                                </div>
                                <div class="card flex items-center justify-between" style="padding: 1.5rem;">
                                    <div>
                                        <p class="text-sm text-muted">Profil Görüntülenme</p>
                                        <p class="text-2xl font-bold text-success">1,245</p>
                                    </div>
                                    <svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:var(--success);stroke-width:1;fill:none;opacity:0.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </div>
                            </div>

                            <div class="card">
                                <div class="flex justify-between items-center" style="margin-bottom: 1rem;">
                                    <h3 class="font-bold text-lg">Favori Kurlarım (Anlık)</h3>
                                    <button class="btn btn-outline text-sm" style="padding: 0.25rem 0.5rem;" onclick="navigate('kurlar')">Tüm Kurlar</button>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);">
                                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem;">
                                            <div class="flex items-center gap-2">
                                                <img src="https://flagcdn.com/w40/us.png" alt="USD" style="width:24px;border-radius:50%;">
                                                <span class="font-bold">Amerikan Doları</span>
                                            </div>
                                            <span class="badge badge-success">USD</span>
                                        </div>
                                        <div class="flex justify-between items-end">
                                            <p class="text-2xl font-bold">${state.currencies.USD ? state.currencies.USD.buy.toFixed(4) : '32.1000'} ₺</p>
                                        </div>
                                    </div>
                                    <div style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);">
                                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem;">
                                            <div class="flex items-center gap-2">
                                                <img src="https://flagcdn.com/w40/eu.png" alt="EUR" style="width:24px;border-radius:50%;">
                                                <span class="font-bold">Euro</span>
                                            </div>
                                            <span class="badge badge-success">EUR</span>
                                        </div>
                                        <div class="flex justify-between items-end">
                                            <p class="text-2xl font-bold">${state.currencies.EUR ? state.currencies.EUR.buy.toFixed(4) : '34.8000'} ₺</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <h3 class="font-bold text-lg" style="margin-bottom: 1rem;">Geçmiş Fiyat Trendim (USD)</h3>
                                ${generateBarChart(state.priceHistory[state.currentUser.id])}
                            </div>
                        </div>
                    </div>

                    <!-- Mağaza Yönetimi Bölümü -->
                    <hr style="border: none; border-top: 1px solid var(--border); margin: 1.5rem 0;">
                    <h2 class="text-xl font-bold" style="margin-bottom: 1.5rem;">📋 İlan Yönetimi</h2>

                    <div class="card" style="margin-bottom: 2rem;">
                        <h3 id="create-form-title" class="font-bold text-lg" style="margin-bottom: 1rem;">Yeni İlan Oluştur</h3>
                        <form id="create-listing-form" class="flex-col gap-4">
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4" style="align-items: end;">
                                <div>
                                    <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Döviz Cinsi</label>
                                    <select id="new-l-curr" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                        ${INITIAL_CURRENCIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Miktar</label>
                                    <input type="number" id="new-l-amount" min="1" required placeholder="Örn: 10000" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                </div>
                                <div>
                                    <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Teklif Fiyatı (₺)</label>
                                    <input type="number" step="0.0001" id="new-l-price" required placeholder="Örn: 32.5000" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                </div>
                                <div>
                                    <label class="text-sm font-bold text-muted" style="display:block; margin-bottom: 0.25rem;">Şehir</label>
                                    <select id="new-l-city" style="width:100%; padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); color: var(--text);">
                                        <option value="İstanbul">İstanbul</option>
                                        <option value="Ankara">Ankara</option>
                                        <option value="İzmir">İzmir</option>
                                    </select>
                                </div>
                            </div>
                            <div class="flex justify-between items-center flex-wrap" style="margin-top: 1.5rem; gap: 1rem;">
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" id="new-l-urgent" style="width: auto;">
                                    <label for="new-l-urgent" class="text-sm font-bold text-danger">Acil Satılık İlanı (Rozet Ekler)</label>
                                </div>
                                <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1.5rem;">İlanı Yayınla</button>
                            </div>
                        </form>
                    </div>

                    <h3 class="font-bold text-xl" style="margin-top: 2rem; margin-bottom: 1rem;">Aktif İlanlarım</h3>
                    <div class="grid grid-cols-2 gap-4" id="my-listings-grid">
                        <!-- Re-using listing render logic slightly tweaked -->
                    </div>
                `;

                // Render my listings
                const myGrid = document.getElementById('my-listings-grid');
                if(myListings.length === 0) {
                    myGrid.innerHTML = `<div class="card text-muted text-center" style="grid-column: 1/-1">Henüz aktif ilanınız yok.</div>`;
                } else {
                    myGrid.innerHTML = myListings.map(l => `
                        <div class="card flex justify-between items-center">
                            <div>
                                <span class="badge badge-primary">${l.currency}</span>
                                <span class="font-bold" style="margin-left:0.5rem">${l.amount} ${l.currency}</span>
                                <div class="text-sm text-muted" style="margin-top:0.25rem">Fiyat: ${l.price} ₺</div>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn btn-warning" style="padding: 0.5rem; color: black;" onclick="editListing('${l.id}')">Düzenle</button>
                                <button class="btn btn-outline" style="padding: 0.5rem;" onclick="deleteListing('${l.id}')">Sil</button>
                            </div>
                        </div>
                    `).join('');
                }

                document.getElementById('create-listing-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    if(state.editingListingId) {
                        const l = state.listings.find(x => x.id === state.editingListingId);
                        if(l) {
                            l.currency = document.getElementById('new-l-curr').value;
                            l.amount = parseInt(document.getElementById('new-l-amount').value);
                            l.price = parseFloat(document.getElementById('new-l-price').value);
                            l.city = document.getElementById('new-l-city').value;
                            l.urgent = document.getElementById('new-l-urgent').checked;
                        }
                        state.editingListingId = null;
                        showToast('İlan başarıyla güncellendi.');
                    } else {
                        const newListing = {
                            id: 'L' + Date.now(),
                            dealerId: state.currentUser.id,
                            currency: document.getElementById('new-l-curr').value,
                            amount: parseInt(document.getElementById('new-l-amount').value),
                            price: parseFloat(document.getElementById('new-l-price').value),
                            city: document.getElementById('new-l-city').value,
                            urgent: document.getElementById('new-l-urgent').checked,
                            date: Date.now()
                        };
                        state.listings.unshift(newListing);
                        showToast('İlan başarıyla yayınlandı.');
                    }
                    renderProfile(); // re-render dashboard
                });

            }
        }

        /* --- SHOP PROFILE (PUBLIC) --- */
        function renderShopProfile(dealerId) {
            const dealer = MOCK_USERS[dealerId];
            if(!dealer) return;

            const dealerListings = state.listings.filter(l => l.dealerId === dealerId);
            const content = document.getElementById('shop-content');
            
            content.innerHTML = `
                <div class="card" style="margin-bottom: 2rem;">
                    <div class="flex items-start gap-4 flex-wrap">
                        <div style="width:100px;height:100px;background:var(--primary);border-radius:12px;color:white;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:bold;">
                            ${dealer.name.charAt(0)}
                        </div>
                        <div style="flex:1">
                            <div class="flex justify-between items-start flex-wrap gap-4">
                                <div>
                                    <h2 class="text-2xl font-bold flex items-center gap-2">
                                        ${dealer.name} 
                                        ${dealer.verified ? '<svg viewBox="0 0 24 24" style="width:24px;height:24px;color:var(--success);fill:currentColor;"><path d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>' : ''}
                                    </h2>
                                    <p class="text-muted" style="margin-top:0.5rem">⭐ ${dealer.rating} Değerlendirme Ortalaması (${dealer.reviewsCount} Yorum)</p>
                                </div>
                                <button class="btn btn-primary" onclick="startChat('${dealer.id}')">Mesaj Gönder</button>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4" style="margin-top:1.5rem">
                                <div>
                                    <p class="text-sm text-muted font-bold">Adres</p>
                                    <p>${dealer.city} - ${dealer.address}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-muted font-bold">İletişim</p>
                                    <p>${dealer.phone}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-muted font-bold">Çalışma Saatleri</p>
                                    <p>${dealer.hours}</p>
                                </div>
                            </div>
                            <div id="shop-map" style="height: 250px; border-radius: var(--radius); margin-top: 1.5rem; background: var(--border); overflow: hidden;"></div>
                        </div>
                    </div>
                </div>

                <h3 class="font-bold text-xl" style="margin-bottom: 1rem;">Mağazanın Aktif İlanları</h3>
                <div class="grid grid-cols-2 gap-4" style="margin-bottom: 2rem;">
                    ${dealerListings.length > 0 ? dealerListings.map(l => `
                        <div class="card listing-card">
                            <div class="flex justify-between">
                                <div>
                                    <span class="badge badge-primary">${l.currency}</span>
                                    <h4 class="font-bold text-lg" style="margin-top:0.5rem">${l.amount.toLocaleString()} ${l.currency}</h4>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-muted">Fiyat</p>
                                    <p class="font-bold text-primary text-xl">${l.price.toFixed(4)} ₺</p>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<p class="text-muted" style="grid-column: 1/-1">Aktif ilan bulunmuyor.</p>'}
                </div>

                <div class="card">
                    <h3 class="font-bold text-lg" style="margin-bottom: 1rem;">Değerlendirme Bırak</h3>
                    <div class="flex gap-2" style="margin-bottom: 1rem;" id="review-stars">
                        <span class="cursor-pointer text-2xl text-muted hover:text-warning transition">★</span>
                        <span class="cursor-pointer text-2xl text-muted hover:text-warning transition">★</span>
                        <span class="cursor-pointer text-2xl text-muted hover:text-warning transition">★</span>
                        <span class="cursor-pointer text-2xl text-muted hover:text-warning transition">★</span>
                        <span class="cursor-pointer text-2xl text-muted hover:text-warning transition">★</span>
                    </div>
                    <textarea rows="3" placeholder="Mağaza hakkındaki deneyiminizi yazın..." style="margin-bottom: 1rem;"></textarea>
                    <button class="btn btn-primary" onclick="showToast('Değerlendirmeniz gönderildi.', 'success')">Gönder</button>
                </div>
            `;

            // Simple star interaction
            const stars = document.querySelectorAll('#review-stars span');
            stars.forEach((s, idx) => {
                s.addEventListener('click', () => {
                    stars.forEach((st, i) => {
                        st.style.color = i <= idx ? 'var(--warning)' : 'var(--text-muted)';
                    });
                });
            });

            if (dealer.lat && dealer.lng && window.google) {
                const map = new google.maps.Map(document.getElementById("shop-map"), {
                    zoom: 15,
                    center: { lat: dealer.lat, lng: dealer.lng },
                });
                new google.maps.Marker({
                    position: { lat: dealer.lat, lng: dealer.lng },
                    map: map,
                    title: dealer.name
                });
            }
        }

        /* --- MESSAGING --- */
        function startChat(dealerId) {
            // Find or create chat
            const chatId = `chat_${state.currentUser.id}_${dealerId}`;
            if(!state.chats[chatId]) {
                state.chats[chatId] = {
                    id: chatId,
                    dealerId: dealerId,
                    userId: state.currentUser.id,
                    messages: [
                        { sender: 'system', text: 'Sohbet başlatıldı.', time: new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) }
                    ]
                };
            }
            navigate('mesajlar');
            openChat(chatId);
        }

        function renderMessages() {
            const sidebar = document.getElementById('chat-sidebar');
            const chats = Object.values(state.chats).filter(c => c.dealerId === state.currentUser.id || c.userId === state.currentUser.id);
            
            if(chats.length === 0) {
                sidebar.innerHTML = `<div class="p-4 text-muted text-center" style="padding: 1rem;">Aktif sohbetiniz yok.</div>`;
                return;
            }

            sidebar.innerHTML = chats.map(c => {
                const otherPartyId = state.currentUser.role === 'dealer' ? c.userId : c.dealerId;
                const otherParty = MOCK_USERS[otherPartyId];
                const lastMsg = c.messages[c.messages.length - 1];
                const isActive = state.activeChatId === c.id;
                
                return `
                    <div class="chat-item ${isActive ? 'active' : ''}" onclick="openChat('${c.id}')">
                        <div class="flex justify-between items-center" style="margin-bottom: 0.25rem;">
                            <strong class="text-sm truncate">${otherParty.name}</strong>
                            <span class="text-xs text-muted">${lastMsg ? lastMsg.time : ''}</span>
                        </div>
                        <p class="text-xs text-muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsg ? lastMsg.text : 'Yeni sohbet'}</p>
                    </div>
                `;
            }).join('');
            
            if(state.activeChatId && state.chats[state.activeChatId]) {
                openChat(state.activeChatId);
            } else {
                document.getElementById('chat-header').innerHTML = '<span>Sohbet Seçin</span>';
                document.getElementById('chat-messages').innerHTML = '<div class="empty-state"><p>Mesajlaşmaya başlamak için soldan bir sohbet seçin.</p></div>';
                document.getElementById('chat-input-area').style.display = 'none';
            }
        }

        function openChat(chatId) {
            state.activeChatId = chatId;
            const chat = state.chats[chatId];
            const otherPartyId = state.currentUser.role === 'dealer' ? chat.userId : chat.dealerId;
            const otherParty = MOCK_USERS[otherPartyId];
            
            renderMessages(); // update sidebar active state

            document.getElementById('chat-header').innerHTML = `
                <div class="flex items-center gap-2">
                    <div style="width:30px;height:30px;background:var(--primary);border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;">
                        ${otherParty.name.charAt(0)}
                    </div>
                    <span>${otherParty.name}</span>
                </div>
            `;
            
            const msgContainer = document.getElementById('chat-messages');
            msgContainer.innerHTML = chat.messages.map(m => {
                if(m.sender === 'system') return `<div class="text-center text-xs text-muted my-2" style="margin:1rem 0">${m.text}</div>`;
                const isMine = m.sender === state.currentUser.id;
                return `
                    <div class="message ${isMine ? 'sent' : 'received'}">
                        <div>${m.text}</div>
                        <div class="text-xs" style="margin-top:0.25rem; opacity:0.7; text-align:right">${m.time}</div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('chat-input-area').style.display = 'flex';
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text || !state.activeChatId) return;

            const chat = state.chats[state.activeChatId];
            chat.messages.push({
                sender: state.currentUser.id,
                text: text,
                time: new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})
            });

            input.value = '';
            openChat(state.activeChatId); // re-render messages

            // Mock auto-reply
            setTimeout(() => {
                chat.messages.push({
                    sender: state.currentUser.role === 'dealer' ? chat.userId : chat.dealerId,
                    text: 'Anlaşıldı, teşekkürler.',
                    time: new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})
                });
                if(state.activeChatId === chat.id) openChat(chat.id);
                // Add notification
                state.notifications.unshift({ id: 'n'+Date.now(), type: 'message', text: 'Yeni bir mesajınız var.', read: false, time: 'Şimdi' });
                updateBadges();
            }, 2000);
        }

        /* --- NOTIFICATIONS --- */
        function renderNotifications() {
            const list = document.getElementById('notifications-list');
            if(state.notifications.length === 0) {
                list.innerHTML = `<div class="empty-state"><p>Bildiriminiz bulunmuyor.</p></div>`;
                return;
            }

            list.innerHTML = state.notifications.map(n => {
                let icon = '';
                if(n.type === 'message') icon = '<svg viewBox="0 0 24 24" style="color:var(--primary)"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
                else if(n.type === 'review') icon = '<svg viewBox="0 0 24 24" style="color:var(--warning)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                else icon = '<svg viewBox="0 0 24 24" style="color:var(--text-muted)"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';

                return `
                    <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
                        <div style="background:var(--bg); padding:0.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; width:40px; height:40px;">
                            ${icon}
                        </div>
                        <div style="flex:1">
                            <p class="${n.read ? 'text-muted' : 'font-bold'}">${n.text}</p>
                            <p class="text-xs text-muted" style="margin-top:0.25rem">${n.time}</p>
                        </div>
                        ${!n.read ? '<div style="width:8px;height:8px;background:var(--primary);border-radius:50%;align-self:center"></div>' : ''}
                    </div>
                `;
            }).join('');
        }

        function markNotificationRead(id) {
            const n = state.notifications.find(x => x.id === id);
            if(n && !n.read) {
                n.read = true;
                updateBadges();
                renderNotifications();
            }
        }

        function markAllNotificationsRead() {
            state.notifications.forEach(n => n.read = true);
            updateBadges();
            renderNotifications();
        }

        function updateBadges() {
            const unreadNotif = state.notifications.filter(n => !n.read).length;
            const notifBadge = document.getElementById('nav-notif-badge');
            notifBadge.innerText = unreadNotif;
            notifBadge.style.display = unreadNotif > 0 ? 'block' : 'none';

            // mock unread msgs logic based on generic count
            const msgBadge = document.getElementById('nav-msg-badge');
            // Assuming 1 unread message if dealer, none if user initially, but we can just use length of chats realistically
            const mockUnreadMsgs = Math.floor(Math.random() * 2); 
            msgBadge.innerText = mockUnreadMsgs;
            msgBadge.style.display = mockUnreadMsgs > 0 ? 'block' : 'none';
        }

        // Initialize App
        window.onload = init;

    