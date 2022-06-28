var userAccount = localStorage.getItem('UserAccount')
let publicKeys =
  localStorage.getItem('PublicKeys') != null ? JSON.parse(localStorage.getItem('PublicKeys')) : null

var rpcCurrentIndex = localStorage.getItem('rpcIndex') != null ? localStorage.getItem('rpcIndex') : 0
const listRPC = ['https://wax.greymass.com', 'https://wax.pink.gg', 'https://api-idm.wax.io', 'https://api.wax.alohaeos.com', 'https://api.waxsweden.org', 'https://api.wax.greeneosio.com', 'https://chain.wax.io']

const waxJS = () => {
    if (userAccount != null && publicKeys != null) {
      return {
        rpcEndpoint: listRPC[rpcCurrentIndex],
        tryAutoLogin: true,
        userAccount: userAccount,
        pubKeys: publicKeys,
      }
    } else {
      return {
        rpcEndpoint: listRPC[rpcCurrentIndex],
        tryAutoLogin: true,
      }
    }
  }

var wax = new waxjs.WaxJS(waxJS())

const dappAccount = 'diggerswgame'
var enableCatchError = false
var start = false

const rowToken = $("#rowtoken")
const rowTrolley = $("#rowtrolley")
const rowTools = $("#rowtools")

const processIndicatorElem = $("#process-indicator")

const logElem = $("#logs")
const btnStartStopBotElem = $("#btn-start-stop-bot")
const rpcMenuButton = $("#rpc-menu-button")
const rpcMenuDropdown = $("#rpc-menu-dropdown")

populateRPC()

function populateRPC() {
    listRPC.map(i => {
        addRPC(i)
    })
    selectRPC()
}

function addRPC(rpc) {
    rpcMenuDropdown.append('<a class="dropdown-item rpc-item" href="#">' + rpc + '</a>')
}

$("#rpc-menu-dropdown a").on('click', function(){
    rpcCurrentIndex = listRPC.indexOf($(this).text())
    rpcMenuButton.text(listRPC[rpcCurrentIndex])
    console.log("rpc", rpcCurrentIndex)
});

function selectRPC() {
    rpcMenuButton.text(listRPC[rpcCurrentIndex])
    rpcCurrentIndex = listRPC.indexOf(rpcMenuButton.text())
}

$("#btn-login").click(async () => {
    await login()
})

$("#btn-logout").click(() => {
    localStorage.clear()
    location.reload(true)
})

btnStartStopBotElem.click(async () => {
    await startStopBot()
})

async function startStopBot() {
    if (start) {
        start = false
        localStorage.removeItem("started-bot");

        btnStartStopBotElem.text("Start Bot")
        btnStartStopBotElem.toggleClass('btn-info')
        btnStartStopBotElem.toggleClass('btn-danger')

        processIndicatorElem.text("")
        await new Promise(resolve => setTimeout(resolve, 1000))

    } else {
        start = true
        localStorage.setItem("started-bot", true);
        
        btnStartStopBotElem.text("Stop Bot")
        btnStartStopBotElem.toggleClass('btn-info')
        btnStartStopBotElem.toggleClass('btn-danger')

        processIndicatorElem.text("Starting Bot")
        await startBot()
    }
}

checkStoredUser()
async function checkStoredUser() {
    await checkLoginState()
}

async function login() {
    try {
        wax = new waxjs.WaxJS(waxJS())
        userAccount = await wax.login();
        console.log("rpcIndex login", rpcCurrentIndex)
        localStorage.setItem("UserAccount", userAccount);
        localStorage.setItem("PublicKeys", JSON.stringify(wax.pubKeys))
        localStorage.setItem("rpcIndex", rpcCurrentIndex);
        console.log('wax', wax)
        await checkLoginState()
    } catch (e) {
        console.log(e)
    }
}

async function checkLoginState() {
    btnStartStopBotElem.prop("disabled", true)
    if (userAccount != null) {
        $("#login-container").hide()
        await new Promise(resolve => setTimeout(resolve, 1000))
        $("#bot-container").show()
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log('user', userAccount)

        btnStartStopBotElem.prop("disabled", false)
        const startedBot = localStorage.getItem("started-bot")
        if (startedBot != null) {
            btnStartStopBotElem.click()
        } 
    } else {
        $("#login-container").show()
        $("#bot-container").hide()
    }
}

async function startBot() {
    if (!wax.api) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        await login()
        return console.log("Not logged")
    } else {
        await getToolsConfig()
        await getUserBalance()
        await getUserBags()
        await getTrolley()
        await getUserTools()
    }
}

var toolsConfs
async function getToolsConfig() {
    toolsConfs = (await getFromTableWithBound('toolsconfig', 100, '')).rows
    console.log(toolsConfs)
}

var userBalance
async function getUserBalance() {
    userBalance = (await getFromTableWithKey('userbalance', 10, '', 1)).rows
    var balanceToken = userBalance[0].balance
    console.log(balanceToken)

    rowToken.empty()
    for (var i=0; i<balanceToken.length; i++) {
        rowToken.append('<div class="col-sm">'+balanceToken[i]+'</div>')
    }
}

var userBags = []
async function getUserBags() {
    var log = "Get available small coal bags for trolley from this account - " + userAccount
    processIndicatorElem.text(log)
    addLogInfo(log)

    userAssets = (await getFromTableDynamic('atomicassets', userAccount, 'assets', 1000, "")).rows

    for (var i=0; i<userAssets.length; i++) {
        var asset = userAssets[i]
        if (asset.collection_name = 'diggersworld' && asset.template_id == 530552 && asset.schema_name == 'bags') {
            userBags.push(asset)
        }
    }
    if (userBags.length == 0) {
        addLog("Warning", "No small bag coal available in your account", 0, 'list-group-item-warning')
    }
    console.log(userBags)
}


var trolley
async function getTrolley() {
    trolley = (await getFromTableWithKey('trolley', 100, 'name', 1)).rows
    console.log(trolley)

    rowTrolley.empty()
    for (var i=0; i<trolley.length; i++) {
        var trolleyName = "trolley-" + trolley[i].asset_id

        var journey = await getJourneyLong(trolley[i])
        if (new Date(trolley.next_action_time * 1000) < new Date() && journey == trolley[i].push_counter) {
            await startNewJourney([trolley[i]])
        } else {
            addLog("Still on current Journey - No need to start new one.", trolleyName, 1, 'list-group-item-info')
        }
        await addTrolley(trolley[i], trolleyName)
        await onAttemptPushTrolley(trolley[i], trolleyName)
    }
}

async function onAttemptPushTrolley(trolley, trolleyName) {
    processIndicatorElem.text("Check status " + trolleyName)
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (new Date(trolley.next_action_time * 1000) > new Date()) {
        addLog("Still mining", trolleyName, 1, 'list-group-item-warning')
        reloadSched(new Date(trolley.next_action_time * 1000).getTime() - new Date().getTime())
    } else {
        if (userBags.length == 0) {
            await buySmallBagofCoal([trolley])
        }
        await onPushTrolley([trolley])
    }
}

async function startNewJourney(trolleys) {
    var name = "trolley-" + trolley[0].asset_id
    var log = "Atempt start new journey " + name
    processIndicatorElem.text(log)
    addLogInfo(log)

    await new Promise(resolve => setTimeout(resolve, 2000));

    const actions = $.map(trolleys, (trolley) => {
        return {
            account: dappAccount,
            name: 'startjourney',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                account: dappAccount,
                name: 'startjourney',
                authorization: [{
                    actor: userAccount,
                    permission: 'active',
                }],
                data: {
                    asset_owner: userAccount,
                    short_j: true,
                },
            },
        }
    })
    try {
        const result = await wax.api.transact({
            actions: actions
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        addLog("Success Start New Journey", name, actions.length, 'list-group-item-success')
    } catch (e) {
        addLog("Error Start New Journey ? " + name, e, actions.length, 'list-group-item-danger')
    }
}

async function buySmallBagofCoal(trolleys) {
    var log = "Atempt buy small bag of coal "
    processIndicatorElem.text(log)

    addLogInfo(log)

    await new Promise(resolve => setTimeout(resolve, 2000));

    const actions = $.map(trolleys, (trolley) => {
        return {
            account: dappAccount,
            name: 'buy',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                player: userAccount,
                template_id: 530552,
            },
        }
    })
    try {
        const result = await wax.api.transact({
            actions: actions
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        addLog("Success Buy", "Small bag of coal", actions.length, 'list-group-item-success')
        await getUserBags()
    } catch (e) {
        addLog("Error Buy ? " + "Small bag of coal", e, actions.length, 'list-group-item-danger')
    }
}

async function onPushTrolley(trolleys) {
    if (userBags.length != 0) {
        var name = "trolley-" + trolleys[0].asset_id
        var log = "Atempt push " + name
        processIndicatorElem.text(log)
        addLogInfo(log)

        await new Promise(resolve => setTimeout(resolve, 2000));

        const actions = $.map(trolleys, (trolley) => {
            return {
                account: 'atomicassets',
                name: 'transfer',
                authorization: [{
                    actor: userAccount,
                    permission: 'active',
                }],
                data: {
                    from: userAccount,
                    to: dappAccount,
                    memo: 'push',
                    asset_ids: [userBags[0].asset_id],
                },
            }
        })
        try {
            const result = await wax.api.transact({
                actions: actions
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            });
            addLog("Success Push Trolley", name, actions.length, 'list-group-item-success')
            await updateTrolley()
        } catch (e) {
            addLog("Error Push Trolley ? " + name, e, actions.length, 'list-group-item-danger')
        }
    } else {
        addLog("Warning", "Cannot push trolley without small bag coal available in your account", 0, 'list-group-item-warning')
    }
    
}

async function updateTrolley() {
    trolley = (await getFromTableWithKey('trolley', 100, 'name', 1)).rows
    console.log(trolley)

    rowTrolley.empty()
    for (var i=0; i<trolley.length; i++) {
        var trolleyName = "trolley-" + trolley[i].asset_id
        await addTrolley(trolley[i], trolleyName)
    }
}

var userTools
async function getUserTools() {
    userTools = (await getFromTableWithKey('tools', 100, 'name', 2)).rows
    console.log(userTools)

    if (userTools.length == 0) {
        addLog("Error No Available Digger Tools","Please buy a digger tool at https://wax.atomichub.io/market?collection_name=diggersworld&order=asc&schema_name=tools&sort=price&symbol=WAX", 0, 'list-group-item-danger')
        return
    }

    availableToolToMine = 0 // # claim tool failed - refetch getUserTools and do mining again
    totalClaimedTools = 0   // # claimed tool success - 0 will not refetch the getUserBalance & updateUserToolsAfterMining

    rowTools.empty()

    for (var i=0; i<userTools.length; i++) {
        tool = userTools[i]

        const tconf = toolsConfs[toolsConfs.map(i => i.template_id).indexOf(tool.template_id)]
        const toolName = tconf.template_name + "-" + tconf.type + ':' + tconf.rarity + '-' + tool.asset_id

        await addTools(tool, tconf)
        await attemptClaimTool(tool, toolName)
    }

    if (availableToolToMine > 0) {
        await new Promise(resolve => setTimeout(resolve, 10*1000))
        await getUserTools()
    } else {
        processIndicatorElem.text("This page will reload after 1 hour")
        //update only if there's any claimed tool
        if (totalClaimedTools != 0) {
            await new Promise(resolve => setTimeout(resolve, 5000))
            await getUserBalance()
            await updateUserToolsAfterMining()
        }
        await reload(60*60*1000)
    }
}


async function updateUserToolsAfterMining() {
    userTools = (await getFromTableWithKey('tools', 100, 'name', 2)).rows
    console.log(userTools)

    rowTools.empty()
    for (var i=0; i<userTools.length; i++) {
        tool = userTools[i]

        const tconf = toolsConfs[toolsConfs.map(i => i.template_id).indexOf(tool.template_id)]

        await addTools(tool, tconf)
    }

}

var availableToolToMine = 0
async function attemptClaimTool(tool, toolName) {
    processIndicatorElem.text("Check tool status " + toolName)
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (new Date(tool.next_mine * 1000) > new Date()) {
        addLog("Still mining", toolName, 1, 'list-group-item-warning')
        reloadSched(new Date(tool.next_mine * 1000).getTime() - new Date().getTime())
    } else {
        await onRepairTool([tool], toolName)
        await onClaimTool([tool], toolName)
    }
}

async function onRepairTool(tools, toolName) {
    if (tools[0].durability == 0) {
        var log = "Atempt repair tool " + toolName
        processIndicatorElem.text(log)
        addLogInfo(log)
        await new Promise(resolve => setTimeout(resolve, 2000))

        const actionsRepair = $.map(tools, (tool) => {
            return {
                account: dappAccount,
                name: 'trepair',
                authorization: [{
                    actor: userAccount,
                    permission: 'active',
                }],
                data: {
                    asset_owner: userAccount,
                    asset_id: tool.asset_id,
                },
            }
        })
        try {
            const result = await wax.api.transact({
                actions: actionsRepair
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            });
            addLog("Success Repair Tool", toolName, actionsRepair.length, 'list-group-item-success')
        } catch (e) {
            addLog("Error Repair Tool ? " + toolName, e, actionsRepair.length, 'list-group-item-danger')
        }
    }
}

async function onClaimTool(tools, toolName) {
    var log = "Atempt claim tool " + toolName
    processIndicatorElem.text(log)
    addLogInfo(log)

    await new Promise(resolve => setTimeout(resolve, 2000));

    const actionsRepair = $.map(tools, (tool) => {
        return {
            account: dappAccount,
            name: 'safemine',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                asset_owner: userAccount,
                asset_id: tool.asset_id,
            },
        }
    })
    try {
        const result = await wax.api.transact({
            actions: actionsRepair
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        totalClaimedTools = totalClaimedTools + 1
        addLog("Success Claim Tool", toolName, actionsRepair.length, 'list-group-item-success')
    } catch (e) {
        availableToolToMine = availableToolToMine + 1
        addLog("Error Claim Tool ? " + toolName, e, actionsRepair.length, 'list-group-item-danger')
    }
}

async function countDownTimerTools(tool) {
    var countDownDate = new Date(tool.next_mine * 1000);
    await countDownTimer(tool.asset_id, countDownDate)
}

async function countDownTimerTrolley(trolley) {
    var countDownDate = new Date(trolley.next_action_time * 1000);
    await countDownTimer(trolley.asset_id, countDownDate)
}

async function countDownTimer(id, countDownDate) {
    await new Promise(resolve => setTimeout(resolve, 100));
    $("#"+id).text("Loading")
    var countDownTime = countDownDate.getTime()
    var x = setInterval(function() {
        var now = new Date().getTime();

        var distance = countDownTime - now;

        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
        var seconds = Math.floor((distance % (1000 * 60)) / 1000).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});

        $("#"+id).text(hours + ":" + minutes + ":" + seconds)

        if (distance < 0) {
            clearInterval(x);
            $("#"+id).text("Ready");
        }
    }, 1000);
}

async function addTools(tool, tconf) {
    rowTools.append('<li class="list-group-item d-flex justify-content-between align-items-center">' +
        '<span class=" text-left col-6 tool-name">' + tconf.template_name + "-" + tconf.rarity + '</span>' +
        '<span class="text-right col-1">' + tool.durability+'/'+tconf.init_durability + '</span>' +
        //'<span class="text-right col-1">' + 0 + ' wax</span>' +
        '<span class="badge badge-primary badge-pill col-2" style="width: 80px;" id="' + tool.asset_id + '">' + countDownTimerTools(tool) + '</span>' +
    '</li>')
}

async function getJourneyLong(trolley) {
    if (trolley.journey_type == 'short') {
        return 25
    } else if (trolley.journey_type == 'long') {
        return 60
    } else {
        return 0
    }
}

async function addTrolley(trolley) {
    rowTrolley.append('<li class="list-group-item d-flex justify-content-between align-items-center">' +
        '<span class=" text-left col-6 trolley-name">Trolley-' + trolley.asset_id + '</span>' +
        '<span class="text-right col-1">' + trolley.push_counter + '/' + await getJourneyLong(trolley) + '</span>' +
        //'<span class="text-right col-1">' + 0 + ' wax</span>' +
        '<span class="badge badge-primary badge-pill col-2" style="width: 80px;" id="' + trolley.asset_id + '">' + countDownTimerTrolley(trolley) + '</span>' +
    '</li>')
}

var totalWax = 0
async function addTotalNetProfit() {
    rowTools.append('<li class="list-group-item d-flex justify-content-between align-items-center">' +
        '<span class=" text-left col-4 tool-name" >' + 'Total' + '</span>' +
        '<span class="text-right col-3">' + '' + '</span>' +
        '<span class="text-right col-3">' + 0 + ' wax</span>' +
        '<span class="col-2" style="width: 80px;">' + '' + '</span>' +
    '</li>')
}

function addLog(tag, textLog, actionsCount, bsClass) {
    logElem.prepend('<li class="transactional-list list-group-item d-flex justify-content-between align-items-center ' + bsClass + '">' + tag + " : " + textLog + '<span class="badge badge-primary badge-pill">' + actionsCount + '</span></li>')
}

function addLogInfo(textLog) {
    logElem.prepend('<li class="non-transactional-list list-group-item list-group-item-info">' + textLog + '</li>')
}

async function reload(time) {
    console.log("reload(time) was called: " + time)
    await new Promise(resolve => setTimeout(resolve, time))
    console.log("reload(time) was executed")
    location.reload(true)
}

function reloadSched(time) {
    console.log("reloadSched(time) was called: " + time)
    setTimeout(function(){ 
        console.log("reloadSched(time) was executed")
        location.reload(true)
    }, time); 
    console.log("reloadSched(time) is now at the bottom")
}

async function getFromTableDynamic(code, scope, table, limit, bound) {
    var tableReq = {
        json: true,
        code: code,
        scope: scope,
        table: table,
        lower_bound:bound,
        upper_bound:bound,
        limit: limit,
        reverse: false,
        show_payer: false
    }
    console.log("tableReq", tableReq)
    return await wax.rpc.get_table_rows(tableReq);
}

async function getFromTable(table, limit) {
    var tableReq = {
        json: true,
        code: dappAccount,
        scope: userAccount,
        table: table,
        limit: limit,
        reverse: false,
        show_payer: false
    }
    console.log("tableReq", tableReq)
    return await wax.rpc.get_table_rows(tableReq);
}

async function getFromTableWithBound(table, limit, bound) {
    var tableReq = {
        json:true,
        code:dappAccount,
        scope:dappAccount,
        table:table,
        lower_bound:bound,
        upper_bound:bound,
        limit:limit,
        reverse:false,
        show_payer:false
    }
    // console.log("tableReq", tableReq)
    return await wax.rpc.get_table_rows(tableReq);
}

async function getFromTableWithoutBound(table, limit) {
    var tableReq = {
        json:true,
        code:dappAccount,
        scope:dappAccount,
        table:table,
        limit:limit,
        reverse:false,
        show_payer:false
    }
    // console.log("tableReq", tableReq)
    return await wax.rpc.get_table_rows(tableReq);
}

async function getFromTableWithKey(table, limit, keyType, indexPos) {
    var tableReq = {
        json:true,
        code:dappAccount,
        scope:dappAccount,
        table:table,
        table_key:"",
        lower_bound:userAccount,
        upper_bound:userAccount,
        index_position:indexPos,
        key_type:keyType,
        limit:limit,
        reverse:false,
        show_payer:false
    }
    // console.log("tableReq", tableReq)
    return await wax.rpc.get_table_rows(tableReq);
}