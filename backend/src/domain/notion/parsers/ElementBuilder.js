const Element = require('../Element');
const Task = require('../Task');
const ReviewTask = require('../ReviewTask');
const YamlSchemaParser = require('./YamlSchemaParser');

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
        // Instancia o parser dinâmico lendo o YAML, e mapeia o resultado para a classe Task
        const taskParser = new YamlSchemaParser('TaskTemplate.yaml', (parsedMap) => {
            return new Task(parsedMap.title[0], parsedMap.topics, parsedMap.checks);
        });
        
        this.#parsers.push(taskParser);
        return this;
    }

    tryReviewTask() {
        // Usa o novo schema focado em revisões
        const reviewParser = new YamlSchemaParser('ReviewTemplate.yaml', (parsedMap) => {
            return new ReviewTask(parsedMap.title, parsedMap.topics, parsedMap.checks);
        });
        
        this.#parsers.push(reviewParser);
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
