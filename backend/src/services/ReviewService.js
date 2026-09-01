const { delay } = require('../util/delay');
const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');

function extractPayload(block) {
    const type = block.type;
    if (!block[type] || !block[type].rich_text) return null;
    
    // Simplificamos a extração mantendo apenas rich_text e checked
    const payload = {
        object: 'block',
        type: type,
        [type]: {
            rich_text: block[type].rich_text.map(rt => {
                const rtPayload = {
                    type: 'text',
                    text: { content: rt.text.content },
                    annotations: rt.annotations
                };
                if (rt.text.link) {
                    rtPayload.text.link = rt.text.link;
                }
                return rtPayload;
            })
        }
    };
    
    if (type === 'to_do') {
        payload[type].checked = block[type].checked;
    }
    if (type.startsWith('heading_')) {
        payload[type].color = block[type].color;
        payload[type].is_toggleable = block[type].is_toggleable;
    }
    if (type === 'bulleted_list_item') {
        payload[type].color = block[type].color;
    }
    
    return payload;
}

class ReviewService {
    /**
     * Entrypoint da automação de repetição espaçada (Spaced Repetition Review).
     * Coordena o fluxo de buscar, mesclar e re-escrever blocos de estudo em lote.
     * 
     * @param {Object[]} studyBatches Array de objetos { materia, atividades }
     * @param {string} dataFormalizacao Data base em formato YYYY-MM-DD
     */
    static async scheduleReviews(studyBatches, dataFormalizacao, onProgress = () => {}) {
        try {
            console.log(`[ReviewService] Iniciando processamento em lote. Matérias recebidas: ${studyBatches.length}`);
            onProgress("Iniciando processamento em lote...", 5);
            
            // 1. Calcular datas das revisões baseadas na data de formalização
            const baseDate = new Date(`${dataFormalizacao}T12:00:00`);
            const revisions = [
                { offset: 1, date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000) },
                { offset: 7, date: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
                { offset: 30, date: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000) }
            ];

            // 2. Extrair toda a página do Notion
            onProgress("Extraindo blocos da página do Notion...", 10);
            const res = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            const blocks = res.results;

            // 3. Identificar ou criar o cabeçalho base de revisões
            const startIndex = await this._ensureTargetHeading(blocks);

            // 4. Coletar e parsear os blocos de revisão existentes para não perder os agendamentos antigos
            onProgress("Identificando e extraindo revisões antigas...", 20);
            const { allClusters, blocksToDelete } = this._extractExistingReviews(blocks, startIndex, dataFormalizacao);

            // 5. Injetar as novas revisões em lote (batch) na nossa lista em memória
            onProgress("Construindo novos blocos de revisão...", 30);
            this._buildNewReviews(allClusters, revisions, studyBatches);

            // 6. Ordenar estritamente de forma cronológica (a mais próxima no topo)
            allClusters.sort((a, b) => a.date - b.date);

            // Achatar os clusters para um array plano de payloads nativos da API do Notion
            const flatPayloads = [];
            allClusters.forEach(cluster => flatPayloads.push(...cluster.payloads));

            // 7. Aplicar as alterações destrutivas de deleção e reinserção
            await this._replaceBlocks(blocksToDelete, flatPayloads, onProgress);

            onProgress("Finalizado com sucesso!", 100);
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
     * Verifica se o cabeçalho "Revisões marcadas" existe na página.
     * Caso contrário, ele é criado. Retorna o índice do bloco onde as revisões começam.
     */
    static async _ensureTargetHeading(blocks) {
        let headingIndex = blocks.findIndex(b => {
            if (!b.type.startsWith('heading_')) return false;
            const fullText = b[b.type].rich_text.map(rt => rt.plain_text).join('').toLowerCase();
            return fullText.includes('revisões marcadas');
        });

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
            
            // Recarrega os blocos após a criação para ter o estado atualizado
            const newRes = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            blocks.splice(0, blocks.length, ...newRes.results);
            headingIndex = blocks.findIndex(b => {
                if (!b.type.startsWith('heading_')) return false;
                const fullText = b[b.type].rich_text.map(rt => rt.plain_text).join('').toLowerCase();
                return fullText.includes('revisões marcadas');
            });
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
    static _buildNewReviews(allClusters, revisions, studyBatches) {
        for (const rev of revisions) {
            const dayStr = String(rev.date.getDate()).padStart(2, '0');
            const monthStr = String(rev.date.getMonth() + 1).padStart(2, '0');
            
            for (const batch of studyBatches) {
                const { materia, atividades } = batch;
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
                                { type: 'text', text: { content: '✔' }, annotations: { bold: true, italic: true, color: 'gray' } }
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
    }


    /**
     * Remove todos os blocos desordenados em pequenos lotes e, em seguida,
     * insere a lista completa perfeitamente cronológica no fim do documento.
     */
    static async _replaceBlocks(blocksToDelete, flatPayloads, onProgress = () => {}) {
        // Deleta em chunks de 3 para não explodir o rate limit de ~3 req/s do Notion
        const totalDeletes = blocksToDelete.length;
        for (let i = 0; i < totalDeletes; i += 3) {
            const chunk = blocksToDelete.slice(i, i + 3);
            await Promise.all(chunk.map(id => NotionApiService.deleteBlock(id)));
            
            // Progress goes from 30% to 60% during deletion
            const p = 30 + ((i + chunk.length) / (totalDeletes || 1)) * 30;
            onProgress(`Removendo formatação antiga (${i + chunk.length}/${totalDeletes})...`, Math.round(p));

            if (i + 3 < totalDeletes) {
                await delay(1100);
            }
        }

        // Insere em chunks de 100 (limite nativo da API append do Notion)
        const totalInserts = flatPayloads.length;
        for (let i = 0; i < totalInserts; i += 100) {
            const chunk = flatPayloads.slice(i, i + 100);
            await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, chunk);
            
            // Progress goes from 60% to 95% during insertion
            const p = 60 + ((i + chunk.length) / (totalInserts || 1)) * 35;
            onProgress(`Injetando revisões cronológicas (${i + chunk.length}/${totalInserts})...`, Math.round(p));

            if (i + 100 < totalInserts) {
                await delay(1100);
            }
        }
    }
}

module.exports = ReviewService;
