const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });


function getEnv(name, fallback = null, required = true) {
    let variable = process.env[name];

    if(!variable) {
        if(required)
            throw new Error(`Variável obrigatória ${name} não configurada. `);
        
        variable = fallback;
    }

    return variable;
}

const COLLEGE_TASKS_PAGE_ID = getEnv('COLLEGE_TASKS_PAGE_ID');
const NOTION_CONNECTION_TOKEN = getEnv('NOTION_CONNECTION_TOKEN');
const NOTION_BASE_URL = 'https://api.notion.com/v1';

module.exports = {
    COLLEGE_TASKS_PAGE_ID,
    NOTION_CONNECTION_TOKEN,
    NOTION_BASE_URL
}