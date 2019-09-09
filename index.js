const ExpressInstance = require("./structures/ExpressApp.js");
const BuildDumping = require("./structures/BuildDumping.js");
const fs = require("fs");
const API = require("./structures/API.js");
const WarningManager = require("./structures/WarningManager.js");

var config;

let requiredPaths = ["./storage/", "./storage/locales/", "./storage/assets/", "./storage/icons/"];
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

new ExpressInstance({ port: config.server.port, title: config.server.title, baseUrl: config.routeinit.baseUrl } || null).then(async app => {
    var skipassetdump, skipbuilddump = false;
    if (process.argv[2]) {
        if (process.argv[2] == "-skipdump" || process.argv[2] == "-sd") {
            skipassetdump = true;
        };
    };
    if (!config.assetdumping || !config.assetdumping.pakpath || require("process").platform !== "win32") {
        skipassetdump = true;
    };
    if (!config.builddumping || !config.builddumping.fnlogs || !config.builddumping.launcherlogs) {
        skipbuilddump = true;
    };
    if (!skipassetdump) {
        const AssetDumping = require("./structures/AssetDumping.js");
        const aes = await AssetDumping.getEncryptionKeys();
        const Locales = await AssetDumping.getLocaleFiles({
            aes,
            pakpath: config.assetdumping.pakpath,
            locales: config.assetdumping.locales || null
        });
        Object.keys(Locales).forEach(locale => {
            fs.writeFileSync("./storage/locales/" + locale + ".json", JSON.stringify(Locales[locale]));
        });
        const Assets = await AssetDumping.process({
            aes,
            pakpath: config.assetdumping.pakpath,
            locales: Locales,
            deleteFilesAfterDump: config.assetdumping.deleteFilesAfterDump
        });
        global.assets = Assets;
        fs.writeFileSync("./storage/assets.json", JSON.stringify(Assets));
        console.log("[AssetDumper] Done.");
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
    const CommandHandler = await ExpressInstance.InitCommandHandler(config.routeinit);
    if (CommandHandler.error) {
        console.log("[CommandHandler:Error] " + CommandHandler.error + " => " + CommandHandler.msg);
        return process.exit(1);
    };
    async function checkFNStatus() {
        let status = await API.getFortniteServerStatus();
        let warnings = WarningManager.Warnings;
        if (status.online && warnings.filter(warn => warn.typeId == "fortnite.servers.offline")[0]) {
            return WarningManager.deleteWarning(warnings.filter(warn => warn.typeId == "fortnite.servers.offline")[0].id);
        };
        if (!status.online && !warnings.filter(warn => warn.typeId == "fortnite.servers.offline")[0]) {
            return WarningManager.createWarning("fortnite.servers.offline", "Fortnite servers are offline.", undefined, "auto");
        };
        return { code: "nothing_changed" };
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
                warningContent = WarningManager.createWarning(warning.typeId, warning.message, warning.postedBy);
                warning.id = warningContent.id;
                updateCount++;
            });
            if (updateCount > 0) return await WarningManager.writeWarningFile(warnings);
        };
        return { code: "nothing_changed" };
    };
    await checkFNStatus();
    await checkWarnFile();
    function formatTime(ms) {
        if (ms >= 1000*60) {
            return ms/60000 + " minutes";
        };
        if (ms >= 1000) {
            return ms/1000 + " seconds";
        };
        return ms + " milliseconds";
    };
    if (config.warning_interval < 10000) {
        console.log("[WarningManager] Interval must be >=10000 to prevent spam and has now been set to 5 minutes.");
        config.warning_interval = 1000*60*5;
    };
    console.log("[WarningManager] Checking updates every " + formatTime(config.warning_interval) + ".");
    setInterval(async () => {
        await checkFNStatus();
        await checkWarnFile();
    },config.warning_interval || 1000*60*5);
});