/**
 * Centraliza a leitura das variáveis de ambiente no Frontend.
 * Nenhum componente deve ler import.meta.env diretamente para facilitar
 * testes, migrações de bundler (Vite -> Webpack) e tipagem centralizada.
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

