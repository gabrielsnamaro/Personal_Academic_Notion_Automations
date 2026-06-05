class Headers {
    #headers;

    constructor(name = null, value = null) {
        this.#headers = [];

        if(name && value)
            this.add(name, value);
    }

    add = (name, value) => {
        this.#headers += { name, value };
    }

    json = () => {
        const result = {};

        for(const { name, value } of this.#headers) {
            result[name] = value;
        }

        return result;
    }
}

module.exports = Headers;