import { Http } from './src/utils.ts';

async function teste() {
    console.log(await Http.get('https://developers.notion.com/llms.txt'));
}

teste();