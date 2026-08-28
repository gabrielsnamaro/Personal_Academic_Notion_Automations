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

        if(!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try {
                const errBody = await res.json();
                errorMsg += ` - ${JSON.stringify(errBody)}`;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        return await res.json();
    } catch(err) {
        console.error('Falha na requisição: ', err);
        throw err;
    }
}
