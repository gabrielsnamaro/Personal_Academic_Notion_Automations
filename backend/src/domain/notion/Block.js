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

    /**
     * Converte o bloco encapsulado de volta para o formato literal/JSON 
     * esperado pela API do Notion (útil para reinjeção/Extract-Sort-Reapply).
     */
    toNotionPayload = () => {
        const type = this.getType();
        const wrapper = this.#payload.content_wrapper;

        if (!wrapper || !wrapper.rich_text) return null;

        const payload = {
            object: 'block',
            type: type,
            [type]: {
                rich_text: wrapper.rich_text.map(rt => {
                    const rtPayload = {
                        type: 'text',
                        text: { content: rt.text?.content || rt.plain_text },
                        annotations: rt.annotations
                    };
                    if (rt.text?.link) {
                        rtPayload.text.link = rt.text.link;
                    }
                    return rtPayload;
                })
            }
        };

        if (type === 'to_do') {
            payload[type].checked = wrapper.checked;
        }
        if (type.startsWith('heading_')) {
            payload[type].color = wrapper.color;
            payload[type].is_toggleable = wrapper.is_toggleable;
        }
        if (type === 'bulleted_list_item') {
            payload[type].color = wrapper.color;
        }

        return payload;
    }

    getType = () => this.#payload.type;
    getId = () => this.#payload.id;
    getRawPayload = () => this.#payload;
}

module.exports = Block;