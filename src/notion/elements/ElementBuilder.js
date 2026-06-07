const Element = require('./Element');
const Task = require('./Task');

class ElementBuilder {
    #page;
    #candidate;

    constructor(page) {
        this.#candidate = {
            typeDetermined: false,
            element: null
        };

        this.#page = page;
    }

    static fromPage = (page) => {
        let builder = new ElementBuilder(page);

        return builder;
    }

    tryTask = () => {
        if(!this.#candidate.typeDetermined) {
            let allBlocks = this.#page.getBlocks();

            let newBlocks = [];
            let title;
            let topics = [];
            let checks = [];

            let task = null;

            let actualPointer = this.#page.getElementPointer();

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

            this.#candidate.element = new Task(title, topics, checks);
            this.#page.setElementPointer(actualPointer);
            this.#candidate.typeDetermined = true;
        }

        return this;
    }

    build = () => {
        if(!this.#candidate.typeDetermined) {
            return new Element([ this.#page.getNextBlock() ]);
        } else {
            return this.#candidate.element;
        }
    }
}

module.exports = ElementBuilder;