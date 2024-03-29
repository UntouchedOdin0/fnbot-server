/*
 *
 * Inspirated from https://github.com/SirWaddles/JohnWick/blob/master/process.js
 *
 */

import { AssetProcessors, PATHS, VariantProcessors } from '../../resources/AssetProcessors.js'

export function filterPaths (paths) {
  return paths.filter(path => {
    return PATHS.map(p => {
      const index = path.path.indexOf(p)
      if (index <= -1) return false
      if (path.path.slice(index + p.length + 1).includes('/')) return false
      return true
    }).filter(v => v).length > 0
  })
};
export function processVariants (data, parent, variants) {
  if (!VariantProcessors[data.export_type]) return variants
  if (!variants[parent]) variants[parent] = []
  const process = VariantProcessors[data.export_type](data, parent)
  if (!process) return variants
  variants[parent].push(process)
  return variants
};
export function AddAsset (data) {
  if (!Object.prototype.hasOwnProperty.call(AssetProcessors, data.export_type)) return undefined
  data.keys = {}
  if (data.DisplayName) {
    if (data.DisplayName.string) {
      if (data.DisplayName.key) data.keys.name = data.DisplayName.key
      data.DisplayName = data.DisplayName.string
    };
    if (data.DisplayName === 'Random') return undefined
  };
  if (data.Description) {
    if (data.Description.string) {
      if (data.Description.key) data.keys.description = data.Description.key
      data.Description = data.Description.string
    };
  };
  if (data.GameplayTags && data.GameplayTags.gameplay_tags && data.GameplayTags.gameplay_tags[0] && data.GameplayTags.gameplay_tags.filter(t => t.startsWith('Cosmetics.Set.'))[0]) {
    data.set = data.GameplayTags.gameplay_tags.filter(t => t.startsWith('Cosmetics.Set.'))[0].split('Cosmetics.Set.')[1]
  };
  return AssetProcessors[data.export_type](data)
};
export function ProcessItems (AssetList) {
  const definitions = Object.assign({}, AssetList.FortHeroType, AssetList.FortWeaponMeleeItemDefinition)
  const items = Object.assign({}, AssetList.AthenaPickaxeItemDefinition,
    AssetList.AthenaBackpackItemDefinition, AssetList.AthenaCharacterItemDefinition,
    AssetList.AthenaDanceItemDefinition, AssetList.FortTokenType, AssetList.FortVariantTokenType)
  Object.keys(items).forEach(itemId => {
    const item = items[itemId]
    if (Object.prototype.hasOwnProperty.call(item, 'definition') && Object.prototype.hasOwnProperty.call(definitions, item.definition) && definitions[item.definition].image) {
      item.image = definitions[item.definition].image
    };
    item.id = itemId
  })
  return Object.values(items)
};
