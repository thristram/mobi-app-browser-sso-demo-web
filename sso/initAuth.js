const identity_sso_url_helper = require('./identity_sso_url_helper')
const identity_sso_code_challenge_helper = require('./identity_sso_code_challenge_helper')

const URL_KEY_IDENTITY_SSO_AUTH_CODE = 'identity_sso_auth_code';
const URL_KEY_IDENTITY_SSO_CODE_CHALLENGE = 'identity_sso_code_challenge';
const URL_KEY_IDENTITY_SSO_RETURN_FROM_APP = 'identity_sso_return_from_app';

const STORAGE_KEY_CODE_VERIFIER = 'identity_sso_code_verifier_storage';
const CODE_VERIFIER_LENGTH = 128;

const CODE_VERIFIER_TTL = 24*3600*1000;

const ERROR_RESPONSE = Object.freeze({
    NetworkError: {errorCode: 1, errorMessage: 'Network is not available, please try again later.'},
    InternalError: {errorCode: 2, errorMessage: 'Internal service error.'},
    InternalStateError: {errorCode: 3, errorMessage: 'Internal state error, auth_code might be invalid or expired.'},
    WrongBrowserWithAuthCodeError: {errorCode: 4, errorMessage: 'Returned to the wrong browser with auth_code. Customer could be using non-default browser.'},
    WrongBrowserWithoutAuthCodeError: {errorCode: 5, errorMessage: 'Returned to the wrong browser without auth_code, Customer could be using non-default browser.'},
});


let initAuth = (authPortalConfig, option, ssoTargetApp, callbackFunction) =>  {


    // Case 1, SSO flows just get initialized, no auth_code & code_challenge in url
    const codeVerifier = identity_sso_code_challenge_helper.generateCodeVerifier(CODE_VERIFIER_LENGTH);
    const codeChallenge = identity_sso_code_challenge_helper.generateCodeChallenge(codeVerifier);
    let link = identity_sso_url_helper.buildUniversalLink(authPortalConfig, option, ssoTargetApp, codeChallenge)

    console.log(link)
    return link
}

module.exports = {initAuth: initAuth}

