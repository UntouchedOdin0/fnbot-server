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
    if (process.argv[2] && process.argv[2].split("=")[0] == "--aes" && process.argv[2].split("=")[1]) {
        aes = process.argv[2].split("=")[1];
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
    if (!tempAssetFile || global.build.fortnite.build !== tempAssetFile.build || (aes && force)) {
        paks = await AssetDumping.getPakList("all", aes, config.assetdumping.pakpath, force);
        config.assetdumping.build = global.build.fortnite.build;
        hasDumped = true;
        if (tempAssetFile && global.build.fortnite.build !== tempAssetFile.build) {
            cachedPaks = [];
        };
        paks.encrypted.forEach(pak => cachedPaks.push(pak.name));
        await AssetDumping.process(paks, "all", config.assetdumping.pakpath, config.assetdumping);
    };
    delete require.cache[require.resolve("./storage/assets.json")];
    global.assets = require("./storage/assets.json");
    try {
        global.icons = fs.readdirSync("./storage/icons/");
    } catch (err) {
        console.log("[Error] Couldn't load icons directory.");
    };
    var total = global.assets.skins.length + global.assets.emotes.length + global.assets.backpacks.length + global.assets.pickaxes.length;
    if (hasDumped) console.log("[AssetDumper] Successfully dumped. " + total + " items are now located in storage/assets.json.");
    isDumping = false;
    // Removes aes argument after first dump.
    if (process.argv[2] && process.argv[2].split("=")[0] == "--aes" && process.argv[2].split("=")[1]) {
        process.argv[2] = undefined;
    };
};

new ExpressInstance({
    port: config.server.port,
    title: config.server.title,
    baseUrl: config.routeinit.baseUrl
} || null).then(async app => {
    var skipassetdump, skipbuilddump = false;
    if (process.argv[2]) {
        if (process.argv[2] == "-skipdump" || process.argv[2] == "-sd") {
            skipassetdump = true;
            skipbuilddump = true;
        };
    };
    if (!config.assetdumping || !config.assetdumping.pakpath) {
        skipassetdump = true;
    };
    if (!config.builddumping || !config.builddumping.fnlogs || !config.builddumping.launcherlogs) {
        skipbuilddump = true;
    };
    if (!skipbuilddump) {
        const FNDump = await BuildDumping.dumpFNBuild(config.builddumping.fnlogs);
        const LauncherDump = await BuildDumping.dumpLauncherBuild(config.builddumping.launcherlogs);
        var obj = {
            fortnite: FNDump,
            launcher: LauncherDump
        };
        global.build = obj;
        fs.writeFileSync("./storage/build.json", JSON.stringify(obj));
    } else {
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
        if (!skipassetdump) {
            if ((!isDumping || isDumping == false) && !serversOff) await assetDump();
        };
    }, config.warning_interval || 1000 * 60 * 5);
});