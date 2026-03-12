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

function isStale(timestamp) {
    if (!timestamp) return true;
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return new Date(timestamp) < sixHoursAgo;
}

// Yandex Maps Application
class DPSMap {
    constructor() {
        this.map = null;
        this.markers = {};
        this.posts = [];
        this.currentPost = null;
        this.deviceId = getDeviceId();
        this.realtimeChannel = null;

        this.init();
    }

    async init() {
        await this.loadPosts();
        this.initMap();
        this.initBottomSheet();
        this.initRealtime();
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
                    console.log('[Realtime] Новый голос:', payload.new);

                    // Перезагружаем посты
                    await this.loadPosts();
                    this.renderMarkers();

                    // Если открыт bottom sheet этого поста — обновить без закрытия
                    if (this.currentPost && this.currentPost.post_id === payload.new.post_id) {
                        const updatedPost = this.posts.find(p => p.post_id === payload.new.post_id);
                        if (updatedPost) {
                            this.currentPost = updatedPost;
                            this.updateBottomSheetTimes(updatedPost);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Статус подключения:', status);
            });
    }

    // Обновляет только время в bottom sheet без полного перерендера
    updateBottomSheetTimes(post) {
        const relevantTime = document.getElementById('relevant-time');
        const irrelevantTime = document.getElementById('irrelevant-time');
        if (!relevantTime || !irrelevantTime) return;

        relevantTime.textContent = formatTimeAgo(post.last_relevant);
        irrelevantTime.textContent = formatTimeAgo(post.last_irrelevant);

        relevantTime.className = 'status-time';
        irrelevantTime.className = 'status-time';

        if (isStale(post.last_relevant)) relevantTime.classList.add('stale');
        if (isStale(post.last_irrelevant)) irrelevantTime.classList.add('stale');
        if (!post.last_relevant) relevantTime.classList.add('no-data');
        if (!post.last_irrelevant) irrelevantTime.classList.add('no-data');
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

            this.map.events.add('click', () => {
                document.getElementById('bottom-sheet').classList.remove('active');
            });
        });
    }

    renderMarkers() {
        Object.values(this.markers).forEach(marker => {
            this.map.geoObjects.remove(marker);
        });
        this.markers = {};

        this.posts.forEach(post => {
            const markerClass = this.getMarkerClass(post);
            const markerColor = this.getMarkerColor(markerClass);

            const placemark = new ymaps.Placemark(
                [post.latitude, post.longitude],
                {
                    hintContent: post.title,
                    balloonContent: `<strong>${post.title}</strong><br>${post.address || ''}`
                },
                {
                    preset: markerColor,
                    iconColor: this.getIconColor(markerClass),
                    hideIconOnBalloonOpen: false
                }
            );

            placemark.events.add('click', (e) => {
                e.preventDefault();
                this.showPostDetails(post);
            });

            this.map.geoObjects.add(placemark);
            this.markers[post.post_id] = placemark;
        });
    }

    getMarkerClass(post) {
        const lastRelevant = post.last_relevant ? new Date(post.last_relevant) : null;
        const lastIrrelevant = post.last_irrelevant ? new Date(post.last_irrelevant) : null;

        const lastActivity = post.last_activity ? new Date(post.last_activity) : null;
        if (!lastActivity || isStale(post.last_activity)) {
            return 'marker-stale';
        }

        if (lastRelevant && (!lastIrrelevant || lastRelevant > lastIrrelevant)) {
            return 'marker-relevant';
        }

        if (lastIrrelevant && (!lastRelevant || lastIrrelevant > lastRelevant)) {
            return 'marker-irrelevant';
        }

        return 'marker-stale';
    }

    getMarkerColor(markerClass) {
        if (markerClass === 'marker-relevant') return 'islands#redIcon';
        if (markerClass === 'marker-irrelevant') return 'islands#grayIcon';
        return 'islands#darkGrayIcon';
    }

    getIconColor(markerClass) {
        if (markerClass === 'marker-relevant') return '#f43f5e';
        if (markerClass === 'marker-irrelevant') return '#64748b';
        return '#475569';
    }

    showPostDetails(post) {
        this.currentPost = post;

        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-address').textContent = post.address || 'Адрес не указан';

        this.updateBottomSheetTimes(post);

        document.getElementById('btn-relevant').disabled = false;
        document.getElementById('btn-irrelevant').disabled = false;

        const message = document.getElementById('vote-message');
        message.className = 'vote-message';
        message.style.display = 'none';

        document.getElementById('bottom-sheet').classList.add('active');

        this.map.panTo([post.latitude, post.longitude], {
            flying: true,
            duration: 500
        });
    }

    initBottomSheet() {
        const btnRelevant = document.getElementById('btn-relevant');
        const btnIrrelevant = document.getElementById('btn-irrelevant');

        btnRelevant.addEventListener('click', () => this.vote('relevant'));
        btnIrrelevant.addEventListener('click', () => this.vote('irrelevant'));
    }

    async vote(voteType) {
        if (!this.currentPost) return;

        const btnRelevant = document.getElementById('btn-relevant');
        const btnIrrelevant = document.getElementById('btn-irrelevant');
        const message = document.getElementById('vote-message');

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
                // Realtime сам обновит маркеры и bottom sheet у всех
                // Локально тоже обновим сразу для быстрого отклика
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