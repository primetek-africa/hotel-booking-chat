const BASE = `${import.meta.env.VITE_API_URL}/api/v1`;
const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) =>
    token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
    const token = getToken();

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_API_KEY,
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    // The API rotates the JWT on every protected request: keep the newest one
    const rotated = res.headers.get('X-Access-Token');
    if (rotated) setToken(rotated);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = new Error(data.message || 'Request failed');
        err.status = res.status;
        throw err;
    }

    return data;
}