const Element = require('./Element');
const Task = require('./Task');

class TaskParser {
    parse(page) {
        let allBlocks = page.getBlocks();
        let actualPointer = page.getElementPointer();

        let title;
        let topics = [];
        let checks = [];

        // 1. Requer um heading_3
        if(actualPointer >= allBlocks.length || allBlocks[actualPointer].getType() !== 'heading_3') {
            return null;
        }
        title = allBlocks[actualPointer];
        actualPointer++;

        // 2. Busca tópicos (bulleted_list_item)
        let topicsDone = false;
        while((actualPointer < allBlocks.length) && !topicsDone) {
            let before = allBlocks[actualPointer - 1];
            let actual = allBlocks[actualPointer];

            if(actual.getType() !== 'bulleted_list_item') {
                if(before.getType() !== 'bulleted_list_item') {
                    return null;
                } else {
                    topicsDone = true;
                }
            } else {
                topics.push(actual);
                actualPointer++;
            }
        }

        if(topics.length < 1) return null;

        // 3. Busca checkboxes (to_do) mantendo o limite fixo (hardcoded) de 2 do usuário
        let count = 2;
        let checksDone = false;
        while((count > 0) && !checksDone && (actualPointer < allBlocks.length)) {
            let before = allBlocks[actualPointer - 1];
            let actual = allBlocks[actualPointer];

            if(actual.getType() !== 'to_do') {
                if(before.getType() !== 'to_do') {
                    return null;
                } else {
                    checksDone = true;
                }
            } else {
                checks.push(actual);
                actualPointer++;
                count--;
            }
        }

        if(checks.length < 1) return null;

        // Sucesso: avança o ponteiro oficial da página
        page.setElementPointer(actualPointer);
        return new Task(title, topics, checks);
    }
}

class GenericParser {
    parse(page) {
        // Simplesmente consome o próximo bloco
        return new Element([ page.getNextBlock() ]);
    }
}

class ElementBuilder {
    #page;
    #parsers;

    constructor(page) {
        this.#page = page;
        this.#parsers = [];
    }

    static fromPage(page) {
        page.verifyEndOfPage();
        return new ElementBuilder(page);
    }

    tryTask() {
        this.#parsers.push(new TaskParser());
        return this;
    }

    acceptGeneric() {
        this.#parsers.push(new GenericParser());
        return this;
    }

    build() {
        for (const parser of this.#parsers) {
            const element = parser.parse(this.#page);
            if (element) return element;
        }

        throw new Error(`Não foi possível extrair nenhum elemento da página ${this.#page.getId()} a partir do cursor ${this.#page.getElementPointer()}`);
    }
}

module.exports = ElementBuilder;
