import { Configuration } from './config.ts';
import { Http } from './utils.ts';
import fs from 'node:fs/promises';

async function test() {
    const url = `${Configuration.BASE_URL}/blocks/${Configuration.PAGE_ID}/children`;
    const headers = [ 
        { name: 'Authorization', value: `Bearer ${Configuration.NOTION_TOKEN}` },
        { name: 'Notion-Version', value: '2022-06-28' }
    ];
    
    try {
        const res = await Http.get(url, headers);
        const outputString = JSON.stringify(res, null, 2);
        await fs.writeFile('resultado.txt', outputString, 'utf-8');
        
        console.log('Arquivo "resultado.txt" salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao buscar ou salvar os dados:', error);
    }
}

test();