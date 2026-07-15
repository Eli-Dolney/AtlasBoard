import { readdir,stat } from 'node:fs/promises'
import { join } from 'node:path'

const assets=join(process.cwd(),'dist','assets')
const rows=[]
for(const name of await readdir(assets)){
  if(!name.endsWith('.js'))continue
  rows.push({name,bytes:(await stat(join(assets,name))).size})
}
rows.sort((a,b)=>b.bytes-a.bytes)
console.table(rows.map(({name,bytes})=>({chunk:name,'size (KB)':(bytes/1024).toFixed(1)})))
