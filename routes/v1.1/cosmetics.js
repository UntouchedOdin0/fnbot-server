function prepareObject (asset, baseUrl) {
  const obj = {
    name: asset.name,
    id: asset.id,
    image: baseUrl + 'icons/' + asset.image,
    setParts: (asset.setParts || []).map(part => { return { id: part.split(':')[0], type: part.split(':')[1] } }) || []
  }
  if (obj.setParts[0]) {
    if (obj.setParts.filter(p => p.type === 'backpack' && p.id.split('_').slice(2).join(' ') === obj.id.split('_').slice(5).join(' '))[0]) {
      obj.setParts.filter(p => p.type === 'backpack' && p.id.split('_').slice(2).join(' ') === obj.id.split('_').slice(5).join(' '))[0].matchesSkin = true
    };
  };
  return obj
};

const types = {
  skins: 'skins',
  emotes: 'emotes',
  backpacks: 'backpacks',
  skin: 'skins',
  emote: 'emotes',
  backpack: 'backpacks'
}

export const routes = [{
  name: '/cosmetics/search',
  run (req, res) {
    if (!req.headers || !req.headers.query) return res.send('Error: Missing search header query')
    if (!req.headers || !req.headers.type) return res.send('Error: Missing type header type')
    if (!types[req.headers.type]) return res.send('Error: Invalid type.')
    const type = types[req.headers.type]
    let Match = (
      global.assets[type].filter(a => a.name && Object.keys(a.name).filter(b => a.name[b].toLowerCase() === req.headers.query.toLowerCase())[0])[0] || // Name match
      global.assets[type].filter(a => a.id && a.id.toLowerCase() === req.headers.query.toLowerCase())[0] // ID match
    )
    if (!Match && type === 'skins' && parseInt(req.headers.query)) {
      Match = global.assets[type].filter(a => a.id && a.id.toLowerCase().split('cid_')[1] && parseInt(a.id.toLowerCase().split('cid_')[1].split('_')[0]) && parseInt(a.id.toLowerCase().split('cid_')[1].split('_')[0]) === parseInt(req.headers.query))[0]
    };
    if (Match) {
      const results = prepareObject(Match, req.baseUrl)
      return res.status(200).json(results)
    };
    return res.status(200).json({
      code: 'no_results'
    })
  },
  description: 'Searches for a specific asset (requires headers query and type).'
},
{
  name: '/icons/:icon',
  run (req, res) {
    const basepath = process.cwd() + '/storage/icons/'
    const icons = global.icons
    if (!req.params.icon) return res.status(404).send('Missing required param icon.')
    if (req.params.icon.split('.')[req.params.icon.split('.').length - 1] !== 'png') req.params.icon += '.png'
    if (!icons || !icons[0] || !icons.includes(req.params.icon)) return res.status(404).send('No results.')
    return res.status(200).sendFile(basepath + req.params.icon)
  }
}
]
