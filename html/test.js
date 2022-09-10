let string = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
<h4 id="PCKSCodeVerifier"></h4>
<h4 id="PCKSAuthCode"></h4>
<h4 id="AuthCookie"></h4>
<br/><br/>
<a href="javascript:;" id="bwm-links" onclick="setStorage()">Set Auth Storage</a>
<a href="javascript:;" onclick="setAuthCookie()">Set Auth Cookie</a>
<script src="./javascripts/bwcheck.js"></script>
<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha256-ZosEbRLbNQzLpnKIkEdrPv7lOy9C27hHQ+Xp8a4MxAQ=" crossorigin="anonymous"></script>
<script src="./javascripts/script.js"></script>
<script type="text/javascript">
    $(function() {
        getStorage()
        getAuthCookie()
    })
    function getStorage(){
        $("#PCKSCodeVerifier").html("PCKSCodeVerifier: " + window.localStorage.getItem("PCKSCodeVerifier") || "None")
        $("#PCKSAuthCode").html("PCKSAuthCode: " + window.localStorage.getItem("PCKSAuthCode") || "None")
    }
    function setStorage(){
        let randomNumber  = Math.floor(1000 + Math.random() * 9000)
        window.localStorage.setItem("PCKSCodeVerifier", "Verify-" + randomNumber)
        window.localStorage.setItem("PCKSAuthCode", "Auth-" + randomNumber)
        window.sessionStorage.setItem("PCKSCodeVerifier", "Verify-" + randomNumber)
        window.sessionStorage.setItem("PCKSAuthCode", "Auth-" + randomNumber)
        getStorage()
    }
    function setAuthCookie(){
        let randomNumber  = Math.floor(1000 + Math.random() * 9000)
        document.cookie = "username=Amazon-" + randomNumber
        getAuthCookie()
    }
    function getAuthCookie(){
        $("#AuthCookie").html("AuthCookie: " + document.cookie || "None")
    }



</script>
</body>
</html>`


let times = 10000000

let reg = /\bwindow|Storage\b/;
let time = new Date()

for(let i = 0; i < times; i ++){
    reg.test(string)
}
let timePerRecord = (new Date() - time) / times
console.log(`Time per record: ${timePerRecord} ms, Total time for 20,000 rules: ${timePerRecord * 20000 * 5} ms`)