const identity_sjcl = require('./crypto')

function generateCodeChallenge(codeVerifier) {

    return identity_sjcl.computeSha256Hash(codeVerifier);
}

function generateCodeVerifier(length) {

    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports =  {generateCodeChallenge: generateCodeChallenge,
    generateCodeVerifier: generateCodeVerifier}