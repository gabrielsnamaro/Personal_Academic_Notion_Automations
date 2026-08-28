const NotionApiService = require('./backend/src/services/NotionApiService');
require('dotenv').config({ path: './backend/.env' });

(async () => {
    try {
        let hasMore = true;
        let cursor = undefined;
        let allBlocks = [];
        
        while (hasMore) {
            const url = `https://api.notion.com/v1/blocks/${process.env.NOTION_TARGET_PAGE_ID}/children` + (cursor ? `?start_cursor=${cursor}` : '');
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${process.env.NOTION_CONNECTION_TOKEN}`, 'Notion-Version': '2026-03-11' } });
            const data = await res.json();
            allBlocks = allBlocks.concat(data.results);
            hasMore = data.has_more;
            cursor = data.next_cursor;
        }

        const headings = allBlocks.filter(b => b.type.startsWith('heading_'));
        console.log(JSON.stringify(headings.map(h => h[h.type].rich_text.map(rt => rt.plain_text).join('')), null, 2));
    } catch (e) {
        console.error(e);
    }
})();
