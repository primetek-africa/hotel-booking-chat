import { io } from "socket.io-client";
import { getToken } from './api.js';

let socket = null;

// Lazy singleton: created the first time any component asks for it
export function getSocket() {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL, {
            // A function, so every (re)connection send the latest token
            auth: (cb) => cb({ 
                token: getToken(), 
                apikey: import.meta.env.VITE_API_KEY 
            }),
        });
    }
    return socket;
}

export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
}

// Emit + ack as a Promise: resolve on { success: true }, rejects otherwise
export function emitAsync(event, payload) {
    return new Promise((resolve, reject) => {
        getSocket()
            .timeout(5000)
            .emit(event, payload, (err, res) => {
                if(err) return reject(new Error('The server did not respond.'));
                if (!res.success) return reject(new Error(res.message));
                resolve(res);
            });
    });
}