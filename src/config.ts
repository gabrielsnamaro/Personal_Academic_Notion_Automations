import dotenv from 'dotenv';
dotenv.config();

export class Configuration {
    static readonly #getEnv = (name: string, required?: boolean, fallback?: string) => {
        let result = process.env[name];

        if(!name) {
            if(required)
                throw new Error(`Variável de ambiente "${name}" não definida. `);
            result = fallback;
        }

        return result;
    }

    static readonly PAGE_ID = this.#getEnv('COLLEGE_TASKS_PAGE_ID', true);
    static readonly NOTION_TOKEN = this.#getEnv('NOTION_CONNECTION_TOKEN', true);
    static readonly BASE_URL = 'https://api.notion.com/v1';
}
