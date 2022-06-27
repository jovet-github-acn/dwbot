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
        //only update if there's any claimed tool
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
        processIndicatorElem.text("Atempt repair tool " + toolName)
        addLogInfo("Atempt repair tool " + toolName)
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
    processIndicatorElem.text("Atempt claim tool " + toolName)
    addLogInfo("Atempt claim tool " + toolName)

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
        '<span class=" text-left col-4 tool-name">' + tconf.template_name + "-" + tconf.type + ':'+tconf.rarity + '</span>' +
        '<span class="text-right col-3">' + tool.durability+'/'+tconf.init_durability + '</span>' +
        '<span class="text-right col-3">' + 0 + ' wax</span>' +
        '<span class="badge badge-primary badge-pill col-2" style="width: 80px;" id="' + tool.asset_id + '">' + countDownTimerTools(tool) + '</span>' +
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
    $("#logs").prepend('<li class="transactional-list list-group-item d-flex justify-content-between align-items-center ' + bsClass + '">' + tag + " : " + textLog + '<span class="badge badge-primary badge-pill">' + actionsCount + '</span></li>')
}

function addLogInfo(textLog) {
    $("#logs").prepend('<li class="non-transactional-list list-group-item list-group-item-info">' + textLog + '</li>')
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