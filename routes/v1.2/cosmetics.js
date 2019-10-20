const Assets = {
  ...global.assets
}

const tlist = {
  backpack: 'backpacks',
  emote: 'emotes',
  pickaxe: 'pickaxes',
  skin: 'skins',
  emoji: 'emojis',
  cid: 'skins',
  eid: 'emotes',
  bid: 'backpacks',
  pic: 'pickaxes'
}
const types = type => {
  if (!Object.keys(tlist).includes(type) && !Object.values(tlist).includes(type)) return null
  return tlist[type] || type
}

function prepareImage (img, baseurl) {
  if (!img || !baseurl) return null
  return baseurl + 'icons/' + img
};

function prepareObject (asset, baseurl) {
  return {
    id: asset.id,
    name: asset.name,
    image: prepareImage(asset.image, baseurl),
    variants: asset.variants || undefined
  }
};

export const routes = [{
  name: '/cosmetics/search',
  run (req, res) {
    if (!req.headers || !req.headers.query) return res.status(400).json({ statusCode: 400, msg: 'Missing header query' })
    if (!req.headers || !req.headers.type) return res.status(400).json({ statusCode: 400, msg: 'Missing header type' })
    if (!types(req.headers.type)) return res.status(400).json({ statusCode: 400, msg: 'Invalid type' })
    const type = types(req.headers.type)
    let Match = (
      Assets[type].filter(a => a.name && Object.keys(a.name).filter(b => a.name[b].toLowerCase() === req.headers.query.toLowerCase())[0])[0] || // Name match
      Assets[type].filter(a => a.id && a.id.toLowerCase() === req.headers.query.toLowerCase())[0] // ID match
    )
    if (req.headers.query.toLowerCase() === 'random') {
      Match = Assets[type][Math.floor(Math.random() * Assets[type].length)]
    };
    if (Match) {
      Match.baseUrl = req.baseUrl
      const data = prepareObject(Match, req.baseUrl)
      data.matches = []
      if (type !== 'emotes' && Match.setParts && Match.setParts[0]) {
        const typeOptions = {
          skins: 5,
          backpacks: 2,
          pickaxes: 3
        }
        Match.setParts.forEach(part => {
          let matches = false
          const asset = Assets[types(part.split(':')[1])].filter(a => a.id === part.split(':')[0])[0]
          asset.type = types(part.split(':')[1])
          if (!asset) return undefined
          if (type === asset.type) return undefined
          if (!typeOptions[asset.type]) return undefined
          if (asset.id.split('_').slice(typeOptions[asset.type]).join('_') === Match.id.split('_').slice(typeOptions[type]).join('_')) matches = true
          if (matches) {
            data.matches.push({
              id: asset.id,
              type: part.split(':')[1]
            })
          }
        })
      };
      return res.status(200).json({
        statusCode: 200,
        data
      })
    };
    return res.status(404).json({
      statusCode: 404,
      data: null,
      msg: 'no_results'
    })
  },
  description: 'Searches for a specific asset (requires headers query and type).'
},
{
  name: '/variants/search',
  run (req, res) {
    if (!req.headers || !req.headers.item) return res.status(400).json({ statusCode: 400, msg: 'Missing header item' })
    if (!req.headers || !req.headers.query) return res.status(400).json({ statusCode: 400, msg: 'Missing header query' })
    if (!req.headers || !req.headers.type) return res.status(400).json({ statusCode: 400, msg: 'Missing header type' })
    if (!types(req.headers.type)) return res.status(400).json({ statusCode: 400, msg: 'Invalid type' })
    const type = types(req.headers.type)
    const item = Assets[type].filter(a => a.id && a.id === req.headers.item.toLowerCase())[0]
    if (!item) return res.status(404).json({ statusCode: 404, data: null, msg: 'invalid_item' })
    if (!item.variants || !item.variants[0]) return res.status(404).json({ statusCode: 404, data: null, msg: 'no_results' })
    const Match = (
      item.variants.filter(t => t.tags && t.tags.filter(a => a.name && Object.keys(a.name).filter(b => a.name[b].toLowerCase() === req.headers.query.toLowerCase())[0])[0])[0] || // Name match
      item.variants.filter(t => t.tags && t.tags.filter(a => a.tag && a.tag.toLowerCase() === req.headers.query.toLowerCase())[0])[0] // ID match
    )
    if (Match) {
      const MatchTag = (
        Match.tags.filter(a => a.name && Object.keys(a.name).filter(b => a.name[b].toLowerCase() === req.headers.query.toLowerCase())[0])[0] ||
        Match.tags.filter(a => a.tag && a.tag.toLowerCase() === req.headers.query.toLowerCase())[0]
      )
      return res.status(200).json({ statusCode: 200, data: { parent: item.id, channel: Match.channel, tag: MatchTag.tag, name: MatchTag.name } })
    };
    return res.status(404).json({
      statusCode: 404,
      data: null,
      msg: 'no_results'
    })
  },
  description: 'Searches for a specific variant of a cosmetic.'
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
