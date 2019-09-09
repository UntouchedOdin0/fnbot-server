const fetch = require("node-fetch");
const {
    PakExtractor,
    Package,
    read_locale,
    read_texture_to_file
} = require("node-wick");
const fs = require("fs");
const Helper = require("./AssetDumping/Helper.js");

const AES_SERVER_URL = "http://benbotfn.tk:8080/api/aes";

var Assets = {};

class AssetDumping {
    static getEncryptionKeys() {
        return new Promise((resolve, reject) => {
            fetch(AES_SERVER_URL).then(res => res.json()).catch(err => reject(err)).then(res => {
                return resolve(res)
            });
        });
    };
    static async getLocaleFiles(options) {
        const extractor = new PakExtractor(options.pakpath + "\\pakchunk0-WindowsClient.pak", options.aes.mainKey.replace("0x", "")); // Includes locale files (locres)
        let pak0list = extractor.get_file_list().map((v, idx) => ({
            path: v,
            index: idx,
        }));
        var Locales = pak0list.filter(i => i.path.includes("Localization/Game_BR/") && i.path.includes(".locres"));
        if (options.locales && options.locales instanceof Array && options.locales[0]) {
            Locales = Locales.filter(l => options.locales.includes(l.path.split("Localization/Game_BR/")[1].split("/")[0]));
        };
        const LocaleList = {};
        for (let i = 0; i < Locales.length; i++) {
            let filepath = Locales[i];
            let file = extractor.get_file(filepath.index);
            if (file != null) {
                let data = read_locale(file);
                let formattedObj = {};
                data.string_data[0].data.forEach(d => {
                    return formattedObj[d.key] = d.data;
                });
                LocaleList[filepath.path.split("Localization/Game_BR/")[1].split("/")[0]] = formattedObj;
            };
        };
        console.log("[LocaleDumper] " + Object.keys(LocaleList).length + " locales dumped and loaded: " + Object.keys(LocaleList).map(key => key).sort().join(", "))
        return LocaleList;
    };
    static async process(options) {
        if (!options || !options instanceof Object) return {
            error: "options_missing",
            msg: "Missing object \"options\"."
        };
        const aes = options.aes;
        const extractors = [
            new PakExtractor(options.pakpath + "\\pakchunk10_s1-WindowsClient.pak", aes.mainKey.replace("0x", "")), // Includes textures
            new PakExtractor(options.pakpath + "\\pakchunk10_s10-WindowsClient.pak", aes.mainKey.replace("0x", "")), // Includes cosmetic definitions
        ];
        if (aes.additionalKeys) {
            Object.keys(aes.additionalKeys).forEach(key => {
                extractors.push(new PakExtractor(options.pakpath + "/" + key, aes.additionalKeys[key].replace("0x", "")));
            });
        };
        let cosmetics = [];
        extractors.forEach(extractor => {
            let arr = extractor.get_file_list().map((v, idx) => ({
                path: v.replace("FortniteGame/Content/", ""),
                index: idx,
                ex: extractor
            }));
            cosmetics = cosmetics.concat(arr);
        });
        var ItemList = await Helper.filterPaths(cosmetics);
        const assetFiles = [];
        console.log("[AssetDumper] Processing " + ItemList.length + " items");
        for (let i = 0; i < ItemList.length; i++) {
            let filepath = ItemList[i];
            let file = filepath.ex.get_file(filepath.index);
            let filename = filepath.path.split('/').pop().toLowerCase();
            assetFiles.push(filename);
            if (fs.existsSync('./storage/assets/' + filename)) continue;
            if (file != null) fs.writeFileSync("./storage/assets/" + filename, file)
        };
        for (let i = 0; i < assetFiles.length; i++) {
            let filename = assetFiles[i];
            if (filename.endsWith(".uexp")) continue;
            let fileAsset = filename.slice(0, -7);
            let asset = false;
            try {
                asset = new Package('./storage/assets/' + fileAsset);
            } catch (e) {
                console.error(e);
                continue;
            };
            let data = asset.get_data()[0];
            if (data.export_type == "Texture2D") {
                let tPath = "./storage/icons/" + fileAsset + ".png";
                if (!fs.existsSync(tPath)) {
                    read_texture_to_file("./storage/assets/" + fileAsset, tPath);
                };
            };
            const UpdatedAssets = Helper.AddAsset(data, fileAsset, Assets);
            Assets = UpdatedAssets;
        };
        let final_items = Helper.ProcessItems(Assets);
        for (let i = 0; i < final_items.length; i++) {
            let item = final_items[i];
            item.name = {
                en: item.name.toString()
            };
            if (item.name.en.split(" ")[item.name.en.split(" ").length - 1] == "") {
                item.name.en = item.name.en.split(" ").slice(0, item.name.en.split(" ").length - 1).join(" ");
            }; // Fixes some skins (like "Skull Trooper ") having a space after the name
            item.description = {
                en: item.description.toString()
            };
            if (item.keys && item.keys instanceof Object) {
                Object.keys(item.keys).forEach(key => {
                    Object.keys(options.locales).sort().forEach(loc => {
                        if (!options.locales[loc][item.keys[key]]) return;
                        let name = options.locales[loc][item.keys[key]];
                        if (name.split(" ")[name.split(" ").length - 1] == "") {
                            name = name.split(" ").slice(0, name.split(" ").length - 1).join(" ");
                        };
                        item[key][loc] = name;
                    });
                });
            };
        };
        var types = {
            cid: "skin",
            eid: "emote",
            bid: "backpack",
            pic: "pickaxe"
        };
        final_items.filter(item => item.set).forEach(item => {
            item.setParts = final_items.filter(i => i.set && i.set == item.set && i.id !== item.id).map(i => {
                return {
                    id: i.id,
                    type: types[i.id.slice(0, 3)],
                    image: i.image || null,
                    name: i.name,
                };
            });
        });
        const data = {
            backpacks: final_items.filter(a => a.id && a.id.startsWith("bid")).sort(),
            emotes: final_items.filter(a => a.id && a.id.startsWith("eid")).sort(),
            pickaxes: final_items.filter(a => a.definition && a.definition.startsWith("wid")).sort(),
            skins: final_items.filter(a => a.id && a.id.startsWith("cid")).sort(),
        };
        if (options.deleteFilesAfterDump) {
            fs.readdir("./storage/assets/", (err, files) => {
                if (err) throw err;
                for (const file of files) {
                    fs.unlink(require("path").join("./storage/assets/", file), err => {
                        if (err) throw err;
                    });
                };
            });
            fs.readdir("./storage/locales/", (err, files) => {
                if (err) throw err;
                for (const file of files) {
                    fs.unlink(require("path").join("./storage/locales/", file), err => {
                        if (err) throw err;
                    });
                };
            });
        };
        return data;
    };
};

module.exports = AssetDumping;