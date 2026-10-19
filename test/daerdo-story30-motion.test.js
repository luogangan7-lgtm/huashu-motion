// Owns actual visible local-person-motion acceptance, independent of camera movement.
// Depends on existing capture/PNG decode. Called only by GitHub story workflow.
// Frozen fields/eyelids invoke the real draw path with unchanged pixel assertions.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {openProject} from '../cli/lib/project.js';import {openFilm} from '../cli/lib/capture.js';import {decodePng} from '../cli/lib/check.js';
const box=([x,y,w,h])=>[Math.round(x*1920/1672),Math.round(y*1080/941),Math.round(w*1920/1672),Math.round(h*1080/941)];
function roi(p,b){const[x,y,w,h]=box(b),a=[];for(let j=y;j<y+h;j+=2)for(let i=x;i<x+w;i+=2){const o=(j*p.width+i)*4;a.push(...p.px.subarray(o,o+3))}return a}
const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
test('Daerdo story30: actual character pixels move against fixed scene references',async()=>{
 const film=await openFilm(openProject('examples/daerdo-story30-film').index,{shotFormat:'png'}),receipt={};
 try{
  // Isolate photographed character pixels from timed captions; the separate story gate and
  // final encoded compositor gate keep every real caption/disclosure visible.
  await film.evaluate("document.querySelectorAll('p').forEach(e=>e.style.visibility='hidden')");
  for(const spec of [
   {name:'wash',times:[.15,.45,.65,1.25,1.85,2.45],moving:[255,610,105,94],fixed:[[245,742,45,8],[900,110,150,240],[435,660,90,55],[650,770,105,100],[188,530,18,180],[1240,80,190,440]],threshold:2},
   {name:'gift',times:[7,8,9,10.6,12.5],moving:[795,620,180,120],fixed:[[1030,380,180,120],[70,100,120,200],[430,130,180,220]],threshold:2},
   {name:'response',times:[17,18,19,21,23,24.8],moving:[420,130,240,250],fixed:[[1180,250,220,400],[30,100,150,200]],threshold:.5}
  ]){
   const frames=[],areas=[];
   for(const t of spec.times){
    await film.seek(t);
    const frozen=process.env.DAERDO_STORY30_MOTION_MUTATION==='freeze-'+spec.name;
    await film.evaluate(`(()=>{document.querySelector('#${spec.name}-photo').style.transform='none';storyMesh.draw(${t},{freezeMotion:${frozen},freezeBlink:true})})()`);
    const v=await film.evaluate('storyMesh.snapshot()');assert.ok(v.ready);assert.ok(v.minAreaRatio>.65&&v.maxAreaRatio<1.35,'limited nonfolding '+spec.name+' texture');areas.push([v.minAreaRatio,v.maxAreaRatio]);
    const p=decodePng(await film.shot({format:'png'}));frames.push({moving:roi(p,spec.moving),fixed:spec.fixed.map(b=>roi(p,b))});
   }
   const delta=Math.max(...frames.map(f=>diff(f.moving,frames[0].moving)));
   assert.ok(delta>spec.threshold,'actual local '+spec.name+' pixel motion');
   for(const f of frames)for(let i=0;i<f.fixed.length;i++)assert.equal(diff(f.fixed[i],frames[0].fixed[i]),0,'fixed '+spec.name+' reference '+i);
   receipt[spec.name]={maximumPixelDelta:delta,areaRatios:areas,times:spec.times};
  }
  const eyes=[];
  for(const t of [20.45,20.72,20.98]){
   await film.seek(t);const frozen=process.env.DAERDO_STORY30_MOTION_MUTATION==='freeze-blink';
   await film.evaluate(`(()=>{document.querySelector('#response-photo').style.transform='none';storyMesh.draw(${t},{freezeMotion:true,freezeBlink:${frozen}})})()`);
   const p=decodePng(await film.shot({format:'png'}));eyes.push({lid:roi(p,[480,235,195,108]),nose:roi(p,[565,355,60,35]),mouth:roi(p,[555,395,115,40]),son:roi(p,[1180,250,220,400])});
  }
  const blinkDelta=diff(eyes[1].lid,eyes[0].lid);assert.ok(blinkDelta>1,'actual eyelid pixel blink');
  for(const f of eyes)for(const key of ['nose','mouth','son'])assert.equal(diff(f[key],eyes[0][key]),0,'blink preserves '+key);
  assert.equal(diff(eyes[2].lid,eyes[0].lid),0,'eyelids return to source open texture');receipt.blink={pixelDelta:blinkDelta,times:[20.45,20.72,20.98]};
  await film.seek(10.6);const a=await film.shot({format:'png'});await film.seek(21);await film.seek(10.6);assert.equal(Buffer.compare(a,await film.shot({format:'png'})),0,'whole film deterministic return seek');
  assert.deepEqual(film.errors,[]);mkdirSync('evidence',{recursive:true});writeFileSync('evidence/story-motion.json',JSON.stringify(receipt,null,2));
 }finally{await film.close()}
});
