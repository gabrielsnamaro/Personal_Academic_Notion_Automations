const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');

// Função auxiliar para esperar e evitar rate limit da API do Notion
const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Extrai o payload base de um bloco existente para que possamos recriá-lo
 * exatamente com a mesma formatação após deletá-lo na ordenação.
 */
function extractPayload(b) {
    if (b.type === 'heading_3') return { object: 'block', type: 'heading_3', heading_3: { rich_text: b.heading_3.rich_text } };
    if (b.type === 'bulleted_list_item') return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: b.bulleted_list_item.rich_text } };
    if (b.type === 'to_do') return { object: 'block', type: 'to_do', to_do: { rich_text: b.to_do.rich_text, checked: b.to_do.checked } };
    return null;
}

class ReviewService {
    /**
     * Entrypoint da automação de repetição espaçada (Spaced Repetition Review).
     * Coordena o fluxo de buscar, mesclar e re-escrever blocos de estudo.
     * 
     * @param {string} materia Nome da disciplina/tópico
     * @param {string[]} atividades Array com os subtópicos a revisar
     * @param {string} dataFormalizacao Data inicial do estudo (YYYY-MM-DD)
     */
    static async scheduleReviews(materia, atividades, dataFormalizacao) {
        this._validateConfig();

        const revisions = this._calculateReviewDates(dataFormalizacao);
        const blocks = await this._fetchPageBlocks();
        const startIndex = await this._ensureTargetHeading(blocks);
        
        const { allClusters, blocksToDelete } = this._extractExistingReviews(blocks, startIndex, dataFormalizacao);
        
        this._buildNewReviews(allClusters, revisions, materia, atividades);

        // Ordena todos os blocos antigos e os novos em ordem cronológica de estudo
        allClusters.sort((a, b) => a.date - b.date);
        const flatPayloads = allClusters.flatMap(c => c.payloads);

        await this._replaceBlocks(blocksToDelete, flatPayloads);

        return { success: true, message: "Revisões ordenadas e geradas com sucesso!" };
    }

    /**
     * Valida se a configuração base do Notion foi preenchida no .env.
     */
    static _validateConfig() {
        if (!NOTION_TARGET_PAGE_ID || NOTION_TARGET_PAGE_ID === 'null') {
            throw new Error("NOTION_TARGET_PAGE_ID não está configurado no arquivo .env");
        }
    }

    /**
     * Calcula as três datas da Curva do Esquecimento: +1 dia, +7 dias, +30 dias.
     */
    static _calculateReviewDates(dataFormalizacao) {
        const baseDate = new Date(`${dataFormalizacao}T12:00:00`);
        const rev1 = new Date(baseDate); rev1.setDate(rev1.getDate() + 1);
        const rev7 = new Date(baseDate); rev7.setDate(rev7.getDate() + 7);
        const rev30 = new Date(baseDate); rev30.setDate(rev30.getDate() + 30);
        return [ { date: rev1 }, { date: rev7 }, { date: rev30 } ];
    }

    /**
     * Busca todos os blocos atuais da página alvo.
     */
    static async _fetchPageBlocks() {
        try {
            const response = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            return response.results;
        } catch (err) {
            if (err.message.includes('404')) {
                throw new Error("Notion API 404: Página não encontrada. Verifique o NOTION_TARGET_PAGE_ID no .env e as permissões.");
            }
            throw err;
        }
    }

    /**
     * Verifica se o cabeçalho "Revisões marcadas" existe na página.
     * Caso contrário, ele é criado. Retorna o índice do bloco onde as revisões começam.
     */
    static async _ensureTargetHeading(blocks) {
        let headingIndex = blocks.findIndex(b => 
            b.type.startsWith('heading_') && 
            b[b.type].rich_text.some(rt => rt.plain_text.toLowerCase().includes('revisões marcadas'))
        );

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
            
            // Recarrega os blocos após a criação para ter o estado realizado
            const newRes = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            blocks.splice(0, blocks.length, ...newRes.results);
            headingIndex = blocks.findIndex(b => b.type.startsWith('heading_') && b[b.type].rich_text.some(rt => rt.plain_text.toLowerCase().includes('revisões marcadas')));
        }
        return headingIndex + 1;
    }

    /**
     * Varre a partir do cabeçalho e coleta as revisões que já estavam penduradas na página.
     * Agrupa os blocos em "Clusters" (Cabeçalho + Lista + ToDo) para não quebrar a ordem.
     */
    static _extractExistingReviews(blocks, startIndex, dataFormalizacao) {
        const allClusters = [];
        const blocksToDelete = [];
        
        const baseDate = new Date(`${dataFormalizacao}T12:00:00`);
        const baseYear = baseDate.getFullYear();
        const baseMonth = baseDate.getMonth();

        for (let i = startIndex; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.type === 'heading_3') {
                const text = b.heading_3.rich_text.map(rt => rt.plain_text).join('');
                const match = text.match(/(\d{2})\/(\d{2})/);
                
                if (match) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    
                    let revYear = baseYear;
                    if (month - 1 < 3 && baseMonth > 8) revYear++; 

                    const revDate = new Date(revYear, month - 1, day, 12, 0, 0);
                    
                    let lastBlockIndex = i;
                    const clusterPayloads = [extractPayload(b)];
                    blocksToDelete.push(b.id);

                    // Puxa os blocos filhos (a lista de tópicos e o checklist "Terminado?")
                    while (lastBlockIndex + 1 < blocks.length) {
                        const nextType = blocks[lastBlockIndex + 1].type;
                        if (nextType === 'bulleted_list_item' || nextType === 'to_do') {
                            lastBlockIndex++;
                            const childBlock = blocks[lastBlockIndex];
                            clusterPayloads.push(extractPayload(childBlock));
                            blocksToDelete.push(childBlock.id);
                        } else {
                            break;
                        }
                    }

                    allClusters.push({
                        date: revDate,
                        payloads: clusterPayloads.filter(p => p !== null)
                    });
                    
                    i = lastBlockIndex;
                }
            }
        }
        return { allClusters, blocksToDelete };
    }

    /**
     * Cria os novos blocos de revisão no formato visual de engenharia reversa do Notion
     * (com cores de fundo, inline code, e checkbox).
     */
    static _buildNewReviews(allClusters, revisions, materia, atividades) {
        for (const rev of revisions) {
            const dayStr = String(rev.date.getDate()).padStart(2, '0');
            const monthStr = String(rev.date.getMonth() + 1).padStart(2, '0');
            
            const bulletBlocks = atividades.map((atv, idx) => {
                const richTextArray = [{ type: 'text', text: { content: `${atv}. ` } }];
                if (idx === 0) {
                    richTextArray.push({ 
                        type: 'text', 
                        text: { content: 'Revisão' }, 
                        annotations: { bold: true, italic: true, color: 'gray_background' } 
                    });
                }
                return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richTextArray } };
            });

            const newPayloads = [
                {
                    object: 'block',
                    type: 'heading_3',
                    heading_3: {
                        rich_text: [
                            { type: 'text', text: { content: `${materia} ` } },
                            { type: 'text', text: { content: '[' }, annotations: { code: true, color: 'gray' } },
                            { type: 'text', text: { content: 'autônomo' }, annotations: { code: true, color: 'yellow' } },
                            { type: 'text', text: { content: ']' }, annotations: { code: true, color: 'gray' } },
                            { type: 'text', text: { content: ' ' }, annotations: { color: 'gray' } },
                            { type: 'text', text: { content: `(${dayStr}/${monthStr})` }, annotations: { italic: true, color: 'gray' } }
                        ]
                    }
                },
                ...bulletBlocks,
                {
                    object: 'block',
                    type: 'to_do',
                    to_do: {
                        rich_text: [
                            { type: 'text', text: { content: 'Terminado! ' }, annotations: { italic: true, color: 'gray' } },
                            { type: 'text', text: { content: '?' }, annotations: { bold: true, italic: true, color: 'gray' } }
                        ],
                        checked: false
                    }
                }
            ];

            allClusters.push({
                date: rev.date,
                payloads: newPayloads
            });
        }
    }

    /**
     * Remove todos os blocos desordenados em pequenos lotes e, em seguida,
     * insere a lista completa perfeitamente cronológica no fim do documento.
     */
    static async _replaceBlocks(blocksToDelete, flatPayloads) {
        // Deleta em chunks de 3 para não explodir o rate limit de ~3 req/s do Notion
        for (let i = 0; i < blocksToDelete.length; i += 3) {
            const chunk = blocksToDelete.slice(i, i + 3);
            await Promise.all(chunk.map(id => NotionApiService.deleteBlock(id)));
            if (i + 3 < blocksToDelete.length) {
                await delay(1100);
            }
        }

        // Insere em chunks de 100 (limite nativo da API append do Notion)
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
