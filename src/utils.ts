interface QueryParam {
    key: string;
    value: string;
}

enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

export class Http {
    static readonly #request = async (method: HttpMethod, url: string, params: Array<QueryParam>, body?: object) => {
        const urlWithParams = this.#includeParams(url, params);
        const options = {
            method,
        }
        try {
            const res: Response = await fetch(urlWithParams, options);

            return res;
        } catch(err) {
            console.error('Erro na requisição', err);
        }
    }

    static #includeParams = (url: string, params: Array<QueryParam>): string => {
        let result = url;
        
        params.forEach((param, index) => {
            const prefix = index == 0
                ? '?='
                : '&=';
            
            result += `${prefix}${param.key}=${encodeURIComponent(param.value)}`;
        });

        return result;
    }

    static readonly get = async (url: string, params?: Array<QueryParam>) => {
        return await this.#request(HttpMethod.GET, url, params || []);
    }
}