const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

class YamlSchemaParser {
    #schema;
    #mapper;

    constructor(yamlFilename, mapper) {
        const fullPath = path.resolve(__dirname, '../../../schemas', yamlFilename);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        this.#schema = yaml.load(fileContents);
        this.#mapper = mapper; 
    }

    parse(page) {
        const allBlocks = page.getBlocks();
        let actualPointer = page.getElementPointer();
        
        const result = {};

        for (const component of this.#schema.components) {
            const { id, type, min, max } = component;
            const matchedBlocks = [];

            let done = false;
            while (!done && actualPointer < allBlocks.length) {
                if (max !== -1 && matchedBlocks.length >= max) {
                    done = true;
                    break;
                }

                const actual = allBlocks[actualPointer];
                if (actual.getType() === type) {
                    matchedBlocks.push(actual);
                    actualPointer++;
                } else {
                    done = true;
                }
            }

            if (matchedBlocks.length < min) {
                return null;
            }

            result[id] = matchedBlocks;
        }

        page.setElementPointer(actualPointer);
        
        if (this.#mapper) {
            return this.#mapper(result);
        }

        return result;
    }
}

module.exports = YamlSchemaParser;
