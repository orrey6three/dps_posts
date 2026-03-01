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
        
        this.init();
    }
    
    async init() {
        await this.loadPosts();
        this.initMap();
        this.initBottomSheet();
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
    
    initMap() {
        // Wait for Yandex Maps API to load
        ymaps.ready(() => {
            // Initialize map centered on Shumikha, Kurgan Oblast
            this.map = new ymaps.Map('map', {
                center: [55.2317, 63.2892],
                zoom: 13,
                controls: ['zoomControl', 'geolocationControl']
            }, {
                searchControlProvider: 'yandex#search',
                suppressMapOpenBlock: true
            });
            
            // Render markers
            this.renderMarkers();
            
            // Hide loading
            this.hideLoading();
            
            // Close bottom sheet on map click
            this.map.events.add('click', () => {
                document.getElementById('bottom-sheet').classList.remove('active');
            });
        });
    }
    
    renderMarkers() {
        // Clear existing markers
        Object.values(this.markers).forEach(marker => {
            this.map.geoObjects.remove(marker);
        });
        this.markers = {};
        
        // Add markers for each post
        this.posts.forEach(post => {
            const markerClass = this.getMarkerClass(post);
            const markerColor = this.getMarkerColor(markerClass);
            
            // Create placemark (marker)
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
            
            // Add click handler
            placemark.events.add('click', (e) => {
                e.preventDefault();
                this.showPostDetails(post);
            });
            
            // Add to map
            this.map.geoObjects.add(placemark);
            
            // Store reference
            this.markers[post.post_id] = placemark;
        });
    }
    
    getMarkerClass(post) {
        const lastRelevant = post.last_relevant ? new Date(post.last_relevant) : null;
        const lastIrrelevant = post.last_irrelevant ? new Date(post.last_irrelevant) : null;
        
        // Check if stale (no activity in 6 hours)
        const lastActivity = post.last_activity ? new Date(post.last_activity) : null;
        if (!lastActivity || isStale(post.last_activity)) {
            return 'marker-stale';
        }
        
        // Relevant is more recent
        if (lastRelevant && (!lastIrrelevant || lastRelevant > lastIrrelevant)) {
            return 'marker-relevant';
        }
        
        // Irrelevant is more recent
        if (lastIrrelevant && (!lastRelevant || lastIrrelevant > lastRelevant)) {
            return 'marker-irrelevant';
        }
        
        return 'marker-stale';
    }
    
    getMarkerColor(markerClass) {
        if (markerClass === 'marker-relevant') {
            return 'islands#redIcon';
        } else if (markerClass === 'marker-irrelevant') {
            return 'islands#grayIcon';
        } else {
            return 'islands#darkGrayIcon';
        }
    }
    
    getIconColor(markerClass) {
        if (markerClass === 'marker-relevant') {
            return '#ef4444';
        } else if (markerClass === 'marker-irrelevant') {
            return '#6b7280';
        } else {
            return '#4b5563';
        }
    }
    
    showPostDetails(post) {
        this.currentPost = post;
        
        // Update post info
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('post-address').textContent = post.address || 'Адрес не указан';
        
        // Update status times
        const relevantTime = document.getElementById('relevant-time');
        const irrelevantTime = document.getElementById('irrelevant-time');
        
        relevantTime.textContent = formatTimeAgo(post.last_relevant);
        irrelevantTime.textContent = formatTimeAgo(post.last_irrelevant);
        
        // Add stale class if needed
        relevantTime.className = 'status-time';
        irrelevantTime.className = 'status-time';
        
        if (isStale(post.last_relevant)) {
            relevantTime.classList.add('stale');
        }
        if (isStale(post.last_irrelevant)) {
            irrelevantTime.classList.add('stale');
        }
        if (!post.last_relevant) {
            relevantTime.classList.add('no-data');
        }
        if (!post.last_irrelevant) {
            irrelevantTime.classList.add('no-data');
        }
        
        // Reset buttons
        document.getElementById('btn-relevant').disabled = false;
        document.getElementById('btn-irrelevant').disabled = false;
        
        // Hide message
        const message = document.getElementById('vote-message');
        message.className = 'vote-message';
        message.style.display = 'none';
        
        // Show bottom sheet
        document.getElementById('bottom-sheet').classList.add('active');
        
        // Center map on marker with smooth animation
        this.map.panTo([post.latitude, post.longitude], {
            flying: true,
            duration: 500
        });
    }
    
    initBottomSheet() {
        const sheet = document.getElementById('bottom-sheet');
        const btnRelevant = document.getElementById('btn-relevant');
        const btnIrrelevant = document.getElementById('btn-irrelevant');
        
        // Vote buttons
        btnRelevant.addEventListener('click', () => this.vote('relevant'));
        btnIrrelevant.addEventListener('click', () => this.vote('irrelevant'));
    }
    
    async vote(voteType) {
        if (!this.currentPost) return;
        
        const btnRelevant = document.getElementById('btn-relevant');
        const btnIrrelevant = document.getElementById('btn-irrelevant');
        const message = document.getElementById('vote-message');
        
        // Disable buttons
        btnRelevant.disabled = true;
        btnIrrelevant.disabled = true;
        
        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: this.currentPost.post_id,
                    device_id: this.deviceId,
                    vote_type: voteType
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('success', data.message || 'Голос принят!');
                
                // Reload posts to update UI
                setTimeout(async () => {
                    await this.loadPosts();
                    this.renderMarkers();
                    // Update current post details
                    const updatedPost = this.posts.find(p => p.post_id === this.currentPost.post_id);
                    if (updatedPost) {
                        this.showPostDetails(updatedPost);
                    }
                }, 500);
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
            setTimeout(() => {
                if (loading.parentNode) {
                    loading.remove();
                }
            }, 300);
        }
    }
}

// Initialize app
new DPSMap();
