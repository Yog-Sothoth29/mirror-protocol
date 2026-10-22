import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid package version');
const staging=path.join(root,'dist',`Mirror-Protocol-${version}-${Date.now()}`);
await fs.mkdir(staging,{recursive:true});
const files=[];
async function copy(relative){
 const source=path.resolve(root,relative),target=path.resolve(staging,relative);
 if(!source.startsWith(root+path.sep)||!target.startsWith(staging+path.sep))throw Error('Unsafe release path');
 const stat=await fs.lstat(source);if(stat.isSymbolicLink())throw Error('Symlinks cannot enter a release');
 if(stat.isDirectory()){for(const name of (await fs.readdir(source)).sort())await copy(path.join(relative,name));return;}
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target);
 files.push({path:relative.replaceAll('\\','/'),bytes:stat.size,sha256:crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex')});
}
for(const name of ['README.md','INSTALL.md','AGENTS.md','WINDOWS-COMPATIBILITY.md','LICENSE','ASSET-LICENSE.md','THIRD_PARTY_NOTICES.md','CONTRIBUTING.md','PUBLISHING.md','RELEASE_NOTES.md','CP2077-LOGO-RESEARCH.md','package.json','package-lock.json','Preview.cmd','Demo.html','Transition.html','index.html','preview-inject.js','mirror-config.json','assets','runtime','packages','tools','docs','references'])await copy(name);
await fs.writeFile(path.join(staging,'release-manifest.json'),JSON.stringify({version,installation:'node tools/install.mjs',node: '>=22',automaticRestart:false,actualCodexVerified:false,files},null,2)+'\n');
console.log(JSON.stringify({version,staging,files:files.length,bytes:files.reduce((sum,f)=>sum+f.bytes,0)}));
