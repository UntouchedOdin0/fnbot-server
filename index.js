const ExpressInstance = require("./structures/ExpressApp.js");
const BuildDumping = require("./structures/BuildDumping.js");
const fs = require("fs");
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
});