const { NOTION_CONNECTION_TOKEN } = require('../config');
const { Http, Headers } = require('../util/http/Http');
const NotionHttp = require('./NotionHttp');

const generalHeaders = new Headers('Authorization', `Bearer ${NOTION_CONNECTION_TOKEN}`);
generalHeaders.add('Notion-Version', '2026-03-11');

class Page {
    #page;
    #blocks;

    constructor(page) {
        this.#page = page;
    }

    static build = async (id) => {
        const page = await NotionHttp.getPage(id);

        return new Page(page);
    }

    print = () => {
        console.log(JSON.stringify(this.#page, null, 2));
    }
}

async function test() {
    const pagina = await Page.build('16471fa4f246805bb5cce4d3e82b026d');

    pagina.print();
}

test();

module.exports = Page;