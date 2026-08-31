const Task = require('./Task');
const YamlPayloadGenerator = require('./generators/YamlPayloadGenerator');

class ReviewTask extends Task {
    #subject;
    #date;
    #activities;
    #done;

    constructor(titleBlocks, topicBlocks, checkBlocks) {
        super(titleBlocks[0], topicBlocks, checkBlocks);
        
        const titleText = titleBlocks[0].getPlainText();
        this.#subject = this._parseSubject(titleText);
        this.#date = this._parseReviewDate(titleText);
        
        this.#activities = topicBlocks.map(block => {
            let text = block.getPlainText();
            return text.replace(/(?:\.\s*Revisão|\.|\s*Revisão)$/i, '').trim();
        });

        this.#done = checkBlocks[0].getCheckedStatus();
    }

    _parseSubject(fullText) {
        return fullText.split('[')[0].trim();
    }

    _parseReviewDate(fullText) {
        const match = fullText.match(/(\d{2})\/(\d{2})/);
        if (!match) return null;

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const baseDate = new Date(); 
        
        let revYear = baseDate.getFullYear();
        const baseMonth = baseDate.getMonth();
        
        if (month - 1 < 3 && baseMonth > 8) revYear++; 
        else if (month - 1 > 8 && baseMonth < 3) revYear--;

        return new Date(revYear, month - 1, day, 12, 0, 0);
    }

    getSubject = () => this.#subject;
    getScheduledDate = () => this.#date;
    getActivities = () => this.#activities;
    isCompleted = () => this.#done;

    /**
     * Gera os payloads literais através de um template YAML, garantindo que o Domínio
     * não conheça formatação e cores chumbadas da interface do Notion.
     */
    static buildNotionPayload(subject, date, activities) {
        const generator = new YamlPayloadGenerator('ReviewOutputTemplate.yaml');

        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dateStr = `${dayStr}/${monthStr}`;

        const titleBlock = generator.getComponent('title', {
            subject: subject,
            date: dateStr
        });

        const bulletBlocks = activities.map((atv, idx) => {
            const componentName = idx === 0 ? 'activity_first' : 'activity';
            return generator.getComponent(componentName, { activity: atv });
        });

        const checkBlock = generator.getComponent('check');

        return [
            titleBlock,
            ...bulletBlocks,
            checkBlock
        ];
    }
}

module.exports = ReviewTask;

