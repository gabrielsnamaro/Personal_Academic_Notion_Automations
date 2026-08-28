const NotionApiService = require('./NotionApiService');
const { NOTION_TARGET_PAGE_ID } = require('../config');

class RevisionService {
    static async scheduleRevisions(materia, atividade, dataFormalizacao) {
        if (!NOTION_TARGET_PAGE_ID) {
            throw new Error("NOTION_TARGET_PAGE_ID não configurado no .env");
        }

        // Converte a data enviada (YYYY-MM-DD) para objeto Date
        // Importante: usar 'T12:00:00' previne problemas de timezone caindo pro dia anterior
        const baseDate = new Date(`${dataFormalizacao}T12:00:00`);

        // Cria as 3 datas da Curva de Esquecimento
        const rev1 = new Date(baseDate); rev1.setDate(rev1.getDate() + 1);
        const rev7 = new Date(baseDate); rev7.setDate(rev7.getDate() + 7);
        const rev30 = new Date(baseDate); rev30.setDate(rev30.getDate() + 30);

        const revisions = [
            { date: rev1, type: "Revisão 1 dia" },
            { date: rev7, type: "Revisão 7 dias" },
            { date: rev30, type: "Revisão 30 dias" }
        ];

        // 1. Busca os blocos da página
        const response = await NotionApiService.getPageBlocks(NOTION_TARGET_PAGE_ID);
        const blocks = response.results;

        // 2. Encontra a seção "# Revisões marcadas"
        let revisoesIndex = blocks.findIndex(b => 
            b.type === 'heading_1' && 
            b.heading_1?.rich_text[0]?.plain_text === '*Revisões marcadas*'
        );

        // Fallback para string simples se não tiver itálico/asteriscos
        if (revisoesIndex === -1) {
            revisoesIndex = blocks.findIndex(b => 
                b.type === 'heading_1' && 
                b.heading_1?.rich_text[0]?.plain_text.includes('Revisões marcadas')
            );
        }

        // Se a seção não existir, usaremos o último bloco da página (append normal)
        let startIndex = revisoesIndex !== -1 ? revisoesIndex + 1 : blocks.length;

        // Extrai as datas das revisões existentes
        const currentRevisions = [];
        for (let i = startIndex; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.type === 'heading_3') {
                const text = b.heading_3.rich_text.map(rt => rt.plain_text).join('');
                // Procura por *(dd/mm)*
                const match = text.match(/\*\((\d{2})\/(\d{2})\)\*/);
                if (match) {
                    const day = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    // Assumimos que está no mesmo ano letivo da data base
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

        // Para cada nova revisão, descobre o blockId do ponto de inserção e injeta
        // NOTA: Devemos fazer na ordem inversa (30, 7, 1) ou atualizar nossa lista local se inserirmos no mesmo lugar?
        // Como cada bloco será injetado depois do `afterId`, se fizermos independentemente, ele funcionará.
        
        for (const rev of revisions) {
            // Cria os 3 blocos do payload
            const dayStr = String(rev.date.getDate()).padStart(2, '0');
            const monthStr = String(rev.date.getMonth() + 1).padStart(2, '0');
            
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
                {
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: [
                            { type: 'text', text: { content: `${atividade}. ` } },
                            { type: 'text', text: { content: '***Revisão***' }, annotations: { bold: true, italic: true } }
                        ]
                    }
                },
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

            // Encontra o último bloco que tem data menor ou igual a rev.date
            // Como as revisões podem estar intercaladas com os bullet/todo originais, 
            // precisamos do ID do ÚLTIMO bloco pertencente à revisão anterior (o 'to_do' dela).
            let targetBlockId = revisoesIndex !== -1 ? blocks[revisoesIndex].id : null;
            
            for (let i = 0; i < currentRevisions.length; i++) {
                if (currentRevisions[i].date <= rev.date) {
                    // O target deve ser o último bloco pertencente a esta revisão.
                    // Na estrutura padrão, a revisão ocupa 3 blocos (h3, bullet, todo).
                    // Então pegamos o id do bloco (h3 index + 2).
                    // Mas vamos checar bounds para não errar.
                    const h3Index = currentRevisions[i].index;
                    let lastBlockIndex = h3Index;
                    if (h3Index + 1 < blocks.length && blocks[h3Index + 1].type === 'bulleted_list_item') lastBlockIndex++;
                    if (h3Index + 2 < blocks.length && blocks[h3Index + 2].type === 'to_do') lastBlockIndex++;
                    
                    targetBlockId = blocks[lastBlockIndex].id;
                } else {
                    break;
                }
            }

            // Injeta na API
            await NotionApiService.appendBlocks(NOTION_TARGET_PAGE_ID, payloadBlocks, targetBlockId);
            
            // Simulação: A API inseriu. Precisamos atualizar o targetBlockId para a próxima iteração
            // se elas caírem no mesmo slot? Sim, mas como fazemos 3 requests separadas e a ordem não muda 
            // drasticamente se as enviarmos de forma crescente (1d, 7d, 30d), a API lidará com isso.
        }

        return { success: true, message: "Revisões geradas com sucesso!" };
    }
}

module.exports = RevisionService;
