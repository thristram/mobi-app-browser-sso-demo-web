

    const UNSUPPORTED_PLATFORM = 'Unsupported_Platform';
    const UNSUPPORTED_MAP_VERSION = 'Unsupported_MAP_Version';
    const INVALID_INPUT = "Invalid_Input"
    const TIMEOUT_ERROR = 'Timeout_Error';
    const DEFAULT_TIMEOUT_MILLIS = 100;
    const callbackFunctionName = 'mapJSCallback';
    const injectTokenCallbackName = 'injectTokenCallback';
    let callingCounter = 0;
    let callbackSet = {};
    let apiNameSet = {};

    function isValidUrl(url) {
        const regexp = /https:\/\/[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+/;
        return regexp.test(url)
    }

    /**
     * Callback called by native for result, or JS side for error.
     * @param paramObj original parameter object
     * @param result result object
     */
    window[callbackFunctionName] = (paramObj, resultObj) => {
        let callingId = paramObj.callingId;
        let timerId = paramObj.timerId;

        if (typeof callingId === 'undefined') {
            console.log('callingId is not defined. No op');
            return;
        }

        if (typeof callbackSet[callingId] === 'function') {

            // 1. Delete the callback from map
            let callback = callbackSet[callingId];
            delete callbackSet[callingId];

            // 2. Clean the timeout timer.
            // We check the the timerId after callingId. If the timerId is somehow from the previous page (the callback is sent
            // to a JS call on previous page), then callbackSet[callingId] would be undefined, and it would not reach here.
            // OR, if it was required as no timeout check, the timerId would be undefined, then clearTimeout will not be performed.
            if (typeof timerId === 'number') {
                // If the timerId is a number, then we should clear the callback timeout.
                console.log('Timer id is valid, clear the timeout');
                window.clearTimeout(timerId);
            }

            // 3. Parse out/Modify return values for certain APIs
            parseResultObject(resultObj, callingId);

            // 4. Check if a timeout error should be thrown
            if (shouldThrowTimeoutError(paramObj, callingId, callback)) {
                callback(createErrorResult(TIMEOUT_ERROR));
                return;
            }

            // 5. Run the callback
            callback(resultObj);
        } else {
            console.log(callingId + ' is not valid calling Id. The callback should not be processed at this page. ');
        }
    };

    /* For the getAssertionWithAuthenticationCredential APIs, the existing method for handling timeouts does not work as expected.
    * This is because these APIs will show a biometric prompt to the user, and when this prompt is shown, it effectively stops the countdown timer that will return the timeout error to the user's callback function.
    * This means that if a timeout of 5 seconds was set for the call, the user could wait to complete the biometric prompt for any amount of time and it will not result in a timeout error.
    * That's why this special timeout handling happens for this API specifically. We check the epoch time when the call is first invoked and when it completes to see if it is greater than the specified timeout time.
    * If this elapsed time is greater than the specified timeout time, then a timeout error is returned to the caller's callback.
    */
    function shouldThrowTimeoutError(paramObj, callingId, callback) {
        if (typeof paramObj.timeout !== 'undefined') {
            if (apiNameSet[callingId] === 'getAssertionWithAuthenticatorCredential') {
                let currentTime = Date.now();
                if (currentTime - paramObj.invocationTime >= paramObj.timeout) {
                    return true;
                }
            }
        }
        return false;
    }

    /* The FIDO SDK that Android is using for its createAuthenticatorCredential and getAssertionWithAuthenticatorCredential APIs provides additional information that is not returned by iOS.
     * We opted to pass this additional information through from the native code to the MAPWebAssets layer and remove it from the result before passing back the calling client's callback function,
     * instead of not including it in the response from the native code altogether. The purpose of doing this was so that we do not lose any of the additional information provided by the device's TPM
     * module in case we need to use it for something in the future. If we needed to use this data in the future, we can just remove this code in MAPWebAssets to start sending it in the response
     * to the client's callback function. This parsing only applies to the createAuthenticatorCredential and getAssertionWithAuthenticatorCredential APIs. The section below describes what all
     * is parsed out from the result passed back by the native Android code
     *
     * createAuthenticatorCredential:
     *      attestationObject, an ArrayBuffer containing the new public key, as well as signature over the entire attestationObject with a private key that is stored in the authenticator when it is manufactured
     *      clientDataJson, client data for the authentication, such as origin and challenge
     *
     * getAssertionWithAuthenticatorCredential:
     *      authenticatorData, an ArrayBuffer containing information from the authenticator such as the Relying Party ID Hash (rpIdHash), a signature counter, test of user presence and user verification flags, and any extensions processed by the authenticator.
     *      clientDataJson, client data for the authentication, such as origin and challenge
     *      credentialId, the ID of the authenticator credential used to get the assertion
     */
    function parseResultObject(resultObj, callingId) {

        if (typeof resultObj.attestationObject !== 'undefined') {
            try {
                resultObj.publicKey = web_authn_helper.extractECPublicKeyFromAttestationObjectAndTransformToASN1Encoding(resultObj.attestationObject);
            } catch (error) {
                console.log("Error occurred while extracting public key from attestationObject");
            }
            delete resultObj["attestationObject"];
        }

        if (apiNameSet[callingId] === 'getAssertionWithAuthenticatorCredential' && typeof resultObj.credentialId !== 'undefined') {
            delete resultObj["credentialId"]
        }
    }

    /**
     * Callback called by native to alert JS that token has been successfully injected into mainframe of page
     * The token is generated on native side and injected as a div into the mainframe where
     * the div id = callbackId of the original function call and div.innerText = token
     * This callback is only used for Android, since iOS already has iFrame protection built in
     * @param paramObj original parameter object
     * @param result result object
     */
    window[injectTokenCallbackName] = (paramObj, result) => {
        // 1. Fetch token from div
        var tokenDiv = document.getElementById(result.callingId);
        var token = tokenDiv.innerText;

        // 2. Call the original function with token
        var originalFunction = result.originalFunction;
        paramObj.token = token;

        // 2.1 Call FidoAuthenticatorJSBridge or APPToBrowserSSOJSBridge
        if (typeof window.FidoAuthenticatorJSBridge !== 'undefined' && typeof window.FidoAuthenticatorJSBridge[originalFunction] === 'function') {
            window.FidoAuthenticatorJSBridge[originalFunction](JSON.stringify(paramObj));
        } else if (typeof window.APPToBrowserSSOJSBridge !== 'undefined' && typeof window.APPToBrowserSSOJSBridge[originalFunction] === 'function') {
            window.APPToBrowserSSOJSBridge[originalFunction](JSON.stringify(paramObj));
        } else if (typeof window.MAPAndroidJSBridge !== 'undefined' && typeof window.MAPAndroidJSBridge[originalFunction] === 'function') {
            window.MAPAndroidJSBridge[originalFunction](JSON.stringify(paramObj));
        }

        // 3. Delete the div
        tokenDiv.parentNode.removeChild(tokenDiv);
    };

    function createErrorResult(error, errorMessage) {
        let result = {};
        result.error = error;
        result.errorMessage = errorMessage;
        return result;
    }

    function prepareCallback(param, apiName, callback, timeoutInMillS) {
        // Use epoch value in callingId to avoid edge case:
        // Web page calls API A, whose calling id is 0. Let's assume that API takes long time, like 2 sec.
        // Then somehow the page is redirected to other page, where the JS is reloaded and callingCounter is reset to zero.
        // Now the callback comes back from the native with counter zero, which may pollute the callback map in the new page.
        let epoch = Date.now();
        param.invocationTime = epoch;

        // set the callback function name
        param.callbackFunctionNameKey = callbackFunctionName;

        // Use callingCounter in callingId to avoid edge case:
        // Two consecutive call to a same API within one millisecond.
        param.callingId = apiName + epoch + callingCounter;
        callingCounter += 1;
        callbackSet[param.callingId] = callback;
        apiNameSet[param.callingId] = apiName;

        if (timeoutInMillS > 0) {
            timeoutInMillS = typeof timeoutInMillS !== 'number' ? DEFAULT_TIMEOUT_MILLIS : timeoutInMillS;
            param.timeout = timeoutInMillS;
            param.timerId = window.setTimeout(() => {
                window[callbackFunctionName](param, createErrorResult(TIMEOUT_ERROR));
            }, timeoutInMillS);
        }
    }

    class MAPInterface {
        constructor() {
        }

        upgradeToken(param) {
            console.log('upgradeToken on unsupported version or platform. return error message.');
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        switchActor(param) {
            console.log('switchActor on unsupported version or platform. return error message.');
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getCustomerInformationHint(param) {
            console.log('getCustomerInformationHint on unsupported version or platform. return error message.');
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getVersion(param) {
            console.log('getVersion on unsupported version or platform, return default value');
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        isSmsRetrieverEnabled(param) {
            console.log("isSmsRetrieverEnabled on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        registerMAPSmsReceiver(param) {
            console.log("registerMAPSmsReceiver on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        isJSBridgeAvailable() {
            return false;
        }

        isUserVerifyingPlatformAuthenticatorAvailable(param) {
            console.log("isUserVerifyingPlatformAuthenticatorAvailable on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        createAuthenticatorCredential(param) {
            console.log("createAuthenticatorCredential on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getAssertionWithAuthenticatorCredential(param) {
            console.log("getAssertionWithAuthenticatorCredential on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        isAuthenticatorCredentialAvailable(param) {
            console.log("isAuthenticatorCredentialAvailable on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getCurrentAppInfo(param) {
            console.log("getCurrentAppInfo on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        dismissSpinnerView(param) {
            console.log("dismissSpinnerView on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getAccounts(param) {
            console.log("getAccounts on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getAuthCode(param) {
            console.log("getAuthCode on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        openUrlInBrowser(param) {
            console.log("openUrlInBrowser on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        static getImp() {
            if (MAPAndroidImp.isAndroidSupported()) {
                return new MAPAndroidImp();
            } else if (MAPiOSImp.isIOSSupported()) {
                return new MAPiOSImp();
            } else {
                return new MAPInterface();
            }
        }
    }

    class MAPAndroidImp extends MAPInterface {
        run(apiName, param) {
            if (typeof window.MAPAndroidJSBridge !== 'undefined' && typeof window.MAPAndroidJSBridge[apiName] === 'function') {
                console.log(apiName + ' is called on MAP Android\'s MAPAndroidJSBridge');
                window.MAPAndroidJSBridge[apiName](JSON.stringify(param));
            } else if (typeof window.FidoAuthenticatorJSBridge !== 'undefined' && typeof window.FidoAuthenticatorJSBridge[apiName] === 'function') {
                console.log(apiName + ' is called on MAP Android\'s FidoAuthenticatorJSBridge');
                window.FidoAuthenticatorJSBridge[apiName](JSON.stringify(param));
            } else if (typeof window.APPToBrowserSSOJSBridge != 'undefined' && typeof window.APPToBrowserSSOJSBridge[apiName] === 'function') {
                console.log(apiName + ' is called on MAP Android\'s APPToBrowserSSOJSBridge');
                window.APPToBrowserSSOJSBridge[apiName](JSON.stringify(param));
            } else {
                console.log(apiName + ' is not supported on this MAP Android version.');
                window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_MAP_VERSION));
            }
        }

        upgradeToken(param) {
            this.run('upgradeToken', param);
        }

        switchActor(param) {
            this.run('switchActor', param);
        }

        getCustomerInformationHint(param) {
            this.run('getCustomerInformationHint', param);
        }

        getVersion(param) {
            this.run('getMAPAndroidBridgeVersion', param);
        }

        isSmsRetrieverEnabled(param) {
            this.run('isSmsRetrieverEnabled', param);
        }

        registerMAPSmsReceiver(param) {
            this.run('registerMAPSmsReceiver', param);
        }

        isJSBridgeAvailable() {
            return MAPAndroidImp.isAndroidSupported();
        }

        isUserVerifyingPlatformAuthenticatorAvailable(param) {
            this.run('isUserVerifyingPlatformAuthenticatorAvailable', param);
        }

        createAuthenticatorCredential(param) {
            this.run('createAuthenticatorCredential', param);
        }

        getAssertionWithAuthenticatorCredential(param) {
            this.run('getAssertionWithAuthenticatorCredential', param);
        }

        isAuthenticatorCredentialAvailable(param) {
            this.run('isAuthenticatorCredentialAvailable', param);
        }

        getCurrentAppInfo(param) {
            console.log("Calling getCurrentAppInfo in Android");
            this.run('getCurrentAppInfo', param);
        }

        dismissSpinnerView(param) {
            console.log("dismissSpinnerView on unsupported version or platform. return error message.");
            window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_PLATFORM));
        }

        getAccounts(param) {
            this.run('getAccounts', param);
        }

        getAuthCode(param) {
            this.run('getAuthCode', param);
        }

        openUrlInBrowser(param) {
            this.run('openUrlInBrowser', param);
        }

        static isAndroidSupported() {
            if ((typeof window.MAPAndroidJSBridge !== 'undefined' && typeof window.MAPAndroidJSBridge.getMAPAndroidBridgeVersion !== 'undefined') 
            || (typeof window.FidoAuthenticatorJSBridge !== 'undefined' && typeof window.FidoAuthenticatorJSBridge.getCurrentAppInfo !== 'undefined')
            || (typeof window.APPToBrowserSSOJSBridge !== 'undefined')) {
                return true;
            }
            return false;
        }
    }

    class MAPiOSImp extends MAPInterface {
        run(apiName, param) {
            if (window.webkit.messageHandlers[apiName] && typeof window.webkit.messageHandlers[apiName].postMessage === 'function') {
                console.log(apiName + ' is called on MAP iOS.');
                window.webkit.messageHandlers[apiName].postMessage(param);
            } else {
                console.log(apiName + ' is not supported on this MAP iOS version.');
                window[callbackFunctionName](param, createErrorResult(UNSUPPORTED_MAP_VERSION));
            }
        }

        upgradeToken(param) {
            this.run('upgradeToken', param);
        }

        getVersion(param) {
            this.run('getMAPiOSBridgeVersion', param);
        }

        isJSBridgeAvailable() {
            return MAPiOSImp.isIOSSupported();
        }

        isUserVerifyingPlatformAuthenticatorAvailable(param) {
            this.run('isUserVerifyingPlatformAuthenticatorAvailable', param);
        }

        createAuthenticatorCredential(param) {
            this.run('createAuthenticatorCredential', param);
        }

        getAssertionWithAuthenticatorCredential(param) {
            this.run('getAssertionWithAuthenticatorCredential', param);
        }

        isAuthenticatorCredentialAvailable(param) {
            this.run('isAuthenticatorCredentialAvailable', param);
        }

        getCurrentAppInfo(param) {
            this.run('getCurrentAppInfo', param);
        }

        dismissSpinnerView(param) {
            this.run('dismissSpinnerView', param);
        }

        getAccounts(param) {
            this.run('getAccounts', param);
        }

        getAuthCode(param) {
            this.run('getAuthCode', param);
        }

        openUrlInBrowser(param) {
            this.run('openUrlInBrowser', param);
        }

        static isIOSSupported() {
            if (typeof window.webkit !== 'undefined' && typeof window.webkit.messageHandlers !== 'undefined' && window.webkit.messageHandlers.getMAPiOSBridgeVersion !== 'undefined') {
                return true;
            }
            return false;
        }
    }

    const implementation = MAPInterface.getImp();

    let MAPWebAssets =  {
        /**
         * constants
         */
        CONSTANT : {
            /**
             * Hint type for getCustomerInformationHint
             */
            CustomerInformationHintType: {
                NAME: 'NAME',
                EMAIL: 'EMAIL',
                PHONE: 'PHONE'
            }
        },
        /**
         * Notify MAP SDK to upgrade the device token.
         * @param stashAuthTokenKey a stash key for auth token.
         * @param cid, user account id. It should not be empty.
         * @param pid, actor id, If pid is null the challenge is for an account, otherwise it is for an actor.
         * @param callback, a callback function. function callback(result) {}, where result is an acknowledgement that
         *                 the native SDK has received the message and has queued the upgrade token job. The pattern is
         *                 result.returnValue = 'MAP_Native_Acknowledged'.
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        upgradeDeviceTokens: (stashAuthTokenKey, cid, pid, callback, timeoutInMillS) => {
            let param = {};
            param.authCode = stashAuthTokenKey;
            param.cid = cid;
            param.pid = pid;
            prepareCallback(param, 'upgradeDeviceTokens', callback, timeoutInMillS);
            implementation.upgradeToken(param);
        },
        /**
         * Notify MAP SDK to switch the actor associated with the program.
         * @param cid, customer account id. It should not be empty.
         * @param pid, actor id, It should not be empty.
         * @param program, the program to which the actor is associated. It should not be empty.
         * @param actor_type, must be provided if you choose Force ActorSwitchMode.
         * <ul>
         <li>{PERSON.ADULT} Actor type for adult actor. </li>
         <li>{PERSON.TEEN} Actor type for teen actor. </li>
         <li>{PERSON.CHILD} Actor type for child actor. </li>
         * <ul>
         * @param actor_switch_mode, eg. <Normal, Force>. Will default to Normal if empty.
         * <ul>
         <li>{Normal} Uses suggested actor type when unable to find associated actor type. </li>
         <li>{Force} Forces use of suggested actor type. </li>
         * <ul>
         * @param callback, a callback function. function callback(result) {}, to notify when switch actor is completed. Can be null.
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        switchActor: (cid, pid, program, actor_type, actor_switch_mode, callback, timeoutInMillS) => {
            let param = {};
            param.cid = cid;
            param.pid = pid;
            param.program = program;
            param.actor_type = actor_type;
            param.actor_switch_mode = actor_switch_mode;

            prepareCallback(param, 'switchActor', callback, timeoutInMillS);
            implementation.switchActor(param);
        },
        /**
         * get customer information hint from MAP.
         * @param hintTypes array of requiring hint types
         * @param callback will be called by structure of {name, namePron, email, phoneNumber}
         */
        getCustomerInformationHint: (hintTypes, callback) => {
            let param = {
                hintTypes: hintTypes
            };
            // as this call will block the UI, we wont' the timeout check, thus call prepare by -1.
            prepareCallback(param, 'getCustomerInformationHint', callback, -1);
            implementation.getCustomerInformationHint(param);
        },
        /**
         * A synchronous helper to tell if MAP JS bridge is available
         */
        isJSBridgeAvailable: () => {
            return implementation.isJSBridgeAvailable();
        },
        /**
         * Get the MAP JS bridge version.
         * Android supports synchronized JS call pattern for returning a value from native. However, iOS doesn't and it
         * only supports async call pattern. To maintain platform consistency, the MAP JS bridge only supports async call
         * pattern, unless iOS native support sync call pattern.
         *
         * @param callback, a callback function. function callback(result) {}, where result is the MAP SDK version
         *         1. MAP Android: result.mapJSVersion = MAP_Android_1, MAP_Android_2, etc
         *         2. MAP iOS: result.mapJSVersion = MAP_iOS_1, MAP_iOS_2, etc
         *         3. Unsupported platform: result.error = Unsupported_Platform
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        mapJSVersion: (callback, timeoutInMillS) => {
            let param = {};
            prepareCallback(param, 'getVersion', callback, timeoutInMillS);
            implementation.getVersion(param);
        },
        /**
         * determine whether SmsRetriever is enabled or not
         * @param callback, a callback function. function callback(identifier){}, where identifier is appHash or webOtpId
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        isSmsRetrieverEnabled: (callback, timeoutInMillS) => {
            let param = {};
            prepareCallback(param, 'isSmsRetrieverEnabled', callback, timeoutInMillS);
            implementation.isSmsRetrieverEnabled(param);
        },
        /**
         * register MAPSmsReceiver if unregistered
         * @param callback, a callback function. function callback(sms){}, where sms is the sms received by android OS containing OTP
         * We don't want timeout check here as it depends on SMS to be received and we don't know how much time it will take.
         */
        registerMAPSmsReceiver: (callback) => {
            let param = {};
            prepareCallback(param, 'registerMAPSmsReceiver', callback, -1);
            implementation.registerMAPSmsReceiver(param);
        },
        /**
         * Check if the user's device supports authenticator credentials
         * @param {function} callback, the callback function that is passed the results of the function call as a single boolean value
         * The possible return types to the client's callback are defined below.
         * Return values:
         *        {boolean} true -> Boolean indicating that the device does support authenticator credentials
         *        {boolean} false -> Boolean indicating that the device does not support authenticator credentials
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        isUserVerifyingPlatformAuthenticatorAvailable: (callback, timeoutInMillS) => {
            let param = {};
            prepareCallback(param, 'isUserVerifyingPlatformAuthenticatorAvailable', callback, timeoutInMillS);
            implementation.isUserVerifyingPlatformAuthenticatorAvailable(param);
        },
        /**
         * Check if a given authenticator credential exists on the customer's device
         * @param {string} credentialId, the credentialId of the authenticator credential to check if it exists on the customer's device
         * @param {function} callback, the callback function that is passed the results of the function call as a single boolean value
         * The possible return types to the client's callback are defined below.
         * Return values:
         *        {boolean} true -> Boolean indicating that the authenticator credential does exist on the device
         *        {boolean} false -> Boolean indicating that the authenticator credential does not exist on the device
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        isAuthenticatorCredentialAvailable: (credentialId, callback, timeoutInMillS) => {
            let param = {};
            param.credentialId = credentialId;
            prepareCallback(param, 'isAuthenticatorCredentialAvailable', callback, timeoutInMillS);
            implementation.isAuthenticatorCredentialAvailable(param);
        },
        /**
         * Create an authenticator credential
         * @param {PublicKeyCredentialCreationOptions object} publicKeyCredentialCreationOptions, a JavaScript object containing the options to use when creating the new authenticator credential
         *        See https://w.amazon.com/bin/view/IdentityServices/AuthN/Fides/technical/Authenticator/hld#HAppendixB28Exampleenrollmentoptions29 for an example of what all information is included in these options
         *        Below are the keys contained within this PublicKeyCredentialCreationOptions JavaScript object
         *
         *        {string} "challenge" -> a base64 encoded string that is used to verify that the credential response received originated from the correct request
         *        {string} "rp" -> a JavaScript object containing information about the Relying Party
         *        {
         *            {string} "name" -> relying Party name (i.e. Amazon)
         *            {string} "id" -> relying Party ID (i.e. amazon.com)
         *        }
         *        {JS array} "pubKeyCredParams" -> an array of credential parameters to use when creating the new credential. We only expect one item and will use the first item in this array
         *        [{
         *            {JS object} "alg" {
         *                {string} "name" -> the name of the algorithm to use when creatign the authenticator credential (i.e. ECDSA SHA-256)
         *                {number} "code" -> an integer that is the COSE algorithm identifier for the algorithm to be used when creating the authenticator credential (i.e. "code" -> -7 for algorithm ECDSA SHA-256).
         *                          See https://www.iana.org/assignments/cose/cose.xhtml#algorithms for the algorithm registry
         *             },
         *            {string} "type" -> the type of credential to create (i.e. public-key)
         *         }]
         * @param {function} callback, the callback function that is passed a single JavaScript object containing the results of the function call.
         * The possible return types to the client's callback are defined below.
         * Success case:
         *        {string} "publicKey" -> an elliptic curve public key in ANSI X9.63 format (04 || X || Y)
         *        {string} "credentialId" -> a String that uniquely identifies the newly created authenticator credential
         *        {string} "challenge" -> the base64 encoded challenge string that was passed in with the PublicKeyCredentialCreationOptions
         * Error case:
         *        {string} "error" -> key indicating the error that occurred (i.e. "error" -> "Invalid_Input_Error")
         *        {string} "errorMessage" -> key of the error message describing the cause of the error

         */
        createAuthenticatorCredential: (publicKeyCredentialCreationOptions, callback) => {
            prepareCallback(publicKeyCredentialCreationOptions, 'createAuthenticatorCredential', callback, -1);
            implementation.createAuthenticatorCredential(publicKeyCredentialCreationOptions);
        },
        /**
         * Generate an assertion using an authenticator credential
         * @param {PublicKeyCredentialRequestOptions object} publicKeyCredentialRequestOptions, a JavaScript object containing the options to use when generating an assertion an authenticator credential
         *        See https://w.amazon.com/bin/view/IdentityServices/AuthN/Fides/technical/Authenticator/hld#HAppendixC28Examplechallengeoptions29 for an example of what all information is included in these options
         *        Below are the keys contained within this PublicKeyCredentialRequestOptions JavaScript object
         *
         *        {string} "challenge" -> a base64 encoded string that is used to verify that the credential response received originated from the correct request
         *        {string} "rpId" -> relying Party ID (i.e. amazon.com). If none is passed in, it will default to using "amazon.com"
         *        {JS array} "allowCredentials" -> an array of credentials to be allowed to generate the assertion. We only expect one value in the array and will always use the first value.
         *        [{
         *            {string} "id" -> the credentialId of the credential that is allowed to generate the assertion
         *            {string} "type" -> the credential type (i.e. public-key)
         *        }]
         *        {number} "timeout" -> timeout in milliseconds (optional). If it is not passed in, there will be no timeout for the function.
         * @param {function} callback, the callback function that is passed a single JavaScript object containing the results of the function call.
         * The possible return types to the client's callback are defined below.
         * Success case:
         *        {string} "signature" -> a signature of the passed in challenge value generating using the passed in credential
         * Error case:
         *        {string} "error" -> key indicating the error that occurred (i.e. "error" -> "Invalid_Input_Error")
         *        {string} "errorMessage" -> key of the error message describing the cause of the error
         */
        getAssertionWithAuthenticatorCredential: (publicKeyCredentialRequestOptions, callback) => {
            prepareCallback(publicKeyCredentialRequestOptions, 'getAssertionWithAuthenticatorCredential', callback, -1);
            implementation.getAssertionWithAuthenticatorCredential(publicKeyCredentialRequestOptions);
        },
        /**
         * Get information about the app and device this function is called on
         * @param {function} callback, the callback function that is passed a single JavaScript object containing the results of the function call.
         * The possible return types to the client's callback are defined below.
         * Success case:
         *        {string} "appIdentifier" -> Key indicating which app the call is made on. (i.e. package name such as com.amazon.shopping in Android or bundleId such as com.amazon.Amazon in iOS)
         *        {string} "mapVersion" -> Key indicating the MAP version used in the app. (i.e. 20210915N in Android or 6.11.10 in iOS)
         *        {string} "platform" -> Key indicating the platform of the device. Either "Android" or "iOS".
         * Error case:
         *        {string} "error" -> Key indicating the error that occurred (i.e. "error" -> "Invalid_Input_Error")
         *        {string} "errorMessage" -> Key of the error message describing the cause of the error
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        getCurrentAppInfo: (callback, timeoutInMillS) => {
            let param = {};
            prepareCallback(param, 'getCurrentAppInfo', callback, timeoutInMillS);
            implementation.getCurrentAppInfo(param);
        },
        /**
         * Removes spinner, if spinner view is present in the iOS MAP Webview after page gets loaded.
         * Issue -
         *      MAP will show a loading spinner when there is a navigation request from a WKWebView triggering Apple's delegate method
         *      In some cases, Apple doesn't trigger the delegate method properly even though the page is fully loaded.
         *      More info on the Apple delegate methods here: https://developer.apple.com/documentation/webkit/wknavigationdelegate?language=objc
         *      As a result, the spinner will never be dismissed, blocking the customer from interacting with the page.
         *      More information on the issue can be found here: https://issues.amazon.com/issues/MOBI-12194
         *      This method calls dismissSpinnerView in ios native during client call to dismiss spinner.
         * @param {function} callback a callback function. function callback(result) {}, returns a value to the callback if an error occurs and otherwise returns nothing if the call is successful.
         */
        dismissSpinnerView: (callback) => {
            let param = {};
            prepareCallback(param, 'dismissSpinnerView', callback, 0);
            implementation.dismissSpinnerView(param);
        },

        /**
         * Get information of accounts registered on the app.
         * @param {function} callback, the callback function that is passed a single JavaScript object containing the results of the function call.
         * The possible return types to the client's callback are defined below.
         * Success case:
         *        {JS array} "accounts" -> a json array of account information registered on the device.
         *        [{
         *            {string} "directedId" -> the account directed id. ex. 'amzn1.account.AESI36IS5WQXLM4O6KSZZPJNQYRA'
         *            {string} "name" -> the account name. ex. 'Tom Riddle'
         *            {string} "accountPool" -> account pool. ex. 'Amazon', 'AmazonJP'
         *            {boolean} "isCurrentAccount" -> whether this account is the current used one in the app.
         *        }]
         * Error case:
         *        {string} "error" -> Key indicating the error that occurred (i.e. "error" -> "Invalid_Input_Error")
         *        {string} "errorMessage" -> Key of the error message describing the cause of the error
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        getAccounts: (callback, timeoutInMillS) => {
            let param = {};
            prepareCallback(param, 'getAccounts', callback, timeoutInMillS);
            implementation.getAccounts(param);
        },

        /**
         * Get the auth code that can be used to redeem auth cookies for a account.
         * @param {string} directedId, the account's directedId for which to get the auth code.
         * @param {string} authChallenge, the auth challenge for the auth code.
         * @param {function} callback, the callback function that is passed a single JavaScript object containing the results of the function call.
         * The possible return types to the client's callback are defined below.
         * Success case:
         *        {string} "authCode" -> the auth code that can be used with the input auth challenge to exchange auth cookies.
         * Error case:
         *        {string} "error" -> Key indicating the error that occurred (i.e. "error" -> "Network_Error")
         *        {string} "errorMessage" -> Key of the error message describing the cause of the error
         * @param {number} timeoutInMillS (optional), timeout in milliseconds. If it is not passed in, there will be no timeout for the function.
         */
        getAuthCode: (directedId, authChallenge, callback, timeoutInMillS) => {
            let param = {};
            param.directedId = directedId;
            param.authChallenge = authChallenge;
            prepareCallback(param, 'getAuthCode', callback, timeoutInMillS);
            implementation.getAuthCode(param);
        },

        /**
         * Get the auth code that can be used to redeem auth cookies for a account.
         * @param {string} url, the url to open on external browser.
         * @param {function} callback, the callback function that is passed a single JavaScript object containing the results of the function call.
         * @param {string} browserName (optional), the browser name to open the url. In Android it is the package name like 'com.android.chrome'.
         * In iOS, it is the browser deeplink scheme, like 'googlechrome'.
         * @param {boolean} shouldCloseCurrentUI (optional), if set to true, the current UI will be killed. Otherwise, the current UI will be kept when the external browser is open.
         */
        openUrlInBrowser: (url, callback, browserName, shouldCloseCurrentUI) => {
            let param = {};
            param.url = url;
            if (typeof browserName === 'string') {
                param.browserName = browserName;
            }
            if (typeof shouldCloseCurrentUI === 'boolean') {
                param.shouldCloseCurrentUI = shouldCloseCurrentUI;
            }
            prepareCallback(param, 'openUrlInBrowser', callback, 0);
            if (!isValidUrl(url)) {
                window[callbackFunctionName](param, createErrorResult(INVALID_INPUT, url + ' is not a valid url'));
                return;
            }
            implementation.openUrlInBrowser(param);
        }
    };

