const fs = require("fs");

class BuildDumping {
    static async dumpFNBuild(path) {
        if (!path || !path instanceof String) return {
            error: "no_path",
            msg: "Please provide a valid path to the FortniteGame.log file."
        };
        try {
            const Data = fs.readFileSync(path, {
                encoding: "utf8"
            });
            var prepareObj = {
                buildID: "1:1:" + Data.split("Net CL: ")[1].split("\r\n")[0],
                netCL: Data.split("Net CL: ")[1].split("\r\n")[0],
                UserAgent: "Fortnite/" + Data.split("Build: ")[1].split("\r\n")[0] + " Windows/10.0.17134.1.768.64bit",
            };
            return prepareObj;
        } catch (err) {
            return { error: err };
        };
    };
    static async dumpLauncherBuild(path) {
        if (!path || !path instanceof String) return {
            error: "no_path",
            msg: "Please provide a valid path to the EpicGamesLauncher.log file."
        };
        try {
            const Data = fs.readFileSync(path, {
                encoding: "utf8"
            });
            var prepareObj = {
                build: Data.split("Build: ")[1].split("\r\n")[0],
                engineVersion: Data.split("Engine Version: ")[1].split("\r\n")[0],
                netCL: Data.split("Net CL: ")[1].split("\r\n")[0],
            };
            return prepareObj;
        } catch (err) {
            return { error: err };
        };
    };
};

module.exports = BuildDumping;