// Owns continuous-mesh motion acceptance: actual pixel change, fixed references and nonfolding UV geometry.
// Depends on unmodified hosted capture/project/PNG decoder. Called only by focused GitHub CI.
// Negative controls replace the actual WebGL draw time, never assertion values or expected thresholds.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';
import {openProject} from '../cli/lib/project.js';import {openFilm} from '../cli/lib/capture.js';import {decodePng} from '../cli/lib/check.js';
const root='examples/daerdo-wash-prototype';
function region(p,[x,y,w,h]){const a=[];for(let j=y;j<y+h;j+=2)for(let i=x;i<x+w;i+=2){const o=(j*p.width+i)*4;a.push(...p.px.subarray(o,o+3))}return a}
const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
const box=([x,y,w,h])=>[Math.round(x*1920/1672),Math.round(y*1080/941),Math.round(w*1920/1672),Math.round(h*1080/941)];
test('Daerdo wash prototype: continuous texture physically moves without cuts or folding',async()=>{
 const expected='8e1fb322fff00a122097097bffa8396c1f6ec747ec8ba6dcc24b65ac2a13e9df';
 assert.equal(createHash('sha256').update(readFileSync(root+'/assets/anchor.png')).digest('hex'),expected,'original complete photo hash');
 const film=await openFilm(openProject(root).index,{shotFormat:'png'}),samples=[],frames=[];
 try{
  assert.equal(film.info.duration,3);
  for(const t of [.15,.45,.65,.95,1.25,1.55,1.85,2.15,2.45,2.65]){
   await film.seek(t);
   if(process.env.DAERDO_WASH_MUTATION==='freeze-field')await film.evaluate('washMesh.draw(.15)');
   const v=await film.evaluate('washMesh.snapshot()');assert.ok(v.ready,'original complete art decoded');
   assert.ok(v.minAreaRatio>.65&&v.maxAreaRatio<1.35,'positive mesh area with limited local texture stretch');
   assert.ok(((v.sponge.x-315)/73)**2+((v.sponge.y-695)/45)**2<1,'sponge remains inside visible plate');samples.push(v);
   const png=decodePng(await film.shot({format:'png'}));assert.equal(png.width,1920);assert.equal(png.height,1080);
   frames.push({hand:region(png,box([255,610,105,94])),head:region(png,box([407,140,160,155])),plate:region(png,box([245,742,45,8])),kitchen:region(png,box([900,110,150,240])),support:region(png,box([435,660,90,55])),waist:region(png,box([650,770,105,100])),water:region(png,box([188,530,18,180])),son:region(png,box([1240,80,190,440]))});
  }
  const motion=Math.max(...frames.map(x=>diff(x.hand,frames[0].hand)));
  assert.ok(motion>2,'actual hand and sponge pixel motion');
  assert.ok(Math.max(...frames.map(x=>diff(x.head,frames[0].head)))>.2,'actual gentle head pixel motion');
  for(const f of frames)for(const key of ['plate','kitchen','support','waist','water','son'])assert.equal(diff(f[key],frames[0][key]),0,'fixed '+key+' raster');
  const opaque=await film.evaluate('washMesh.readPixels()');assert.ok(opaque.opaque&&opaque.error===0,'no transparent holes or GPU errors');
  await film.seek(.65);const first=await film.shot({format:'png'});await film.seek(2.45);await film.seek(.65);assert.equal(Buffer.compare(first,await film.shot({format:'png'})),0,'deterministic nonsequential seek');
  assert.deepEqual(film.errors,[]);mkdirSync('evidence',{recursive:true});writeFileSync('evidence/motion.json',JSON.stringify({samples,maximumHandPixelDelta:motion,assetHash:expected,opaque},null,2));
 }finally{await film.close()}
});
