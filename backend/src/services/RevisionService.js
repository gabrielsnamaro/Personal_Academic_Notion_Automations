const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');

// Função auxiliar para esperar e evitar rate limit
const delay = ms => new Promise(res => setTimeout(res, ms));

function extractPayload(b) {
    if (b.type === 'heading_3') return { object: 'block', type: 'heading_3', heading_3: { rich_text: b.heading_3.rich_text } };
    if (b.type === 'bulleted_list_item') return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: b.bulleted_list_item.rich_text } };
    if (b.type === 'to_do') return { object: 'block', type: 'to_do', to_do: { rich_text: b.to_do.rich_text, checked: b.to_do.checked } };
    return null;
}

class RevisionService {
    static async scheduleRevisions(materia, atividades, dataFormalizacao) {
        if (!NOTION_TARGET_PAGE_ID || NOTION_TARGET_PAGE_ID === 'null') {
            throw new Error("NOTION_TARGET_PAGE_ID não está configurado no arquivo .env");
        }

        const baseDate = new Date(`${dataFormalizacao}T12:00:00`);
        const baseYear = baseDate.getFullYear();
        const baseMonth = baseDate.getMonth();

        const rev1 = new Date(baseDate); rev1.setDate(rev1.getDate() + 1);
        const rev7 = new Date(baseDate); rev7.setDate(rev7.getDate() + 7);
        const rev30 = new Date(baseDate); rev30.setDate(rev30.getDate() + 30);

        const revisions = [
            { date: rev1 },
            { date: rev7 },
            { date: rev30 }
        ];

        let response;
        try {
            // Busca todos os blocos com paginação
            response = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
        } catch (err) {
            if (err.message.includes('404')) {
                throw new Error("Notion API 404: Página não encontrada. Verifique o NOTION_TARGET_PAGE_ID no .env e as permissões (Add connections) da página alvo.");
            }
            throw err;
        }

        const blocks = response.results;

        let revisoesIndex = blocks.findIndex(b => 
            b.type.startsWith('heading_') && 
            b[b.type].rich_text.some(rt => rt.plain_text.toLowerCase().includes('revisões marcadas'))
        );

        if (revisoesIndex === -1) {
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
            // Busca de novo para pegar a página com o novo heading
            const newRes = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
            blocks.splice(0, blocks.length, ...newRes.results);
            revisoesIndex = blocks.findIndex(b => b.type.startsWith('heading_') && b[b.type].rich_text.some(rt => rt.plain_text.toLowerCase().includes('revisões marcadas')));
        }

        const startIndex = revisoesIndex + 1;
        const allClusters = [];
        const blocksToDelete = [];

        // Extrai todas as revisões existentes
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

        // Constrói os payloads das novas revisões
        for (const rev of revisions) {
            const dayStr = String(rev.date.getDate()).padStart(2, '0');
            const monthStr = String(rev.date.getMonth() + 1).padStart(2, '0');
            
            const bulletBlocks = atividades.map((atv, idx) => {
                const richTextArray = [{ type: 'text', text: { content: `${atv}. ` } }];
                if (idx === 0) richTextArray.push({ type: 'text', text: { content: 'Revisão' }, annotations: { bold: true, italic: true } });
                return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richTextArray } };
            });

            const newPayloads = [
                {
                    object: 'block',
                    type: 'heading_3',
                    heading_3: {
                        rich_text: [
                            { type: 'text', text: { content: `${materia} ` } },
                            { type: 'text', text: { content: '[autônomo] ' } },
                            { type: 'text', text: { content: `(${dayStr}/${monthStr})` }, annotations: { italic: true } }
                        ]
                    }
                },
                ...bulletBlocks,
                {
                    object: 'block',
                    type: 'to_do',
                    to_do: {
                        rich_text: [{ type: 'text', text: { content: 'Terminado! ✔' }, annotations: { italic: true } }],
                        checked: false
                    }
                }
            ];

            allClusters.push({
                date: rev.date,
                payloads: newPayloads
            });
        }

        // Ordena tudo pela data
        allClusters.sort((a, b) => a.date - b.date);

        // Achata os payloads em um único array (até 100 blocos)
        const flatPayloads = allClusters.flatMap(c => c.payloads);

        // Deleta os blocos antigos um por um para não tomar rate limit excessivo
        // Chunk requests in 3 parallel deletions per second (Notion allows 3 req/sec)
        for (let i = 0; i < blocksToDelete.length; i += 3) {
            const chunk = blocksToDelete.slice(i, i + 3);
            await Promise.all(chunk.map(id => NotionApiService.deleteBlock(id)));
            if (i + 3 < blocksToDelete.length) {
                await delay(1100);
            }
        }

        // Injeta os blocos novos na ordem correta, em chunks de 100 (limite da API do Notion)
        for (let i = 0; i < flatPayloads.length; i += 100) {
            const chunk = flatPayloads.slice(i, i + 100);
            await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, chunk);
            if (i + 100 < flatPayloads.length) {
                await delay(1100);
            }
        }

        return { success: true, message: "Revisões ordenadas e geradas com sucesso!" };
    }
}

module.exports = RevisionService;
