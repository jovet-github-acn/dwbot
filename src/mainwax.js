var userAccount = localStorage.getItem('UserAccount')
let publicKeys =
  localStorage.getItem('PublicKeys') != null ? JSON.parse(localStorage.getItem('PublicKeys')) : null

var rpcCurrentIndex = localStorage.getItem('rpcIndex') != null ? localStorage.getItem('rpcIndex') : 0
const listRPC = ['https://api.tokengamer.io', 'https://wax.greymass.com', 'https://wax.pink.gg']

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

const smallBagOfCoal = "SMALL BAG OF COAL"
const accessMinePassConst = "\"Access to the mine\" pass"

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
        } else {
            await onStartBot() 
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
        await onStartBot()
    }
}

async function onStartBot() {
    await getToolsConfig()
    await getUserBalance()
    await getAcessMinePass()
    await getTrolley()
    await getLandsConf()
    await getTools()
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
    var log = "Get available " + smallBagOfCoal + " for TROLLEY from this account - " + userAccount
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
        addLog("Warning", "No " + smallBagOfCoal + " available in your account", 0, 'list-group-item-warning')
    } else {
        addLog(userAccount,  "You have " + userBags.length + " " + smallBagOfCoal, userBags.length, 'list-group-item-success')
    }
    console.log(userBags)
}


var trolley
async function getTrolley() {
    trolley = (await getFromTableWithKey('trolley', 100, 'name', 1)).rows
    console.log(trolley)

    if (trolley.length == 0) {
        addLog("Info", "No TROLLEY available in your account", 0, 'list-group-item-info')
    } else {
        await getUserBags()
    }

    rowTrolley.empty()
    for (var i=0; i<trolley.length; i++) {
        var trolleyName = "Trolley-" + trolley[i].asset_id

        if (trolley[i].build_counter != 10) {
            addLog("Warning! Please build path for TROLLEY. ", trolleyName, 1, 'list-group-item-warning')
            break
        }

        var journey = await getJourneyDuration(trolley[i])
        if (new Date(trolley[i].next_action_time * 1000) < new Date() && journey == trolley[i].push_counter && start == true) {
            if (trolley[i].journey_type != '') {
                await claimJourney([trolley[i]])
                await new Promise(resolve => setTimeout(resolve, 10000))
                await startNewJourney([trolley[i]])
            } else {
                await startNewJourney([trolley[i]])
                await new Promise(resolve => setTimeout(resolve, 10000))
            }
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
    } else if (start == true){
        if (userBags.length == 0) {
            await buySmallBagofCoal([trolley])
            await new Promise(resolve => setTimeout(resolve, 5000))
        }
        await onPushTrolley([trolley])
    }
}

async function claimJourney(trolleys) {
    var name = "Trolley-" + trolley[0].asset_id
    var log = "Claim journey " + name
    processIndicatorElem.text(log)
    addLogInfo(log)

    await new Promise(resolve => setTimeout(resolve, 2000));

    const actions = $.map(trolleys, (trolley) => {
        return {
            account: dappAccount,
            name: 'claimjourney',
            authorization: [{
                actor: userAccount,
                permission: 'active',
            }],
            data: {
                asset_owner: userAccount,
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
        addLog("Success Claim Journey", name, actions.length, 'list-group-item-success')
    } catch (e) {
        addLog("Error Claim Journey ? " + name, e, actions.length, 'list-group-item-danger')
    }
}

async function startNewJourney(trolleys) {
    var name = "Trolley-" + trolley[0].asset_id
    var log = "Atempt to start a new journey " + name
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
                asset_owner: userAccount,
                short_j: false,
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
    var log = "Atempt to buy " + smallBagOfCoal + " "
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
        addLog("Success Buy", smallBagOfCoal, actions.length, 'list-group-item-success')
        await new Promise(resolve => setTimeout(resolve, 10000));
        await getUserBags()
    } catch (e) {
        addLog("Error Buy ? " + smallBagOfCoal, e, actions.length, 'list-group-item-danger')
    }
}

async function onPushTrolley(trolleys) {
    if (userBags.length != 0) {
        var name = "Trolley-" + trolleys[0].asset_id + "; small bag of coal-" + userBags[0].asset_id
        var log = "Atempt to push " + name
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
            await new Promise(resolve => setTimeout(resolve, 5000));
            await updateTrolley()
        } catch (e) {
            addLog("Error Push Trolley ? " + name, e, actions.length, 'list-group-item-danger')
            await new Promise(resolve => setTimeout(resolve, 5000));
            await getTrolley()
        }
    } else {
        addLog("Warning", "Cannot push TROLLEY without " + smallBagOfCoal + " available in your account", 0, 'list-group-item-warning')
        await buySmallBagofCoal(trolleys)
        await getTrolley()
    }
    
}

async function updateTrolley() {
    trolley = (await getFromTableWithKey('trolley', 100, 'name', 1)).rows
    console.log(trolley)

    rowTrolley.empty()
    for (var i=0; i<trolley.length; i++) {
        var trolleyName = "Trolley-" + trolley[i].asset_id

        userBags.shift() // this will remove used bag at 1st index - no need to refetch the userBags to reduce the usage of cpu
        await addTrolley(trolley[i], trolleyName)

        if (new Date(trolley.next_action_time * 1000) > new Date()) {
            reloadSched(new Date(trolley.next_action_time * 1000).getTime() - new Date().getTime())
        }
    }
}

var accessMinePassHolder
async function getAcessMinePass() {
    var log = "Get available " + accessMinePassConst + " for eligibility of CLAIM/REPAIR ALL from this account - " + userAccount
    processIndicatorElem.text(log)
    addLogInfo(log)

    userAssets = (await getFromTableDynamic(dappAccount, dappAccount, 'passes', 1000, userAccount)).rows

    for (var i=0; i<userAssets.length; i++) {
        var asset = userAssets[i]
        if (asset.template_id == 494331) {
            accessMinePassHolder = asset
            break
        }
    }
    if (accessMinePassHolder == null) {
        addLog("Warning", "No " + accessMinePassConst + " available in your account", 0, 'list-group-item-warning')
    } else {
        addLog("Hooorah", "You're eligible to use the REPAIR/CLAIM ALL functionality. This feature will reduce the CPU usage.", 0, 'list-group-item-success')
    }
    console.log(accessMinePassHolder)
}

var commonLands = []
var rareLands = []
var mythicLands = []
async function getLandsConf() {
    var log = "Get available land territory"
    processIndicatorElem.text(log)
    addLogInfo(log)

    var landsConf = (await getFromTableWithoutBound('territories', 100)).rows

    if (landsConf != null && landsConf.length != 0) {
        await sortResults(landsConf, 'commision', true)
    }

    var currentTerritoryLandSelected = localStorage.getItem("TerritoryLandSelected") != null ? JSON.parse(localStorage.getItem("TerritoryLandSelected")) : null
    if (currentTerritoryLandSelected != null) {
        addLogInfo("Current Land Territory Selected - AssetID:" + currentTerritoryLandSelected.asset_id + " / Rarity:" + getLandRarity(currentTerritoryLandSelected.template_id) + " / Commision:" + currentTerritoryLandSelected.commision+"%")
    } else {
        addLog("Warning", "No Selected Land Territory", 0, 'list-group-item-warning')
    }

    for (var i=0; i<landsConf.length; i++) {
        var land = landsConf[i]
        if (currentTerritoryLandSelected == null || currentTerritoryLandSelected.asset_id != land.asset_id) {
            if (land.template_id == 543435 && land.players_counter != 30) {
                commonLands.push(land)
            } else if (land.template_id == 543436 && land.players_counter != 34) {
                rareLands.push(land)
            } else if (land.template_id == 543437 && land.players_counter != 37) {
                mythicLands.push(land)
            }
        }
    }
    if (commonLands.length == 0) {
        addLog("Common", "No land territory available", 0, 'list-group-item-warning')
    } else {
        addLog("Common", commonLands.length + " land territory available.", commonLands.length, 'list-group-item-success')
    }
    if (rareLands.length == 0) {
        addLog("Rare", "No land territory available", 0, 'list-group-item-warning')
    } else {
        addLog("Rare", rareLands.length + " land territory available.", rareLands.length, 'list-group-item-success')
    }
    if (mythicLands.length == 0) {
        addLog("Mythic", "No land territory available", 0, 'list-group-item-warning')
    } else {
        addLog("Mythic", mythicLands.length + " land territory available.", mythicLands.length, 'list-group-item-success')
    }
    console.log(commonLands)
    console.log(rareLands)
    console.log(mythicLands)
}

async function attemptToJoinLandTerritory() {

    if (userTools.length == 0) return
    
    var toolsReadyToMine = false
    for (var i=0; i<userTools.length; i++) {
        tool = userTools[i]

        if (new Date() > new Date(tool.next_mine * 1000)) {
            toolsReadyToMine = true
            break
        }
    }

    if (toolsReadyToMine) {
        var currentTerritoryLandSelected = localStorage.getItem("TerritoryLandSelected") != null ? JSON.parse(localStorage.getItem("TerritoryLandSelected")) : null

        if (mythicLands.length != 0) {
            await searchLandTerritoryAtTheBestOption(mythicLands[0], currentTerritoryLandSelected, "Mythic")
        } else if (rareLands.length != 0) {
            await searchLandTerritoryAtTheBestOption(rareLands[0], currentTerritoryLandSelected, "Rare")
        } else if (commonLands.length != 0) {
            await searchLandTerritoryAtTheBestOption(commonLands[0], currentTerritoryLandSelected, "Common")
        } else if (currentTerritoryLandSelected != null) {
            await messageBestLand(currentTerritoryLandSelected)
        } else {
            addLog("No Available Land Territory", "Please try again later.", 0, 'list-group-item-danger')
        }
    }
}

async function searchLandTerritoryAtTheBestOption(land, currentLand, rarity) {
    if (currentLand == null) {
        await joinLandTerritoryAtTheBestOption(land, rarity)
    } else if (land.template_id == 543437  && land.commision <= 3) {
        if (land.commision < currentLand.commision) {
            await joinLandTerritoryAtTheBestOption(land, rarity)
        } else {
            await messageBestLand(currentLand)
        }
    } else if ((land.template_id == 543437 || land.template_id == 543436)  && land.commision < currentLand.commision) {
        await joinLandTerritoryAtTheBestOption(land, rarity)
    } else if (land.template_id == currentLand.template_id && land.commision < currentLand.commision){
        await joinLandTerritoryAtTheBestOption(land, rarity)
    } else {
        await messageBestLand(currentLand)
    }
}

async function messageBestLand(land) {
    var landName = "Land Territory(" + getLandRarity(land.template_id) + ") - " + land.asset_id
    addLog("No Need To Join Land Territory", "As for now you've already joined at the best " + landName, 0, 'list-group-item-warning')
}

function getLandRarity(template_id) {
    if (template_id == 543435) {
        return 'Common'
    } else if (template_id == 543436) {
        return 'Rare'
    } else if (template_id == 543437) {
        return 'Mythic'
    }
}

async function joinLandTerritoryAtTheBestOption(land, rarity) {

    localStorage.setItem("TerritoryLandSelected", JSON.stringify(land))

    var landName = "Land Territory(" + rarity + ") - " + land.asset_id

    var log = "Attempt to join " + landName
    processIndicatorElem.text(log)
    addLogInfo(log)
    
    await new Promise(resolve => setTimeout(resolve, 2000))

    const actions = [{
        account: dappAccount,
        name: 'jointerr',
        authorization: [{
            actor: userAccount,
            permission: 'active',
        }],
        data: {
            player: userAccount,
            index: land.index,
        },
    }]
    try {
        const result = await wax.api.transact({
            actions: actions
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        addLog("Success Joined ", landName, actions.length, 'list-group-item-success')
        await new Promise(resolve => setTimeout(resolve, 5000))
    } catch (e) {
        addLog("Failed to Join ? " + landName, e, actions.length, 'list-group-item-danger')
        await new Promise(resolve => setTimeout(resolve, 5000))
    }
}

async function sortResults(array, field, asc) {
    array.sort(function(a, b) {
        if (asc) {
            return (a[field] > b[field]) ? 1 : ((a[field] < b[field]) ? -1 : 0);
        } else {
            return (b[field] > a[field]) ? 1 : ((b[field] < a[field]) ? -1 : 0);
        }
    })
}

async function getTools() {
    if (accessMinePassHolder == null) {
        await getUserToolsWithoutPass()
    } else {
        await getUserToolsWithPass()
    }
 
}

var userTools
async function getUserToolsWithPass() {

    userTools = (await getFromTableWithKey('tools', 100, 'name', 2)).rows
    console.log(userTools)

    if (userTools.length == 0) {
        addLog("Error No Available Digger Tools","Please buy a digger tool at https://wax.atomichub.io/market?collection_name=diggersworld&order=asc&schema_name=tools&sort=price&symbol=WAX", 0, 'list-group-item-danger')
        return
    } 
    
    await attemptToJoinLandTerritory()

    rowTools.empty()

    var toolsNeededToRepair = []
    var toolsReadyToMine = []

    for (var i=0; i<userTools.length; i++) {
        tool = userTools[i]

        const tconf = toolsConfs[toolsConfs.map(i => i.template_id).indexOf(tool.template_id)]

        await addTools(tool, tconf)
        
        if (tool.durability != tconf.init_durability) {
            toolsNeededToRepair.push(tool)
        }
        if (new Date() > new Date(tool.next_mine * 1000)) {
            toolsReadyToMine.push(tool)
        } else {
            reloadSched(new Date(tool.next_mine * 1000).getTime() - new Date().getTime())
        }
    }

    if (toolsNeededToRepair.length != 0 && start == true) {
        console.log(toolsNeededToRepair)
        await repairAllTools(toolsNeededToRepair)
    }
    if (toolsReadyToMine.length != 0 && start == true) {
        console.log(toolsReadyToMine)
        await claimAllTools(toolsReadyToMine)
    }
    if (toolsReadyToMine == 0 && toolsReadyToMine == 0) {
        processIndicatorElem.text("This page will reload after 1 hour")
        addLog("Still mining ", "All tools.", userTools.length, 'list-group-item-warning')
    }
}

async function getUserToolsWithoutPass() {
    userTools = (await getFromTableWithKey('tools', 100, 'name', 2)).rows
    console.log(userTools)

    if (userTools.length == 0) {
        addLog("Error No Available Digger Tools","Please buy a digger tool at https://wax.atomichub.io/market?collection_name=diggersworld&order=asc&schema_name=tools&sort=price&symbol=WAX", 0, 'list-group-item-danger')
        return
    } 

    await attemptToJoinLandTerritory()

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
        reloadSched(60*60*1000)
    }
}

var availableToolToMine = 0
var totalClaimedTools = 0
async function attemptClaimTool(tool, toolName) {
    processIndicatorElem.text("Check status " + toolName)
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (new Date(tool.next_mine * 1000) > new Date()) {
        addLog("Still mining", toolName, 1, 'list-group-item-warning')
        reloadSched(new Date(tool.next_mine * 1000).getTime() - new Date().getTime())
    } else if (start == true) {
        await repairTool([tool], toolName)
        await claimTool([tool], toolName)
    }
}

async function repairTool(tools, toolName) {
    if (tools[0].durability == 0) {
        var log = "Atempt to repair tool " + toolName
        processIndicatorElem.text(log)
        addLogInfo(log)
        await new Promise(resolve => setTimeout(resolve, 2000))

        const actions = $.map(tools, (tool) => {
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
                actions: actions
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            });
            addLog("Success Repair Tool", toolName, actions.length, 'list-group-item-success')
        } catch (e) {
            addLog("Error Repair Tool ? " + toolName, e, actions.length, 'list-group-item-danger')
        }
    }
}

async function claimTool(tools, toolName) {
    var log = "Atempt to claim tool " + toolName
    processIndicatorElem.text(log)
    addLogInfo(log)

    await new Promise(resolve => setTimeout(resolve, 2000));

    const actions = $.map(tools, (tool) => {
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
            actions: actions
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        totalClaimedTools = totalClaimedTools + 1
        addLog("Success Claim Tool", toolName, actions.length, 'list-group-item-success')
    } catch (e) {
        availableToolToMine = availableToolToMine + 1
        addLog("Error Claim Tool ? " + toolName, e, actions.length, 'list-group-item-danger')
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

        if (new Date(tool.next_mine * 1000) > new Date()) {
            reloadSched(new Date(tool.next_mine * 1000).getTime() - new Date().getTime())
        }
    }
    processIndicatorElem.text("This page will reload after 1 hour")
}

async function repairAllTools(tools) {

    var assets_ids = []
    for (var i=0; i<tools.length; i++){
        assets_ids.push(tools[i].asset_id)
    }

    var log = "Atempt to repair all tools " + assets_ids.length
    processIndicatorElem.text(log)
    addLogInfo(log)
    
    await new Promise(resolve => setTimeout(resolve, 2000))

    const actions = [{
        account: dappAccount,
        name: 'repairall',
        authorization: [{
            actor: userAccount,
            permission: 'active',
        }],
        data: {
            asset_owner: userAccount,
            asset_ids: assets_ids,
        },
    }]
    try {
        const result = await wax.api.transact({
            actions: actions
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        addLog("Success Repair ", "All Tools", actions.length, 'list-group-item-success')
        await new Promise(resolve => setTimeout(resolve, 10000))
        await getUserBalance()
        await new Promise(resolve => setTimeout(resolve, 5000))
        await updateUserToolsAfterMining()
    } catch (e) {
        addLog("Error Repair ? " + "All Tools", e, actions.length, 'list-group-item-danger')
        await new Promise(resolve => setTimeout(resolve, 10000))
        await repairAllTools(tools)
    }
}

async function claimAllTools(tools) {

    if (tools == null) {
        tools = (await getFromTableWithKey('tools', 100, 'name', 2)).rows
        userTools = tools;
        console.log(userTools)
    }

    var assets_ids = []
    for (var i=0; i<tools.length; i++){
        assets_ids.push(tools[i].asset_id)
    }
    console.log(assets_ids)

    var log = "Atempt to claim all tools " + assets_ids.length
    processIndicatorElem.text(log)
    addLogInfo(log)
 
    await new Promise(resolve => setTimeout(resolve, 2000))

    const actions = [{
        account: dappAccount,
        name: 'mineall',
        authorization: [{
            actor: userAccount,
            permission: 'active',
        }],
        data: {
            asset_ids: assets_ids,
            owner: userAccount,
        },
    }]
    console.log(actions)
    try {
        const result = await wax.api.transact({
            actions: actions
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        addLog("Success Claim ", "All Tools", actions.length, 'list-group-item-success')
        await new Promise(resolve => setTimeout(resolve, 10000))
        await getUserBalance()
        await new Promise(resolve => setTimeout(resolve, 5000))
        await repairAllTools(tools)
    } catch (e) {
        addLog("Error Claim ? " + "All Tools", e, actions.length, 'list-group-item-danger')
        await new Promise(resolve => setTimeout(resolve, 10000))
        await claimAllTools(tools)
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
        '<span class=" text-left col-6 tool-name">' + tconf.template_name + "-" + tconf.rarity + ":" + tool.type + '</span>' +
        '<span class="text-right col-1">' + tool.durability+'/'+tconf.init_durability + '</span>' +
        //'<span class="text-right col-1">' + 0 + ' wax</span>' +
        '<span class="badge badge-primary badge-pill col-2" style="width: 80px;" id="' + tool.asset_id + '">' + countDownTimerTools(tool) + '</span>' +
    '</li>')
}

async function getJourneyDuration(trolley) {
    if (trolley.journey_type == 'short') {
        return 24
    } else if (trolley.journey_type == 'long') {
        return 60
    } else {
        return 0
    }
}

async function addTrolley(trolley) {
    rowTrolley.append('<li class="list-group-item d-flex justify-content-between align-items-center">' +
        '<span class=" text-left col-6 trolley-name">Trolley-' + trolley.asset_id + '</span>' +
        '<span class="text-right col-4">' + trolley.push_counter + '/' + await getJourneyDuration(trolley) + ' ('+ userBags.length + ' Bags)</span>' +
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
    //console.log("reload(time) was called: " + time)
    await new Promise(resolve => setTimeout(resolve, time))
    //console.log("reload(time) was executed")
    location.reload(true)
}

function reloadSched(time) {
    //console.log("reloadSched(time) was called: " + time)
    setTimeout(function(){ 
        //console.log("reloadSched(time) was executed")
        location.reload(true)
    }, time); 
    //console.log("reloadSched(time) is now at the bottom")
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
    //console.log("tableReq", tableReq)
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
    //console.log("tableReq", tableReq)
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