/* globals define */
(function(root, factory){
    if(typeof define === 'function' && define.amd) {
        define([], function(){
            return factory();
        });
    } else if(typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CONSTANTS = factory();
    }
}(this, function() {
    const LOGIN_URL = 'https://apps.sciserver.org/login-portal/keystone/v3/tokens';
    const isBrowser = typeof window !== 'undefined';
    const fetch = isBrowser ? window.fetch : require('node-fetch');
    const Headers = isBrowser ? window.Headers : fetch.Headers;

    async function loginViaProxy(username, password) {
        const url = '/routers/SciServerAuth/token';
        const opts = {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({username, password})
        };
        const response = await fetch(url, opts);
        return await response.text();
    }

    async function login(username, password) {
        if (isBrowser) {
            return loginViaProxy(username, password);
        }

        const url = `${LOGIN_URL}?TaskName=DeepForge.Authentication.Login`;
        const opts = {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            body: getLoginBody(username, password)
        };
        const response = await fetch(url, opts);
        return response.headers.get('X-Subject-Token');
    }

    login.memoize = function() {
        let tokens = {};
        return function l(username, password) {
            tokens[username] = tokens[username] || {};
            if (!tokens[username][password]) {
                tokens[username][password] = login(username, password);
            }
            return tokens[username][password];
        };
    };

    function getLoginBody(username, password) {
        return JSON.stringify({
            auth: {
                identity: {
                    password: {
                        user: {
                            name: username,
                            password: password
                        }
                    }
                }
            }
        });
    }

    return login;
}));
