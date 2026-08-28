const RevisionService = require('./backend/src/services/RevisionService');
require('dotenv').config({ path: './backend/.env' });

(async () => {
    try {
        await RevisionService.scheduleRevisions('Teste', ['Teste teste teste'], '2026-08-28');
        console.log('Sucesso');
    } catch (e) {
        console.error(e);
    }
})();
