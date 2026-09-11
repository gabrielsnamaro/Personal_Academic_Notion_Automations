import axios from 'axios';
import { API_URL } from '../config';

/**
 * Instância configurada do Axios para uso centralizado na aplicação.
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de Requisição:
 * Puxa o token de forma automática e anexa em toda requisição que sair pelo apiClient.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log(`[Frontend API] 🚀 Disparando ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`, {
      params: config.params,
      body: config.data,
    });
    return config;
  },
  (error) => {
    console.error('[Frontend API] ❌ Erro ao configurar requisição:', error);
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Resposta:
 * Desempacota a propriedade `data` por padrão e faz logs/formatação de erro, se necessário.
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[Frontend API] ✅ Resposta recebida ${response.config.method?.toUpperCase()} ${response.config.url} (Status: ${response.status})`, response.data);
    return response.data; // Retorna direto o conteúdo útil
  },
  (error) => {
    console.error(`[Frontend API] ❌ Falha na requisição ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

