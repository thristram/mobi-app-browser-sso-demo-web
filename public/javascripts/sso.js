

'use strict';

console.log('start');
let identity_sso_cookie_exchange_promise = new Promise(function(resolve, reject) {
        
        const cookieObj = exchangeAuthCodeForCookies();
        resolve(cookieObj);
});
document.getElementById('cookies').innerHTML=document.cookie;

async function initAuth(authPortalConfig, option, ssoTargetApp, callbackFunction) {
	    console.log('initAuth');

        // 1. fetch current url
        const currentPageURL = new URL(window.location);

        // 2. Check if current page contains authCode.
        const ssoAuthCode = currentPageURL.searchParams.get('identity_sso_auth_code');

        if (ssoAuthCode === null) {
            // 1. generate AuthPortal sign-in url



            // 2. generate code verifier and store in session-storage

            const codeVerifier = makeid(10);
            localStorage.setItem('code_verifier', codeVerifier);
            const codeChallenge = await sha256(codeVerifier);

            // 3. Build univeral link url
            let universalLinkUrl = 'https://redirect.ackapp.com/universallink?code_challenge=' + codeChallenge + '&return_to=' + encodeURIComponent(window.location); 


            window.location = universalLinkUrl;
        } else {

        	console.log('found SSO auth code:' + ssoAuthCode);
            
            if (identity_sso_cookie_exchange_promise !== undefined) {
                console.log('found promise');
                Promise.all([identity_sso_cookie_exchange_promise]).then(
                    (data) => {
                    	console.log('Promise already finished, calling callback');
                        const result = {result: 'sso_success'};
                        document.getElementById('cookies').innerHTML=document.cookie;
                        callbackFunction(data);
                    }
                ).catch(function(err) {
                          alert('error');
                });
            } else {
                console.log('no promise');
            }

        }
}

function exchangeAuthCodeForCookies() {
        const currentPageURL = new URL(window.location);
        const ssoAuthCode = currentPageURL.searchParams.get('identity_sso_auth_code');
        const codeVerifier = localStorage.getItem('code_verifier')

        if (ssoAuthCode !== null && codeVerifier !== null) {
            // For POC demo, read cookies directly
            const cookieString = window.atob(currentPageURL.searchParams.get('identity_sso_cookies'));
            const cookieObj = JSON.parse(cookieString);

            Object.keys(cookieObj).forEach(function(key) {
                setCookie(key, cookieObj[key], 365);
            });

            localStorage.removeItem('code_verifier');
            return cookieObj;
        }
        return {
            result: 'no cookie found'
        }
}

function setCookie(name,value,days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/; Secure";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

async function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);                    

    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string                  
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}