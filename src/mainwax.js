// localStorage.clear()
var userAccount = localStorage.getItem('UserAccount')
let publicKeys =
  localStorage.getItem('PublicKeys') != null ? JSON.parse(localStorage.getItem('PublicKeys')) : null

const waxJS = () => {
    if (userAccount != null && publicKeys != null) {
      return {
        rpcEndpoint: 'https://api.waxsweden.org',
        tryAutoLogin: true,
        userAccount: userAccount,
        pubKeys: publicKeys,
      }
    } else {
      return {
        rpcEndpoint: 'https://api.waxsweden.org',
        tryAutoLogin: true,
      }
    }
  }
// var userAccount = wax.userAccount;

var wax = new waxjs.WaxJS(waxJS())

const dappAccount = 'saarofficial'
var enableCatchError = false
var start = false
const maxBatchTools = 20
const maxBatchPlanets = 20

const processIndicatorElem = $("#process-indicator")
const logElem = $("#logs")
const btnStartStopBotElem = $("#btn-start-stop-bot")
const autoTransferLand = document.getElementById("auto-transfer-land")

var waitingToClaimForLandTransfer = false

$("#btn-login").click(async () => {
    await login()
})

$("#btn-logout").click(() => {
    localStorage.clear()
    location.reload()
})

autoTransferLand.addEventListener('change', e => {
    localStorage.setItem("auto-transfer-land", e.target.checked);
    console.log("change", localStorage.getItem("auto-transfer-land"))
});

  const isAutoTransferLand = localStorage.getItem("auto-transfer-land") ? localStorage.getItem("auto-transfer-land") : false;
    autoTransferLand.checked =  isAutoTransferLand
    console.log("isAutoTransferLand", isAutoTransferLand)
    console.log("autoTransferLand.checked", autoTransferLand.checked)

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
        logElem.empty()
        await new Promise(resolve => setTimeout(resolve, 100));
    } else {
        start = true
        localStorage.setItem("started-bot", true);
        
        btnStartStopBotElem.text("Stop Bot")
        btnStartStopBotElem.toggleClass('btn-info')
        btnStartStopBotElem.toggleClass('btn-danger')

        processIndicatorElem.text("Starting Bot")
        addLogInfo('Starting Bot')
        await startBot()
    }
}

checkStoredUser()
async function checkStoredUser() {
    await checkLoginState()
}

async function login() {
    try {
        userAccount = await wax.login();
        localStorage.setItem("UserAccount", userAccount);
        localStorage.setItem("PublicKeys", JSON.stringify(wax.pubKeys))
        console.log('wax', wax)
        await checkLoginState()
    } catch (e) {
        console.log(e)
    }
}

async function checkLoginState() {
    if (userAccount != null) {
        $("#login-container").hide()
        await new Promise(resolve => setTimeout(resolve, 2000));
        $("#bot-container").show()
        await new Promise(resolve => setTimeout(resolve, 10000));
        const user = await getUser()
        setupTokens(user)
        const startedBot = localStorage.getItem("started-bot");
        if (startedBot != null) {
            btnStartStopBotElem.click()
        } 
    } else {
        $("#login-container").show()
        $("#bot-container").hide()
    }
}

function setupTokens(user) {
    const balances = user.balances

    const sre = tokenIndex(balances, "E") > -1 ? balances[tokenIndex(balances, "E")].split(" ")[0] : 0
    const srm = tokenIndex(balances, "M") > -1 ? balances[tokenIndex(balances, "M")].split(" ")[0] : 0
    const srw = tokenIndex(balances, "W") > -1 ? balances[tokenIndex(balances, "W")].split(" ")[0] : 0
    const srs = tokenIndex(balances, "S") > -1 ? balances[tokenIndex(balances, "S")].split(" ")[0] : 0
    $("#sre").text(numberWithCommas(sre) + " SRE")
    $("#srm").text(numberWithCommas(srm) + " SRM")
    $("#srw").text(numberWithCommas(srw) + " SRW")
    $("#srs").text(numberWithCommas(srs) + " SRS")
}

function tokenIndex(balances, key) {
    return balances.map(i => i.split(' ')[1]).indexOf(key)
}

function numberWithCommas(n) {
    var parts=n.toString().split(".");
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
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

async function getFromTableWithKey(table, limit) {
    var tableReq = {
        json:true,
        code:dappAccount,
        scope:dappAccount,
        table:table,
        table_key:"",
        lower_bound:userAccount,
        upper_bound:userAccount,
        index_position:2,
        key_type:"i64",
        limit:limit,
        reverse:false,
        show_payer:false
    }
    // console.log("tableReq", tableReq)
    return await wax.rpc.get_table_rows(tableReq);
}

var alreadySetupToolsConfs = false
var alreadySetupExtraHours = false
var alreadySetupAmuletsConfs = false
async function startBot() {
    if (!wax.api) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await login()
        return console.log("Not logged")
    }
    if (!alreadySetupToolsConfs) {
        const tools = (await getFromTable('yeti', 100)).rows
        console.log("tools yeti", tools)
        await setupToolsConfs(tools)
        alreadySetupToolsConfs = true
    }
    if (!alreadySetupAmuletsConfs) {
        const amulets = (await getFromTable('amulet', 100)).rows
        console.log("amulets", amulets)
        await setupAmuletsConfs(amulets)
        alreadySetupAmuletsConfs = true
    }
    // if (!alreadySetupExtraHours) {
    //     await getExtraHours()
    //     alreadySetupExtraHours = true
    // }
    // if (start) {
    //     await repairAllTools()
    // } else {
    //     await new Promise(resolve => setTimeout(resolve, 100));
    //     return console.log("Stop Bot")
    // }
    if (autoTransferLand.checked && start) {
        await transferLand()
    } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        return console.log("Stop Bot")
    }
    if (start) {
        await claimTools()
    } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        return console.log("Stop Bot")
    }
    if (start) {
        await claimAmulets()
    } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        return console.log("Stop Bot")
    }
    if (start) {
        await startBot()
    } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        return console.log("Stop Bot")
    }
}

var toolsConfs = []
async function setupToolsConfs(tools) {
    const setup = async () => {
        for (var i = 0; i < tools.length; i++) {
            const tool = tools[i]
            const tConfs = (await getFromTableWithBound('yeticfg', 100, '')).rows
            const tCon = tConfs[tConfs.map(i => i.template_id).indexOf(tool.template_id)]
            const tConfsExisting = toolsConfs.map(i => i.template_id).indexOf(tool.template_id) > -1 
            if (!tConfsExisting) {
                toolsConfs.push(tCon)
            }
        }
    }
    
    await setup()
    console.log("toolsConfs", toolsConfs)
}

var amuletsConfs = []
async function setupAmuletsConfs(amulets) {
    const setup = async () => {
        for (var i = 0; i < amulets.length; i++) {
            const amulet = amulets[i]
            const tConfs = (await getFromTableWithBound('amuletcfg', 100, '')).rows
            const tCon = tConfs[tConfs.map(i => i.template_id).indexOf(amulet.template_id)]
            const tConfsExisting = amuletsConfs.map(i => i.template_id).indexOf(amulet.template_id) > -1 
            if (!tConfsExisting) {
                amuletsConfs.push(tCon)
            }
        }
    }
    
    await setup()
    console.log("amuletsConfs", amuletsConfs)
}

// const extraHoursConf = [
//     {
//         type: "Asteroid",
//         hours: 0
//     },
//     {
//         type: "Plasma",
//         hours: 0
//     },
//     {
//         type: "Oxygen",
//         hours: 0
//     }]
// async function getExtraHours() {
//     const tools = (await getFromTableWithKey('gadgets', 500)).rows
//     const setup = () => {
//         const filteredConfs = toolsConfs.filter(i => i.schema_name == "timemachines")
//         for (let i = 0; i < filteredConfs.length; i++) {
//             const timeMachineConf = filteredConfs[i];
//             const timeMachines = tools.filter(j => j.template_id == timeMachineConf.template_id)
//             const hours = timeMachineConf.rewards[timeMachineConf.rewards.map(k => k.split(' ')[1]).indexOf('MINING')].split(' ')[0]

//             const index = extraHoursConf.map(j => j.type).indexOf(timeMachineConf.type)
//             extraHoursConf[index].hours = extraHoursConf[index].hours + (hours * timeMachines.length)
//         }
//     } 
    
//     setup()
// }

// async function repairAllTools() {
//     processIndicatorElem.text("Repairing All Tools")
//     addLogInfo('Repairing All Tools')
//     const tools = (await getFromTable('yeti', 100)).rows
//     // console.log("tools", tools)
//     const repairableTools = await getRepairableTools(tools)
//     const qtyTools = repairableTools.length

//     if (qtyTools > 0) {
//         const batchLength = Math.ceil(qtyTools / maxBatchTools)
//         for (var i = 0; i < batchLength; i++) {
//             let currentEntry = i
//             let currentClose = currentEntry + maxBatchTools > qtyTools ? qtyTools : currentEntry + maxBatchTools

//             const queueTools = repairableTools.slice(currentEntry, currentClose)
//             await attempRepairTools(queueTools)
//         }
//     } else {
//         await new Promise(resolve => setTimeout(resolve, 5000));
//     }
// }


// async function getRepairableTools(tools) {
//     return $.map(tools, (tool) => {
//         const toolsConf = toolsConfs[toolsConfs.map(i => i.template_id).indexOf(tool.template_id)]
//         const durability = toolsConf.max_durability
//         const current_durability = tool.durability_left
//         return current_durability < durability ? tool : null
//     })
// }

async function attempRepairTools(tools) {
    const actionsRepair = $.map(tools, (tool) => {
        return {
            account: dappAccount,
            name: 'repairyeti',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                account: userAccount,
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
        addLog("Success Repair Tool", result, actionsRepair.length, 'list-group-item-success')
        const user = await getUser()
        setupTokens(user)
        await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
        addLog("Error Repair Tool", e, actionsRepair.length, 'list-group-item-danger')
    }
}

async function claimTools() {
    processIndicatorElem.text("Attempt to claim tools")
    addLogInfo('Attempt to claim tools')
    const tools = (await getFromTable('yeti', 100)).rows
    const claimableTools = getClaimableTools(tools)
    const qtyTools = claimableTools.length

    if (qtyTools > 0) {
        const claims = async () => {
            for (var i = 0; i < qtyTools; i++) {
                const tool = claimableTools[i]
                await buyEnergy()
                await attemptClaimAndMineTools([tool], false)
                await attempRepairTools([tool])
                // if (!waitingToClaimForLandTransfer) {
                //     await attemptClaimAndMineTools([tool], true)
                // }
            }
        }
        await claims()
    } else {
        addLogInfo('All tools are not yet ready')
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

function getClaimableTools(tools) {
    return $.map(tools, (tool) => {
        const dateNow = new Date()
        const dateClaim = new Date(tool.mine_end * 1000)
        return dateNow > dateClaim ? tool : null
    })
}

async function buyEnergy() {
    processIndicatorElem.text("Attempt to refill energy")
    addLogInfo('Attempt to refill energy')
    const staminas = (await getFromTableWithBound("staminacfg", 10, null)).rows
    const user = await getUser()

    console.log("staminas", staminas)
    const energyFull = staminas[staminas.map(i => i.level).indexOf(user.stamina_level)].max_stamina
    const energyLeft = user.stamina
    console.log("energyFull", energyFull)
    console.log("energyLeft", energyLeft)

    const balances = user.balances
    const sre = tokenIndex(balances, "E") > -1 ? balances[tokenIndex(balances, "E")].split(" ")[0] : 0
    console.log("sre", sre)

    const costEnergy = parseInt((energyFull - energyLeft))
    const finalEnergyToRefill = sre > costEnergy ? costEnergy : sre

    if (costEnergy > 0) {
        const actionsBuyEnergy = [{
            account: dappAccount,
            name: 'renewstamina',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                account: userAccount,
                stamina_to_restore: finalEnergyToRefill,
            },
        }]
        try {
            const result = await wax.api.transact({
                actions: actionsBuyEnergy
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            });
            addLog("Success Buy Energy", result, actionsBuyEnergy.length, 'list-group-item-success')
            const user = await getUser()
            setupTokens(user)
            await new Promise(resolve => setTimeout(resolve, 000));
        } catch (e) {
            addLog("Error Buy Energy", e, actionsBuyEnergy.length, 'list-group-item-danger')
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

async function attemptClaimAndMineTools(tools, isMine) {
    const assets = (await getFromTableDynamic('atomicassets', userAccount, 'assets', 9999, null)).rows 
    const passes = assets.filter(i => i.collection_name == "saarofficial" && i.schema_name == "passes")
    const passTemplateId = passes.length > 0 ? passes[0].asset_id : 0

    console.log("assets", assets)
    console.log("passes", passes)
    console.log("passTemplateId", passTemplateId)

    const actionsClaim = $.map(tools, (tool) => {
        const actionsData = isMine ? {
            account: userAccount,
            asset_id: tool.asset_id,
            pass_id: passTemplateId
        } : {
            account: userAccount,
            asset_id: tool.asset_id
        }
        return {
            account: dappAccount,
            name:  isMine ? 'mineyeti' : 'claimyeti',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: actionsData,
        }
    })
    try {
        const result = await wax.api.transact({
            actions: actionsClaim
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        if (isMine) {
            addLog("Success Mine Tool", result, actionsClaim.length, 'list-group-item-success')
        } else {
            addLog("Success Claim Tool", result, actionsClaim.length, 'list-group-item-success')
        }
        const user = await getUser()
        setupTokens(user)
        await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
        if (isMine) {
            addLog("Error Mine Tool", e, actionsClaim.length, 'list-group-item-danger')
        } else {
            addLog("Error Claim Tool", e, actionsClaim.length, 'list-group-item-danger')
        }
    }
}

async function claimAmulets() {
    processIndicatorElem.text("Attempt to claim amulets")
    addLogInfo('Attempt to claim Tool')
    const amulets = (await getFromTable('amulet', 100)).rows
    const claimableAmulets = getClaimableAmulets(amulets)
    const qtyAmulets = claimableAmulets.length

    if (qtyAmulets > 0) {
        const claims = async () => {
            for (var i = 0; i < qtyAmulets; i++) {
                const amulet = claimableAmulets[i]
                await attemptClaimAndMineAmulets([amulet], false)
                await attemptClaimAndMineAmulets([amulet], true)
            }
        }
        await claims()
    } else {
        addLogInfo('All amulets are not yet ready')
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

function getClaimableAmulets(amulets) {
    return $.map(amulets, (amulet) => {
        const dateNow = new Date()
        const dateClaim = new Date(amulet.mine_end * 1000)
        return dateNow > dateClaim ? amulet : null
    })
}

async function attemptClaimAndMineAmulets(amulets, isMine) {
    const assets = (await getFromTableDynamic('atomicassets', userAccount, 'assets', 9999, null)).rows 
    const passes = assets.filter(i => i.collection_name == "saarofficial" && i.schema_name == "passes")
    const passTemplateId = passes.length > 0 ? passes[0].asset_id : 0

    console.log("assets", assets)
    console.log("passes", passes)
    console.log("passTemplateId", passTemplateId)

    const actionsClaim = $.map(amulets, (amulet) => {
        const actionsData = isMine ? {
            account: userAccount,
            asset_id: amulet.asset_id,
            pass_id: passTemplateId
        } : {
            account: userAccount,
            asset_id: amulet.asset_id
        }
        return {
            account: dappAccount,
            name:  isMine ? 'mineamlt' : 'claimamlt',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: actionsData,
        }
    })
    try {
        const result = await wax.api.transact({
            actions: actionsClaim
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        if (isMine) {
            addLog("Success Mine Amulet", result, actionsClaim.length, 'list-group-item-success')
        } else {
            addLog("Success Claim Amulet", result, actionsClaim.length, 'list-group-item-success')
        }
        const user = await getUser()
        setupTokens(user)
        await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
        if (isMine) {
            addLog("Error Mine Amulet", e, actionsClaim.length, 'list-group-item-danger')
        } else {
            addLog("Error Claim Amulet", e, actionsClaim.length, 'list-group-item-danger')
        }
    }
}

const sunnyWeather = 1
const highestTax = 5
async function transferLand() {
    console.log("waitingToClaimForLandTransfer", waitingToClaimForLandTransfer)
    const user = await getUser()

    const mineLandId = user.mine_land_id
    const userResType = user.mine_res_type
    
    const currentLand = (await getFromTableWithBound("land", 1, mineLandId)).rows[0]
    const currentWeather = currentLand.natural_conditions
    console.log("currentLand", currentLand)

    const changedLandAt = user.mine_land_changed_at
    var changedLandAtDate = new Date(changedLandAt * 1000)
    changedLandAtDate.setHours(changedLandAtDate.getHours()+48);
    const dateNow = new Date()

    console.log("changedLandAtDate", changedLandAtDate)
    console.log("dateNow", dateNow)
    if (dateNow < changedLandAtDate) {
        addLogInfo('You can change your land at ' + changedLandAtDate)
    } else if (currentWeather == sunnyWeather) {
        addLogInfo('Your land\'s weather is Sunny, no need to transfer land')
    } else {
        const curentLandTemplateId = currentLand.template_id
        const currentPlayersCount = currentLand.players_count
        const currentLandTax = currentLand.land_tax

        const landConfs = (await getFromTableWithoutBound("landcfg", 9999)).rows
        const currentLandConf = landConfs[landConfs.map(i => i.template_id).indexOf(curentLandTemplateId)]
        const currentRarity = currentLandConf.rarity
        const currentResType = currentLandConf.res_type
        const currentMaxPlayersCount = currentLandConf.max_players_count

        const lands = (await getFromTableWithoutBound("land", 99999)).rows
        const sunnyResTypeLands = lands.filter(i => {
            const landTemplateId = i.template_id
            const playersCount = i.players_count

            const landConf = landConfs[landConfs.map(i => i.template_id).indexOf(landTemplateId)]
            const maxPlayersCount = landConf.max_players_count
            return i.natural_conditions == sunnyWeather && landConf.res_type == userResType && playersCount < maxPlayersCount && i.land_tax <= highestTax
        })
        
        sunnyResTypeLands.sort((land1, land2) => {
            const landConf1 = landConfs[landConfs.map(i => i.template_id).indexOf(land1.template_id)]
            const landConf2 = landConfs[landConfs.map(i => i.template_id).indexOf(land2.template_id)]
            return land1.land_tax - land2.land_tax && landConf2.rarity - landConf1.rarity
        })

        const bestLand = sunnyResTypeLands[0]

        console.log("sunnyResTypeLands", sunnyResTypeLands)
        console.log("bestLand", bestLand)
        await attemptTransferLand(bestLand.asset_id)
    }
}

async function attemptTransferLand(landId) {
    const actionsClaim = [
        {
            account: dappAccount,
            name: 'selectland',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                account: userAccount,
                land_id: landId
            },
        }
    ]
    try {
        const result = await wax.api.transact({
            actions: actionsClaim
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        waitingToClaimForLandTransfer = false
        addLog("Success Transfer Land", result, actionsClaim.length, 'list-group-item-success')
        const user = await getUser()
        setupTokens(user)
        await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
        console.log(e.message)
        waitingToClaimForLandTransfer = e.message.includes("wait") 
        addLog("Error Transfer Land", e, actionsClaim.length, 'list-group-item-danger')
    }
}

async function getUser() {
    const users = (await getFromTableWithBound('account', 1, userAccount)).rows
    console.log("users", users)
    return users.length > 0 ? users[0] : null
}

function addLog(tag, textLog, actionsCount, bsClass) {
    $("#logs").prepend('<li class="transactional-list list-group-item d-flex justify-content-between align-items-center ' + bsClass + '">' + tag + " : " + textLog + '<span class="badge badge-primary badge-pill">' + actionsCount + '</span></li>')
}

function addLogInfo(textLog) {
    $("#logs").prepend('<li class="non-transactional-list list-group-item list-group-item-info">' + textLog + '</li>')
}

reload()
async function reload() {
    await new Promise(resolve => setTimeout(resolve, 60000 * 5));
    location.reload()
}

attempCathError()
function attempCathError() {
  if (enableCatchError) {
    window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
      location.reload();
      return false;
    }

    window.addEventListener('unhandledrejection', function (e) {
      location.reload();
    })
  }
}