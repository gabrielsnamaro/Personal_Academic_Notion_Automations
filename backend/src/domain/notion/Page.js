const Block = require('./Block');
const ElementBuilder = require('./parsers/ElementBuilder');
const NotionApiService = require('../../services/NotionApiService');

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
        const pagePayload = await NotionApiService.getPage(id);
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
            throw new Error('Não há mais blocos para serem extraídos dessa página.');
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

module.exports = Page;
