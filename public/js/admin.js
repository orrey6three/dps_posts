class AdminPanel {
    constructor() {
        this.posts = [];
        this.users = [];
        this.currentPost = null;
        this.map = null;
        this.placemark = null;
        this.toastTimer = null;
        this.pendingDelete = null;
        this.currentTab = 'posts';
        this.init();
        window.adminPanel = this;
    }

    showToast(type, text, timeoutMs = 2200) {
        const el = document.getElementById('toast');
        if (!el) return;
        if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
        el.classList.remove('hidden', 'success', 'error', 'warning', 'show');
        el.classList.add(type);
        el.textContent = text;
        requestAnimationFrame(() => el.classList.add('show'));
        this.toastTimer = setTimeout(() => {
            el.classList.remove('show');
            this.toastTimer = setTimeout(() => el.classList.add('hidden'), 220);
        }, timeoutMs);
    }

    async init() {
        await this.checkAuth();
        this.initEventListeners();
        this.initTabs();
    }

    initTabs() {
        document.querySelectorAll('.admin-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('hidden', c.id !== `tab-${tabId}`));
        
        if (tabId === 'posts') this.loadPosts();
        if (tabId === 'users') this.loadUsers();
    }

    async checkAuth() {
        try {
            const response = await fetch('/admin/api/verify', { credentials: 'include' });
            if (response.ok) {
                this.showAdminPanel();
                await this.loadStats();
                await this.loadPosts();
            } else { this.showLoginScreen(); }
        } catch (error) { this.showLoginScreen(); }
    }

    async loadStats() {
        try {
            const res = await fetch('/admin/api/stats', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('stat-posts').textContent = data.total_posts;
                document.getElementById('stat-users').textContent = data.total_users;
                document.getElementById('stat-votes').textContent = data.total_votes;
            }
        } catch (e) {}
    }

    initEventListeners() {
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('add-post-btn')?.addEventListener('click', () => this.showPostModal());
        document.getElementById('close-modal')?.addEventListener('click', () => this.hidePostModal());
        document.getElementById('cancel-modal')?.addEventListener('click', () => this.hidePostModal());
        document.getElementById('post-form')?.addEventListener('submit', (e) => this.handlePostSubmit(e));
        document.getElementById('refresh-users-btn')?.addEventListener('click', () => this.loadUsers());

        // Modal close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hidePostModal();
                this.hideConfirmDelete();
            }
        });

        // Event delegation for posts
        document.getElementById('posts-list')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (action === 'edit') this.editPost(id);
            if (action === 'delete') this.showConfirmDelete('post', id, btn.getAttribute('data-title'));
        });

        // User deletion
        document.getElementById('users-tbody')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-delete-user');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-username');
            this.showConfirmDelete('user', id, name);
        });

        document.getElementById('confirm-delete-cancel')?.addEventListener('click', () => this.hideConfirmDelete());
        document.getElementById('confirm-delete-close')?.addEventListener('click', () => this.hideConfirmDelete());
        document.getElementById('confirm-delete-ok')?.addEventListener('click', () => this.confirmDelete());
    }

    showConfirmDelete(type, id, name) {
        const modal = document.getElementById('confirm-delete-modal');
        this.pendingDelete = { type, id, name };
        document.getElementById('confirm-delete-name').textContent = name || 'Без названия';
        modal.classList.remove('hidden');
    }

    hideConfirmDelete() {
        document.getElementById('confirm-delete-modal').classList.add('hidden');
        this.pendingDelete = null;
    }

    async confirmDelete() {
        if (!this.pendingDelete) return;
        const { type, id } = this.pendingDelete;
        const endpoint = type === 'user' ? `/admin/api/users/${id}` : `/admin/api/posts/${id}`;
        try {
            const res = await fetch(endpoint, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                this.showToast('success', 'Удалено успешно');
                if (type === 'user') this.loadUsers(); else this.loadPosts();
                this.loadStats();
            } else { this.showToast('error', 'Ошибка удаления'); }
        } catch (e) { this.showToast('error', 'Ошибка сети'); }
        this.hideConfirmDelete();
    }

    showPostModal(post = null) {
        this.currentPost = post;
        const modal = document.getElementById('post-modal');
        document.getElementById('modal-title-text').textContent = post ? 'Редактировать метку' : 'Добавить метку';
        
        if (post) {
            document.getElementById('post-id').value = post.id;
            document.getElementById('post-type-select').value = post.type;
            document.getElementById('post-address').value = post.address || '';
            document.getElementById('post-latitude').value = post.latitude;
            document.getElementById('post-longitude').value = post.longitude;
            document.getElementById('post-comment-admin').value = post.comment || '';
        } else {
            document.getElementById('post-form').reset();
            document.getElementById('post-id').value = '';
            document.getElementById('post-latitude').value = 55.2317;
            document.getElementById('post-longitude').value = 63.2892;
        }

        modal.classList.remove('hidden');
        this.initModalMap([parseFloat(document.getElementById('post-latitude').value), parseFloat(document.getElementById('post-longitude').value)]);
    }

    hidePostModal() { document.getElementById('post-modal').classList.add('hidden'); }

    initModalMap(coords) {
        ymaps.ready(() => {
            if (!this.map) {
                this.map = new ymaps.Map('modal-map', { center: coords, zoom: 14, controls: ['zoomControl'] });
                this.placemark = new ymaps.Placemark(coords, {}, { preset: 'islands#redDotIcon', draggable: true });
                this.map.events.add('click', (e) => {
                    const newCoords = e.get('coords');
                    this.updateCoordsFields(newCoords);
                });
                this.placemark.events.add('dragend', () => {
                    this.updateCoordsFields(this.placemark.geometry.getCoordinates());
                });
                this.map.geoObjects.add(this.placemark);
            } else {
                this.placemark.geometry.setCoordinates(coords);
                this.map.setCenter(coords);
            }
            setTimeout(() => this.map.container.fitToViewport(), 100);
        });
    }

    updateCoordsFields(coords) {
        document.getElementById('post-latitude').value = coords[0].toFixed(6);
        document.getElementById('post-longitude').value = coords[1].toFixed(6);
        this.placemark.geometry.setCoordinates(coords);
        ymaps.geocode(coords).then(res => {
            const addr = res.geoObjects.get(0)?.getAddressLine();
            if (addr) document.getElementById('post-address').value = addr;
        });
    }

    async loadPosts() {
        const loading = document.getElementById('admin-loading');
        loading.classList.remove('hidden');
        try {
            const res = await fetch('/admin/api/posts', { credentials: 'include' });
            const data = await res.json();
            this.posts = data.posts;
            this.renderPosts();
        } finally { loading.classList.add('hidden'); }
    }

    renderPosts() {
        const list = document.getElementById('posts-list');
        if (this.posts.length === 0) { list.innerHTML = '<div class="empty-state">Нет меток</div>'; return; }
        list.innerHTML = this.posts.map(p => `
            <div class="post-card">
                <div class="post-card-header">
                    <div class="post-card-info">
                        <h3>${this.escapeHtml(p.title)} <span class="badge ${p.type}">${p.type}</span></h3>
                        <p class="post-address">${this.escapeHtml(p.address || 'Без адреса')}</p>
                    </div>
                    <div class="post-card-actions">
                        <button class="btn-icon edit" data-action="edit" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete" data-action="delete" data-id="${p.id}" data-title="${p.title}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                ${p.stats ? `
                <div class="post-stats">
                    <div class="stat-mini"><span class="val green">${p.stats.relevant}</span> Актуально</div>
                    <div class="stat-mini"><span class="val gray">${p.stats.irrelevant}</span> Старых</div>
                </div>` : ''}
            </div>
        `).join('');
    }

    async loadUsers() {
        const loading = document.getElementById('users-loading');
        loading.classList.remove('hidden');
        try {
            const res = await fetch('/admin/api/users', { credentials: 'include' });
            const data = await res.json();
            this.users = data.users;
            this.renderUsers();
        } finally { loading.classList.add('hidden'); }
    }

    renderUsers() {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = this.users.map(u => `
            <tr>
                <td><strong>${this.escapeHtml(u.username)}</strong></td>
                <td><span class="badge ${u.role}">${u.role}</span></td>
                <td>${u.post_count}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    ${u.role !== 'admin' ? `<button class="btn-icon delete btn-delete-user" data-id="${u.id}" data-username="${u.username}"><i class="fa-solid fa-user-minus"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    async handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password-input').value;
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password }),
            credentials: 'include'
        });
        if (res.ok) { this.showAdminPanel(); await this.loadStats(); await this.loadPosts(); }
        else { const err = document.getElementById('login-error'); err.textContent = 'Ошибка входа'; err.classList.remove('hidden'); }
    }

    async handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        this.showLoginScreen();
    }

    async handlePostSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('post-id').value;
        const data = {
            title: document.getElementById('post-type-select').value,
            type: document.getElementById('post-type-select').value,
            address: document.getElementById('post-address').value,
            latitude: parseFloat(document.getElementById('post-latitude').value),
            longitude: parseFloat(document.getElementById('post-longitude').value),
            comment: document.getElementById('post-comment-admin').value
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/admin/api/posts/${id}` : '/admin/api/posts';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
        if (res.ok) { this.hidePostModal(); this.loadPosts(); this.loadStats(); this.showToast('success', 'Сохранено'); }
        else { this.showToast('error', 'Ошибка сохранения'); }
    }

    editPost(id) { const p = this.posts.find(x => x.id === id); if (p) this.showPostModal(p); }
    escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    showLoginScreen() { document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('admin-panel').classList.add('hidden'); }
    showAdminPanel() { document.getElementById('login-screen').classList.add('hidden'); document.getElementById('admin-panel').classList.remove('hidden'); }
}

new AdminPanel();