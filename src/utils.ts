interface QueryParam {
    key: string;
    value: string;
}

interface Header {
    name: string,
    value: string
}

enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

export class Http {
    static readonly #request = async (method: HttpMethod, url: string, params: Array<QueryParam> = [], headersList: Array<Header> = [], body?: object) => {
        const urlWithParams = this.#includeParams(url, params);

        let headers: HeadersInit = {};
        headersList.forEach((header) => {
            headers[header.name] = header.value
        });

        const options = {
            method,
            headers
        }

        try {
            const res: Response = await fetch(urlWithParams, options);
            const data = await res.json();
            return data;
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

    static readonly get = async (url: string, headers?: Array<Header>, params?: Array<QueryParam>) => {
        return await this.#request(HttpMethod.GET, url, params, headers);
    }
}