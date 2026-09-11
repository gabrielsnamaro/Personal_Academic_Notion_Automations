const { delay } = require('../util/delay');
const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');
const Block = require('../domain/notion/Block');
const Page = require('../domain/notion/Page');
const ElementBuilder = require('../domain/notion/parsers/ElementBuilder');
const ReviewTask = require('../domain/notion/ReviewTask');

class ReviewService {
    /**
     * Entrypoint da automação de repetição espaçada (Spaced Repetition Review).
     * Coordena o fluxo de buscar, mesclar e re-escrever blocos de estudo em lote
     * utilizando a estratégia de substituição atômica de container (Atomic Container Replacement).
     * 
     * @param {Object[]} studyBatches Array de objetos { subject, activities }
     * @param {string} formalizationDate Data base em formato YYYY-MM-DD
     */
    static async scheduleReviews(studyBatches, formalizationDate) {
        try {
            console.log(`\n================== [ReviewService: AGENDAMENTO] ==================`);
            console.log(`[ReviewService] 🚀 Iniciando processamento em lote.`);
            console.log(`[ReviewService] 📚 Matérias (${studyBatches.length}):`, studyBatches.map(b => b.subject).join(', '));
            console.log(`[ReviewService] 📅 Data de formalização: ${formalizationDate}`);
            
            const baseDate = new Date(`${formalizationDate}T12:00:00`);
            const revisions = [
                { offset: 1, date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000) },
                { offset: 7, date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
                { offset: 30, date: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000) }
            ];

            console.log(`[ReviewService] 🔍 [Passo 1/4] Buscando blocos raiz da página no Notion...`);
            const pageRes = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            const rawPageBlocks = pageRes.results;
            console.log(`[ReviewService]    -> ${rawPageBlocks.length} blocos raiz encontrados.`);

            const { calloutBlock, children } = await this._findRevisionsCallout(rawPageBlocks);
            const oldCalloutId = calloutBlock ? calloutBlock.id : null;

            console.log(`[ReviewService] 📦 [Passo 2/4] Extraindo clusters existentes do container...`);
            const allClusters = this._extractExistingReviewsFromChildren(children, oldCalloutId);
            console.log(`[ReviewService]    -> ${allClusters.length} clusters existentes recuperados.`);

            // Injetar as novas revisões gerando seus payloads nativos usando o próprio Modelo
            console.log(`[ReviewService] 🔨 [Passo 3/4] Gerando payloads nativos das novas revisões...`);
            for (const rev of revisions) {
                for (const batch of studyBatches) {
                    allClusters.push({
                        date: rev.date,
                        payloads: ReviewTask.buildNotionPayload(batch.subject, rev.date, batch.activities)
                    });
                }
            }

            // Ordenar estritamente de forma cronológica (a mais próxima no topo)
            allClusters.sort((a, b) => a.date - b.date);

            const flatPayloads = [];
            allClusters.forEach(cluster => flatPayloads.push(...cluster.payloads));
            console.log(`[ReviewService]    -> Total de clusters consolidados: ${allClusters.length} (${flatPayloads.length} blocos).`);

            // Preparar o cabeçalho heading_1 interno do Callout
            const headingPayload = {
                object: 'block',
                type: 'heading_1',
                heading_1: {
                    rich_text: [
                        {
                            type: 'text',
                            text: { content: 'Revisões marcadas' }
                        }
                    ],
                    color: 'orange_background',
                    is_toggleable: false
                }
            };

            const calloutChildren = [headingPayload, ...flatPayloads];

            console.log(`[ReviewService] 🔄 [Passo 4/4] Executando Atomic Container Replacement...`);
            await this._replaceRevisionsCallout(oldCalloutId, calloutChildren);

            console.log(`[ReviewService] ✨ Agendamento em lote concluído com sucesso!`);
            console.log(`==================================================================\n`);
            return { success: true, message: "Revisões injetadas, organizadas e ordenadas cronologicamente com sucesso." };
        } catch (err) {
            console.error("[ReviewService] ❌ Erro fatal no ReviewService:", err.message);
            if (err.message.includes("404")) {
                throw new Error("Notion API 404: Página não encontrada. Verifique o NOTION_TARGET_PAGE_ID no .env e as permissões.");
            }
            throw err;
        }
    }

    /**
     * Retorna as revisões agendadas na página estruturadas como tasks (DTOs pro frontend).
     * @param {Object[]} [rawBlocks] - Opcional. Blocos raiz da página do Notion
     * @returns {Promise<Object[]>} Array formatado
     */
    static async getScheduledReviews(rawBlocks = null) {
        if (!rawBlocks) {
            const res = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            rawBlocks = res.results;
        }

        const { calloutBlock, children } = await this._findRevisionsCallout(rawBlocks);
        if (!calloutBlock || !children || children.length <= 1) return [];

        const reviewBlocks = children.slice(1);
        const domainBlocks = reviewBlocks.map(b => new Block(b));
        const page = new Page(calloutBlock.id, domainBlocks, null);
        page.setElementPointer(0);

        const reviews = [];

        while (!page.endOfPage()) {
            try {
                const element = ElementBuilder.fromPage(page).tryReviewTask().build();
                
                if (element instanceof ReviewTask) {
                    const date = element.getScheduledDate();
                    if (date) {
                        reviews.push({
                            subject: element.getSubject(),
                            date: date,
                            activities: element.getActivities(),
                            done: element.isCompleted()
                        });
                    }
                }
            } catch (err) {
                page.getNextBlock();
            }
        }
        
        return reviews;
    }

    /**
     * Extrai os clusters de revisão a partir dos blocos filhos do Callout de revisões.
     */
    static _extractExistingReviewsFromChildren(children, calloutId) {
        const allClusters = [];
        if (!children || children.length <= 1) return allClusters;

        // O primeiro filho é o heading_1 ("Revisões marcadas"), os demais são as tasks
        const reviewBlocks = children.slice(1);
        const domainBlocks = reviewBlocks.map(b => new Block(b));
        const page = new Page(calloutId || 'temp_callout', domainBlocks, null);
        page.setElementPointer(0);

        while (!page.endOfPage()) {
            try {
                const element = ElementBuilder.fromPage(page).tryReviewTask().build();

                if (element instanceof ReviewTask) {
                    const date = element.getScheduledDate();
                    
                    if (date) {
                        const clusterPayloads = element.getBlocks()
                            .map(b => b.toNotionPayload())
                            .filter(p => p !== null);

                        allClusters.push({ date, payloads: clusterPayloads });
                    }
                }
            } catch (err) {
                page.getNextBlock();
            }
        }

        return allClusters;
    }

    /**
     * Localiza o Callout de "Revisões marcadas" e o bloco anterior para manter a posição.
     */
    static async _findRevisionsCallout(rawBlocks) {
        console.log(`[ReviewService] 🔎 Localizando container Callout de revisões...`);
        for (let i = 0; i < rawBlocks.length; i++) {
            const block = rawBlocks[i];
            if (block.type === 'callout') {
                const res = await NotionApiService.getPageBlocks(block.id);
                const children = res.results || [];
                const firstChild = children[0];

                if (firstChild && firstChild.type.startsWith('heading_')) {
                    const richText = firstChild[firstChild.type]?.rich_text || [];
                    const text = richText.map(t => t.plain_text || t.text?.content || '').join('').toLowerCase();
                    
                    if (text.includes('revisões marcadas')) {
                        console.log(`[ReviewService]    🎯 Callout de revisões localizado: ${block.id} (${children.length} blocos filhos).`);
                        const previousBlockId = i > 0 ? rawBlocks[i - 1].id : null;
                        return { calloutBlock: block, previousBlockId, children };
                    }
                }
            }
        }

        console.log(`[ReviewService]    ℹ️ Nenhum Callout existente de revisões foi encontrado.`);
        const previousBlockId = rawBlocks.length > 0 ? rawBlocks[rawBlocks.length - 1].id : null;
        return { calloutBlock: null, previousBlockId, children: [] };
    }

    /**
     * Realiza a substituição atômica: cria um novo container Callout no fim da página,
     * injeta os novos dados paginados e deleta o Callout antigo em uma única requisição.
     */
    static async _replaceRevisionsCallout(oldCalloutId, childrenPayloads) {
        const newCalloutPayload = [{
            object: 'block',
            type: 'callout',
            callout: {
                rich_text: [],
                icon: { type: 'emoji', emoji: '💡' },
                color: 'default_background'
            }
        }];

        // 1. Criar novo Callout no fim da página (a API do Notion não permite o parâmetro 'after' em páginas planas)
        console.log(`[ReviewService]    ➕ [1/3] Criando novo bloco Callout na página...`);
        const appendRes = await NotionApiService.appendBlocks(
            NOTION_TARGET_PAGE_ID, 
            newCalloutPayload
        );

        if (!appendRes || !appendRes.results || appendRes.results.length === 0) {
            throw new Error("Falha ao criar o novo container de Callout no Notion.");
        }

        const newCalloutId = appendRes.results[0].id;
        console.log(`[ReviewService]    ✅ Novo Callout criado com ID: ${newCalloutId}`);

        // 2. Injetar todos os filhos no novo Callout em chunks de até 100 blocos
        console.log(`[ReviewService]    📥 [2/3] Injetando ${childrenPayloads.length} blocos no novo Callout...`);
        for (let i = 0; i < childrenPayloads.length; i += 100) {
            const chunk = childrenPayloads.slice(i, i + 100);
            await NotionApiService.appendBlocks(newCalloutId, chunk);
            console.log(`[ReviewService]       -> Lote de blocos ${i + 1} a ${Math.min(i + 100, childrenPayloads.length)} inserido com sucesso.`);
            if (i + 100 < childrenPayloads.length) {
                await delay(500);
            }
        }

        // 3. Deletar o Callout antigo (apaga o bloco e todos os filhos instantaneamente)
        if (oldCalloutId) {
            console.log(`[ReviewService]    🗑️ [3/3] Deletando Callout antigo (${oldCalloutId}) em requisição única...`);
            await NotionApiService.deleteBlock(oldCalloutId);
            console.log(`[ReviewService]    ✅ Callout antigo removido com sucesso.`);
        }
    }
}

module.exports = ReviewService;
