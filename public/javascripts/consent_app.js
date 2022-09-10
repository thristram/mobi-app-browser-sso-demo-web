const URL_KEY_IDENTITY_SSO_AUTH_CODE = 'identity_sso_auth_code';
const URL_KEY_IDENTITY_SSO_CODE_CHALLENGE = 'identity_sso_code_challenge';
const URL_KEY_IDENTITY_SSO_RETURN_FROM_APP = 'identity_sso_return_from_app';

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


function startAuth (){
    try {
        pushLogs(`JS Function Called: startAuth()`)
        getCurrentAccount((directedId, name, accountPool) => {
            if (directedId && name && accountPool){
                getAuthCode(directedId, null, (authCode) => {
                    if(authCode){
                        openURLInBrowserWithAuth(authCode, () => {

                        })
                    }   else    {
                        throw new Error("Can not get Auth Code")
                    }
                })
            }   else    {
                throw new Error("directedId || name || accountPool Missing")
            }
        })
    }   catch (e)   {
        handleError({error: e.message})
    }
}
function cancelAuth (){
    try{
        pushLogs(`JS Function Called: cancelAuth()`)
        let url = MAPParams[URL_KEY_SIGNIN_URL]
        if(!url) {
            throw new Error("No AuthPortal URL Found")
        }
        pushLogs(`with url ${url}`)
        openUrlInBrowser(url, (status) => {
            if(!status){
                throw new Error("Can not redirect to browser")
            }
        })
    }   catch (e){
        handleError({error: e.message})
    }
}
function constructURL(authCode){
    try {
        if(!authCode) throw new Error("No Auth Code")
        if(!MAPParams[URL_KEY_IDENTITY_SSO_CODE_CHALLENGE]) throw new Error("No URL_KEY_IDENTITY_SSO_CODE_CHALLENGE")
        pushLogs(`Constructing return URL ${url}`)
        if (MAPParams && MAPParams.return_url) {
            let connector = MAPParams.return_url.includes("?") ? "&" : "?"
            let url = `${MAPParams.return_url}${connector}${URL_KEY_IDENTITY_SSO_AUTH_CODE}=${authCode}&${URL_KEY_IDENTITY_SSO_CODE_CHALLENGE}=${MAPParams[URL_KEY_IDENTITY_SSO_CODE_CHALLENGE]}&${URL_KEY_IDENTITY_SSO_RETURN_FROM_APP}=true`
            pushLogs(`Successfully constructed URL ${url}`)
            return url
        }
    }   catch (e){
        handleError({error: e.message})
    }
}

function openURLInBrowserWithAuth (authCode){
    try{
        pushLogs(`JS Function Called: openURLInBrowserWithAuth(${authCode})`)
        let url = constructURL(authCode)
        if(!url) throw new Error("No AuthCode, Can not construct Auth URL")
        openUrlInBrowser(url, (status) => {
            if(!status){
                throw new Error("Can not redirect to browser")
            }
        })
    }   catch (e){
        handleError({error: e.message})
    }
}
function openUrlInBrowser(url, callback) {
    try{
        pushLogs(`JS Function Called: openUrlInBrowser(${url})`)
        MAPWebAssets.openUrlInBrowser( url,(result) => {
            if (!handleError(result)){
                pushLogs(`url opened: ${url}`)
                callback(true)
            }

        }, null, true, 1000)
    }   catch (e){
        handleError({error: e.message})
    }

}
function getCurrentAppInfo(callback){
    pushLogs(`JS Function Called: getCurrentAppInfo()`)
    try {
        MAPWebAssets.getCurrentAppInfo((result) => {
            if (!handleError(result)){
                pushLogs(`Current App Info: ${JSON.stringify(result)}`)
                callback()
            }
        })
    }   catch (e)   {
        handleError({error: e.message})
    }
}
function getAuthCode(directedId, authChallenge, callback){
    try{
        pushLogs(`JS Function Called: getAuthCode(${directedId}, ${authChallenge})`)
        MAPWebAssets.getAuthCode((directedId, authChallenge, result) => {
            if (!handleError(result)){
                if(result.authCode){
                    pushLogs(`AuthCode Get: ${result.authCode}`)
                    callback(result.authCode)
                }   else    {
                    throw new Error(`Fail to exchange Auth Code for account ${directedId}`)
                }

            }

        }, 1000)
    }   catch (e){
        handleError({error: e.message})
    }

}
function getCurrentAccount(callback){
    try{
        pushLogs("JS Function Called: getCurrentAccount()")
        MAPWebAssets.getAccounts((result) => {
            if (!handleError(result)){
                pushLogs(`Accounts: ${JSON.stringify(result)}`)
                for(let item of result){
                    if(item.isCurrentAccount){
                        pushLogs(`Current Account Found: ${JSON.stringify(item)}`)
                        callback(item.directedId, item.name, item.accountPool)
                    }
                }
                callback(result)
            }

        }, 1000)
    }   catch (e){
        handleError({error: e.message})
    }

}

function handleError(result){
    if (!result || result.error) {
        console.error(result.error)
        $(".logs").append(`ERROR: ${result.error}\n`)
        return true
    }   else    {
        return false
    }
}

function pushLogs (log){
    $(".logs").append(`LOG: ${log}\n`)
    console.log(log)
}