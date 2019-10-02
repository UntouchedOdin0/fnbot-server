const {
    PakExtractor,
    read_locale
} = require("node-wick");

module.exports = async (pak, loc) => {
    var locales = {};
    const pakextractor = new PakExtractor(pak.path, pak.key);
    let pak0list = pakextractor.get_file_list().map((v, idx) => ({
        path: v,
        index: idx,
    }));
    var Locales = pak0list.filter(i => i.path.includes("Localization/Game_BR/") && i.path.includes(".locres"));
    if (loc && loc instanceof Array && loc[0]) {
        Locales = Locales.filter(l => loc.includes(l.path.split("Localization/Game_BR/")[1].split("/")[0]));
    };
    for (let i = 0; i < Locales.length; i++) {
        let filepath = Locales[i];
        let file = pakextractor.get_file(filepath.index);
        if (file != null) {
            let data = read_locale(file);
            let formattedObj = {};
            data.string_data[0].data.forEach(d => {
                return formattedObj[d.key] = d.data;
            });
            locales[filepath.path.split("Localization/Game_BR/")[1].split("/")[0]] = formattedObj;
        };
    };
    console.log("[LocaleDumper] " + Object.keys(locales).length + " locales loaded: " + Object.keys(locales).map(key => key).sort().join(", "));
    return locales;
};