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
const NOTION_TARGET_PAGE_ID = getEnv('NOTION_TARGET_PAGE_ID', null, false);

const GOOGLE_OAUTH_CLIENT_ID = getEnv('GOOGLE_OAUTH_CLIENT_ID', null, false);
const GOOGLE_OAUTH_CLIENT_SECRET = getEnv('GOOGLE_OAUTH_CLIENT_SECRET', null, false);
const AUTHORIZED_EMAIL = getEnv('AUTHORIZED_EMAIL', null, false);
const JWT_SECRET = getEnv('JWT_SECRET', 'default_secret', false); // Para desenvolvimento local caso falte
const PORT = getEnv('PORT', 3000, false);
const FRONTEND_URL = getEnv('FRONTEND_URL', 'http://localhost:5173', false);

module.exports = {
    COLLEGE_TASKS_PAGE_ID,
    NOTION_CONNECTION_TOKEN,
    NOTION_BASE_URL,
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    AUTHORIZED_EMAIL,
    JWT_SECRET,
    PORT,
    FRONTEND_URL,
    NOTION_TARGET_PAGE_ID
}