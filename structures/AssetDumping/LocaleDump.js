// eslint-disable-next-line camelcase
import { PakExtractor, read_locale } from 'node-wick'

export default function dump (pak, loc) {
  const locales = {}
  const pakextractor = new PakExtractor(pak.path, pak.key)
  const pak0list = pakextractor.get_file_list().map((v, idx) => ({
    path: v,
    index: idx
  }))
  let Locales = pak0list.filter(i => i.path.includes('Localization/Game_BR/') && i.path.includes('.locres'))
  if (loc && loc instanceof Array && loc[0]) {
    Locales = Locales.filter(l => loc.includes(l.path.split('Localization/Game_BR/')[1].split('/')[0]))
  };
  for (let i = 0; i < Locales.length; i++) {
    const filepath = Locales[i]
    const file = pakextractor.get_file(filepath.index)
    if (file != null) {
      const data = read_locale(file)
      const formattedObj = {}
      data.string_data[0].data.forEach(d => {
        formattedObj[d.key] = d.data
      })
      locales[filepath.path.split('Localization/Game_BR/')[1].split('/')[0]] = formattedObj
    };
  };
  console.log('  => Loaded ' + Object.keys(locales).length + ' locales: ' + Object.keys(locales).map(key => key).sort().join(', '))
  return locales
}
