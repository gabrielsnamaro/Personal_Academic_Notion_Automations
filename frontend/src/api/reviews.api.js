import { apiClient } from '../lib/axios';

/**
 * Envia um lote de disciplinas para gerar revisões espaçadas no Notion.
 * @param {Array<{subject: string, activities: string[]}>} batches 
 * @param {string} formalizationDate Data base do estudo YYYY-MM-DD
 * @returns {Promise<Object>} Resposta com a mensagem de sucesso
 */
export async function scheduleReviews(batches, formalizationDate) {
  return await apiClient.post('/notion/reviews', {
    batches,
    formalizationDate,
  });
}

/**
 * Busca as revisões espaçadas ativas/pendentes na página.
 * @returns {Promise<Object>} Lista contendo as { reviews }
 */
export async function getScheduledReviews() {
  return await apiClient.get('/notion/reviews');
}
