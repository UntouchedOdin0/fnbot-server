function prepareObject (asset) {
  return {
    name: asset.name,
    id: asset.id
  }
};

var types = {
  skins: 'skins',
  emotes: 'emotes',
  skin: 'skins',
  emote: 'emotes'
}

export const routes = [{
  name: '/cosmetics/search',
  run (req, res) {
    if (!req.query || !req.query.q) return res.send('Error: Missing search query q')
    if (!req.query || !req.query.type) return res.send('Error: Missing type query type')
    if (!types[req.query.type]) return res.send('Error: Invalid type.')
    const type = types[req.query.type]
    const Match = (
      global.assets[type].filter(a => Object.keys(a.name).filter(b => a.name[b].toLowerCase() === req.query.q.toLowerCase())[0])[0] || // Name match
            global.assets[type].filter(a => a.id.toLowerCase() === req.query.q.toLowerCase())[0] // ID match
    )
    if (Match) {
      var results = prepareObject(Match)
      return res.status(200).json(results)
    };
    return res.status(200).json({
      no_results: true
    })
  },
  description: 'Searches for an specific asset (requires queries q and type).'
}]
