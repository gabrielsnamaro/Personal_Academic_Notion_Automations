import { apiClient } from '../lib/axios';

/**
 * Autentica o usuário com o token OAuth do Google.
 * @param {string} accessToken Token retornado pelo `useGoogleLogin`
 * @returns {Promise<Object>} Payload da sessão com `token` e `user`
 */
export async function loginWithGoogle(accessToken) {
  // A própria instância desempacota o .data
  return await apiClient.post('/auth/google', {
    access_token: accessToken,
  });
}
