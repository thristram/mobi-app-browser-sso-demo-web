
const configurationData = {
    version: 'v1',
    universalLinkDomain: 'sso.amazon.com',
}
const amazonDomainRegex = /(^|\.)amazon\.((ae|ca|cn|com|de|eg|es|eu|fr|in|it|nl|pl|sa|se|sg|co\.(jp|uk))|com\.(au|br|mx|sg|tr|co))$/;

function getVersion() {
    return configurationData.version;
}

function getUniversalLinkDomain() {
    return configurationData.universalLinkDomain;
}

function getAmazonDomainRegex() {
    return amazonDomainRegex;
}
module.exports =  {
    getVersion:getVersion,
    getUniversalLinkDomain:getUniversalLinkDomain,
    getAmazonDomainRegex:getAmazonDomainRegex
}