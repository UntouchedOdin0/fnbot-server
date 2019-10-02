const uuid = require('uuid/v5');
const fs = require("fs");

var Warnings = [];

const PREDEFINED_NAMESPACE = "12a851ca-b912-4993-b70e-08b0f047c30e";

class WarningManager {
    static createWarning(type, message, author, creation) {
        if (!author) author = null;
        let id = uuid(type + "|" + message + "|" + Date.now(), PREDEFINED_NAMESPACE);
        if (Warnings.filter(w => w.id == id)[0] || Warnings.filter(w => w.typeId == type)[0]) return { error: "id_exists", msg: "ID already exists." };
        let warning = { id, typeId: type, message, postedBy: author || null, timestamps: { postedAt: new Date() } };
        if (creation) warning.creation = creation;
        Warnings.push(warning);
        console.log("[WarningManager] New warning: <" + warning.typeId + ">");
        return warning;
    };
    static updateWarning(id, overwrite) {
        let warning = Warnings.filter(w => w.id == id)[0];
        if (!warning) return { error: "warning_doesnt_exist", msg: "Warning does not exist." };
        warning.timestamps.updatedAt = new Date();
        Object.keys(overwrite).filter(ov => ov != "id" && ov != "timestamps").forEach(ov => {
            warning[ov] = overwrite[ov];
        });
        console.log("[WarningManager] Warning updated: <" + warning.typeId + ">");
        Warnings.filter(w => w.id == id)[0] = warning;
        return warning;
    };
    static deleteWarning(id) {
        let warning = Warnings.filter(w => w.id == id)[0];
        if (!warning) return { error: "warning_doesnt_exist", msg: "Warning does not exist." };
        console.log("[WarningManager] Warning removed: <" + warning.typeId + ">");
        Warnings = Warnings.filter(w => w.id !== warning.id) || [];
        return Warnings;
    };
    static get Warnings() {
        return Warnings;
    };
    static async readWarningFile() {
        if (!fs.existsSync("./warnings.json")) return null;
        return JSON.parse(fs.readFileSync("./warnings.json", { encoding: "utf8" }));
    };
    static async writeWarningFile(contents) {
        fs.writeFileSync("./warnings.json", JSON.stringify(contents.filter(c => !c.creation || c.creation !== "auto")));
        return contents;
    };
};

module.exports = WarningManager;