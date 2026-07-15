import { readdir,stat } from 'node:fs/promises'
import { join } from 'node:path'

const assets=join(process.cwd(),'dist','assets')
const files=await readdir(assets)
const entryFiles=files.filter(name=>/^index-[\w-]+\.js$/.test(name))
if(entryFiles.length!==1)throw new Error(`Expected one application entry chunk, found ${entryFiles.length}`)
const entry=entryFiles[0]
const bytes=(await stat(join(assets,entry))).size
const limit=400*1024
if(bytes>limit)throw new Error(`Startup bundle ${entry} is ${(bytes/1024).toFixed(1)} KB; limit is ${limit/1024} KB`)
console.log(`Startup bundle: ${(bytes/1024).toFixed(1)} KB / ${limit/1024} KB limit`)
