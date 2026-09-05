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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Resposta:
 * Desempacota a propriedade `data` por padrão e faz logs/formatação de erro, se necessário.
 */
apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Retorna direto o conteúdo útil
  },
  (error) => {
    // Permite log centralizado de erros globais (ex: 401 para redirecionar ao login)
    return Promise.reject(error);
  }
);
