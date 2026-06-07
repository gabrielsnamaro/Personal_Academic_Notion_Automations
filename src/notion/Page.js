const { NOTION_CONNECTION_TOKEN } = require('../config');
const { Http, Headers } = require('../util/http/Http');
const Block = require('./Block');
const NotionController = require('./NotionController');

const generalHeaders = new Headers('Authorization', `Bearer ${NOTION_CONNECTION_TOKEN}`);
generalHeaders.add('Notion-Version', '2026-03-11');

class Page {
    #pagePayload;
    #id;
    #blocks;

    constructor(id, blocks, pagePayload) {
        this.#id = id;
        this.#blocks = blocks;
        this.#pagePayload = pagePayload;
    }

    static build = async (id) => {
        const pagePayload = await NotionController.getPage(id);
        const blocks = await Block.fromPage(id);

        return new Page(id, blocks, pagePayload);
    }

    getBlocks = () => this.#blocks;
}

async function test() {
    const page = await Page.build('16471fa4f246805bb5cce4d3e82b026d');

    page.getBlocks().forEach((block) => {
        console.log(block.toString() + '\n');
    })
}

test();

module.exports = Page;