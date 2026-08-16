'use strict';

class DOS95ApiClient {
    constructor() {
        this.bootstrapPromise = null;
    }

    async bootstrap(force = false) {
        if (force || !this.bootstrapPromise) {
            this.bootstrapPromise = fetch('/api/bootstrap', {
                method: 'GET',
                cache: 'no-store',
                credentials: 'same-origin'
            }).then(async (response) => {
                if (!response.ok) throw new Error('Не удалось инициализировать защищённое соединение');
                return response.json();
            });
        }
        return this.bootstrapPromise;
    }

    async fetch(resource, options = {}, retry = true) {
        const method = String(options.method || 'GET').toUpperCase();
        const headers = new Headers(options.headers || {});
        if (method !== 'GET' && method !== 'HEAD') {
            const bootstrap = await this.bootstrap();
            headers.set('X-DOS95-Token', bootstrap.apiToken);
        }
        const response = await fetch(resource, {
            ...options,
            method,
            headers,
            credentials: 'same-origin'
        });
        if (response.status === 403 && retry && method !== 'GET' && method !== 'HEAD') {
            await this.bootstrap(true);
            return this.fetch(resource, options, false);
        }
        return response;
    }
}

window.dos95Api = new DOS95ApiClient();
