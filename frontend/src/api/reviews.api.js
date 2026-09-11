import { apiClient } from '../lib/axios';

const ACTIVE_REVIEWS_CACHE_KEY = 'notion_active_reviews_cache';

/**
 * Lê o cache de ciclos de revisão armazenado no sessionStorage da aba atual.
 * @returns {Object|null} Dados do ciclo em cache ou null se não houver ou estiver corrompido
 */
export function getReviewCyclesCache() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_REVIEWS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Falha ao ler cache de sessão dos ciclos de revisão:', err);
    return null;
  }
}

/**
 * Salva os ciclos de revisão no sessionStorage da aba atual.
 * @param {Object} data 
 */
export function setReviewCyclesCache(data) {
  try {
    if (data) {
      sessionStorage.setItem(ACTIVE_REVIEWS_CACHE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Falha ao persistir cache de sessão dos ciclos de revisão:', err);
  }
}

/**
 * Remove o cache de ciclos de revisão do sessionStorage da aba atual.
 */
export function clearReviewCyclesCache() {
  try {
    sessionStorage.removeItem(ACTIVE_REVIEWS_CACHE_KEY);
  } catch (err) {
    console.warn('Falha ao limpar cache de sessão dos ciclos de revisão:', err);
  }
}

/**
 * Envia um lote de disciplinas para gerar revisões espaçadas no Notion.
 * Após o agendamento com sucesso, o cache de sessão é invalidado automaticamente.
 * @param {Array<{subject: string, activities: string[]}>} batches 
 * @param {string} formalizationDate Data base do estudo YYYY-MM-DD
 * @returns {Promise<Object>} Resposta com a mensagem de sucesso
 */
export async function scheduleReviews(batches, formalizationDate) {
  const response = await apiClient.post('/notion/reviews', {
    batches,
    formalizationDate,
  });
  // Invalida o cache de sessão para garantir que novas revisões criadas sejam buscadas
  clearReviewCyclesCache();
  return response;
}

/**
 * Busca as revisões espaçadas ativas/pendentes na página.
 * @returns {Promise<Object>} Lista contendo as { reviews }
 */
export async function getScheduledReviews() {
  return await apiClient.get('/notion/reviews');
}

/**
 * Busca os ciclos de revisão ativos com inteligência de estágios, dedução e timeline.
 * Suporta cache em sessão: se forceRefresh for falso e houver cache válido, retorna os dados cacheados.
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] Força requisição de rede ignorando o cache
 * @returns {Promise<{ success: boolean, summary: Object, cycles: Object[], timeline: Object[] }>}
 */
export async function getActiveReviewCycles({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getReviewCyclesCache();
    if (cached) {
      return cached;
    }
  }

  const response = await apiClient.get('/notion/reviews/active');
  if (response && response.success) {
    setReviewCyclesCache(response);
  }
  return response;
}

/**
 * Invalida um ciclo de revisão específico via API do Notion.
 * O backend utiliza Atomic Container Replacement para remover as tarefas correspondentes
 * e manter a ordem cronológica estrita das tarefas restantes.
 * Invalida automaticamente o cache de sessão.
 * 
 * @param {string} cycleId Identificador único do ciclo
 * @param {Object} [extraData] Dados de redundância { subject, activities }
 * @returns {Promise<Object>} Resposta da API
 */
export async function invalidateReviewCycle(cycleId, extraData = {}) {
  const response = await apiClient.delete(`/notion/reviews/cycles/${cycleId}`, { data: extraData });
  clearReviewCyclesCache();
  return response;
}


