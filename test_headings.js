const NotionApiService = require('./backend/src/services/NotionApiService');
require('dotenv').config({ path: './backend/.env' });

(async () => {
    try {
        const res = await NotionApiService.getPageBlocks(process.env.NOTION_TARGET_PAGE_ID);
        const headings = res.results.filter(b => b.type.startsWith('heading_'));
        console.log(JSON.stringify(headings.map(h => h[h.type].rich_text.map(rt => rt.plain_text).join('')), null, 2));
    } catch (e) {
        console.error(e);
    }
})();
