const { app } = require('electron')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

app.whenReady().then(async () => {
  // Verify resources database
  const srcPath = path.join(process.cwd(), 'resources', 'hanzi.db')
  const src = new Database(srcPath)
  const test = src.prepare("SELECT character, structure, definition, radical_id FROM characters WHERE character = '祺'").get()
  console.log('resources/hanzi.db:', test)
  src.close()

  // Delete user database
  const userPath = 'C:/Users/zhaoruibin/AppData/Roaming/hanzi-learn/'
  try { fs.unlinkSync(userPath + 'hanzi-learn.db'); console.log('Deleted old db') } catch(e) { console.log('No old db to delete:', e.message) }
  try { fs.unlinkSync(userPath + 'hanzi-learn.db-wal'); console.log('Deleted wal') } catch(e) {}
  try { fs.unlinkSync(userPath + 'hanzi-learn.db-shm'); console.log('Deleted shm') } catch(e) {}

  // Copy using fs
  const srcBuf = fs.readFileSync(srcPath)
  fs.writeFileSync(userPath + 'hanzi-learn.db', srcBuf)
  console.log('Copied', srcBuf.length, 'bytes')

  // Verify user database
  const userDb = new Database(userPath + 'hanzi-learn.db')
  const userTest = userDb.prepare("SELECT character, structure, definition, radical_id FROM characters WHERE character = '祺'").get()
  console.log('user db:', userTest)
  userDb.close()

  app.exit(0)
})
