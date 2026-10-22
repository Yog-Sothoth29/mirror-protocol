import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
 const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(target!==root&&!target.startsWith(root+path.sep))throw Error('Invalid path');
 const file=(await fs.stat(target)).isDirectory()?path.join(target,'index.html'):target;
 const bytes=await fs.readFile(file);res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
}catch{res.writeHead(404);res.end('Not found');}});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Preview port 8791 is already in use; open http://127.0.0.1:8791 or stop the other preview.':error.message);process.exitCode=1;});
server.listen(8791,'127.0.0.1',()=>console.log('Mirror Protocol preview: http://127.0.0.1:8791 (Ctrl+C to stop; never connects to Codex)'));
