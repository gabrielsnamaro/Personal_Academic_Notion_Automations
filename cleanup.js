const NotionApiService = require('./backend/src/services/NotionApiService');
require('dotenv').config({ path: './backend/.env' });

async function cleanup() {
    const res = await NotionApiService.getPageBlocks(process.env.NOTION_TARGET_PAGE_ID);
    const headings = res.results.filter(b => b.type === 'heading_1' && b.heading_1.rich_text.some(rt => rt.plain_text.toLowerCase().includes('revisões marcadas')));
    
    // Deleta os duplicados, mantendo só o primeiro
    for (let i = 1; i < headings.length; i++) {
        console.log(`Deletando duplicata: ${headings[i].id}`);
        await NotionApiService.deleteBlock(headings[i].id);
        await new Promise(r => setTimeout(r, 400));
    }
}
cleanup();
