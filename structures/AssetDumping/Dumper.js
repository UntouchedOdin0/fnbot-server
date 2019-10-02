const {
    Package,
    PakExtractor,
    read_locale,
    read_texture_to_file
} = require("node-wick");
const fs = require("fs");
const Helper = require("./Helper.js");
const LocaleDump = require("./LocaleDump.js");

var locales = {};
var assets = {};
var assets_old;
var variants = {};

function getTranslations(asset, type, key, locales) {
    if (!asset) return undefined;
    if (!type || !key || !locales) return asset;
    if (!asset[type]) asset[type] = {};
    if (typeof asset[type] == "string") {
        asset[type] = {
            en: asset[type]
        };
    };
    Object.keys(locales).sort().forEach(loc => {
        let name = locales[loc][key] || locales["en"][key];
        if (!name) return asset;
        if (name.split(" ")[name.split(" ").length - 1] == "") {
            name = name.split(" ").slice(0, name.split(" ").length - 1).join(" ");
        };
        if (name) asset[type][loc] = name;
    });
    return asset;
};

class Dumper {
    static async process(paks, type, path, options) {
        if (!paks || !type || !path) return undefined;
        if (!options) options = {};
        var extractors = [];
        if (type !== "all") {
            let exists = fs.existsSync("./storage/assets.json");
            if (exists) assets_old = require("../../storage/assets.json");
        };
        if (paks.main && paks.main.filter(pak => pak.name == "pakchunk0-WindowsClient.pak")[0]) {
            var pak = paks.main.filter(pak => pak.name == "pakchunk0-WindowsClient.pak")[0];
            locales = await LocaleDump({
                path: path + pak.name,
                key: (pak.key).replace("0x", "")
            }, options.locales)
        };
        paks.main.forEach(pak => extractors.push(new PakExtractor(path + pak.name, (pak.key).replace("0x", ""))));
        paks.encrypted.forEach(pak => extractors.push(new PakExtractor(path + pak.name, (pak.key).replace("0x", ""))));
        var cosmetics = [];
        extractors.forEach(extractor => {
            cosmetics = cosmetics.concat(extractor.get_file_list().map((file, idx) => ({
                path: file.replace("FortniteGame/Content/", ""),
                index: idx,
                extractor: extractor,
            })));
        });
        var assetFiles = [];
        var Items = await Helper.filterPaths(cosmetics);
        console.log("[AssetDumper] Dumping " + Items.length + " assets (" + type + ").");
        for (let i = 0; i < Items.length; i++) {
            let filepath = Items[i];
            let file = filepath.extractor.get_file(filepath.index);
            let filename = filepath.path.split('/').pop().toLowerCase();
            assetFiles.push(filename);
            if (fs.existsSync('./storage/assets/' + filename)) continue;
            if (file != null) fs.writeFileSync("./storage/assets/" + filename, file)
        };
        console.log("[AssetDumper] Reading data...");
        var datafields = { textures: 0, items: 0, variants: 0 };
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
            let data = asset.get_data();
            if (!data[0]) continue;
            if (data[0].export_type == "Texture2D" && options.dumpIcons) {
                let tPath = "./storage/icons/" + fileAsset + ".png";
                if (!fs.existsSync(tPath)) {
                    read_texture_to_file("./storage/assets/" + fileAsset, tPath);
                };
                datafields.textures++;
            };
            if (data[0].ItemVariants && data[0].ItemVariants[0] && data[1]) {
                datafields.variants++;
                data.slice(1).forEach(d => {
                    let ProcessedVariants = Helper.processVariants(d, fileAsset, variants);
                    variants = ProcessedVariants;
                });
            };
            if (!assets[data[0].export_type]) assets[data[0].export_type] = {};
            let assetdata = Helper.AddAsset(data[0]);
            if (assetdata) assets[data[0].export_type][fileAsset] = assetdata;
            datafields.items++;
        };
        console.log("[AssetDumper] Loaded " + Object.keys(datafields).map(key => datafields[key] + " " + key).sort().join(", ") + ".");
        let SortedVariants = {};
        Object.keys(variants).sort().forEach(key => {
            if (variants[key].filter(v => v.tags)[0]) {
                variants[key].forEach(v => {
                    v.tags.forEach(tag => {
                        if (tag.keys) {
                            Object.keys(tag.keys).forEach(key => {
                                tag = getTranslations(tag, key, tag.keys[key], locales);
                            });
                        };
                        tag.keys = undefined;
                    });
                });
            };
            SortedVariants[key] = variants[key]
        });
        variants = SortedVariants;
        let final_items = Helper.ProcessItems(assets);
        for (let i = 0; i < final_items.length; i++) {
            let item = final_items[i];
            if (item.keys) {
                Object.keys(item.keys).forEach(key => {
                    item = getTranslations(item, key, item.keys[key], locales);
                });
            };
        };
        var types = {
            cid: "skin",
            eid: "emote",
            bid: "backpack",
            pic: "pickaxe",
        };
        final_items.forEach(item => {
            if (item.set) item.setParts = final_items.filter(i => i.set && i.set == item.set && i.id !== item.id).map(i => {
                return i.id + ":" + types[i.id.slice(0, 3)];
            });
            if (item.id && variants[item.id.toLowerCase()]) {
                item.variants = variants[item.id.toLowerCase()]
            };
        });
        const data = {
            backpacks: final_items.filter(a => a.id && a.id.startsWith("bid")).sort(),
            emotes: final_items.filter(a => a.id && a.id.startsWith("eid")).sort(),
            pickaxes: final_items.filter(a => a.definition && a.definition.startsWith("wid")).sort(),
            skins: final_items.filter(a => a.id && a.id.startsWith("cid")).sort(),
            build: options.build,
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
        };

        function compare(a, b) {
            if (a.id < b.id) {
                return -1;
            };
            if (a.id > b.id) {
                return 1;
            };
            return 0;
        };
        Object.keys(data).filter(key => typeof data[key] == "object").forEach(key => {
            if (assets_old && type !== "all") assets_old[key].forEach(asset => {
                if (data[key].filter(a => a.id == asset.id)[0]) return;
                data[key].push(asset);
            });
            data[key] = data[key].sort(compare);
        });
        fs.writeFileSync("./storage/assets.json", JSON.stringify(data));
        return data;
    };
};

module.exports = Dumper;