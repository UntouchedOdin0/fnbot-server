const WarningManager = require("../../structures/WarningManager.js");

function calculateAssets(assets) {
    var obj = {
        total: 0
    };
    Object.keys(assets).forEach(a => {
        obj.total += assets[a].length;
        obj[a] = assets[a].length;
    });
    return obj;
};

exports.routes = [{
        name: "/status",
        run(req, res) {
            res.status(200).json({
                state: "online",
                defaultVersion: global.defaultVersion,
                fortniteVersion: global.build.fortnite.UserAgent.split("Release-")[1].split("-")[0],
                assetsLoaded: calculateAssets(global.assets),
            });
        },
        description: "Returns the current server status.",
    },
    {
        name: "/build",
        run(req, res) {
            res.status(200).json(global.build);
        },
        description: "Returns netCL and buildID.",
    },
    {
        name: "/",
        run(req, res) {
            let tmpstr = "";
            if (req.serverVersion !== "" && !req.serverVersion.includes("/")) {
                tmpstr = req.serverVersion + "/";
            };
            res.status(200).redirect("/api/" + tmpstr + "status");
        },
    },
    {
        name: "/warnings",
        run(req, res) {
            return res.status(200).json(WarningManager.Warnings);
        },
    }
];