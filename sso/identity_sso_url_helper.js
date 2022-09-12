const URL_KEY_BROWSER = 'browser';
const URL_KEY_ACCOUNT_POOL = 'account_pool';
const URL_KEY_RETURN_URL = 'return_url';
const URL_KEY_APPLICATION_NAME = 'application_name';
const URL_KEY_APPLICATION_CONTEXT = 'application_context';
const URL_KEY_LANGUAGE = 'language';
const URL_KEY_MERCHANT_ID = 'merchant_id';
const URL_KEY_CLIENT_ID = 'client_id';
const URL_KEY_CONSENT_UI = 'consent_ui';
const URL_KEY_SIGNIN_URL = 'signin_url';
const URL_KEY_IDENTITY_SSO_CODE_CHALLENGE = 'identity_sso_code_challenge';

const identity_sso_configuration = require('./identity_sso_configuration')


/**
 * Get the current path of the URL, starting with "/"
 * @returns {string} The current path of the URL
 */
const pathname = function() {
    return '/atb/consent'
    // return window.location.pathname;
};

/**
 * Get the current queryString of the URL, starting with "?"
 * @returns {string} The current queryString of the URL
 */
const queryString = function() {
    return ''
    // return window.location.search;
};

/**
 * Get the given url's query param based on given key
 *
 * @param {string}} url
 * @param {string} key
 * @returns value of the query param
 */
const getUrlParam = function(url, key) {
    const currentURL = new URL(url);
    return currentURL.searchParams.get(key);
};

/**
 * Get the current origin of the URL
 * @returns {string} The current origin of the URL
 */
const origin = function() {
    return window.location.origin;
};

/**
 * Get the current host of the URL
 * @returns {string} The current host of the URL
 */
const host = function() {
    return window.location.host;
};

/**
 * Get the current hostname of the URL
 * @returns {string} The current hostname of the URL
 */
const hostname = function() {
    return window.location.hostname;
};

/**
 * Get the current full URL
 * @returns {string} The current full URL
 */
const href = function() {
    return window.location.href;
};

/**
 * Redirects the page to the given URL
 * @param url {string} The URL to redirect to
 */
const redirect = function(url) {
    window.location = url;
};

/**
 * Redirects the page to the given relative path
 * @param path {string} The path to redirect to
 */
const redirectPath = function(path) {
    window.location.href = path;
};

/**
 * Refresh the current page
 */
const reload = function() {
    // Passing "true" forces the browser to reload from the server.
    window.location.reload(true);
};

/**
 * Replace the current url, no history appended
 */
const replace = function(url) {
    window.location.replace(url);
};

/**
 * Check if the given domain is amazon domain.
 *
 * @param {} domain
 * @returns true if the domain is amazon domain
 */
const isAmazonDomain = function(domain) {
    return true;
};

const getAuthPortalUrl = function(authPortalConfig) {
    // if completeSignInURL is defined, we simply directly use that.
    if (typeof authPortalConfig['completeSignInURL'] !== 'undefined') {
        return authPortalConfig['completeSignInURL'];
    } else {
        const authPortalUrl = new URL('https://' + authPortalConfig['domain'] + '/ap/signin');
        authPortalUrl.searchParams.append('openid.assoc_handle', authPortalConfig['assocHandle']);
        authPortalUrl.searchParams.append('pageId', authPortalConfig['pageId']);
        authPortalUrl.searchParams.append('openid.pape.max_auth_age', authPortalConfig['maxAuthAge']);
        authPortalUrl.searchParams.append('openid.return_to', authPortalConfig['redirectURL']);
        if (typeof authPortalConfig['siteState'] !== 'undefined') {
            authPortalUrl.searchParams.append('siteState', authPortalConfig['siteState']);
        }
        if (typeof authPortalConfig['additionalParams'] !== 'undefined') {
            for (let key in authPortalConfig['additionalParams']) {
                authPortalUrl.searchParams.append(key, authPortalConfig['additionalParams'][key]);
            }
        }
        return authPortalUrl.href;
    }
};

const getHostFromUrl = function(url) {
    const fullURL = new URL(url);
    return fullURL.host;
};

// TODO: The URL might be growing long, we should consider doing a url stash in the future.
const buildUniversalLink = function(authPortalConfig, option, ssoTargetApp, codeChallenge) {
    const universalLinkURL = new URL('https://' + identity_sso_configuration.getUniversalLinkDomain()+ '/atb/' + ssoTargetApp.toLowerCase() + '/' + identity_sso_configuration.getVersion());

    const accountPoolArray = option['accountPool'];
    universalLinkURL.searchParams.append(URL_KEY_ACCOUNT_POOL, accountPoolArray.join());
    universalLinkURL.searchParams.append(URL_KEY_BROWSER, 'safari');
    universalLinkURL.searchParams.append(URL_KEY_IDENTITY_SSO_CODE_CHALLENGE, codeChallenge);
    universalLinkURL.searchParams.append(URL_KEY_RETURN_URL, 'https://www.amazon.com');
    universalLinkURL.searchParams.append(URL_KEY_APPLICATION_NAME,option['applicationName']);
    universalLinkURL.searchParams.append(URL_KEY_APPLICATION_CONTEXT, option['applicationContext']);
    universalLinkURL.searchParams.append(URL_KEY_LANGUAGE, option['language']);
    universalLinkURL.searchParams.append(URL_KEY_CONSENT_UI, option['consentUI']);
    universalLinkURL.searchParams.append(URL_KEY_SIGNIN_URL, getAuthPortalUrl(authPortalConfig));
    if (typeof option['merchantId'] !== 'undefined') {
        universalLinkURL.searchParams.append(URL_KEY_MERCHANT_ID, option['merchantId']);
    }
    if (typeof option['clientId'] !== 'undefined') {
        universalLinkURL.searchParams.append(URL_KEY_CLIENT_ID, option['clientId']);
    }

    console.log('Opening universal link:' + universalLinkURL.href);
    return universalLinkURL.href;
};

module.exports =  {
    pathname: pathname,
    redirect: redirect,
    reload: reload,
    href: href,
    host: host,
    hostname: hostname,
    origin: origin,
    queryString: queryString,
    replace: replace,
    redirectPath: redirectPath,
    getUrlParam: getUrlParam,
    isAmazonDomain: isAmazonDomain,
    getAuthPortalUrl: getAuthPortalUrl,
    getHostFromUrl: getHostFromUrl,
    buildUniversalLink: buildUniversalLink
}