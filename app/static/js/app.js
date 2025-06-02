// Gerenciamento de estado global
window.appState = {
    loading: false,
    notifications: []
};

// Alpine.js data store
document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        loading: false,
        setLoading(value) {
            this.loading = value;
        }
    });
});

// Interceptadores de eventos
document.addEventListener('DOMContentLoaded', () => {
    // Intercepta submits de formulário
    document.addEventListener('submit', (e) => {
        const form = e.target;
        if (!form.hasAttribute('data-no-loading')) {
            Alpine.store('app').setLoading(true);
        }
    });

    // Intercepta cliques em links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && !link.hasAttribute('data-no-loading')) {
            Alpine.store('app').setLoading(true);
        }
    });

    // Intercepta requisições AJAX
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        try {
            Alpine.store('app').setLoading(true);
            const response = await originalFetch(...args);
            return response;
        } finally {
            Alpine.store('app').setLoading(false);
        }
    };
});

// Utilitários de notificação
window.notify = {
    show(message, type = 'info', duration = 5000) {
        const id = Date.now();
        const notification = { id, message, type };
        
        appState.notifications.push(notification);
        document.dispatchEvent(new CustomEvent('notification:new', { detail: notification }));

        if (duration > 0) {
            setTimeout(() => this.hide(id), duration);
        }
        
        return id;
    },
    
    hide(id) {
        const index = appState.notifications.findIndex(n => n.id === id);
        if (index > -1) {
            appState.notifications.splice(index, 1);
            document.dispatchEvent(new CustomEvent('notification:remove', { detail: { id } }));
        }
    },
    
    success(message, duration) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        return this.show(message, 'error', duration);
    },
    
    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};
