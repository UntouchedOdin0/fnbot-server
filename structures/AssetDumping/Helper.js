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
    "Athena/Items/CosmeticVariantTokens",
    "Athena/Heroes",
    "UI/Foundation/Textures/Icons/Backpacks",
    "UI/Foundation/Textures/Icons/Emotes",
    "UI/Foundation/Textures/Icons/Weapons/Items",
    "UI/Foundation/Textures/Icons/Heroes/Athena/Soldier",
    "UI/Foundation/Textures/Icons/Heroes/Progressive",
    "UI/Foundation/Textures/Icons/Heroes/Variants",
];

function buildImagePath(path) {
    if (!path) return null;
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

const VariantProcessors = {
    FortCosmeticParticleVariant: (asset) => ({
        channel: asset.VariantChannelTag.TagName.split("Cosmetics.Variant.Channel.")[1],
        tags: asset.ParticleOptions.map(p => { return { keys: { name: p.VariantName.key }, tag: p.CustomizationVariantTag.TagName.split("Cosmetics.Variant.Property.")[1] }}),
    }),
    FortCosmeticCharacterPartVariant: (asset) => ({
        channel: asset.VariantChannelTag.TagName.split("Cosmetics.Variant.Channel.")[1],
        tags: asset.PartOptions.map(p => { return { keys: { name: p.VariantName.key }, tag: p.CustomizationVariantTag.TagName.split("Cosmetics.Variant.Property.")[1] }}),
    }),
    FortCosmeticMaterialVariant: (asset) => ({
        channel: asset.VariantChannelTag.TagName.split("Cosmetics.Variant.Channel.")[1],
        tags: asset.MaterialOptions.map(p => { return { keys: { name: p.VariantName.key }, tag: p.CustomizationVariantTag.TagName.split("Cosmetics.Variant.Property.")[1] }}),
    }),
};

const AssetProcessors = {
    FortHeroType: asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : null,
        description: asset.Description ? asset.Description.toString() : null,
        image: buildImagePath(asset.LargePreviewImage),
        set: asset.set || null,
        keys: asset.keys || null,
    }),
    AthenaPickaxeItemDefinition: asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : null,
        description: asset.Description ? asset.Description.toString() : null,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        definition: findImport(asset.WeaponDefinition),
        set: asset.set || null,
        keys: asset.keys || null,
    }),
    AthenaCharacterItemDefinition: asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : null,
        description: asset.Description ? asset.Description.toString() : null,
        rarity: buildRarity(asset.Rarity),
        definition: findImport(asset.HeroDefinition),
        set: asset.set || null,
        keys: asset.keys || null,
    }),
    AthenaBackpackItemDefinition: asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : null,
        description: asset.Description ? asset.Description.toString() : null,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        set: asset.set || null,
        keys: asset.keys || null,
    }),
    AthenaDanceItemDefinition: asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : null,
        description: asset.Description ? asset.Description.toString() : null,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        set: asset.set || null,
        keys: asset.keys || null,
    }),
    FortTokenType: asset => ({
        name: asset.DisplayName ? asset.DisplayName.toString() : null,
        description: asset.Description ? asset.Description.toString() : null,
        image: buildImagePath(asset.LargePreviewImage),
        rarity: buildRarity(asset.Rarity),
        set: asset.set || null,
        keys: asset.keys || null,
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
    static processVariants(data, parent, variants) {
        if (!VariantProcessors[data.export_type]) return variants;
        if (!variants[parent]) variants[parent] = [];
        let process = VariantProcessors[data.export_type](data, parent);
        if (!process) return variants;
        variants[parent].push(process);
        return variants;
    };
    static AddAsset(data) {
        data.keys = {};
        if (data.DisplayName) {
            if (data.DisplayName.string) {
                if (data.DisplayName.key) data.keys.name = data.DisplayName.key;
                data.DisplayName = data.DisplayName.string;
            };
            if (data.DisplayName == "Random") return undefined;
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
        if (!AssetProcessors.hasOwnProperty(data.export_type)) return undefined;
        return AssetProcessors[data.export_type](data);
    };
    static ProcessItems(AssetList) {
        let definitions = Object.assign({}, AssetList.FortHeroType, AssetList.FortWeaponMeleeItemDefinition);
        let items = Object.assign({}, AssetList.AthenaPickaxeItemDefinition,
            AssetList.AthenaBackpackItemDefinition, AssetList.AthenaCharacterItemDefinition,
            AssetList.AthenaDanceItemDefinition, AssetList.FortTokenType, AssetList.FortVariantTokenType);
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