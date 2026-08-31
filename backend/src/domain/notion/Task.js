const Element = require('./Element');

class Task extends Element {
    #title;
    #topics;
    #checks;

    constructor(title, topics, checks) {
        super([ title, ...topics, ...checks ]);

        this.#title = title;
        this.#topics = topics;
        this.#checks = checks;
    }

    toString = () => {
        let result = '-=-=-=- TAREFA -=-=-=-\n';

        result += this.#title.toString() + '\n';
        
        for(const topic of this.#topics) {
            result += topic.toString() + '\n';
        }

        for(const check of this.#checks) {
            result += check.toString() + '\n';
        }

        result += '-=-=-=-=-=-=-\n\n';

        return result;
    }
}

module.exports = Task;