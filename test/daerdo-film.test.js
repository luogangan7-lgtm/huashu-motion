// DAERDO acceptance: actual official images, complete framing, pixel-ground type and loop continuity.
// Depends on openFilm/decodePng; invoked by the GitHub-only daerdo-film workflow.
// Invariant: each deliberate live DOM defect must fail the same acceptance used for the real film.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openProject} from '../cli/lib/project.js';
import {openFilm} from '../cli/lib/capture.js';
import {decodePng} from '../cli/lib/check.js';
const lum=a=>a.map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('Daerdo film: official device ready, full bounds, readable text and exact loop',async()=>{
 const film=await openFilm(openProject('examples/daerdo-site-film').index,{shotFormat:'png'});
 const mutation=process.env.DAERDO_FILM_MUTATION;let minimum=Infinity;
 try{
  for(const t of [0,.75,3.75,6.75,10,11.5]){
   await film.seek(t);
   if(mutation==='missing-image')await film.evaluate("document.querySelector('#product').src='assets/absent.png'");
   if(mutation==='overflow')await film.evaluate("document.querySelector('#product').style.left='1900px'");
   if(mutation==='contrast')await film.evaluate("document.querySelector('#model').style.color='#ffffff'");
   const state=await film.evaluate(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};return{images:[...document.images].map(e=>({id:e.id,ready:e.complete&&e.naturalWidth>0,...box(e)})),text:[...document.querySelectorAll('h1,h2,.small-model')].filter(e=>Number(getComputedStyle(e).opacity)>.95).map(e=>({id:e.id,text:e.textContent,color:getComputedStyle(e).color.match(/[0-9.]+/g).slice(0,3).map(Number),...box(e)}))}})()`);
   for(const image of state.images){
    assert.ok(image.ready,'device image ready: '+JSON.stringify(image));
    assert.ok(image.x>=0&&image.y>=0&&image.x+image.w<=1920&&image.y+image.h<=1080,'image full bounds: '+JSON.stringify(image));
   }
   const png=decodePng(await film.shot({format:'png'}));
   for(const word of state.text){
    assert.ok(word.x>=0&&word.y>=0&&word.x+word.w<=1920&&word.y+word.h<=1080,'text bounds: '+JSON.stringify(word));
    const o=(Math.min(1079,Math.ceil(word.y+word.h+8))*1920+Math.floor(word.x+word.w/2))*4;
    const c=contrast(word.color,[...png.px.subarray(o,o+3)]);minimum=Math.min(minimum,c);
    assert.ok(c>=4.5,'text contrast: '+word.text+' '+c);
   }
  }
  await film.seek(0);const first=decodePng(await film.shot({format:'png'}));
  await film.seek(12);
  if(mutation==='loop')await film.evaluate("document.querySelector('#product').style.opacity='0'");
  const last=decodePng(await film.shot({format:'png'}));
  assert.deepEqual(last.px,first.px,'loop endpoint pixels');
  console.log(JSON.stringify({sampledTimes:6,minimumTextContrast:minimum,loopEndpoint:'pixel-exact'}));
 }finally{await film.close()}
});
