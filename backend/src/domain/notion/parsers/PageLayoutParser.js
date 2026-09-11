const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const NotionApiService = require('../../../services/NotionApiService');

class PageLayoutParser {
    #schema;

    constructor(schemaFilename = 'PageLayoutTemplate.yaml') {
        const fullPath = path.resolve(__dirname, '../../../schemas', schemaFilename);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        this.#schema = yaml.load(fileContents);
    }

    getReviewSectionSchema() {
        return this.#schema.review_section;
    }

    /**
     * Localiza o container de revisões varrendo a raiz da página e column_lists recursivamente,
     * orientando-se pelas regras declarativas do schema YAML.
     * 
     * @param {Object[]} rootBlocks - Blocos do primeiro nível da página
     * @param {string} pageId - ID da página raiz (fallback para parentContainer)
     * @returns {Promise<{ calloutBlock: Object|null, parentContainerId: string, children: Object[] }>}
     */
    async findReviewContainer(rootBlocks, pageId) {
        const sectionConfig = this.getReviewSectionSchema();
        const locator = sectionConfig.locator;
        const matchCriteria = locator.match_criteria;

        const checkBlockMatches = (block, children) => {
            if (block.type !== locator.container_type) return false;
            const targetChild = children[matchCriteria.child_index];
            if (!targetChild || targetChild.type !== matchCriteria.block_type) return false;

            const richText = targetChild[targetChild.type]?.rich_text || [];
            let text = richText.map(t => t.plain_text || t.text?.content || '').join('');
            if (matchCriteria.case_insensitive) {
                text = text.toLowerCase();
            }

            const searchFor = matchCriteria.case_insensitive 
                ? matchCriteria.text_contains.toLowerCase() 
                : matchCriteria.text_contains;

            return text.includes(searchFor);
        };

        // 1. Varredura no nível da raiz da página
        if (locator.search_paths.includes('root')) {
            for (const block of rootBlocks) {
                if (block.type === locator.container_type && block.has_children) {
                    const res = await NotionApiService.getPageBlocks(block.id);
                    const children = res.results || [];
                    if (checkBlockMatches(block, children)) {
                        return { calloutBlock: block, parentContainerId: pageId, children };
                    }
                }
            }
        }

        // 2. Varredura dentro de column_list -> columns
        if (locator.search_paths.includes('column_list.columns')) {
            for (const block of rootBlocks) {
                if (block.type === 'column_list' && block.has_children) {
                    const colListRes = await NotionApiService.getPageBlocks(block.id);
                    const columns = colListRes.results || [];

                    for (const col of columns) {
                        if (col.type === 'column' && col.has_children) {
                            const colRes = await NotionApiService.getPageBlocks(col.id);
                            const colBlocks = colRes.results || [];

                            for (const innerBlock of colBlocks) {
                                if (innerBlock.type === locator.container_type && innerBlock.has_children) {
                                    const res = await NotionApiService.getPageBlocks(innerBlock.id);
                                    const children = res.results || [];
                                    if (checkBlockMatches(innerBlock, children)) {
                                        return { calloutBlock: innerBlock, parentContainerId: col.id, children };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return { calloutBlock: null, parentContainerId: pageId, children: [] };
    }

    /**
     * Retorna os payloads estruturados do container e do cabeçalho
     * conforme declarado no YAML.
     */
    getContainerPayload() {
        const outputConfig = this.getReviewSectionSchema().container_output;
        const calloutPayload = {
            object: outputConfig.object,
            type: outputConfig.type,
            [outputConfig.type]: {
                rich_text: outputConfig.callout.rich_text,
                icon: outputConfig.callout.icon,
                color: outputConfig.callout.color
            }
        };

        const headerBlock = outputConfig.header_block;
        const headerPayload = {
            object: headerBlock.object,
            type: headerBlock.type,
            [headerBlock.type]: {
                rich_text: headerBlock[headerBlock.type].rich_text.map(rt => ({
                    type: rt.type,
                    text: { content: rt.text.content }
                })),
                color: headerBlock[headerBlock.type].color,
                is_toggleable: headerBlock[headerBlock.type].is_toggleable
            }
        };

        return { calloutPayload, headerPayload };
    }
}

module.exports = PageLayoutParser;
