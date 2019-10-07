import * as uuidv4 from 'uuid/v4'
import * as uuidv5 from 'uuid/v5'
import * as fs from 'fs'

export let Warnings = []

const PREDEFINED_NAMESPACE = uuidv4.default()

export function createWarning (type, message, author, creation) {
  if (!author) author = null
  const id = uuidv5.default(type + '|' + message + '|' + Date.now(), PREDEFINED_NAMESPACE)
  if (Warnings.filter(w => w.id === id)[0] || Warnings.filter(w => w.typeId === type)[0]) return { error: 'id_exists', msg: 'ID already exists.' }
  const warning = { id, typeId: type, message, postedBy: author || null, timestamps: { postedAt: new Date() } }
  if (creation) warning.creation = creation
  Warnings.push(warning)
  console.log('[WarningManager] New warning: <' + warning.typeId + '>')
  return warning
};
export function updateWarning (id, overwrite) {
  const warning = Warnings.filter(w => w.id === id)[0]
  if (!warning) return { error: 'warning_doesnt_exist', msg: 'Warning does not exist.' }
  warning.timestamps.updatedAt = new Date()
  Object.keys(overwrite).filter(ov => ov !== 'id' && ov !== 'timestamps').forEach(ov => {
    warning[ov] = overwrite[ov]
  })
  console.log('[WarningManager] Warning updated: <' + warning.typeId + '>')
  Warnings.filter(w => w.id === id)[0] = warning
  return warning
};

export function deleteWarning (id) {
  const warning = Warnings.filter(w => w.id === id)[0]
  if (!warning) return { error: 'warning_doesnt_exist', msg: 'Warning does not exist.' }
  console.log('[WarningManager] Warning removed: <' + warning.typeId + '>')
  Warnings = Warnings.filter(w => w.id !== warning.id) || []
  return Warnings
};

export function readWarningFile () {
  if (!fs.existsSync('./warnings.json')) return null
  return JSON.parse(fs.readFileSync('./warnings.json', { encoding: 'utf8' }))
};

export function writeWarningFile (contents) {
  fs.writeFileSync('./warnings.json', JSON.stringify(contents.filter(c => !c.creation || c.creation !== 'auto')))
  return contents
};
