const { NOTION_CONNECTION_TOKEN } = require('../config');
const { Http, Headers } = require('../util/http/Http');
const Block = require('./Block');
const ElementBuilder = require('./elements/ElementBuilder');
const NotionController = require('./NotionController');

const generalHeaders = new Headers('Authorization', `Bearer ${NOTION_CONNECTION_TOKEN}`);
generalHeaders.add('Notion-Version', '2026-03-11');

class Page {
    #pagePayload;
    #id;
    #blocks;
    #blockPointer;

    constructor(id, blocks, pagePayload) {
        this.#id = id;
        this.#blocks = blocks;
        this.#blockPointer = 0;
        this.#pagePayload = pagePayload;
    }

    static build = async (id) => {
        const pagePayload = await NotionController.getPage(id);
        const blocks = await Block.fromPage(id);

        return new Page(id, blocks, pagePayload);
    }

    getBlocks = () => this.#blocks;

    getNextBlock = () => {
        this.verifyEndOfPage();

        const actual = this.#blocks[this.#blockPointer];
        this.#blockPointer++;

        return actual;
    }

    getElementPointer = () => this.#blockPointer;

    setElementPointer = (pointer) => this.#blockPointer = pointer;

    resetBlockCursor = () => this.#blockPointer = 0; 

    getNextElement = () => {
        return ElementBuilder.fromPage(this)
            .tryTask()
            .acceptGeneric()
            .build();
    }

    endOfPage = () => this.#blocks.length <= this.#blockPointer;

    verifyEndOfPage = () => {
        if(this.endOfPage()) {
            throw new Error('Não há mais blocos para serem extraídos dessa página. ');
        }
    }

    extractRemainingElements = () => {
        const elements = [];

        while(!this.endOfPage())
            elements.push(this.getNextElement());
        
        return elements;      
    }

    listAllElements = () => {
        const cursor = this.#blockPointer;
        let elements = [];

        this.setElementPointer(0);
        elements = this.extractRemainingElements();
        this.setElementPointer(cursor);
        
        return elements;
    }

    getId = () => this.#id;
}

async function test() {
    const page = await Page.build('31971fa4f24680d190c9dff3e913bd3e');

    page.listAllElements()
        .map((e) => e.toString())
        .forEach((e) => console.log(e.toString()));
}

test();

module.exports = Page;