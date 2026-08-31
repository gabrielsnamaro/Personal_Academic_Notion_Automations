const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

class YamlPayloadGenerator {
    #template;

    constructor(yamlFilename) {
        const fullPath = path.resolve(__dirname, '../../../schemas', yamlFilename);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        this.#template = yaml.load(fileContents);
    }

    /**
     * Interpolates variables into the JSON template using naive string replacement.
     * Must stringify first to replace everywhere, then parse back to JSON.
     */
    _interpolate(templateObject, variables) {
        let jsonStr = JSON.stringify(templateObject);
        
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            jsonStr = jsonStr.replace(regex, value);
        }
        
        return JSON.parse(jsonStr);
    }

    getComponent(componentName, variables = {}) {
        if (!this.#template[componentName]) {
            throw new Error(`Componente ${componentName} não encontrado no template YAML.`);
        }
        
        const componentTemplate = this.#template[componentName];
        return this._interpolate(componentTemplate, variables);
    }
}

module.exports = YamlPayloadGenerator;
