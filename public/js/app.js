function getDeviceId() {
    let deviceId = localStorage.getItem('dps45_device_id');
    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem('dps45_device_id', deviceId);
    }
    return deviceId;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Time Formatting
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Нет данных';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн. назад`;
}

function isStale(timestamp, type) {
    if (!timestamp) return true;
    const now = Date.now();
    const postTime = new Date(timestamp).getTime();
    
    // 1 hour for SOS and Clear
    if (type === 'Нужна помощь' || type === 'Чисто') {
        const oneHourAgo = now - 1 * 60 * 60 * 1000;
        return postTime < oneHourAgo;
    }
    
    // 6 hours for others
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    return postTime < sixHoursAgo;
}
const HASHTAGS_MAP = {
    'ДПС': ['Одинокий', 'ДвеПалки', 'ТриПалки', 'ВсехПодряд', 'ТехКонтроль', 'Тонировка', 'Пешеходы', 'СвежееДыхание', 'Страховка', 'вОбеСтороны', 'МотоБат', 'Приставы', 'Регулировщик', 'Медичка', 'Много'],
    'Нужна помощь': ['Прикурите', 'Обсох', 'ВозьмитеНаТрос', 'ПроводаЕсть', 'ПроводаНет', 'НуженКомпрессор', 'НуженДомкрат'],
    'Вопрос': ['НеРаботаетСветофор', 'Яма', 'ДТП', 'ДорожныеРаботы', 'Перекрыто'],
    'Чисто': []
};

// Yandex Maps Application
class DPSMap {
    constructor() {
        this.map = null;
        this.markers = {};
        this.posts = [];
        this.currentPost = null;
        this.deviceId = getDeviceId();
        this.realtimeChannel = null;
        
        this.currentUser = null;
        this.newMarkerCoords = null;
        this.selectedTags = [];
        this.isPlacementMode = false;
        this.markerSize = parseInt(localStorage.getItem('dps45_marker_size')) || 32;
        this.CITY_COORDS = {
            shchuchye: [55.2133, 62.7634],
            shumikha: [55.2255, 63.2982],
            mishkino: [55.3385, 63.9168]
        };

        this.init();
    }

    async init() {
        this.initTheme();
        this.initMarkerSize();
        await this.checkAuth();
        this.initUI();
        await this.loadPosts();
        this.initMap();
        this.initRealtime();
    }
    
    initTheme() {
        const savedTheme = localStorage.getItem('dps45_theme') || 'light';
        this.applyTheme(savedTheme);
        
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
            localStorage.setItem('dps45_theme', newTheme);
            this.updateMapTheme(newTheme);
        });
    }

    switchCity(city, notify = true) {
        if (!this.CITY_COORDS[city]) return;

        localStorage.setItem('dps45_city', city);
        
        // Update all UI elements (menu buttons)
        document.querySelectorAll(`.city-nav-btn`).forEach(btn => {
            if (btn.getAttribute('data-city') === city) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        const cityText = document.getElementById('city-selector-text');
        if (cityText) {
            const cityName = city === 'shchuchye' ? 'Щучье' : city === 'shumikha' ? 'Шумиха' : 'Мишкино';
            cityText.textContent = `Ваш город (${cityName})`;
        }

        // Move map
        if (this.map) {
            this.map.setCenter(this.CITY_COORDS[city], 14, { duration: 1000 });
        }

        if (notify) {
            const cityName = city === 'shchuchye' ? 'Щучье' : city === 'shumikha' ? 'Шумиха' : 'Мишкино';
            this.showSuccess(`Выбран город: ${cityName}`);
        }
    }

    initCitySelector() {
        const cityButtons = document.querySelectorAll('.city-nav-btn');
        const currentCity = localStorage.getItem('dps45_city') || 'shumikha';

        cityButtons.forEach(btn => {
            const city = btn.getAttribute('data-city');
            btn.addEventListener('click', () => this.switchCity(city));
        });

        // Initial sync
        this.switchCity(currentCity, false);
    }

    initMarkerSize() {
        // Update UI based on initial value
        document.querySelectorAll('.size-btn').forEach(btn => {
            if (parseInt(btn.getAttribute('data-size')) === this.markerSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // prevent settings-item click
                const size = parseInt(btn.getAttribute('data-size'));
                this.updateMarkerSize(size);
            });
        });

        this.updateMarkerSizeUI();
    }

    updateMarkerSize(size) {
        this.markerSize = size;
        localStorage.setItem('dps45_marker_size', size);
        
        document.querySelectorAll('.size-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.getAttribute('data-size')) === size);
        });

        this.updateMarkerSizeUI();
        this.renderMarkers();
        this.showSuccess('Размер меток изменен');
    }

    updateMarkerSizeUI() {
        const text = document.getElementById('marker-size-text');
        if (text) {
            let label = 'Средний';
            if (this.markerSize < 30) label = 'Маленький';
            if (this.markerSize > 40) label = 'Большой';
            text.textContent = `Размер меток (${label})`;
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeText = document.getElementById('theme-text');
        const themeTag = document.querySelector('.theme-status-tag');
        
        console.log('Applying theme:', theme);
        
        if (theme === 'dark') {
            if (themeText) themeText.textContent = 'Тёмная тема';
            if (themeTag) {
                themeTag.textContent = 'Вкл';
                themeTag.classList.add('active');
            }
        } else {
            if (themeText) themeText.textContent = 'Светлая тема';
            if (themeTag) {
                themeTag.textContent = 'Выкл';
                themeTag.classList.remove('active');
            }
        }
    }

    updateMapTheme(theme) {
        if (!this.map) {
            console.log('Map not ready for theme update');
            return;
        }
        const mapType = theme === 'dark' ? 'yandex#hybrid' : 'yandex#map';
        console.log('Setting map type to:', mapType);
        this.map.setType(mapType);
    }
    
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                // Fix: Sync deviceId with userId for registered users
                if (data.user && data.user.id) {
                    this.deviceId = data.user.id;
                    localStorage.setItem('dps45_device_id', data.user.id);
                }
                this.updateAuthUI();
                this.showSuccess(`С возвращением, ${this.currentUser.username}!`);
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
        
        // Setup logout button
        document.getElementById('btn-logout').addEventListener('click', async () => {
            const confirmed = await this.showConfirm('Выход', 'Вы уверены, что хотите выйти из аккаунта?');
            if (!confirmed) return;

            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                this.currentUser = null;
                this.updateAuthUI();
                this.showSuccess('Вы успешно вышли из аккаунта');
                
                // Show auth visual section
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('profile-section').style.display = 'none';
            } catch (error) {
                console.error('Logout error:', error);
                this.showError('Ошибка при выходе');
            }
        });
    }

    updateAuthUI() {
        const authSection = document.getElementById('auth-section');
        const profileSection = document.getElementById('profile-section');
        const adminBtn = document.getElementById('admin-link');
        const adminMapBtn = document.getElementById('admin-map-btn');

        if (this.currentUser) {
            authSection.style.display = 'none';
            profileSection.style.display = 'block';
            document.getElementById('profile-username').textContent = this.currentUser.username;
            
            // Show/hide admin elements based on role
            if (this.currentUser.role !== 'admin') {
                adminBtn.style.display = 'none';
                adminMapBtn.classList.remove('visible');
            } else {
                adminBtn.style.display = 'flex';
                adminMapBtn.classList.add('visible');
                document.querySelector('.profile-role').textContent = 'Администратор';
            }
        } else {
            authSection.style.display = 'block';
            profileSection.style.display = 'none';
            adminMapBtn.classList.remove('visible');
        }
    }

    initUI() {
        // initCitySelector is now called in initMap after map is ready

        // Overlay logic
        const overlay = document.getElementById('drawer-overlay');
        overlay.addEventListener('click', () => this.closeAllDrawers());

        // ESC key closes any open drawer or bottom sheet
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllDrawers();
        });

        // Bottom Nav logic
        document.getElementById('nav-map').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAllDrawers();
        });

        document.getElementById('nav-add').addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.currentUser) {
                this.showError('Для добавления меток необходимо войти в аккаунт.');
                document.getElementById('nav-settings').click();
                return;
            }
            
            this.closeAllDrawers();
            this.isPlacementMode = true;
            document.getElementById('map').classList.add('placement-active');
            this.showSuccess('Выберите место на карте, нажав на нужную точку');
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById('nav-add').classList.add('active');
        });

        document.getElementById('nav-settings').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeAllDrawers();
            document.getElementById('nav-settings').classList.add('active');
            overlay.classList.add('active');
            document.getElementById('settings-drawer').classList.add('active');
        });

        // Drawer Close Buttons
        document.querySelectorAll('.drawer-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllDrawers());
        });

        // Auth Tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
                
                e.target.classList.add('active');
                const formId = e.target.getAttribute('data-tab') + '-form';
                document.getElementById(formId).style.display = 'block';
            });
        });

        // Marker Details (Bottom Sheet)
        const btnRelevant = document.getElementById('btn-relevant');
        const btnIrrelevant = document.getElementById('btn-irrelevant');
        btnRelevant.addEventListener('click', () => this.vote('relevant'));
        btnIrrelevant.addEventListener('click', () => this.vote('irrelevant'));

        document.getElementById('btn-delete-post').addEventListener('click', () => this.deleteOwnPost());

        // Forms logic
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                
                if (response.ok) {
                    this.currentUser = data.user;
                    if (data.user && data.user.id) {
                        this.deviceId = data.user.id;
                        localStorage.setItem('dps45_device_id', data.user.id);
                    }
                    this.updateAuthUI();
                    this.showSuccess('Вы успешно вошли в систему');
                    document.getElementById('login-form').reset();
                    this.closeAllDrawers();
                } else {
                    this.showError(data.error || 'Ошибка входа');
                }
            } catch (error) {
                this.showError('Ошибка сети');
            }
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                
                if (response.ok) {
                    this.currentUser = data.user;
                    if (data.user && data.user.id) {
                        this.deviceId = data.user.id;
                        localStorage.setItem('dps45_device_id', data.user.id);
                    }
                    this.updateAuthUI();
                    this.showSuccess('Аккаунт успешно создан!');
                    document.getElementById('register-form').reset();
                    this.closeAllDrawers();
                } else {
                    this.showError(data.error || 'Ошибка регистрации');
                }
            } catch (error) {
                this.showError('Ошибка сети');
            }
        });

        // Add Post Category Selector
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const type = e.target.getAttribute('data-type');
                document.getElementById('post-type').value = type;
                this.generateTags(type);
            });
        });
        
        // Setup initial tags
        this.generateTags('ДПС');

        // Add Post Form Submission
        document.getElementById('add-post-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!this.newMarkerCoords) {
                this.showError("Не выбрано место на карте");
                return;
            }

            const title = document.getElementById('post-new-comment').value.trim() || 'Метка пользователя';
            const type = document.getElementById('post-type').value;
            const comment = document.getElementById('post-new-comment').value;

            try {
                // Get approximate address
                let address = '';
                try {
                    const ymapsResponse = await ymaps.geocode(this.newMarkerCoords);
                    const firstGeoObject = ymapsResponse.geoObjects.get(0);
                    if (firstGeoObject) address = firstGeoObject.getAddressLine();
                } catch(e) {}

                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: type, // Make title the type so it's clean
                        type,
                        comment,
                        tags: this.selectedTags,
                        address,
                        latitude: this.newMarkerCoords[0],
                        longitude: this.newMarkerCoords[1]
                    })
                });

                if (response.ok) {
                    this.closeAllDrawers();
                    document.getElementById('add-post-form').reset();
                    this.selectedTags = []; // clear tags
                    await this.loadPosts();
                    this.renderMarkers();
                    this.newMarkerCoords = null; // reset coords
                    this.showSuccess('Метка успешно добавлена');
                } else {
                    const data = await response.json();
                    this.showError(data.error || 'Ошибка создания метки');
                }
            } catch (error) {
                this.showError('Ошибка при создании');
            }
        });
    }

    generateTags(category) {
        const container = document.getElementById('tags-selector');
        container.innerHTML = '';
        this.selectedTags = [];

        const tags = HASHTAGS_MAP[category] || [];
        if (tags.length === 0) {
            container.innerHTML = '<span class="text-muted" style="font-size:0.85rem;">Для данной категории теги не требуются</span>';
            return;
        }

        tags.forEach(tag => {
            const el = document.createElement('div');
            el.className = 'tag-badge';
            el.textContent = `#${tag}`;
            
            el.addEventListener('click', () => {
                if (el.classList.contains('selected')) {
                    el.classList.remove('selected');
                    this.selectedTags = this.selectedTags.filter(t => t !== tag);
                } else {
                    el.classList.add('selected');
                    this.selectedTags.push(tag);
                }
            });
            container.appendChild(el);
        });
    }

    async loadPosts() {
        try {
            const response = await fetch('/api/posts');
            const data = await response.json();
            this.posts = data.posts;
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('Не удалось загрузить посты');
            this.hideLoading();
        }
    }

    initRealtime() {
        // ... omitted unchanged realtime logic
        const supabaseClient = window.supabase.createClient(
            'https://plfzklrsmasyfibwgwjy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZnprbHJzbWFzeWZpYndnd2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTEyNDEsImV4cCI6MjA4Nzc4NzI0MX0.ov_SXuO2vBkAKi0TU9YGbEyShy2LhCnybpO9y6unXuU'
        );

        this.realtimeChannel = supabaseClient
            .channel('votes-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'votes' },
                async (payload) => {
                    await this.loadPosts();
                    this.renderMarkers();

                    if (this.currentPost && this.currentPost.post_id === payload.new.post_id) {
                        const updatedPost = this.posts.find(p => p.post_id === payload.new.post_id);
                        if (updatedPost) {
                            this.currentPost = updatedPost;
                            this.updateBottomSheetTimes(updatedPost);
                        }
                    }
                }
            )
            .subscribe();
    }

    updateBottomSheetTimes(post) {
        // Update usernames (Creator and Last Voter)
        const authorName = document.getElementById('post-author-name');
        const lastVoterName = document.getElementById('post-last-voter-name');
        
        if (authorName) authorName.textContent = post.username || 'Аноним';
        if (lastVoterName) lastVoterName.textContent = post.last_voter_username || '—';

        const relevantTime = document.getElementById('relevant-time');
        // const irrelevantTime = document.getElementById('irrelevant-time');
        
        if (relevantTime) {
            relevantTime.textContent = formatTimeAgo(post.last_relevant);
            relevantTime.className = 'status-time';
            if (isStale(post.last_relevant)) relevantTime.classList.add('stale');
            if (!post.last_relevant) relevantTime.classList.add('no-data');
        }
    }

    initMap() {
        ymaps.ready(() => {
            const MAP_LIMITS = [
                [54.80, 62.60],
                [55.50, 64.10]
            ];

            const savedTheme = localStorage.getItem('dps45_theme') || 'light';
            const initialMapType = savedTheme === 'dark' ? 'yandex#hybrid' : 'yandex#map';

            const savedCity = localStorage.getItem('dps45_city');
            const defaultCenter = savedCity ? this.CITY_COORDS[savedCity] : this.CITY_COORDS.shumikha;

            this.map = new ymaps.Map('map', {
                center: defaultCenter || this.CITY_COORDS.shumikha,
                zoom: 12,
                type: initialMapType,
                controls: ['zoomControl', 'geolocationControl']
            }, {
                searchControlProvider: 'yandex#search',
                suppressMapOpenBlock: true,
                restrictMapArea: MAP_LIMITS,
                minZoom: 10,
                maxZoom: 18
            });

            this.initCitySelector();

            if (!savedCity) {
                this.showCityModal(this.CITY_COORDS);
            }

            this.renderMarkers();
            this.hideLoading();

            // Map click handler wrapper
            this.map.events.add('click', (e) => {
                const drawers = document.querySelectorAll('.drawer-modal.active, .bottom-sheet.active');
                if (drawers.length > 0) {
                    this.isPlacementMode = false;
                    document.getElementById('map').classList.remove('placement-active');
                    drawers.forEach(d => d.classList.remove('active'));
                    document.getElementById('drawer-overlay').classList.remove('active');
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    document.getElementById('nav-map').classList.add('active');
                    return;
                }

                if (this.isPlacementMode) {
                    this.newMarkerCoords = e.get('coords');
                    this.isPlacementMode = false;
                    document.getElementById('map').classList.remove('placement-active');
                    
                    // Open the add post drawer
                    document.getElementById('drawer-overlay').classList.add('active');
                    document.getElementById('add-post-drawer').classList.add('active');
                    this.generateTags(document.getElementById('post-type').value);
                    return;
                }
            });

            // Automatically try to find user's city/location
            setTimeout(() => {
                if (localStorage.getItem('dps45_city')) return; // Priority to saved city

                console.log('Attempting auto-geolocation...');
                ymaps.geolocation.get({
                    provider: 'browser',
                    mapStateAutoApply: true
                }).then((result) => {
                    const coords = result.geoObjects.get(0).geometry.getCoordinates();
                    if (coords) {
                        this.map.setCenter(coords, 14, { duration: 1500, flying: true });
                        this.showNotification('Местоположение определено', 'success');
                    }
                }).catch((err) => {
                    console.log('Browser geolocation failed, trying Yandex...', err);
                    // Fallback to Yandex (IP based usually)
                    ymaps.geolocation.get({
                        provider: 'yandex',
                        autoReverseGeocode: true
                    }).then((result) => {
                        const coords = result.geoObjects.get(0).geometry.getCoordinates();
                        if (coords) {
                            this.map.setCenter(coords, 12, { duration: 1000, flying: true });
                        }
                    });
                });
            }, 1000); 
        });
    }

    renderMarkers() {
        Object.values(this.markers).forEach(marker => {
            this.map.geoObjects.remove(marker);
        });
        this.markers = {};

        if (!this.posts || !Array.isArray(this.posts)) return;

        this.posts.forEach(post => {
            // Logic for active vs inactive (stale or marked as irrelevant)
            const timeRelevant = post.last_relevant ? new Date(post.last_relevant).getTime() : new Date(post.created_at).getTime();
            const timeIrrelevant = post.last_irrelevant ? new Date(post.last_irrelevant).getTime() : 0;
            
            const isCurrentlyStale = isStale(timeRelevant, post.type);
            
            // If it's a Help or Clear marker, and it's older than 1 hour, DO NOT render it at all
            if (isCurrentlyStale && (post.type === 'Нужна помощь' || post.type === 'Чисто')) {
                return; // skip this iteration, so marker is removed
            }

            const emojiStr = this.getEmojiByType(post.type);
            
            let tagStr = post.tags && post.tags.length > 0 ? `<br><em>${post.tags.map(t => '#'+t).join(' ')}</em>` : '';

            // It is fresh IF:
            // 1. timeRelevant > timeIrrelevant (The last vote/creation was 'relevant' AND NOT 'irrelevant')
            // 2. AND it's not stale (6 hours for DPS/Event, 1 hour for SOS/Clear)
            const isFresh = (timeRelevant > timeIrrelevant) && !isCurrentlyStale;
            
            // If stale or marked irrelevant, make it gray and semi-transparent. If fresh, make it bright.
            const filterStyle = isFresh 
                ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' 
                : 'grayscale(100%) opacity(0.4)';

            const sizeValue = this.markerSize;
            const halfSize = sizeValue / 2;

            // Create a custom HTML layout for the marker
            const CustomIconLayout = ymaps.templateLayoutFactory.createClass(
                `<div style="font-size: ${sizeValue}px; line-height: ${sizeValue}px; transform: translate(-50%, -50%); cursor: pointer; filter: ${filterStyle}; transition: all 0.3s ease;">
                    ${emojiStr}
                </div>`
            );

            const placemark = new ymaps.Placemark(
                [post.latitude, post.longitude],
                {
                    hintContent: post.type || 'ДПС',
                    balloonContent: `<strong>${post.type || 'ДПС'}</strong><br>${post.comment || ''}${tagStr}`,
                },
                {
                    iconLayout: CustomIconLayout,
                    // The icon size and offset are handled primarily by the CSS transform above,
                    // but we set a shape to ensure clicks register correctly on the emoji bounding box.
                    iconShape: {
                        type: 'Rectangle',
                        coordinates: [
                            [-halfSize, -halfSize], [halfSize, halfSize]
                        ]
                    },
                    hideIconOnBalloonOpen: false
                }
            );

            placemark.events.add('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Stop event from reaching map
                // Map automatically centers so bottom sheet logic happens next
                this.showPostDetails(post);
            });

            this.map.geoObjects.add(placemark);
            this.markers[post.post_id] = placemark;
        });
    }

    getEmojiByType(type) {
        if (type === 'Нужна помощь') return '🆘';
        if (type === 'Чисто') return '✅';
        if (type === 'Вопрос') return '⚠️';
        return '🚔'; // ДПС
    }

    getTypeClass(type) {
        if (type === 'Нужна помощь') return 'type-help';
        if (type === 'Чисто') return 'type-clear';
        if (type === 'Вопрос') return 'type-question';
        return 'type-dps';
    }

    showPostDetails(post) {
        this.currentPost = post;

        // Reset details
        const typeBadge = document.getElementById('post-type-badge');
        typeBadge.textContent = post.type || 'ДПС';
        typeBadge.className = `post-type-badge ${this.getTypeClass(post.type)}`;
        
        // Author will be updated in updateBottomSheetTimes
        
        // Tags
        const tagsContainer = document.getElementById('post-tags-container');
        tagsContainer.innerHTML = '';
        if (post.tags && post.tags.length > 0) {
            post.tags.forEach(t => {
                const el = document.createElement('div');
                el.className = 'tag-badge selected';
                el.textContent = `#${t}`;
                tagsContainer.appendChild(el);
            });
            tagsContainer.style.display = 'flex';
        } else {
            tagsContainer.style.display = 'none';
        }

        const commentContainer = document.getElementById('post-comment-container');
        if (post.comment) {
            document.getElementById('post-comment').textContent = post.comment;
            commentContainer.style.display = 'block';
        } else {
            commentContainer.style.display = 'none';
        }

        this.updateBottomSheetTimes(post);

        document.getElementById('btn-relevant').disabled = false;
        document.getElementById('btn-irrelevant').disabled = false;

        // Show delete button for the post owner OR admin
        const deleteBtn = document.getElementById('btn-delete-post');
        const isOwner = this.currentUser && post.user_id && post.user_id === this.currentUser.id;
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        deleteBtn.style.display = (isOwner || isAdmin) ? 'block' : 'none';

        const message = document.getElementById('vote-message');
        message.className = 'vote-message';
        message.style.display = 'none';

        // Open Bottom Sheet visually
        document.getElementById('bottom-sheet').classList.add('active');

        this.map.panTo([post.latitude, post.longitude], {
            flying: true,
            duration: 500
        });
    }

    async vote(voteType) {
        if (!this.currentPost) return;

        const btnRelevant = document.getElementById('btn-relevant');
        const btnIrrelevant = document.getElementById('btn-irrelevant');

        btnRelevant.disabled = true;
        btnIrrelevant.disabled = true;

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_id: this.currentPost.post_id,
                    device_id: this.deviceId,
                    vote_type: voteType
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('success', data.message || 'Голос принят!');
                this.showSuccess('Голос принят');
                await this.loadPosts();
                this.renderMarkers();
                const updatedPost = this.posts.find(p => p.post_id === this.currentPost.post_id);
                if (updatedPost) {
                    this.currentPost = updatedPost;
                    this.updateBottomSheetTimes(updatedPost);
                }
            } else {
                this.showMessage('warning', data.error || 'Ошибка при голосовании');
                this.showError(data.error || 'Ошибка голосования');
                btnRelevant.disabled = false;
                btnIrrelevant.disabled = false;
            }
        } catch (error) {
            console.error('Vote error:', error);
            this.showMessage('error', 'Не удалось отправить голос');
            this.showError('Не удалось отправить голос');
            btnRelevant.disabled = false;
            btnIrrelevant.disabled = false;
        }
    }

    async deleteOwnPost() {
        if (!this.currentPost) return;
        
        const confirmed = await this.showConfirm(
            'Удаление метки', 
            'Вы уверены, что хотите удалить вашу метку? Это действие нельзя будет отменить.'
        );
        if (!confirmed) return;

        const postId = this.currentPost.post_id;
        if (!postId) {
            this.showError('ID метки не найден');
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            
            if (response.ok) {
                const data = await response.json();
                document.getElementById('bottom-sheet').classList.remove('active');
                document.getElementById('drawer-overlay').classList.remove('active');
                this.currentPost = null;
                this.showSuccess('Метка удалена');
                // Refresh map
                await this.loadPosts();
                this.renderMarkers();
            } else {
                let errorMsg = 'Не удалось удалить метку';
                try {
                    const data = await response.json();
                    errorMsg = data.error || errorMsg;
                } catch (e) {
                    errorMsg = `Ошибка сервера: ${response.status}`;
                }
                this.showError(errorMsg);
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Ошибка при удалении');
        }
    }

    showMessage(type, text) {
        const message = document.getElementById('vote-message');
        if (message) {
            message.className = `vote-message ${type}`;
            message.textContent = text;
            message.style.display = 'block';
        }
    }

    showNotification(text, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = document.createElement('i');
        if (type === 'success') icon.className = 'fa-solid fa-circle-check';
        else if (type === 'error') icon.className = 'fa-solid fa-circle-xmark';
        else icon.className = 'fa-solid fa-circle-info';
        
        const span = document.createElement('span');
        span.textContent = text;
        
        toast.appendChild(icon);
        toast.appendChild(span);
        container.appendChild(toast);

        // Auto remove after 3s
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    showSuccess(text) {
        this.showNotification(text, 'success');
    }

    showError(text) {
        this.showNotification(text, 'error');
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const msgEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok');
            const cancelBtn = document.getElementById('confirm-cancel');

            titleEl.textContent = title;
            msgEl.textContent = message;
            modal.classList.add('active');

            const onOk = () => {
                modal.classList.remove('active');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(true);
            };

            const onCancel = () => {
                modal.classList.remove('active');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(false);
            };

            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => { if (loading.parentNode) loading.remove(); }, 300);
        }
    }

    showCityModal(CITY_COORDS) {
        const modal = document.getElementById('city-modal');
        if (!modal) return;
        
        modal.classList.add('active');
        
        modal.querySelectorAll('.city-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const city = btn.getAttribute('data-city');
                this.switchCity(city);
                modal.classList.remove('active');
            });
        });
    }

    closeAllDrawers() {
        const overlay = document.getElementById('drawer-overlay');
        overlay.classList.remove('active');
        document.querySelectorAll('.drawer-modal, .bottom-sheet').forEach(m => m.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('nav-map').classList.add('active'); // default to map active
        
        this.isPlacementMode = false;
        document.getElementById('map').classList.remove('placement-active');
    }
}

new DPSMap();