const { NOTION_CONNECTION_TOKEN, NOTION_BASE_URL } = require('../config');
const { Http, Headers } = require('../util/http/Http');

const generalHeaders = new Headers('Authorization', `Bearer ${NOTION_CONNECTION_TOKEN}`);
generalHeaders.add('Notion-Version', '2026-03-11');

class NotionController {
    static getPage = async (pageId) => {
        const url = `${NOTION_BASE_URL}/pages/${pageId}`;
        return await Http.get(url, null, generalHeaders);
    }

    static getPageBlocks = async (pageId) => {
        const url = `${NOTION_BASE_URL}/blocks/${pageId}/children`;
        return await Http.get(url, null, generalHeaders);
    }
}

module.exports = NotionController;