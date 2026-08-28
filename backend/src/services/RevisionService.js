const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');

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
            { date: rev1, type: "Revisão 1 dia" },
            { date: rev7, type: "Revisão 7 dias" },
            { date: rev30, type: "Revisão 30 dias" }
        ];

        let response;
        try {
            response = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
        } catch (err) {
            if (err.message.includes('404')) {
                throw new Error("Notion API 404: Página não encontrada. Verifique o NOTION_TARGET_PAGE_ID no .env e as permissões (Add connections) da página alvo.");
            }
            throw err;
        }

        const blocks = response.results;

        // Procura a seção de revisões de forma mais resiliente
        let revisoesIndex = blocks.findIndex(b => 
            b.type.startsWith('heading_') && 
            b[b.type].rich_text.some(rt => rt.plain_text.toLowerCase().includes('revisões marcadas'))
        );

        let revSectionId = null;

        // Se não encontrar a seção, nós a criamos no final da página!
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
            const hRes = await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, headingPayload);
            revSectionId = hRes.results[0].id;
        } else {
            revSectionId = blocks[revisoesIndex].id;
        }

        let startIndex = revisoesIndex !== -1 ? revisoesIndex + 1 : blocks.length;

        // Mapeia todas as revisões existentes para um array ordenado na memória
        const existingRevisions = [];
        
        for (let i = startIndex; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.type === 'heading_3') {
                const text = b.heading_3.rich_text.map(rt => rt.plain_text).join('');
                
                // Regex mais flexível: captura dd/mm independente de asteriscos ou parênteses vizinhos
                const match = text.match(/(\d{2})\/(\d{2})/);
                if (match) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    
                    // Tratativa de virada de ano: se a data base é Dezembro e a revisão é Janeiro
                    let revYear = baseYear;
                    if (month - 1 < 3 && baseMonth > 8) {
                        revYear++; 
                    }

                    const revDate = new Date(revYear, month - 1, day, 12, 0, 0);
                    
                    // Precisamos achar o último bloco dessa revisão específica
                    let lastBlockIndex = i;
                    while (lastBlockIndex + 1 < blocks.length) {
                        const nextType = blocks[lastBlockIndex + 1].type;
                        if (nextType === 'bulleted_list_item' || nextType === 'to_do') {
                            lastBlockIndex++;
                        } else {
                            break;
                        }
                    }

                    existingRevisions.push({
                        lastBlockId: blocks[lastBlockIndex].id,
                        date: revDate
                    });
                    
                    // Pula i para não reprocessar
                    i = lastBlockIndex;
                }
            }
        }
        
        // Garante ordenação local inicial
        existingRevisions.sort((a, b) => a.date - b.date);

        // Insere as 3 novas revisões dinamicamente
        for (const rev of revisions) {
            const dayStr = String(rev.date.getDate()).padStart(2, '0');
            const monthStr = String(rev.date.getMonth() + 1).padStart(2, '0');
            
            const bulletBlocks = atividades.map((atv, idx) => {
                const richTextArray = [
                    { type: 'text', text: { content: `${atv}. ` } }
                ];
                if (idx === 0) {
                    richTextArray.push({ type: 'text', text: { content: 'Revisão' }, annotations: { bold: true, italic: true } });
                }
                return {
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: richTextArray
                    }
                };
            });

            const payloadBlocks = [
                {
                    object: 'block',
                    type: 'heading_3',
                    heading_3: {
                        rich_text: [
                            { type: 'text', text: { content: `${materia} ` } },
                            { type: 'text', text: { content: '[autônomo] ' } },
                            // Notion aplica o Markdown, então se mandar literal vira bagunça. Vamos usar só texto puro com anotação.
                            { type: 'text', text: { content: `(${dayStr}/${monthStr})` }, annotations: { italic: true } }
                        ]
                    }
                },
                ...bulletBlocks,
                {
                    object: 'block',
                    type: 'to_do',
                    to_do: {
                        rich_text: [
                            { type: 'text', text: { content: 'Terminado! ✔' }, annotations: { italic: true } }
                        ],
                        checked: false
                    }
                }
            ];

            // Encontra o ponto de inserção com base na lista em memória
            let targetBlockId = revSectionId;
            for (const existing of existingRevisions) {
                if (existing.date <= rev.date) {
                    targetBlockId = existing.lastBlockId;
                } else {
                    break;
                }
            }

            // Injeta na API
            const res = await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, payloadBlocks, targetBlockId);
            
            // Pega o ID do ÚLTIMO bloco inserido na resposta
            const newLastBlockId = res.results[res.results.length - 1].id;

            // Adiciona a nova revisão à lista em memória e reordena!
            // Isso garante que se a próxima revisão tiver que entrar APÓS essa, ela achará o bloco correto.
            existingRevisions.push({
                lastBlockId: newLastBlockId,
                date: rev.date
            });
            existingRevisions.sort((a, b) => a.date - b.date);
        }

        return { success: true, message: "Revisões geradas com sucesso!" };
    }
}

module.exports = RevisionService;
