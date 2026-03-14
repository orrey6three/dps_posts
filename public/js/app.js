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

        this.init();
    }

    async init() {
        await this.checkAuth();
        this.initUI();
        await this.loadPosts();
        this.initMap();
        this.initRealtime();
    }
    
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateAuthUI();
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
        
        // Setup logout button
        document.getElementById('btn-logout').addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                this.currentUser = null;
                this.updateAuthUI();
                
                // Show auth visual section
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('profile-section').style.display = 'none';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    updateAuthUI() {
        const authSection = document.getElementById('auth-section');
        const profileSection = document.getElementById('profile-section');
        const adminBtn = document.getElementById('admin-link');

        if (this.currentUser) {
            authSection.style.display = 'none';
            profileSection.style.display = 'block';
            document.getElementById('profile-username').textContent = this.currentUser.username;
            
            // Hide admin button for regular users
            if (this.currentUser.role !== 'admin') {
                adminBtn.style.display = 'none';
            } else {
                adminBtn.style.display = 'flex';
                document.querySelector('.profile-role').textContent = 'Администратор';
            }
        } else {
            authSection.style.display = 'block';
            profileSection.style.display = 'none';
        }
    }

    initUI() {
        // Overlay logic
        const overlay = document.getElementById('drawer-overlay');
        const closeAllDrawers = () => {
            overlay.classList.remove('active');
            document.querySelectorAll('.drawer-modal, .bottom-sheet').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById('nav-map').classList.add('active'); // default to map active
        };

        overlay.addEventListener('click', closeAllDrawers);

        // Bottom Nav logic
        document.getElementById('nav-map').addEventListener('click', (e) => {
            e.preventDefault();
            closeAllDrawers();
        });

        document.getElementById('nav-add').addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.currentUser) {
                this.showError('Для добавления меток необходимо войти в аккаунт.');
                document.getElementById('nav-settings').click();
                return;
            }
            if (!this.newMarkerCoords) {
                this.showError('Сначала нажмите на карту, чтобы выбрать место.');
                return;
            }
            
            closeAllDrawers();
            document.getElementById('nav-add').classList.add('active');
            overlay.classList.add('active');
            document.getElementById('add-post-drawer').classList.add('active');
            
            // Trigger tags regeneration
            this.generateTags(document.getElementById('post-type').value);
        });

        document.getElementById('nav-settings').addEventListener('click', (e) => {
            e.preventDefault();
            closeAllDrawers();
            document.getElementById('nav-settings').classList.add('active');
            overlay.classList.add('active');
            document.getElementById('settings-drawer').classList.add('active');
        });

        // Drawer Close Buttons
        document.querySelectorAll('.drawer-close').forEach(btn => {
            btn.addEventListener('click', closeAllDrawers);
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
                    this.updateAuthUI();
                    document.getElementById('login-form').reset();
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
                    this.updateAuthUI();
                    document.getElementById('register-form').reset();
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
                    closeAllDrawers();
                    document.getElementById('add-post-form').reset();
                    this.selectedTags = []; // clear tags
                    await this.loadPosts();
                    this.renderMarkers();
                    this.newMarkerCoords = null; // reset coords
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
            const SHUMIKHA_LIMITS = [
                [54.85, 62.80],
                [55.45, 63.80]
            ];

            this.map = new ymaps.Map('map', {
                center: [55.2255, 63.2982],
                zoom: 12,
                controls: ['zoomControl', 'geolocationControl']
            }, {
                searchControlProvider: 'yandex#search',
                suppressMapOpenBlock: true,
                restrictMapArea: SHUMIKHA_LIMITS,
                minZoom: 10,
                maxZoom: 18
            });

            this.renderMarkers();
            this.hideLoading();

            // Map click handler wrapper
            this.map.events.add('click', (e) => {
                const drawers = document.querySelectorAll('.drawer-modal.active, .bottom-sheet.active');
                if (drawers.length > 0) {
                    drawers.forEach(d => d.classList.remove('active'));
                    document.getElementById('drawer-overlay').classList.remove('active');
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    document.getElementById('nav-map').classList.add('active');
                    return;
                }

                if (!this.currentUser) {
                    alert('Войдите в систему (нажав на Шестеренку), чтобы добавить метку');
                    return;
                }

                // Show modal to add a marker
                this.newMarkerCoords = e.get('coords');
                document.getElementById('nav-add').click();
            });
        });
    }

    renderMarkers() {
        Object.values(this.markers).forEach(marker => {
            this.map.geoObjects.remove(marker);
        });
        this.markers = {};

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

            // Create a custom HTML layout for the marker
            const CustomIconLayout = ymaps.templateLayoutFactory.createClass(
                `<div style="font-size: 32px; line-height: 32px; transform: translate(-50%, -50%); cursor: pointer; filter: ${filterStyle}; transition: filter 0.3s ease;">
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
                            [-16, -16], [16, 16]
                        ]
                    },
                    hideIconOnBalloonOpen: false
                }
            );

            placemark.events.add('click', (e) => {
                e.preventDefault();
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
        
        document.getElementById('post-author').textContent = post.username ? `@${post.username}` : '@аноним';
        
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
                await this.loadPosts();
                this.renderMarkers();
                const updatedPost = this.posts.find(p => p.post_id === this.currentPost.post_id);
                if (updatedPost) {
                    this.currentPost = updatedPost;
                    this.updateBottomSheetTimes(updatedPost);
                }
            } else {
                this.showMessage('warning', data.error || 'Ошибка при голосовании');
                btnRelevant.disabled = false;
                btnIrrelevant.disabled = false;
            }
        } catch (error) {
            console.error('Vote error:', error);
            this.showMessage('error', 'Не удалось отправить голос');
            btnRelevant.disabled = false;
            btnIrrelevant.disabled = false;
        }
    }

    showMessage(type, text) {
        const message = document.getElementById('vote-message');
        message.className = `vote-message ${type}`;
        message.textContent = text;
        message.style.display = 'block';
    }

    showError(text) {
        alert(text);
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => { if (loading.parentNode) loading.remove(); }, 300);
        }
    }
}

new DPSMap();