exports.PATHS = [
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

exports.AssetProcessors = {
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

exports.VariantProcessors = {
    FortCosmeticParticleVariant: (asset) => ({
        channel: asset.VariantChannelTag.TagName.split("Cosmetics.Variant.Channel.")[1],
        tags: asset.ParticleOptions.map(p => {
            return {
                keys: {
                    name: p.VariantName.key
                },
                tag: p.CustomizationVariantTag.TagName.split("Cosmetics.Variant.Property.")[1]
            }
        }),
    }),
    FortCosmeticCharacterPartVariant: (asset) => ({
        channel: asset.VariantChannelTag.TagName.split("Cosmetics.Variant.Channel.")[1],
        tags: asset.PartOptions.map(p => {
            return {
                keys: {
                    name: p.VariantName.key
                },
                tag: p.CustomizationVariantTag.TagName.split("Cosmetics.Variant.Property.")[1]
            }
        }),
    }),
    FortCosmeticMaterialVariant: (asset) => ({
        channel: asset.VariantChannelTag.TagName.split("Cosmetics.Variant.Channel.")[1],
        tags: asset.MaterialOptions.map(p => {
            return {
                keys: {
                    name: p.VariantName.key
                },
                tag: p.CustomizationVariantTag.TagName.split("Cosmetics.Variant.Property.")[1]
            }
        }),
    }),
};

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