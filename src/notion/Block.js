const NotionController = require("./NotionController");

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
        const response = await NotionController.getPageBlocks(id);
        const results = response?.results || [];

        const blocks = [];

        for(const result of results) {
            blocks.push(new Block(result));
        }

        return blocks;
    }

    toString = () => {
        return JSON.stringify(this.#payload, null, 2);
    }
}

module.exports = Block;