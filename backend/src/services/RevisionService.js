const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');

class RevisionService {
    static async scheduleRevisions(materia, atividades, dataFormalizacao) {
        if (!NOTION_TARGET_PAGE_ID || NOTION_TARGET_PAGE_ID === 'null') {
            throw new Error("NOTION_TARGET_PAGE_ID não está configurado no arquivo .env");
        }

        const baseDate = new Date(`${dataFormalizacao}T12:00:00`);

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
                throw new Error("Notion API 404: Página não encontrada. Verifique o NOTION_TARGET_PAGE_ID no .env e garanta que você CONVIDOU a sua integração para a página clicando em 'Add connections' (...) no menu do Notion.");
            }
            throw err;
        }

        const blocks = response.results;

        let revisoesIndex = blocks.findIndex(b => 
            b.type === 'heading_1' && 
            b.heading_1?.rich_text[0]?.plain_text === '*Revisões marcadas*'
        );

        if (revisoesIndex === -1) {
            revisoesIndex = blocks.findIndex(b => 
                b.type === 'heading_1' && 
                b.heading_1?.rich_text[0]?.plain_text.includes('Revisões marcadas')
            );
        }

        let startIndex = revisoesIndex !== -1 ? revisoesIndex + 1 : blocks.length;

        const currentRevisions = [];
        for (let i = startIndex; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.type === 'heading_3') {
                const text = b.heading_3.rich_text.map(rt => rt.plain_text).join('');
                const match = text.match(/\*\((\d{2})\/(\d{2})\)\*/);
                if (match) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const year = baseDate.getFullYear();
                    const revDate = new Date(year, month - 1, day, 12, 0, 0);
                    currentRevisions.push({
                        blockId: b.id,
                        date: revDate,
                        index: i
                    });
                }
            }
        }
        
        for (const rev of revisions) {
            const dayStr = String(rev.date.getDate()).padStart(2, '0');
            const monthStr = String(rev.date.getMonth() + 1).padStart(2, '0');
            
            // Build dynamic bullets
            const bulletBlocks = atividades.map((atv, idx) => {
                const richTextArray = [
                    { type: 'text', text: { content: `${atv}. ` } }
                ];
                if (idx === 0) {
                    richTextArray.push({ type: 'text', text: { content: '***Revisão***' }, annotations: { bold: true, italic: true } });
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
                            { type: 'text', text: { content: `*(${dayStr}/${monthStr})*` }, annotations: { italic: true } }
                        ]
                    }
                },
                ...bulletBlocks,
                {
                    object: 'block',
                    type: 'to_do',
                    to_do: {
                        rich_text: [
                            { type: 'text', text: { content: '*Terminado! ✔*' }, annotations: { italic: true } }
                        ],
                        checked: false
                    }
                }
            ];

            let targetBlockId = revisoesIndex !== -1 ? blocks[revisoesIndex].id : null;
            
            for (let i = 0; i < currentRevisions.length; i++) {
                if (currentRevisions[i].date <= rev.date) {
                    const h3Index = currentRevisions[i].index;
                    let lastBlockIndex = h3Index;
                    
                    while (lastBlockIndex + 1 < blocks.length) {
                        const nextType = blocks[lastBlockIndex + 1].type;
                        if (nextType === 'bulleted_list_item' || nextType === 'to_do') {
                            lastBlockIndex++;
                        } else {
                            break;
                        }
                    }
                    
                    targetBlockId = blocks[lastBlockIndex].id;
                } else {
                    break;
                }
            }

            await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, payloadBlocks, targetBlockId);
        }

        return { success: true, message: "Revisões geradas com sucesso!" };
    }
}

module.exports = RevisionService;
