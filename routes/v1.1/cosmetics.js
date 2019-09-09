function prepareObject(asset, baseUrl) {
    let obj = {
        name: asset.name,
        id: asset.id,
        image: baseUrl + "icons/" + asset.image,
        setParts: asset.setParts || [],
    };
    if (obj.setParts && obj.setParts[0] && obj.setParts.filter(p => p.type == "backpack" && p.id.split("_").slice(2).join(" ") == obj.id.split("_").slice(5).join(" "))[0]) {
        obj.setParts.filter(p => p.type == "backpack" && p.id.split("_").slice(2).join(" ") == obj.id.split("_").slice(5).join(" "))[0].matchesSkin = true;
    };
    return obj;
};

var types = {
    skins: "skins",
    emotes: "emotes",
    backpacks: "backpacks",
    skin: "skins",
    emote: "emotes",
    backpack: "backpacks"
};

exports.routes = [{
        name: "/cosmetics/search",
        run(req, res) {
            if (!req.headers || !req.headers.query) return res.send("Error: Missing search header query");
            if (!req.headers || !req.headers.type) return res.send("Error: Missing type header type");
            if (!types[req.headers.type]) return res.send("Error: Invalid type.");
            let type = types[req.headers.type];
            const Match = (
                global.assets[type].filter(a => Object.keys(a.name).filter(b => a.name[b].toLowerCase() == req.headers.query.toLowerCase())[0])[0] || // Name match
                global.assets[type].filter(a => a.id.toLowerCase() == req.headers.query.toLowerCase())[0] // ID match
            );
            if (Match) {
                var results = prepareObject(Match, req.baseUrl);
                return res.status(200).json(results);
            };
            return res.status(200).json({
                code: "no_results"
            });
        },
        description: "Searches for a specific asset (requires headers query and type)."
    },
    {
        name: "/icons/:icon",
        run(req, res) {
            const basepath = process.cwd() + "/storage/icons/";
            if (!req.params.icon) return res.status(404).send("Missing required param icon.");
            const exists = require("fs").existsSync(basepath + req.params.icon);
            if (!exists) return res.status(404).send("No results.");
            return res.status(200).sendFile(basepath + req.params.icon);
        },
    }
];