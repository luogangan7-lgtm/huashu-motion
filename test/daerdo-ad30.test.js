// Advertisement acceptance: real full product, actual text geometry and background pixels.
// Depends on capture/project/decodePng; called by ad30 GitHub CI, never the old loop gate.
// Invariant: negative controls reach the same semantic assertions as the final composition.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openProject} from '../cli/lib/project.js';
import {openFilm} from '../cli/lib/capture.js';
import {decodePng} from '../cli/lib/check.js';
const lum=a=>a.map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('Daerdo ad30: authentic product and readable actual frames',async()=>{
 const film=await openFilm(openProject('examples/daerdo-ad30-film').index,{shotFormat:'png'});
 const mutation=process.env.DAERDO_AD30_MUTATION;let minimum=Infinity;
 try{
  for(const t of [0,.2,.75,2.9,3,3.5,5,7,7.7,9,11.5,12,14,16.9,17.5,19.2,19.7,20.2,21.5,22.6,24.5,25.5,25.6,25.8,26,26.3,29.5]){
   await film.seek(t);
   if(mutation==='missing-image')await film.evaluate("document.querySelector('#product').src='assets/absent.png'");
   if(mutation==='overflow')await film.evaluate("document.querySelector('#product').style.left='1900px'");
   if(mutation==='cta-overlap'&&t>=25.5)await film.evaluate("gsap.set('#product',{x:-740,y:0,scale:.94})");
   if(mutation==='contrast')await film.evaluate("document.querySelector('#hook h1').style.color='#ffffff'");
   const state=await film.evaluate(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};const visible=e=>{for(let p=e;p;p=p.parentElement)if(Number(getComputedStyle(p).opacity)<.95)return false;return true};return{images:[...document.images].filter(visible).map(e=>({id:e.id,ready:e.complete&&e.naturalWidth>0,...box(e)})),text:[...document.querySelectorAll('h1,h2,p')].filter(visible).map(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return{id:e.dataset.omId,text:e.textContent,color:getComputedStyle(e).color.match(/[0-9.]+/g).slice(0,3).map(Number),x:b.x,y:b.y,w:b.width,h:b.height}})}})()`);
   assert.ok(state.images.some(x=>x.id==='product'||x.id==='single'),'complete product present');
   for(const image of state.images){assert.ok(image.ready,'device image ready: '+JSON.stringify(image));assert.ok(image.x>=0&&image.y>=0&&image.x+image.w<=1920&&image.y+image.h<=1080,'image full bounds: '+JSON.stringify(image));}
   // At the CTA cut and early motion, authentic device pixels must clear all brand/copy.
   if(t>=25.5){
    const device=state.images.find(x=>x.id==='product');
    for(const target of [...state.text,...state.images.filter(x=>x.id==='brand')])assert.ok(Math.min(device.x+device.w,target.x+target.w)<=Math.max(device.x,target.x)||Math.min(device.y+device.h,target.y+target.h)<=Math.max(device.y,target.y),'product copy overlap: '+JSON.stringify({t,device,target}));
   }
   const png=decodePng(await film.shot({format:'png'}));
   for(const word of state.text){
    assert.ok(word.x>=0&&word.y>=0&&word.x+word.w<=1920&&word.y+word.h<=1080,'text bounds: '+JSON.stringify(word));
    const o=(Math.min(1079,Math.ceil(word.y+word.h+8))*1920+Math.floor(word.x+word.w/2))*4;
    const c=contrast(word.color,[...png.px.subarray(o,o+3)]);minimum=Math.min(minimum,c);assert.ok(c>=4.5,'text contrast: '+word.text+' '+c);
   }
   for(let i=0;i<state.text.length;i++)for(let j=i+1;j<state.text.length;j++){const a=state.text[i],b=state.text[j];assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y),'text overlap: '+JSON.stringify({t,a,b}));}
  }
  console.log(JSON.stringify({sampledTimes:27,minimumTextContrast:minimum,duration:film.info.duration}));assert.equal(film.info.duration,30);
 }finally{await film.close()}
});
