const API = require("./API.js");
const Dumper = require("./AssetDumping/Dumper.js");
const Helper = require("./AssetDumping/Helper.js");
const {
    PakExtractor
} = require("node-wick");
const fs = require("fs");

class AssetDumping {
    static async getPakList(type, aes, pakpath, forceAes) {
        if (!type) return undefined;
        var keys;
        var res = {
            main: [],
            encrypted: []
        };
        if (aes && forceAes) {
            // If param forceAes provided (as true), it'll use the aes key instead of requesting keys.
            keys = {
                mainKey: aes.replace("0x", "")
            };
        } else {
            keys = await API.getEncryptionKeys(aes);
        };
        if (!keys || !keys.mainKey) {
            if (keys && keys.code && keys.msg) {
                keys = "Http status code " + keys.code + ": " + keys.msg;
            } else {
                keys = ""
            };
            console.log("[Error] Requesting AES keys failed. " + keys);
            return res;
        };
        if (type == "all") {
            // Returns all paks, needed if you don't have an existing assets.json.
            var files = fs.readdirSync(pakpath);
            files.filter(f => f.endsWith(".pak")).sort().map(async file => {
                try {
                    const ex = new PakExtractor(pakpath + file, (keys.mainKey).replace("0x", ""));
                    var cosmetics = ex.get_file_list().map((file, idx) => ({
                        path: file.replace("FortniteGame/Content/", ""),
                        index: idx,
                        extractor: ex,
                    }));
                    var filtered = Helper.filterPaths(cosmetics);
                    if (filtered.length > 0) {
                        res.main.push({
                            type: "main",
                            name: file,
                            key: keys.mainKey
                        });
                    };
                } catch (err) {
                    return;
                };
            });
            if (keys.additionalKeys) {
                Object.keys(keys.additionalKeys).forEach(key => {
                    res.encrypted.push({
                        type: "encrypted",
                        name: key,
                        key: keys.additionalKeys[key]
                    });
                });
            };
        };
        if (type == "encrypted_only") {
            if (keys.additionalKeys) {
                Object.keys(keys.additionalKeys).forEach(key => {
                    res.encrypted.push({
                        type: "encrypted",
                        name: key,
                        key: keys.additionalKeys[key]
                    });
                });
            };
        };
        return res;
    };
    static async process(paks, type, path, options) {
        await Dumper.process(paks, type, path, options);
    };
};

module.exports = AssetDumping;