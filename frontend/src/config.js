const isDevelopment = import.meta.env.DEV;

const devHost = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';

export const API_BASE_URL = isDevelopment ? `http://${devHost}:3001` : '';
export const MICROSERVICE_URL = isDevelopment ? `http://${devHost}:5000` : '';
export const SOCKET_URL = isDevelopment ? `http://${devHost}:3001` : '';
