var express = require('express');
var router = express.Router();
const path = require('path')
const fs = require('fs')
const apn = require('apn');
const APSignInURL = "https://www.amazon.com/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com%2F%3Fref_%3Dnav_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=usflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&"

var config = require('../config.json')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/ivvtest', function(req, res, next) {
  res.render('testiframe', { title: 'Express' });
});
router.get('/ivvlanding', function(req, res, next) {
  res.send("done")
});
router.get('/healthcheck', function(req, res, next) {
  res.send("ok")
});
router.get('/mobi', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../html/mobi.html'))
});
router.get('/button', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../html/button.html"))
});
router.get('/button', function(req, res, next) {
  res.sendFile(path.join(__dirname, "../html/button.html"))
});
router.get('/consent/edit', function(req, res, next) {
  res.render('consentChoice', config)
});
router.post('/consent/edit', function(req, res, next) {
  let choice = parseInt(req.body.consentPage) || 0
  console.log(choice)
  config.consentPage = choice
  res.redirect('/consent/edit')
});
router.get('/consent', function(req, res, next) {
  let data = {
    // redirectTo : req.query["redirect_to"] || "https://www.amazon.com",
    redirectTo : "/maplanding",
    cancelTo: req.query["cancel_to"] || APSignInURL,
    browser: req.query["browser"]  || "Safari",
  }
  switch (config.consentPage){
    case 1:
      res.render("bwpspinner", {page: 'consent', ...data})
      break
    case 2:
      res.redirect("/maplanding")
      break
    default:
      res.render("bwpconsent", {page: 'consent', ...data})
      break
  }

});
router.get('/atb/mshop/v1', function(req, res, next) {
  let data = {
    // redirectTo : req.query["redirect_to"] || "https://www.amazon.com",

    consentUI: req.query["consent_ui"] || "NoConsent",
    query: req.query,

  }
  switch (data.consentUI){
    case "NoConsent":
      res.render("bwpspinner", {page: 'consent', ...data})
      break
    default:
      res.render("bwpconsent", {page: 'consent', ...data})
      break
  }

});
router.get('/maplanding', function(req, res, next) {
  res.send("MAP Landing")
});
router.get('/testsso', function(req, res, next) {
  res.render("testsso", {page: 'testsso'})
});
router.get('/universallink', function(req, res, next) {
  res.redirect(APSignInURL)

});
router.get('/consents', function(req, res, next) {

  res.sendFile(path.join(__dirname, "../html/consent.html"))
});
router.get('/apns', function(req, res, next) {

  res.render("apns")
});
router.post('/apns', async function(req, res, next) {
  try {
    let postForm = req.body
    let fields = ["teamID", "keyID", "title", "payload", "bundleID", "deviceToken"]
    for(let item of fields){
      if(!postForm[item]){
        throw new Error(`No ${item}`)
      }
    }

    var options = {
      token: {
        key: `path/to/APNsAuthKey_${postForm.keyID}.p8`,
        keyId: postForm.keyID,
        teamId: postForm.teamID
      },
      production: true
    };

    var apnProvider = new apn.Provider(options);
    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.

    note.alert = postForm.title;
    note.payload = JSON.parse(postForm.payload);
    note.topic = postForm.bundleID;
    apnProvider.send(note, postForm.deviceToken).then( (result) => {
      res.send(result)
    }).catch(e => {
      res.send(e)
    });
  } catch (e){
    res.send({error: e.message})
  }



});
router.get('/.well-known/apple-app-site-association', function(req, res, next) {
  let content = require("../public/apple-app-site-association.json")
  res.setHeader('content-type', 'text/plain');
  res.json(content)
});
module.exports = router;
