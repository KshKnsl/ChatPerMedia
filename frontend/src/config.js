const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment ? 'http://localhost:3001' : '';
export const MICROSERVICE_URL = isDevelopment ? 'http://localhost:5000' : '';
export const SOCKET_URL = isDevelopment ? 'http://localhost:3001' : '';
