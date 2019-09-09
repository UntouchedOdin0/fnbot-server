/*
 *
 * Inspirated from https://github.com/SirWaddles/JohnWick/blob/master/process.js
 *
 */

const Paths = [
    "Athena/Items/Cosmetics/Backpacks",
    "Athena/Items/Cosmetics/Characters",
    "Athena/Items/Cosmetics/Dances",
    "Athena/Items/Cosmetics/Pickaxes",
    "Athena/Heroes",
    "UI/Foundation/Textures/Icons/Backpacks",
    "UI/Foundation/Textures/Icons/Emotes",
    "UI/Foundation/Textures/Icons/Heroes/Athena/Soldier",
    "Localization/Game_BR/",
];

function buildImagePath(path) {
    if (!path) return false;
    path = path.asset_path_name;
    return path.split("/").pop().split(".")[0].toLowerCase() + ".png";
};

const RarityLevels = {
    "EFortRarity::Common": "Common",
    "EFortRarity::Rare": "Rare",
    "EFortRarity::Epic": "Epic",
    "EFortRarity::Legendary": "Legendary",
};

function buildRarity(rarity) {
    if (!rarity) return "Uncommon";
    return RarityLevels[rarity.toString()];
};

function findImport(definition) {
    if (!definition) return false;
    return definition.toLowerCase();
};

const AssetProcessors = {
    "FortHeroType": asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : false,
        description: asset.Description ? asset.Description.toString() : false,
        image: buildImagePath(asset.LargePreviewImage),
        keys: asset.keys,
        set: asset.set || null
    }),
    "AthenaPickaxeItemDefinition": asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : false,
        description: asset.Description ? asset.Description.toString() : false,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        definition: findImport(asset.WeaponDefinition),
        keys: asset.keys,
        set: asset.set || null
    }),
    "AthenaCharacterItemDefinition": asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : false,
        description: asset.Description ? asset.Description.toString() : false,
        rarity: buildRarity(asset.Rarity),
        definition: findImport(asset.HeroDefinition),
        keys: asset.keys,
        set: asset.set || null
    }),
    "AthenaBackpackItemDefinition": asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : false,
        description: asset.Description ? asset.Description.toString() : false,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        keys: asset.keys,
        set: asset.set || null
    }),
    "AthenaDanceItemDefinition": asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : false,
        description: asset.Description ? asset.Description.toString() : false,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        keys: asset.keys,
        set: asset.set || null
    }),
    "FortTokenType": asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : false,
        description: asset.Description ? asset.Description.toString() : false,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        keys: asset.keys,
        set: asset.set || null
    }),
};

class Helper {
    static filterPaths(paths) {
        return paths.filter(path => {
            return Paths.map(p => {
                let index = path.path.indexOf(p);
                if (index <= -1) return false;
                if (path.path.slice(index + p.length + 1).includes("/")) return false;
                return true;
            }).filter(v => v).length > 0;
        });
    };
    static AddAsset(data, filename, currentAssets) {
        data.keys = {};
        if (data.DisplayName) {
            if (data.DisplayName.string) {
                if (data.DisplayName.key) data.keys.name = data.DisplayName.key;
                data.DisplayName = data.DisplayName.string;
            };
            if (data.DisplayName == "Random") return currentAssets;
        };
        if (data.Description) {
            if (data.Description.string) {
                if (data.Description.key) data.keys.description = data.Description.key;
                data.Description = data.Description.string;
            };
        };
        if (data.GameplayTags && data.GameplayTags.gameplay_tags && data.GameplayTags.gameplay_tags[0] && data.GameplayTags.gameplay_tags.filter(t => t.startsWith("Cosmetics.Set."))[0]) {
            data.set = data.GameplayTags.gameplay_tags.filter(t => t.startsWith("Cosmetics.Set."))[0].split("Cosmetics.Set.")[1];
        };
        if (!AssetProcessors.hasOwnProperty(data.export_type)) return currentAssets;
        if (!currentAssets.hasOwnProperty(data.export_type)) currentAssets[data.export_type] = {};
        currentAssets[data.export_type][filename] = AssetProcessors[data.export_type](data);
        return currentAssets;
    };
    static ProcessItems(AssetList) {
        let definitions = Object.assign({}, AssetList.FortHeroType, AssetList.FortWeaponMeleeItemDefinition);
        let items = Object.assign({}, AssetList.AthenaPickaxeItemDefinition,
            AssetList.AthenaBackpackItemDefinition, AssetList.AthenaCharacterItemDefinition,
            AssetList.AthenaDanceItemDefinition, AssetList.FortTokenType);
        Object.keys(items).forEach(itemId => {
            let item = items[itemId];
            if (item.hasOwnProperty('definition') && definitions.hasOwnProperty(item.definition) && definitions[item.definition].image) {
                item.image = definitions[item.definition].image;
            };
            item.id = itemId;
        });
        return Object.values(items);
    };
};

module.exports = Helper;