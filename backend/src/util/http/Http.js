class Headers {
    #headers;

    constructor(name = null, value = null, headers = []) {
        this.#headers = headers;

        if(name && value)
            this.add(name, value);
    }

    add = (name, value) => {
        this.#headers.push({ name, value }) ;
    }

    json = () => {
        const result = {};

        for(const { name, value } of this.#headers) {
            result[name] = value;
        }

        return result;
    }

    copy = () => {
        return new Headers(null, null, this.#headers);
    }

    copyWith = (name, value) => {
        return new Headers(name, value, this.#headers);
    }
}

class Http {
    static get = (url, params = [], headers = null) => request(
        'GET', 
        insertQueryParams(url, params), 
        undefined, 
        headers
    );

    static delete = (url, params = [], headers = null) => request(
        'DELETE', 
        insertQueryParams(url, params), 
        undefined, 
        headers
    );

    static post = (url, payload, params = [], headers = null) => request(
        'POST', 
        insertQueryParams(url, params), 
        payload, 
        headers
    );

    static put = (url, payload, params = [], headers = null) => request(
        'PUT', 
        insertQueryParams(url, params), 
        payload, 
        headers
    );

    static patch = (url, payload, params = [], headers = null) => request(
        'PATCH', 
        insertQueryParams(url, params), 
        payload, 
        headers
    );
}

async function request(method, url, payload = undefined, headers = new Headers()) {
    try {
        validateHeaders(headers);

        const options = {
            method,
            headers: headers.json()
        }

        if(payload)
            options.body = JSON.stringify(payload);

        const res = await fetch(url, options);

        if(!res.ok)
            throw new Error(`HTTP ${res.status}`);

        return await res.json();
    } catch(err) {
        console.error('Falha na requisição: ', err);
        throw err;
    }
}

function insertQueryParams(url, params = []) {
    if(!params) return url;
    
    let newUrl = url;

    params.forEach((param, _index) => {
        const prefix = _index == 0
            ? '?'
            : '&'
        
        newUrl += `${prefix}${param.key}=${encodeURIComponent(param.value)}`;
    });

    return newUrl;
}

function validateHeaders(headers) {
    if(!(headers instanceof Headers))
        throw new Error('Cabeçalhos inválidos. ');

    return headers;
}

module.exports = { Http, Headers };