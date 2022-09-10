['Crash','Unable to login', 'Unable to Sign-in', 'Sign in App crash'].some(text => issue.title.includes(text))


const allowlist = [
    "ACTION REQUIRED"
];
const keywords = [
    "Unable to login",
    "Unable to signin",
    "Unable to sign-in"
];

for (let item of allowlist){
    if(issue.title.toLowerCase().includes(item.toLowerCase())){
        return false
    }
}

for (let item of keywords){
    if(issue.title.includes(item)){
        return true
    }
}

