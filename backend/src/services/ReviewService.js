const { delay } = require('../util/delay');
const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');
const Block = require('../domain/notion/Block');
const Page = require('../domain/notion/Page');
const ElementBuilder = require('../domain/notion/parsers/ElementBuilder');
const ReviewTask = require('../domain/notion/elements/ReviewTask');

class ReviewService {
    /**
     * Entrypoint da automação de repetição espaçada (Spaced Repetition Review).
     * Coordena o fluxo de buscar, mesclar e re-escrever blocos de estudo em lote.
     * 
     * @param {Object[]} studyBatches Array de objetos { subject, activities }
     * @param {string} formalizationDate Data base em formato YYYY-MM-DD
     */
    static async scheduleReviews(studyBatches, formalizationDate) {
        try {
            console.log(`[ReviewService] Iniciando processamento em lote. Matérias recebidas: ${studyBatches.length}`);
            
            const baseDate = new Date(`${formalizationDate}T12:00:00`);
            const revisions = [
                { offset: 1, date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000) },
                { offset: 7, date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
                { offset: 30, date: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000) }
            ];

            const res = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            const rawBlocks = res.results;

            const startIndex = await this._ensureTargetHeading(rawBlocks);

            // Abstração de Domínio
            const domainBlocks = rawBlocks.map(b => new Block(b));
            const page = new Page(NOTION_TARGET_PAGE_ID, domainBlocks, null);

            // Coletar e fazer parsing dos clusters de revisão existentes
            const { allClusters, blocksToDelete } = this._extractExistingReviews(page, startIndex);

            // Injetar as novas revisões gerando seus payloads nativos usando o próprio Modelo
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

            // Aplicar as alterações destrutivas de deleção e reinserção
            await this._replaceBlocks(blocksToDelete, flatPayloads);

            return { success: true, message: "Revisões injetadas, organizadas e ordenadas cronologicamente com sucesso." };
        } catch (err) {
            console.error("Erro fatal no ReviewService:", err.message);
            if (err.message.includes("404")) {
                throw new Error("Notion API 404: Página não encontrada. Verifique o NOTION_TARGET_PAGE_ID no .env e as permissões.");
            }
            throw err;
        }
    }

    /**
     * Retorna as revisões agendadas na página estruturadas como tasks (DTOs pro frontend).
     * @param {Object[]} rawBlocks - Todos os blocos retornados da página do Notion
     * @returns {Object[]} Array formatado
     */
    static getScheduledReviews(rawBlocks) {
        const headingIndex = this._findRevisionsHeadingIndex(rawBlocks);
        if (headingIndex === -1) return [];

        const domainBlocks = rawBlocks.map(b => new Block(b));
        const page = new Page(NOTION_TARGET_PAGE_ID, domainBlocks, null);
        page.setElementPointer(headingIndex + 1);

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
                // O Builder não encontrou uma ReviewTask a partir deste bloco.
                // Consumimos um bloco "lixo" e tentamos novamente no próximo passo do cursor.
                page.getNextBlock();
            }
        }
        
        return reviews;
    }

    /**
     * Varre a partir do cursor e usa o Parser do Domínio para identificar clusters completos.
     */
    static _extractExistingReviews(page, startIndex) {
        const allClusters = [];
        const blocksToDelete = [];
        
        page.setElementPointer(startIndex);

        while (!page.endOfPage()) {
            try {
                const element = ElementBuilder.fromPage(page).tryReviewTask().build();

                if (element instanceof ReviewTask) {
                    const date = element.getScheduledDate();
                    
                    if (date) {
                        const clusterPayloads = element.getBlocks().map(b => {
                            blocksToDelete.push(b.getId());
                            return b.toNotionPayload();
                        }).filter(p => p !== null);

                        allClusters.push({ date, payloads: clusterPayloads });
                    }
                }
            } catch (err) {
                page.getNextBlock();
            }
        }

        return { allClusters, blocksToDelete };
    }

    /**
     * Localiza o índice exato do cabeçalho de seção "Revisões marcadas".
     */
    static _findRevisionsHeadingIndex(blocks) {
        return blocks.findIndex(b => {
            if (!b.type.startsWith('heading_')) return false;
            const fullText = b[b.type].rich_text.map(rt => rt.plain_text).join('').toLowerCase();
            return fullText.includes('revisões marcadas');
        });
    }

    /**
     * Verifica se o cabeçalho "Revisões marcadas" existe na página.
     * Caso contrário, ele é criado. Retorna o índice do bloco onde as revisões começam.
     */
    static async _ensureTargetHeading(rawBlocks) {
        let headingIndex = this._findRevisionsHeadingIndex(rawBlocks);

        if (headingIndex === -1) {
            const headingPayload = [{
                object: 'block',
                type: 'heading_1',
                heading_1: {
                    rich_text: [
                        { type: 'text', text: { content: 'Revisões marcadas' }, annotations: { italic: true } }
                    ]
                }
            }];
            await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, headingPayload);
            
            const newRes = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            rawBlocks.splice(0, rawBlocks.length, ...newRes.results);
            headingIndex = this._findRevisionsHeadingIndex(rawBlocks);
        }
        return headingIndex + 1;
    }

    /**
     * Remove todos os blocos desordenados em pequenos lotes e, em seguida,
     * insere a lista completa perfeitamente cronológica no fim do documento.
     */
    static async _replaceBlocks(blocksToDelete, flatPayloads) {
        for (let i = 0; i < blocksToDelete.length; i += 3) {
            const chunk = blocksToDelete.slice(i, i + 3);
            await Promise.all(chunk.map(id => NotionApiService.deleteBlock(id)));
            if (i + 3 < blocksToDelete.length) {
                await delay(1100);
            }
        }

        for (let i = 0; i < flatPayloads.length; i += 100) {
            const chunk = flatPayloads.slice(i, i + 100);
            await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, chunk);
            if (i + 100 < flatPayloads.length) {
                await delay(1100);
            }
        }
    }
}

module.exports = ReviewService;
