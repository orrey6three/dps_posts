// Admin Panel Management
class AdminPanel {
    constructor() {
        this.posts = [];
        this.currentPost = null;
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        this.initEventListeners();
    }
    
    async checkAuth() {
        try {
            const response = await fetch('/admin/verify', {
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showAdminPanel();
                await this.loadPosts();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showLoginScreen();
        }
    }
    
    initEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Add post
        const addPostBtn = document.getElementById('add-post-btn');
        if (addPostBtn) {
            addPostBtn.addEventListener('click', () => this.showPostModal());
        }
        
        // Modal
        const closeModal = document.getElementById('close-modal');
        const cancelModal = document.getElementById('cancel-modal');
        const postForm = document.getElementById('post-form');
        
        if (closeModal) {
            closeModal.addEventListener('click', () => this.hidePostModal());
        }
        if (cancelModal) {
            cancelModal.addEventListener('click', () => this.hidePostModal());
        }
        if (postForm) {
            postForm.addEventListener('submit', (e) => this.handlePostSubmit(e));
        }
    }
    
    showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('admin-panel').classList.add('hidden');
    }
    
    showAdminPanel() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const password = document.getElementById('password-input').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showAdminPanel();
                await this.loadPosts();
            } else {
                errorDiv.textContent = data.error || 'Неверный пароль';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Ошибка входа';
            errorDiv.classList.remove('hidden');
        }
    }
    
    async handleLogout() {
        try {
            await fetch('/admin/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            this.showLoginScreen();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async loadPosts() {
        const loadingDiv = document.getElementById('admin-loading');
        const postsListDiv = document.getElementById('posts-list');
        
        loadingDiv.classList.remove('hidden');
        
        try {
            const response = await fetch('/admin/posts', {
                credentials: 'include'
            });
            
            const data = await response.json();
            this.posts = data.posts;
            
            this.renderPosts();
        } catch (error) {
            console.error('Error loading posts:', error);
            postsListDiv.innerHTML = '<div class="text-center text-red-400 py-8">Не удалось загрузить посты</div>';
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }
    
    renderPosts() {
        const postsListDiv = document.getElementById('posts-list');
        
        if (this.posts.length === 0) {
            postsListDiv.innerHTML = '<div class="text-center text-gray-400 py-8">Постов пока нет</div>';
            return;
        }
        
        postsListDiv.innerHTML = this.posts.map(post => `
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-bold mb-1">${this.escapeHtml(post.title)}</h3>
                        <p class="text-sm text-gray-400 mb-2">${this.escapeHtml(post.address || 'Адрес не указан')}</p>
                        <p class="text-xs text-gray-500">
                            📍 ${post.latitude.toFixed(4)}, ${post.longitude.toFixed(4)}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button 
                            onclick="adminPanel.editPost('${post.id}')"
                            class="text-blue-400 hover:text-blue-300 p-2"
                            title="Редактировать"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button 
                            onclick="adminPanel.deletePost('${post.id}', '${this.escapeHtml(post.title)}')"
                            class="text-red-400 hover:text-red-300 p-2"
                            title="Удалить"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                ${post.stats ? `
                    <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-400">${post.stats.relevant}</div>
                            <div class="text-xs text-gray-400">Актуально</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-gray-400">${post.stats.irrelevant}</div>
                            <div class="text-xs text-gray-400">Неактуально</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-400">${post.stats.total}</div>
                            <div class="text-xs text-gray-400">Всего</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    showPostModal(post = null) {
        this.currentPost = post;
        
        const modal = document.getElementById('post-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('post-form');
        
        if (post) {
            modalTitle.textContent = 'Редактировать пост';
            document.getElementById('post-id').value = post.id;
            document.getElementById('post-title').value = post.title;
            document.getElementById('post-address').value = post.address || '';
            document.getElementById('post-latitude').value = post.latitude;
            document.getElementById('post-longitude').value = post.longitude;
        } else {
            modalTitle.textContent = 'Добавить пост';
            form.reset();
            document.getElementById('post-id').value = '';
            // Default coordinates for Shumikha
            document.getElementById('post-latitude').value = '55.2317';
            document.getElementById('post-longitude').value = '63.2892';
        }
        
        modal.classList.remove('hidden');
    }
    
    hidePostModal() {
        document.getElementById('post-modal').classList.add('hidden');
        this.currentPost = null;
    }
    
    async handlePostSubmit(e) {
        e.preventDefault();
        
        const postId = document.getElementById('post-id').value;
        const title = document.getElementById('post-title').value;
        const address = document.getElementById('post-address').value;
        const latitude = parseFloat(document.getElementById('post-latitude').value);
        const longitude = parseFloat(document.getElementById('post-longitude').value);
        
        const postData = {
            title,
            address: address || null,
            latitude,
            longitude
        };
        
        try {
            let response;
            
            if (postId) {
                // Update existing post
                response = await fetch(`/admin/posts/${postId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(postData)
                });
            } else {
                // Create new post
                response = await fetch('/admin/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(postData)
                });
            }
            
            if (response.ok) {
                this.hidePostModal();
                await this.loadPosts();
            } else {
                const data = await response.json();
                alert(data.error || 'Ошибка при сохранении');
            }
        } catch (error) {
            console.error('Error saving post:', error);
            alert('Не удалось сохранить пост');
        }
    }
    
    editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            this.showPostModal(post);
        }
    }
    
    async deletePost(postId, postTitle) {
        if (!confirm(`Вы уверены, что хотите удалить пост "${postTitle}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                await this.loadPosts();
            } else {
                const data = await response.json();
                alert(data.error || 'Ошибка при удалении');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Не удалось удалить пост');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin panel
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
