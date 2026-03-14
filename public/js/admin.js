class AdminPanel {
    constructor() {
        this.posts = [];
        this.currentPost = null;
        this.map = null;
        this.placemark = null;
        this.toastTimer = null;
        this.pendingDelete = null;
        this.init();
        window.adminPanel = this;
    }

    showToast(type, text, timeoutMs = 2200) {
        const el = document.getElementById('toast');
        if (!el) return;

        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
            this.toastTimer = null;
        }

        el.classList.remove('hidden', 'success', 'error', 'warning', 'show');
        el.classList.add(type);
        el.textContent = text;

        // next frame to ensure transition
        requestAnimationFrame(() => el.classList.add('show'));

        this.toastTimer = setTimeout(() => {
            el.classList.remove('show');
            this.toastTimer = setTimeout(() => el.classList.add('hidden'), 220);
        }, timeoutMs);
    }

    async init() {
        await this.checkAuth();
        this.initEventListeners();
    }

    async checkAuth() {
        try {
            const response = await fetch('/admin/api/verify', { credentials: 'include' });
            if (response.ok) {
                this.showAdminPanel();
                await this.loadPosts();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            this.showLoginScreen();
        }
    }

    initEventListeners() {
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('add-post-btn')?.addEventListener('click', () => this.showPostModal());
        document.getElementById('close-modal')?.addEventListener('click', () => this.hidePostModal());
        document.getElementById('cancel-modal')?.addEventListener('click', () => this.hidePostModal());
        document.getElementById('post-form')?.addEventListener('submit', (e) => this.handlePostSubmit(e));

        // Confirm delete modal
        document.getElementById('confirm-delete-cancel')?.addEventListener('click', () => this.hideConfirmDelete());
        document.getElementById('confirm-delete-close')?.addEventListener('click', () => this.hideConfirmDelete());
        document.getElementById('confirm-delete-ok')?.addEventListener('click', () => this.confirmDelete());
        document.getElementById('confirm-delete-modal')?.addEventListener('click', (e) => {
            if (e.target?.id === 'confirm-delete-modal') this.hideConfirmDelete();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideConfirmDelete();
        });

        // Event delegation for dynamically rendered post cards
        document.getElementById('posts-list')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const postId = btn.getAttribute('data-id');
            if (!postId) return;

            if (action === 'edit') {
                this.editPost(postId);
                return;
            }

            if (action === 'delete') {
                const title = btn.getAttribute('data-title') || '';
                this.showConfirmDelete(postId, title);
            }
        });
    }

    showConfirmDelete(postId, title) {
        const modal = document.getElementById('confirm-delete-modal');
        const name = document.getElementById('confirm-delete-name');
        const okBtn = document.getElementById('confirm-delete-ok');
        if (!modal || !name || !okBtn) return;

        this.pendingDelete = { postId, title };
        name.textContent = title || 'Без названия';
        okBtn.disabled = false;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => okBtn.focus?.());
    }

    hideConfirmDelete() {
        const modal = document.getElementById('confirm-delete-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        this.pendingDelete = null;
    }

    async confirmDelete() {
        if (!this.pendingDelete) return;
        const okBtn = document.getElementById('confirm-delete-ok');
        if (okBtn) okBtn.disabled = true;

        const { postId, title } = this.pendingDelete;
        await this.deletePost(postId, title);
        this.hideConfirmDelete();
    }

    initModalMap(coords) {
        if (typeof ymaps === 'undefined' || !ymaps.Map) {
            this.showToast('error', 'Карта Яндекс не загрузилась');
            return;
        }

        // Создаём карту один раз и переиспользуем
        if (!this.map) {
            this.map = new ymaps.Map('modal-map', {
                center: coords,
                zoom: 14,
                controls: ['zoomControl']
            });

            this.placemark = new ymaps.Placemark(coords, {}, {
                preset: 'islands#redDotIcon',
                draggable: true
            });

            this.map.events.add('click', (e) => {
                const newCoords = e.get('coords');
                this.updateCoordsFields(newCoords);
            });

            this.placemark.events.add('dragend', () => {
                const newCoords = this.placemark.geometry.getCoordinates();
                this.updateCoordsFields(newCoords);
            });

            this.map.geoObjects.add(this.placemark);
        } else if (this.placemark) {
            this.placemark.geometry.setCoordinates(coords);
            this.map.setCenter(coords);
        }

        this.map.setZoom(14);
        // Подгоняем размер после того, как модалка уже показана
        setTimeout(() => {
            try {
                this.map.container.fitToViewport();
            } catch {}
        }, 0);
    }

    showPostModal(post = null) {
        this.currentPost = post;
        const modal = document.getElementById('post-modal');
        const form = document.getElementById('post-form');

        const lat = post ? post.latitude : 55.2317;
        const lon = post ? post.longitude : 63.2892;

        if (post) {
            document.getElementById('modal-title').textContent = 'Редактировать пост';
            document.getElementById('post-id').value = post.id;
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-address').value = post.address || '';
            document.getElementById('post-latitude').value = post.latitude;
            document.getElementById('post-longitude').value = post.longitude;
        } else {
            document.getElementById('modal-title').textContent = 'Добавить пост';
            form.reset();
            document.getElementById('post-id').value = '';
            document.getElementById('post-latitude').value = lat;
            document.getElementById('post-longitude').value = lon;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        ymaps.ready(() => {
            requestAnimationFrame(() => {
                setTimeout(() => this.initModalMap([lat, lon]), 300);
            });
        });
    }

    hidePostModal() {
        const modal = document.getElementById('post-modal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    updateCoordsFields(coords) {
        document.getElementById('post-latitude').value = coords[0].toFixed(6);
        document.getElementById('post-longitude').value = coords[1].toFixed(6);
        if (this.placemark) this.placemark.geometry.setCoordinates(coords);
        this.fetchAddressByCoords(coords);
    }

    fetchAddressByCoords(coords) {
        if (typeof ymaps === 'undefined' || !ymaps.geocode) return;

        ymaps.geocode(coords).then((res) => {
            const geoObject = res.geoObjects.get(0);
            if (geoObject) {
                const address = geoObject.getAddressLine();
                if (address) document.getElementById('post-address').value = address;
            }
        }).catch(() => {});
    }

    async loadPosts() {
        const loadingDiv = document.getElementById('admin-loading');
        loadingDiv.classList.remove('hidden');
        try {
            const response = await fetch('/admin/api/posts', { credentials: 'include' });
            const data = await response.json();
            this.posts = data.posts;
            this.renderPosts();
        } catch (error) {
            console.error(error);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    renderPosts() {
        const postsListDiv = document.getElementById('posts-list');
        if (this.posts.length === 0) {
            postsListDiv.innerHTML = '<div class="empty-state">Постов пока нет</div>';
            return;
        }

        postsListDiv.innerHTML = this.posts.map(post => `
            <div class="post-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                    <div style="flex: 1;">
                        <h3>${this.escapeHtml(post.title)}</h3>
                        <p class="post-address">${this.escapeHtml(post.address || 'Адрес не указан')}</p>
                        <p class="post-coords">📍 ${post.latitude.toFixed(4)}, ${post.longitude.toFixed(4)}</p>
                    </div>
                    <div class="post-card-actions">
                        <button class="btn-edit" data-action="edit" data-id="${this.escapeHtml(post.id)}" title="Редактировать">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="btn-delete" data-action="delete" data-id="${this.escapeHtml(post.id)}" data-title="${this.escapeHtml(post.title)}" title="Удалить">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>
                ${post.stats ? `
                    <div class="post-stats">
                        <div class="post-stat"><div class="post-stat-value green">${post.stats.relevant}</div><div class="post-stat-label">Актуально</div></div>
                        <div class="post-stat"><div class="post-stat-value gray">${post.stats.irrelevant}</div><div class="post-stat-label">Неактуально</div></div>
                        <div class="post-stat"><div class="post-stat-value blue">${post.stats.total}</div><div class="post-stat-label">Всего</div></div>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password-input').value;
        const errorDiv = document.getElementById('login-error');
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: 'admin', password })
            });
            if (response.ok) { this.showAdminPanel(); await this.loadPosts(); }
            else { errorDiv.textContent = 'Неверный пароль'; errorDiv.classList.remove('hidden'); }
        } catch (error) { errorDiv.textContent = 'Ошибка входа'; errorDiv.classList.remove('hidden'); }
    }

    async handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        this.showLoginScreen();
    }

    async handlePostSubmit(e) {
        e.preventDefault();
        const postId = document.getElementById('post-id').value;
        const postData = {
            title: document.getElementById('post-title').value,
            address: document.getElementById('post-address').value || null,
            latitude: parseFloat(document.getElementById('post-latitude').value),
            longitude: parseFloat(document.getElementById('post-longitude').value)
        };
        const method = postId ? 'PUT' : 'POST';
        const url = postId ? `/admin/api/posts/${postId}` : '/admin/api/posts';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(postData)
        });
        if (response.ok) {
            this.hidePostModal();
            await this.loadPosts();
            this.showToast('success', postId ? 'Пост обновлён' : 'Пост добавлен');
        } else {
            this.showToast('error', 'Не удалось сохранить');
        }
    }

    editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post) this.showPostModal(post);
    }

    async deletePost(postId, title) {
        const res = await fetch(`/admin/api/posts/${postId}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
            await this.loadPosts();
            this.showToast('success', 'Пост удалён');
        } else {
            this.showToast('error', 'Не удалось удалить');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoginScreen() { document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('admin-panel').classList.add('hidden'); }
    showAdminPanel() { document.getElementById('login-screen').classList.add('hidden'); document.getElementById('admin-panel').classList.remove('hidden'); }
}

new AdminPanel();