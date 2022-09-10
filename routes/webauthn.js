const express   = require('express');
const utils     = require('../utils');
const config    = require('../config.json');
const base64url = require('base64url');
const router    = express.Router();
const database  = require('./db');

router.post('/register', (request, response) => {
    try{
        if(!request.body || !request.body.username || !request.body.name) {
            response.json({
                'status': 'failed',
                'message': 'Request missing name or username field!'
            })

            return
        }

        let username = request.body.username;
        let name     = request.body.name;

        if(database[username] && database[username].registered) {
            response.json({
                'status': 'failed',
                'message': `Username ${username} already exists`
            })

            return
        }

        database[username] = {
            'name': name,
            'registered': false,
            'id': utils.randomBase64URLBuffer(),
            'authenticators': []
        }

        let challengeMakeCred    = utils.generateServerMakeCredRequest(username, name, database[username].id)
        challengeMakeCred.status = 'ok'

        request.session.challenge = challengeMakeCred.challenge;
        request.session.username  = username;

        response.json(challengeMakeCred)
    }   catch (e) {
        console.log(e)
    }

})

router.post('/login', (request, response) => {
    if(!request.body || !request.body.username) {
        response.json({
            'status': 'failed',
            'message': 'Request missing username field!'
        })

        return
    }

    let username = request.body.username;

    if(!database[username] || !database[username].registered) {
        response.json({
            'status': 'failed',
            'message': `User ${username} does not exist!`
        })

        return
    }

    let getAssertion    = utils.generateServerGetAssertion(database[username].authenticators)
    getAssertion.status = 'ok'

    request.session.challenge = getAssertion.challenge;
    request.session.username  = username;

    response.json(getAssertion)
})

router.post('/response', (request, response) => {
    if(!request.body       || !request.body.id
    || !request.body.rawId || !request.body.response
    || !request.body.type  || request.body.type !== 'public-key' ) {
        response.json({
            'status': 'failed',
            'message': 'Response missing one or more of id/rawId/response/type fields, or type is not public-key!'
        })

        return
    }

    let webauthnResp = request.body
    let clientData   = JSON.parse(base64url.decode(webauthnResp.response.clientDataJSON));

    /* Check challenge... */
    if(clientData.challenge !== request.session.challenge) {
        response.json({
            'status': 'failed',
            'message': 'Challenges don\'t match!'
        })
    }

    /* ...and origin */
    // if(clientData.origin !== config.origin) {
    //     response.json({
    //         'status': 'failed',
    //         'message': 'Origins don\'t match!'
    //     })
    // }

    let result;
    if(webauthnResp.response.attestationObject !== undefined) {
        /* This is create cred */
        console.log(1)
        try{
            result = utils.verifyAuthenticatorAttestationResponse(webauthnResp);
        }   catch (e){
            console.log(e)
        }


        if(result.verified) {
            database[request.session.username].authenticators.push(result.authrInfo);
            database[request.session.username].registered = true
        }
    } else if(webauthnResp.response.authenticatorData !== undefined) {
        /* This is get assertion */
        console.log("2")
        result = utils.verifyAuthenticatorAssertionResponse(webauthnResp, database[request.session.username].authenticators);
    } else {
        response.json({
            'status': 'failed',
            'message': 'Can not determine type of response!'
        })
    }

    if(result.verified) {
        request.session.loggedIn = true;
        response.json({ 'status': 'ok' })
    } else {
        response.json({
            'status': 'failed',
            'message': 'Can not authenticate signature!'
        })
    }
})
router.get('/rrr', (request, response) => {
    let a = {"id":"f0HUdp986uRFcshMifV6YEwT69_zT3ch9R4IxnVHonOj3uz2TmGP2FJAgLIBv49Bgw","rawId":"f0HUdp986uRFcshMifV6YEwT69_zT3ch9R4IxnVHonOj3uz2TmGP2FJAgLIBv49Bgw","type":"public-key","response":{"attestationObject":"o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVi1dKbqkhPJnC90siSSsyDPQCYqlMGpUKA5fyklC2CEHvBFAAAAAK3OAAI1vMYKZIsLJfHwVQMAMX9B1HaffOrkRXLITIn1emBME-vf8093IfUeCMZ1R6Jzo97s9k5hj9hSQICyAb-PQYOlAQIDJiABIVggM3KQv1JSkMVwg2u00WcBqtFt5zJcchKPDs7sKGJt4z4iWCDUEhGVT7qD8AplD93gEWX7zVJUBRyL3vrAr7tRpyogzA","clientDataJSON":"eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiZEd3MmN6YlZVb1gyelh2MUNPNXA4djJGeG5PaGhHaEZkLVAxd3YxUWdacyIsIm9yaWdpbiI6Imh0dHBzOi8vd2ViYXV0aG4uaW8iLCJjcm9zc09yaWdpbiI6ZmFsc2UsIm90aGVyX2tleXNfY2FuX2JlX2FkZGVkX2hlcmUiOiJkbyBub3QgY29tcGFyZSBjbGllbnREYXRhSlNPTiBhZ2FpbnN0IGEgdGVtcGxhdGUuIFNlZSBodHRwczovL2dvby5nbC95YWJQZXgifQ"}}
    let result = utils.verifyAuthenticatorAttestationResponse(a)
    console.log(result)
    let b = "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiVDZZY1luY0pUZzQ3YTdOWWV4QVMxUE9Xd29aYTNtNDFYN2NvLXc4UnNfcyIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCIsImNyb3NzT3JpZ2luIjpmYWxzZX0"
    console.log(JSON.parse(base64url.decode(b)));
})
module.exports = router;
