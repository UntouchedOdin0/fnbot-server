const ExpressInstance = require("./structures/ExpressApp.js");
const BuildDumping = require("./structures/BuildDumping.js");
const fs = require("fs");
const API = require("./structures/API.js");
const WarningManager = require("./structures/WarningManager.js");

var config;

var cachedPaks = [];
var isDumping = false;
var serversOff = false;

let requiredPaths = ["./storage/", "./storage/assets/", "./storage/icons/"];
requiredPaths.forEach(p => {
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p);
    };
});

function handleCmdArgs(argv) {
    let args = argv.slice(2);
    var res = {};
    args.forEach(arg => {
        if (arg.toLowerCase().startsWith("--") && arg.toLowerCase().split("=")[1]) {
            res[arg.slice(2).split("=")[0]] = arg.toLowerCase().split("=")[1]
        };
        if (arg.toLowerCase().startsWith("-") && !arg.toLowerCase().startsWith("--")) {
            res[arg.slice(1)] = "---";
        };
    });
    return res;
};

global.arguments = handleCmdArgs(process.argv);

if (!fs.existsSync("./config.json")) {
    if (fs.existsSync("./config.example.json")) {
        fs.renameSync("./config.example.json", "./config.json");
        config = require("./config.json");
    } else {
        console.log("[FSError] No configuration file has been found.");
        return process.exit(1)
    };
} else {
    config = require("./config.json");
};

async function buildDump(firstTime) {
    if (firstTime) console.log("[BuildDumper] Dumping build information from logs.");
    const FNDump = await BuildDumping.dumpFNBuild(config.builddumping.fnlogs);
    const LauncherDump = await BuildDumping.dumpLauncherBuild(config.builddumping.launcherlogs);
    var obj = {
        fortnite: FNDump,
        launcher: LauncherDump
    };
    if (global.build && JSON.stringify(obj) == JSON.stringify(global.build)) return;
    global.build = obj;
    fs.writeFileSync("./storage/build.json", JSON.stringify(obj));
    if (firstTime) {
        console.log("[BuildDumper] Dumped build information, works with " + obj.fortnite.build + ".");
     } else {
        console.log("[BuildDumper] Updated build information, works with " + obj.fortnite.build + ".");
    };
};

async function assetDump() {
    isDumping = true;
    const AssetDumping = require("./structures/AssetDumping.js");
    var aes;
    var force = false;
    var hasDumped = false;
    let assetsExist = fs.existsSync("./storage/assets.json");
    var tempAssetFile;
    if (assetsExist) {
        tempAssetFile = require("./storage/assets.json");
    };
    var paks;
    if (global.arguments.aes) {
        aes = global.arguments.aes;
        force = true;
    };
    if (tempAssetFile && global.build.fortnite.build == tempAssetFile.build && !force) {
        paks = await AssetDumping.getPakList("encrypted_only", aes, config.assetdumping.pakpath, false);
        config.assetdumping.build = global.build.fortnite.build;
        if (((!paks.main || !paks.main[0]) && (!paks.encrypted || !paks.encrypted[0])) || !paks.encrypted.filter(pak => !cachedPaks.includes(pak.name))[0]) {
            hasDumped = false;
        } else {
            paks.encrypted.forEach(pak => cachedPaks.push(pak.name));
            hasDumped = true;
            await AssetDumping.process(paks, "encrypted_only", config.assetdumping.pakpath, config.assetdumping);
        };
    };
    var totalAssets = 0;
    if (tempAssetFile) Object.keys(tempAssetFile).filter(key => typeof key == "object").forEach(key => totalAssets+= tempAssetFile[key].length);
    if (!tempAssetFile || global.build.fortnite.build !== tempAssetFile.build || (aes && force) || totalAssets == 0) {
        paks = await AssetDumping.getPakList("all", aes, config.assetdumping.pakpath, force);
        config.assetdumping.build = global.build.fortnite.build;
        if (tempAssetFile && global.build.fortnite.build !== tempAssetFile.build) {
            cachedPaks = [];
        };
        if ((!paks.main || !paks.main[0]) && (!paks.encrypted || !paks.encrypted[0])) {
            console.log("[AssetDumper] No paks were loaded. If you're using an old version of Fortnite, make sure to provide \"--aes=<key>\" as an argument with the right aes encryption key.");
        } else {
            hasDumped = true;
            paks.encrypted.forEach(pak => cachedPaks.push(pak.name));
            await AssetDumping.process(paks, "all", config.assetdumping.pakpath, config.assetdumping);
        };
    };
    try {
        delete require.cache[require.resolve("./storage/assets.json")];
        global.assets = require("./storage/assets.json");
    } catch (err) {
        console.log("[Error] Couldn't load storage/assets.json. You must dump assets at least one time before you can run the script without dumping.");
        return process.exit(1);
    };
    totalAssets = 0;
    Object.keys(global.assets).filter(key => typeof key == "object").forEach(key => totalAssets+= tempAssetFile[key].length);
    try {
        global.icons = fs.readdirSync("./storage/icons/");
    } catch (err) {
        console.log("[Error] Couldn't load icons directory.");
    };
    if (totalAssets == 0) {
        console.log("[Error] assets file is empty.");
        return process.exit(1);
    };
    if (hasDumped) console.log("[AssetDumper] Successfully dumped. " + totalAssets + " items are now located in storage/assets.json.");
    isDumping = false;
    // Removes aes argument after first dump.
    if (global.arguments.aes) {
        global.arguments.aes = undefined;
    };
};

new ExpressInstance({
    port: config.server.port,
    title: config.server.title,
    baseUrl: config.routeinit.baseUrl
} || null).then(async app => {
    ExpressInstance.updateState({ msg: "Server is currently starting up and preparing assets.", code: "preparing" });
    var skipassetdump, skipbuilddump = false;
    if (global.arguments.skipdump || global.arguments.sd || global.arguments.skipdumping) {
        skipassetdump = true;
        skipbuilddump = true;
    };
    if (!config.assetdumping || !config.assetdumping.pakpath) {
        skipassetdump = true;
    };
    if (!config.builddumping || !config.builddumping.fnlogs || !config.builddumping.launcherlogs) {
        skipbuilddump = true;
    };
    if (!skipbuilddump) {
        await buildDump(true);
    } else {
        console.log("[BuildDumper] Skipping dump.");
        try {
            global.build = require("./storage/build.json");
        } catch (err) {
            console.log("[Error] Error while loading build.json: " + err);
            process.exit(1);
        };
    };
    if (!skipassetdump) {
        if (config.assetdumping.pakpath.split("/")[1]) {
            if (config.assetdumping.pakpath.split("/")[config.assetdumping.pakpath.split("/").length - 1] !== "") {
                config.assetdumping.pakpath = config.assetdumping.pakpath + "/";
            };
        };
        if (config.assetdumping.pakpath.split("\\")[1]) {
            if (config.assetdumping.pakpath.split("\\")[config.assetdumping.pakpath.split("\\").length - 1] !== "") {
                config.assetdumping.pakpath = config.assetdumping.pakpath + "\\";
            };
        };
        await assetDump();
    } else {
        console.log("[AssetDumper] Skipping dump.");
        try {
            global.assets = require("./storage/assets.json");
        } catch (err) {
            console.log("[Error] Error while loading assets.json: " + err);
            process.exit(1);
        };
        try {
            global.icons = fs.readdirSync("./storage/icons/");
        } catch (err) {
            console.log("[Error] Couldn't load icons directory.");
        };
    };
    try {
        global.exceptions = require("./storage/exceptions.json");
    } catch (err) {
        global.exceptions = [];
    };
    const CommandHandler = await ExpressInstance.InitCommandHandler(config.routeinit);
    if (CommandHandler.error) {
        console.log("[CommandHandler:Error] " + CommandHandler.error + " => " + CommandHandler.msg);
        return process.exit(1);
    };
    ExpressInstance.updateState({ code: "ready", msg: "Server is up and running. You can now use it with fnbot-client." });
    async function checkFNStatus() {
        let status = await API.getFortniteServerStatus();
        let warnings = WarningManager.Warnings;
        if (status.online && warnings.filter(warn => warn.typeId == "fortnite.servers.offline")[0]) {
            serversOff = false;
            return WarningManager.deleteWarning(warnings.filter(warn => warn.typeId == "fortnite.servers.offline")[0].id);
        };
        if (!status.online && !warnings.filter(warn => warn.typeId == "fortnite.servers.offline")[0]) {
            serversOff = true;
            return WarningManager.createWarning("fortnite.servers.offline", "Fortnite servers are offline.", undefined, "auto");
        };
        return {
            code: "nothing_changed"
        };
    };
    async function checkWarnFile() {
        let file = await WarningManager.readWarningFile();
        let warnings = WarningManager.Warnings;
        if (file) {
            var updateCount = 0;
            warnings.forEach(warning => {
                if (!file.filter(f => f.id == warning.id)[0]) {
                    if (warning.creation && warning.creation == "auto") return;
                    return WarningManager.deleteWarning(warning.id);
                };
            });
            file.forEach(async warning => {
                let warningContent;
                if (warnings.filter(w => w.id == warning.id)[0]) {
                    if (JSON.stringify(warnings.filter(w => w.id == warning.id)[0]) == JSON.stringify(warning)) return;
                    warningContent = WarningManager.updateWarning(warning.id, warning);
                    warning.id = warningContent.id;
                    warnings = WarningManager.Warnings;
                    return await WarningManager.writeWarningFile(warnings);
                };
                if (warning.id) return warnings.push(warning);
                warningContent = WarningManager.createWarning(warning.typeId, warning.message, warning.postedBy);
                updateCount++;
            });
            if (updateCount > 0) return await WarningManager.writeWarningFile(warnings);
        };
        return {
            code: "nothing_changed"
        };
    };
    async function addHotfix() {
        const HotfixData = await API.getHotfix();
        var newAssets = {
            ...global.assets
        };
        var changes = [];
        Object.keys(newAssets).filter(key => typeof newAssets[key] == "object").forEach(k => {
            newAssets[k].filter(asset => asset.keys).forEach(asset => {
                Object.keys(asset.keys).forEach(key => {
                    if (HotfixData.filter(data => data.Key == asset.keys[key])[0]) {
                        let fixdata = HotfixData.filter(data => data.Key == asset.keys[key])[0];
                        if (!skipassetdump && config.assetdumping.locales) {
                            fixdata.LocalizedStrings = fixdata.LocalizedStrings.filter(data => config.assetdumping.locales.includes(data[0]));
                        };
                        if (!fixdata.LocalizedStrings || !fixdata.LocalizedStrings[0]) return;
                        fixdata.LocalizedStrings.forEach(data => {
                            if (asset[key][data[0]] && asset[key][data[0]] == data[1]) return;
                            if (!changes.filter(change => change.id == asset.id)[0]) changes.push(asset);
                            asset[key][data[0]] = data[1];
                        });
                    };
                });
            });
        });
        if (changes[0]) {
            console.log("[Hotfix] New hotfix - Updated " + changes.length + " items: " + changes.map(change => change.id).sort().join(", "));
            global.assets = newAssets;
            fs.writeFileSync("./storage/assets.json", JSON.stringify(newAssets));
        };
    };
    await addHotfix();
    await checkFNStatus();
    await checkWarnFile();

    function formatTime(ms) {
        if (ms >= 1000 * 60) {
            return ms / 60000 + " minutes";
        };
        if (ms >= 1000) {
            return ms / 1000 + " seconds";
        };
        return ms + " milliseconds";
    };
    if (config.warning_interval < 10000) {
        console.log("[WarningManager] Interval must be >=60000 to prevent spam and has now been set to 5 minutes.");
        config.warning_interval = 300000;
    };
    console.log("[WarningManager] Checking updates every " + formatTime(config.warning_interval) + ".");
    setInterval(async () => {
        await addHotfix();
        await checkFNStatus();
        await checkWarnFile();
        if (!skipbuilddump) await buildDump();
        if (!skipassetdump) {
            if ((!isDumping || isDumping == false) && !serversOff) await assetDump();
        };
    }, config.warning_interval || 1000 * 60 * 5);
});