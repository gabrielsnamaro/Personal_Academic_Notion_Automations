const { NOTION_CONNECTION_TOKEN, NOTION_BASE_URL } = require('../config');
const { Http, Headers } = require('../util/http/Http');

const generalHeaders = new Headers('Authorization', `Bearer ${NOTION_CONNECTION_TOKEN}`);
generalHeaders.add('Notion-Version', '2026-03-11');

class NotionHttp extends Http {
    static getPage = async (pageId) => {
        const url = `${NOTION_BASE_URL}/pages/${pageId}`;
        return await Http.get(url, null, generalHeaders);
    }
}

module.exports = NotionHttp;