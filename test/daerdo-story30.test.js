// Story acceptance owns photograph/time/visible-output contracts, not renderer internals.
// Depends on capture/project/decodePng and pinned assets; called only by hosted CI.
// Invariant: DOM replacement/hiding mutations reach these same semantic assertions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openProject} from '../cli/lib/project.js';
import {openFilm} from '../cli/lib/capture.js';
import {decodePng} from '../cli/lib/check.js';
const root='examples/daerdo-story30-film';
const expected={wash:'8e1fb322fff00a122097097bffa8396c1f6ec747ec8ba6dcc24b65ac2a13e9df',gift:'ae2723e0346562dbffe7d3bc1c7c7076f6628fec5b75fb592be4e55f0cacdea6',response:'802f2fe891aacfdd9c63fa8b36ca6046ad6741c0af299da2f0ec77359b9ee411', 'response-blink':'6040c003899c95a4aaffa1697805e6c3a76e02c74fda818e0e32923ab3c58be5'};
const lum=a=>a.map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('Daerdo story30: three distinct visible story photographs and readable product proof',async()=>{
 for(const[name,sha]of Object.entries(expected))assert.equal(createHash('sha256').update(readFileSync(`${root}/assets/${name}.png`)).digest('hex'),sha,'pinned story photograph '+name);
 assert.equal(new Set(Object.values(expected)).size,4,'three story photographs plus separate eyelid reference');
 const film=await openFilm(openProject(root).index,{shotFormat:'png'});let minimum=Infinity;const signatures=[];
 try{
  for(const t of [0,1.5,3.5,6.9,7,8.5,10.8,12.9,13,14.5,16.9,17,18,19.5,20.72,21.5,24.9,25,25.1,25.6,28,29.96]){
   await film.seek(t);
   if(process.env.DAERDO_STORY30_MUTATION==='replace-gift')await film.evaluate(`storyMesh.draw(${t},{replaceGift:true})`);
   if(process.env.DAERDO_STORY30_MUTATION==='hide-response')await film.evaluate("document.querySelector('#response-photo').style.opacity='0'");
   const state=await film.evaluate(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};const visible=e=>{for(let p=e;p;p=p.parentElement)if(Number(getComputedStyle(p).opacity)<.95)return false;return true};return{images:[...document.querySelectorAll('img,canvas.photo')].filter(visible).map(e=>({id:e.id,src:e.tagName==='CANVAS'?'assets/'+(storyMesh.snapshot().options.replaceGift&&e.id==='gift-photo'?'wash':e.id.split('-')[0])+'.png':e.getAttribute('src'),ready:e.tagName==='CANVAS'?storyMesh.snapshot().ready:e.complete&&e.naturalWidth>0,...box(e)})),text:[...document.querySelectorAll('h1,h2,p')].filter(visible).map(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return{text:e.textContent,color:getComputedStyle(e).color.match(/[0-9.]+/g).slice(0,3).map(Number),x:b.x,y:b.y,w:b.width,h:b.height}})}})()`);
   const scene=t<7?'wash':t<13?'gift':t<17?'insert':t<25?'response':'end';
   if(expected[scene]){
    const picture=state.images.find(x=>x.id===scene+'-photo');assert.ok(picture,'visible story photograph: '+scene+' at '+t);
    assert.equal(picture.src,'assets/'+scene+'.png','correct story photograph: '+scene+' at '+t);
    assert.ok(picture.x<=1&&picture.y<=1&&picture.x+picture.w>=1919&&picture.y+picture.h>=1079,'story photograph fills frame: '+scene);
    assert.ok(state.text.some(x=>x.text.includes('AI dramatization')),'readable dramatization disclosure');
   }else assert.ok(state.images.some(x=>x.id===(scene==='insert'?'real-product':'end-product')),'authentic product present');
   for(const im of state.images){assert.ok(im.ready,'visible image decoded: '+JSON.stringify(im));if(!im.id.endsWith('-photo'))assert.ok(im.x>=0&&im.y>=0&&im.x+im.w<=1920&&im.y+im.h<=1080,'complete product bounds: '+JSON.stringify(im));}
   const png=decodePng(await film.shot({format:'png'}));
   if(expected[scene]){let black=0,total=0;for(let y=33;y<78;y+=2)for(let x=1520;x<1876;x+=2){const o=(y*1920+x)*4;total++;if(png.px[o]<8&&png.px[o+1]<8&&png.px[o+2]<8)black++}assert.ok(black/total<.01,'no mirrored DOM-overlay rectangle at '+t)}
   if([3.5,10.8,21.5].includes(t)){let sum=0,sum2=0;for(let y=100;y<850;y+=31)for(let x=80;x<1840;x+=43){const o=(y*1920+x)*4;const v=png.px[o]+png.px[o+1]+png.px[o+2];sum+=v;sum2+=v*v;}signatures.push(sum);assert.ok(sum2>sum*100,'nonempty actual story pixels');}
   for(const word of state.text){
    assert.ok(word.x>=0&&word.y>=0&&word.x+word.w<=1920&&word.y+word.h<=1080,'text bounds: '+JSON.stringify(word));
    const o=(Math.min(1079,Math.ceil(word.y+word.h+6))*1920+Math.floor(word.x+word.w/2))*4;
    const c=contrast(word.color,[...png.px.subarray(o,o+3)]);minimum=Math.min(minimum,c);assert.ok(c>=4.5,'text contrast '+word.text+' '+c);
   }
   for(let i=0;i<state.text.length;i++)for(let j=i+1;j<state.text.length;j++){const a=state.text[i],b=state.text[j];assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y),'text overlap at '+t);}
   if(t>=25){const d=state.images.find(x=>x.id==='end-product');for(const a of [...state.text,...state.images.filter(x=>x.id==='wordmark')])assert.ok(Math.min(a.x+a.w,d.x+d.w)<=Math.max(a.x,d.x)||Math.min(a.y+a.h,d.y+d.h)<=Math.max(a.y,d.y),'product copy overlap at '+t);}
   if(t===1.5||t===19.5)assert.ok(state.text.some(x=>x.text==='Mom?'),'call timing');
   if(t===8.5)assert.ok(state.text.some(x=>x.text==='A little something for you.'),'gift dialogue timing');
   if(t===21.5)assert.ok(state.text.some(x=>x.text==='I hear you, darling.'),'response timing');
  }
  assert.equal(new Set(signatures).size,3,'three distinct rendered story pictures');assert.equal(film.info.duration,30);
  console.log(JSON.stringify({sampledTimes:21,minimumTextContrast:minimum,storySignatures:signatures,duration:film.info.duration}));
 }finally{await film.close()}
});
