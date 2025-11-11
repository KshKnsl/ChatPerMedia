import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

const API_BASE = API_BASE_URL + '/api';

class ApiClient {
  constructor() {
    this.token = null;
    this.onLogout = null;
  }

  setToken(token) {
    this.token = token;
  }

  setLogoutHandler(handler) {
    this.onLogout = handler;
  }

  getHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  handleError(error, customMessage) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      if (this.onLogout) this.onLogout();
      return true;
    }
    
    const errorMsg = customMessage || error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
    toast.error(errorMsg);
    return false;
  }

  async get(url, options = {}) {
    try {
      const response = await axios.get(`${API_BASE}${url}`, {
        headers: this.getHeaders(),
        ...options
      });
      return { data: response.data, error: null };
    } catch (error) {
      this.handleError(error, options.errorMessage);
      return { data: null, error };
    }
  }

  async post(url, body, options = {}) {
    try {
      const response = await axios.post(`${API_BASE}${url}`, body, {
        headers: { ...this.getHeaders(), ...options.headers },
        ...options
      });
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      return { data: response.data, error: null };
    } catch (error) {
      this.handleError(error, options.errorMessage);
      return { data: null, error };
    }
  }

  async put(url, body, options = {}) {
    try {
      const response = await axios.put(`${API_BASE}${url}`, body, {
        headers: this.getHeaders(),
        ...options
      });
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      return { data: response.data, error: null };
    } catch (error) {
      this.handleError(error, options.errorMessage);
      return { data: null, error };
    }
  }

  async delete(url, options = {}) {
    try {
      const response = await axios.delete(`${API_BASE}${url}`, {
        headers: this.getHeaders(),
        ...options
      });
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      return { data: response.data, error: null };
    } catch (error) {
      this.handleError(error, options.errorMessage);
      return { data: null, error };
    }
  }

  async fetchWithLoading(url, setLoading, options = {}) {
    setLoading(true);
    const result = await this.get(url, options);
    setLoading(false);
    return result;
  }

  async postWithLoading(url, body, setLoading, options = {}) {
    setLoading(true);
    const result = await this.post(url, body, options);
    setLoading(false);
    return result;
  }
}
export const api = new ApiClient();
export const uploadFile = async (url, formData, token, options = {}) => {
  try {
    const response = await axios.post(`${API_BASE}${url}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: token ? `Bearer ${token}` : undefined
      },
      ...options
    });
    if (options.successMessage) {
      toast.success(options.successMessage);
    }
    return { data: response.data, error: null };
  } catch (error) {
    const errorMsg = options.errorMessage || error.response?.data?.error || error.message;
    toast.error(errorMsg);
    return { data: null, error };
  }
};
