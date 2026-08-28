const { NOTION_CONNECTION_TOKEN, NOTION_BASE_URL } = require('../config');
const { Http, Headers } = require('../util/http/Http');

const generalHeaders = new Headers('Authorization', `Bearer ${NOTION_CONNECTION_TOKEN}`);
generalHeaders.add('Notion-Version', '2026-03-11');

const jsonHeaders = generalHeaders.copyWith('Content-Type', 'application/json');

class NotionApiService {
    static getPage = async (pageId) => {
        const url = `${NOTION_BASE_URL}/pages/${pageId}`;
        return await Http.get(url, null, generalHeaders);
    }

    static getPageBlocks = async (pageId) => {
        let allBlocks = [];
        let hasMore = true;
        let nextCursor = undefined;
        
        while (hasMore) {
            let url = `${NOTION_BASE_URL}/blocks/${pageId}/children`;
            if (nextCursor) {
                url += `?start_cursor=${nextCursor}`;
            }
            const data = await Http.get(url, null, generalHeaders);
            allBlocks = allBlocks.concat(data.results);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        return { results: allBlocks };
    }

    static appendBlocks = async (parentId, children, afterBlockId = null) => {
        const url = `${NOTION_BASE_URL}/blocks/${parentId}/children`;
        const payload = { children };
        if (afterBlockId) {
            payload.after = afterBlockId;
        }
        return await Http.patch(url, payload, null, jsonHeaders);
    }

    static deleteBlock = async (blockId) => {
        const url = `${NOTION_BASE_URL}/blocks/${blockId}`;
        return await Http.delete(url, null, generalHeaders);
    }
}

module.exports = NotionApiService;
