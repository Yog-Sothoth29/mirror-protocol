import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.MIRROR_SHARP||'sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),assets=path.join(root,'assets');
const base=await sharp(path.join(assets,'deepseek-blue.png')).metadata(),w=base.width,h=base.height,n=w*h;
const glass=await sharp(path.join(assets,'mirror-glass-material-v3.png')).resize(w,h,{fit:'fill'}).ensureAlpha().raw().toBuffer();
const alpha=Uint8Array.from({length:n},(_,i)=>glass[i*4+3]);
function region(radius){
 const wall=new Uint8Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(alpha[y*w+x]>32){
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const a=x+dx,b=y+dy;if(a>=0&&a<w&&b>=0&&b<h)wall[b*w+a]=1;}
 }
 const seen=new Uint8Array(n),queue=new Int32Array(n);let count=1,head=0,edges=false,minX=w,maxX=0,minY=h,maxY=0;
 const seed=Math.round(h*.37)*w+Math.round(w*.77);if(wall[seed])throw Error('Face seed lies on glass material');seen[seed]=1;queue[0]=seed;
 while(head<count){const p=queue[head++],x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x===0||x===w-1||y===0||y===h-1)edges=true;
  for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(q>=0&&!wall[q]&&!seen[q]){seen[q]=1;queue[count++]=q;}
 }
 return {seen,count,edges,radius,bounds:[minX,minY,maxX,maxY]};
}
let opening;const attempts=[];
for(const radius of [0,1,2,3,5,8]){const r=region(radius);attempts.push({radius,pixels:r.count,touchesEdge:r.edges,bounds:r.bounds});if(!r.edges&&r.count>n*.04&&r.count<n*.4){opening=r;break;}}
if(!opening)throw Error('No closed physical opening found: '+JSON.stringify(attempts));
await sharp(Buffer.from(opening.seen.map(v=>v?255:0)),{raw:{width:w,height:h,channels:1}}).png().toFile(path.join(assets,'face-opening-mask.png'));
// Reveal only the component enclosed by the authored glass itself. No second geometry is drawn.
const red=await sharp(path.join(assets,'longmarch-black.png')).ensureAlpha().raw().toBuffer();
const images=[],verification=[];
for(const variant of ['day','night']){
 const source=await sharp(path.join(assets,variant==='night'?'deepseek-night.png':'deepseek-blue.png')).ensureAlpha().raw().toBuffer();
 if(source.length!==red.length)throw Error('Source images must share exact dimensions');
 const pixels=Buffer.from(source);
 for(let i=0;i<n;i++)if(opening.seen[i])red.copy(pixels,i*4,i*4,i*4+4);
 // Only the existing material is composited; both characters keep their exact original pixels and coordinates.
 const composite=sharp(pixels,{raw:{width:w,height:h,channels:4}}).composite([{input:glass,raw:{width:w,height:h,channels:4}}]);
 const name='transition-'+variant+'-original';await composite.clone().png().toFile(path.join(assets,name+'.png'));await composite.clone().webp({quality:92}).toFile(path.join(assets,name+'.webp'));
 const final=await sharp(path.join(assets,name+'.png')).ensureAlpha().raw().toBuffer();let unchangedSource=0,unchangedDestination=0;
 for(let i=0;i<n;i++)if(alpha[i]===0){const expected=opening.seen[i]?red:source;for(let c=0;c<4;c++)if(final[i*4+c]!==expected[i*4+c])throw Error('Original pixel changed at '+i);if(opening.seen[i])unchangedDestination++;else unchangedSource++;}
 verification.push({variant,unchangedSource,unchangedDestination,registration:'identity: x,y unchanged; no scaling or translation of either character'});
 images.push(name);
}
const report={strategy:'reuse original artwork at exact source coordinates',width:w,height:h,generatedCharacters:false,manualHolePaths:0,openingDerivedFrom:'glass alpha connected component',attempts,selectedRadius:opening.radius,images,verification};
await fs.writeFile(path.join(root,'previews/alignment-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
