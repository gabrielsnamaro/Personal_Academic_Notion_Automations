class Element {
    #typeDetermined;
    #blocks;

    constructor(blocks) {
        this.#typeDetermined = false;
        this.#blocks = blocks;
    }

    toString = () => {
        let result = '-=-=-=- ELEMENTO GENÉRICO -=-=-=-\n';

        for(const block of this.#blocks) {
            result += block.toString() + '\n';
        }

        result += '-=-=-=-=-=-=-\n\n'

        return result;
    }
}

module.exports = Element;