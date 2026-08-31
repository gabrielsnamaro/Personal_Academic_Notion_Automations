const Task = require('./Task');

class ReviewTask extends Task {
    #materia;
    #date;
    #atividades;
    #done;

    constructor(titleBlocks, topicBlocks, checkBlocks) {
        super(titleBlocks[0], topicBlocks, checkBlocks);
        
        const titleText = titleBlocks[0].getPlainText();
        this.#materia = this._parseMateria(titleText);
        this.#date = this._parseReviewDate(titleText);
        
        this.#atividades = topicBlocks.map(block => {
            let text = block.getPlainText();
            return text.replace(/(?:\.\s*Revisão|\.|\s*Revisão)$/i, '').trim();
        });

        this.#done = checkBlocks[0].getCheckedStatus();
    }

    _parseMateria(fullText) {
        return fullText.split('[')[0].trim();
    }

    _parseReviewDate(fullText) {
        const match = fullText.match(/(\d{2})\/(\d{2})/);
        if (!match) return null;

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const baseDate = new Date(); // Usado como base para virada de ano
        
        let revYear = baseDate.getFullYear();
        const baseMonth = baseDate.getMonth();
        
        if (month - 1 < 3 && baseMonth > 8) revYear++; 
        else if (month - 1 > 8 && baseMonth < 3) revYear--;

        return new Date(revYear, month - 1, day, 12, 0, 0);
    }

    getSubject = () => this.#materia;
    getScheduledDate = () => this.#date;
    getActivities = () => this.#atividades;
    isCompleted = () => this.#done;

    /**
     * Gera os payloads literais exigidos pelo Notion para desenhar a revisão na tela.
     */
    static buildNotionPayload(materia, date, atividades) {
        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');

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

        return [
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
    }
}

module.exports = ReviewTask;

