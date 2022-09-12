async function execute_account_process(timeoutInMillS, maxRetries) {
    return await requestAccountInfo(timeoutInMillS, 0, maxRetries);
}

function requestAccountInfo(timeoutInMillS, retries, maxRetries = 2) {
    mapBridge.getAccounts(function(account_response){
        if (!account_response || account_response.error) {
            metrics.logException("ATBSSO_CONSENT_ACCOUNT_EXCEPTION", JSON.stringfy(account_response));
        } else {
            metrics.log("ATBSSO_CONSENT_ACCOUNT_RETREIVED");
        }
    }, timeoutInMilliS)

    return new Promise(function(resolve, reject) {
        getAccounts(function (account_response) {
            if (!account_response || account_response.error) {
                metrics.logException("ATBSSO_CONSENT_ACCOUNT_EXCEPTION", JSON.stringfy(account_response));
                reject(account_response);
            } else {
                metrics.log("ATBSSO_CONSENT_ACCOUNT_RETREIVED");
                resolve(account_response);
            }
        }, timeoutInMillS);
    }).catch(function(error) {
        if (retries < maxRetries) {
            resolve(requestAccountInfo(timeoutInMillS, retries + 1, maxRetries));
        } else {
            reject(error);
        }
    });
}

function getAccounts(callback, timeoutInMilliS) {
    return mapBridge.getAccounts(callback, timeoutInMilliS);
}