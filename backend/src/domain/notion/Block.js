const NotionApiService = require("../../services/NotionApiService");

function minimizePayload(blockPayload) {
    const { id, type } = blockPayload;
    const result = { id, type };
    result.content_wrapper = blockPayload[result.type];

    return result;
}

class Block {
    #payload;

    constructor(payload) {
        this.#payload = minimizePayload(payload);
    }

    static fromPage = async (id) => {
        const response = await NotionApiService.getPageBlocks(id);
        const results = response?.results || [];

        const blocks = [];

        for(const result of results) {
            blocks.push(new Block(result));
        }

        return blocks;
    }

    toString = () => {
        return `Type: ${this.getType()} | ID: ${this.getId()} `;
    }

    getPlainText = () => {
        const wrapper = this.#payload.content_wrapper;
        if (wrapper && wrapper.rich_text) {
            return wrapper.rich_text.map(rt => rt.text?.content || rt.plain_text || '').join('');
        }
        return '';
    }

    getCheckedStatus = () => {
        const wrapper = this.#payload.content_wrapper;
        return wrapper && wrapper.checked === true;
    }

    getType = () => this.#payload.type;
    getId = () => this.#payload.id;
    getRawPayload = () => this.#payload; // Export raw for rebuilding if necessary
}

module.exports = Block;