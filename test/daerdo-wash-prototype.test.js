// Wash-motion acceptance owns fixed references, connected joints and actual plate contact.
// Depends on hosted capture/project/PNG decoder; called only by the focused GitHub workflow.
// Both mutations alter rendered arm transforms before these unchanged assertions.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';
import {openProject} from '../cli/lib/project.js';import {openFilm} from '../cli/lib/capture.js';import {decodePng} from '../cli/lib/check.js';
const root='examples/daerdo-wash-prototype';
const hash=x=>createHash('sha256').update(x).digest('hex');
const span=(a,k)=>Math.max(...a.map(p=>p[k]))-Math.min(...a.map(p=>p[k]));
function region(p,[x,y,w,h]){const a=[];for(let j=y;j<y+h;j+=4)for(let i=x;i<x+w;i+=4){const o=(j*p.width+i)*4;a.push(...p.px.subarray(o,o+3))}return a}
function diff(a,b){return a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length}
test('Daerdo wash prototype: actual articulated scrubbing against fixed torso and plate',async()=>{
 const expected={'rig.png':'80f754ca344cce987e7193e391a183ad87bba509534b63371d5c6f7c8091b42c','kitchen.png':'3611a1099c30308d1722481691bcea4b3166e343fab11fcd6e3b3c8347dfae5d'};
 for(const[n,h]of Object.entries(expected))assert.equal(hash(readFileSync(root+'/assets/'+n)),h,'original asset hash '+n);
 const film=await openFilm(openProject(root).index,{shotFormat:'png'}),samples=[],frames=[];let fixed;
 try{
  assert.equal(film.info.duration,3);
  for(const t of [.15,.45,.65,.95,1.25,1.55,1.85,2.15,2.45,2.65]){
   await film.seek(t);
   if(!fixed)fixed=await film.evaluate(`(()=>{const s=document.querySelector('#shoulder'),f=document.querySelector('#forearm'),e=document.querySelector('#elbow');return{shoulder:s.style.transform,forearm:f.style.transform,world:new DOMMatrix(getComputedStyle(s).transform).translate(parseFloat(e.style.left),parseFloat(e.style.top)).multiply(new DOMMatrix(getComputedStyle(f).transform)).toString()}})()`);
   if(process.env.DAERDO_WASH_MUTATION==='freeze-arm')await film.evaluate(`document.querySelector('#shoulder').style.transform=${JSON.stringify(fixed.shoulder)};document.querySelector('#forearm').style.transform=${JSON.stringify(fixed.forearm)}`);
   if(process.env.DAERDO_WASH_MUTATION==='freeze-tool')await film.evaluate(`(()=>{const p=new DOMMatrix(getComputedStyle(document.querySelector('#shoulder')).transform).translate(parseFloat(document.querySelector('#elbow').style.left),parseFloat(document.querySelector('#elbow').style.top));document.querySelector('#forearm').style.transform=p.inverse().multiply(new DOMMatrix(${JSON.stringify(fixed.world)})).toString()})()`);
   const v=await film.evaluate(`(()=>{const point=id=>{const r=document.querySelector('#'+id).getBoundingClientRect();return{x:r.x,y:r.y}};return{t:${t},shoulder:point('shoulder'),elbow:point('elbow'),wrist:point('wrist'),sponge:point('sponge'),torso:point('torso'),plate:point('left-support'),ready:[...document.images].every(i=>i.complete&&i.naturalWidth>0)}})()`);
   assert.ok(v.ready,'all original art decoded');
   assert.ok(((v.sponge.x-555)/100)**2+((v.sponge.y-912)/50)**2<1,'actual sponge inside visible plate');
   const elbowGap=await film.evaluate(`(()=>{const p=document.querySelector('#forearm'),r=p.getBoundingClientRect(),e=document.querySelector('#elbow').getBoundingClientRect();return Math.hypot(r.x-e.x,r.y-e.y)})()`);
   assert.ok(elbowGap<.1,'shared elbow remains connected');samples.push(v);
   const png=decodePng(await film.shot({format:'png'}));assert.equal(png.width,1920);assert.equal(png.height,1080);
   frames.push({arm:region(png,[400,650,850,350]),face:region(png,[805,245,180,150]),kitchen:region(png,[1450,80,220,200])});
  }
  assert.ok(span(samples.map(x=>x.sponge),'x')>40&&span(samples.map(x=>x.sponge),'y')>15,'actual sponge scrub path varies');
  assert.ok(span(samples.map(x=>x.wrist),'x')>25,'actual wrist motion');assert.ok(span(samples.map(x=>x.elbow),'x')>5,'actual elbow motion');
  for(const k of ['torso','plate','shoulder'])for(const axis of ['x','y'])assert.ok(span(samples.map(x=>x[k]),axis)<.01,'fixed '+k+' '+axis);
  const motion=Math.max(...frames.map(x=>diff(x.arm,frames[0].arm)));assert.ok(motion>1,'actual arm raster changes');
  for(const x of frames){assert.equal(diff(x.face,frames[0].face),0,'face raster fixed');assert.equal(diff(x.kitchen,frames[0].kitchen),0,'kitchen raster fixed')}
  assert.deepEqual(film.errors,[]);mkdirSync('evidence',{recursive:true});writeFileSync('evidence/motion.json',JSON.stringify({samples,maximumArmPixelDelta:motion,assetHashes:expected},null,2));console.log(JSON.stringify({samples:samples.length,maximumArmPixelDelta:motion}));
 }finally{await film.close()}
});
