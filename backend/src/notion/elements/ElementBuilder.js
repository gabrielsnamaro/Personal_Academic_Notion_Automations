const Element = require('./Element');
const Task = require('./Task');

class ElementBuilder {
    #page;
    #element;
    #acceptedTypes;

    constructor(page) {
        this.#element = null;
        this.#acceptedTypes = new Set();

        this.#page = page;
    }

    static fromPage = (page) => {
        page.verifyEndOfPage();

        let builder = new ElementBuilder(page);

        return builder;
    }

    tryTask = () => {
        this.#acceptedTypes.add('Tarefa');

        if(!this.#buildable()) {
            let allBlocks = this.#page.getBlocks();
            let actualPointer = this.#page.getElementPointer();

            let newBlocks = [];
            let title;
            let topics = [];
            let checks = [];

            if(allBlocks[actualPointer].getType() != 'heading_3') {
                return this;
            } 
            
            title = allBlocks[actualPointer];
            actualPointer++;

            let topicsDone = false;
            while((actualPointer < allBlocks.length) && !topicsDone) {
                let before = allBlocks[actualPointer - 1];
                let actual = allBlocks[actualPointer];

                if(actual.getType() != 'bulleted_list_item') {
                    if(before.getType() != 'bulleted_list_item') {
                        return this;
                    } else {
                        topicsDone = true;
                    }
                } else {
                    topics.push(actual);
                    actualPointer++;
                }
            }

            if(topics.length < 1) return this;

            let count = 2;
            let checksDone = false;
            while((count > 0) && !checksDone && (actualPointer < allBlocks.length)) {
                let before = allBlocks[actualPointer - 1];
                let actual = allBlocks[actualPointer];

                if(actual.getType() != 'to_do') {
                    if(before.getType() != 'to_do') {
                        return this;
                    } else {
                        checksDone = true;
                    }
                } else {
                    checks.push(actual);
                    actualPointer++;
                    count--;
                }
            }

            if(checks.length < 1) return this;

            this.#setElement(new Task(title, topics, checks));
            this.#page.setElementPointer(actualPointer);
        }

        return this;
    }

    #setElement = (element) => this.#element = element;

    acceptGeneric = () => {
        this.#acceptedTypes.add('Genérico');

        if(!this.#buildable()) {
            this.#setElement(new Element([ this.#page.getNextBlock() ]));
        }

        return this;
    }

    build = () => {
        this.#verifyBuildable();

        return this.#element;
    }

    #buildable = () => !!this.#element;

    #verifyBuildable = () => {
        if(!this.#buildable()) throw new Error(`Não foi possível extrair nenhum elemento da página ${this.#page.getId()} a partir do cursor ${this.#page.getElementPointer()} que seja de um dos seguintes tipos aceitos: ${[...this.#acceptedTypes]}`);
    }
}

module.exports = ElementBuilder;