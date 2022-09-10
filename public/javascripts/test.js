let list = {NA: ["US","CA","MX", "BR"], EU: ["UK", "IN", "AE", "EG", "DE", "ES", "FR", "IT", "NL", "PL", "SA", "SE", "TR"], FE: ["AU", "JP", "SG"]}
let isRegional = true
let isDisplayRegion = true
// Replace lowercase country code to  [LOWER]
// Replace uppercase country code to  [UPPER]
// Replace region to [REGION]

let template = '{{igraph type="bitmap" args="graph=SchemaName1=Service&DataSet1=Prod&Marketplace1=[REGION]Amazon&HostGroup1=ALL&Host1=ALL&ServiceName1=KavachService&MethodName1=StartWebAuthenticationChallenge&Client1=ALL&MetricClass1=NONE&Instance1=NONE&Metric1=Time&Period1=FiveMinute&Stat1=n&Label1=StartWebAuthenticationChallenge&SchemaName2=Service&MethodName2=FinishWebAuthenticationChallenge&YAxisPreference2=right&Label2=FinishWebAuthenticationChallenge&DecoratePoints=true&StartTime1=-P7D&EndTime1=P0D&FunctionExpression1=M1&FunctionLabel1=Start%20%5B%7Bsum%7D%5D&FunctionYAxisPreference1=left&FunctionColor1=default&FunctionExpression2=M2&FunctionLabel2=Finish%20%5B%7Bsum%7D%5D&FunctionYAxisPreference2=left&FunctionColor2=default&FunctionExpression3=M2%20%2F%20M1%20*%20100&FunctionLabel3=Success%20Rate%20%5Bavg%3A%20%7Bavg%7D%25%5D&FunctionYAxisPreference3=right&FunctionColor3=default&ChartLegend=true|width=1300|height=250"/}}'
let arr = []

for(let region in list){
    if(isRegional){
        arr.push(getItem(null, region))
    }   else    {
        for (let country of list[region]){

            arr.push(getItem(country, region))
        }
    }

}
console.log(arr.join("\n") + "|")
function getItem(country, region){
    let str = ""
    if(isRegional){
        let regionSymbol = isDisplayRegion ? region.replace("NA", "US") : region.replace("NA", "US").replace("EU", "GB").replace("FE", "JP")

        str = template
            .split("[REGION]")
            .join(regionSymbol)
    }   else    {
        str = template
            .split("[LOWER]")
            .join( getCountryLower(country))
            .split("[UPPER]", )
            .join(getCountryUpper(country))
            .split("[REGION]")
            .join(region)
    }


    return isRegional ?  `|${region}|${str}` :`|${country}|${str}`
}
function getCountryUpper(c){
    if(c === "UK"){
        return "GB"
    }
    return c
}
function getCountryLower(c){
    return c.toLowerCase()

}