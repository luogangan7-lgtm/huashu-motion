// Owns native-video story coverage, readable output and real subject progression.
// Depends on OM capture/project/decodePng and committed source receipts; hosted film CI calls it.
// Invariants: original video at rate 1, deterministic seeks, no actor mesh/camera transforms.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {extractClip,frameAt} from '../cli/lib/frames.js';
import {createHash} from 'node:crypto';
import {openProject} from '../cli/lib/project.js';
import {openFilm} from '../cli/lib/capture.js';
import {decodePng} from '../cli/lib/check.js';
const root='examples/daerdo-minimax-story30';
const roles={wash:{start:0,roi:[.14,.60,.30,.30]},gift:{start:5.875,roi:[.30,.57,.37,.34]},response:{start:15.75,roi:[.15,.08,.30,.43]}};
const lum=a=>a.map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const hash=a=>createHash('sha256').update(a).digest('hex');
function roi(p,r){const [x,y,w,h]=r,values=[];for(let yy=Math.floor(y*p.height);yy<(y+h)*p.height;yy+=8)for(let xx=Math.floor(x*p.width);xx<(x+w)*p.width;xx+=8){const i=(yy*p.width+xx)*4;values.push((p.px[i]+p.px[i+1]+p.px[i+2])/3)}return values}
const difference=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
test('Daerdo MiniMax: real native footage, exact story windows and readable product proof',async()=>{
 for(const name of Object.keys(roles)){const m=JSON.parse(readFileSync(`${root}/assets/${name}-source.json`));assert.equal(hash(readFileSync(`${root}/assets/${name}.mp4`)),m.sha256,'pinned original source '+name);assert.equal(m.source_duration,5.875);}
 let html=readFileSync(`${root}/index.html`,'utf8');
 if(process.env.DAERDO_MINIMAX_MUTATION==='replace-gift')html=html.replace('src="assets/gift.mp4"','src="assets/wash.mp4"');
 if(process.env.DAERDO_MINIMAX_MUTATION==='hide-response')html=html.replace('id="response-video" class="footage"','id="response-video" style="opacity:0" class="footage"');
 const video=process.env.DAERDO_MINIMAX_VIDEO==='seek'?'seek':'extract';
 const film=await openFilm(openProject(root).index,{html,video,shotFormat:'png'});let minimum=Infinity;const tables=new Map();
 try{
  if(video==='extract')for(const m of (await film.media()).filter(m=>m.tag==='video'&&m.src)){const table=await extractClip(resolve(root,m.src),{from:m.mediaStart,to:m.mediaStart+m.duration*m.rate,cacheDir:resolve('evidence/frame-cache'),format:'png'});tables.set(m.id,table);await film.setFrames(m.id,table);}
  for(const t of [0,1.5,3.5,5.86,5.875,6.5,10.5,11.73,11.75,14.5,15.73,15.75,16.2,17.5,19.8,21.6,21.625,24.97,25,25.6,28,29.96]){
   await film.seek(t);
   const state=await film.evaluate(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};const visible=e=>{for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(Number(s.opacity)<.95||s.visibility==='hidden')return false}return true};return{media:[...document.querySelectorAll('video')].filter(visible).map(e=>({id:e.id,src:e.getAttribute('data-om-src')||e.getAttribute('src'),poster:e.getAttribute('poster'),ready:e.readyState>=2,time:e.currentTime,rate:e.getAttribute('data-playback-rate'),duration:e.getAttribute('data-duration'),muted:e.muted,transform:getComputedStyle(e).transform,...box(e)})),images:[...document.images].filter(visible).map(e=>({id:e.id,ready:e.complete&&e.naturalWidth>0,...box(e)})),text:[...document.querySelectorAll('h1,h2,p')].filter(visible).map(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return{text:e.textContent,color:getComputedStyle(e).color.match(/[0-9.]+/g).slice(0,3).map(Number),x:b.x,y:b.y,w:b.width,h:b.height}})}})()`);
   const scene=t<5.875?'wash':t<11.75?'gift':t<15.75?'insert':t<21.625?'response':t<25?'bridge':'end';
   if(roles[scene]){
    const v=state.media.find(x=>x.id===scene+'-video');assert.ok(v,'visible story video: '+scene+' at '+t);
    assert.equal(v.src,'assets/'+scene+'.mp4','correct original story video: '+scene);assert.equal(state.media.length,1,'exactly one active performance');
    if(video==='seek')assert.ok(v.ready,'native video decoded');assert.equal(v.rate,'1');assert.equal(v.duration,'5.875');assert.ok(v.muted);assert.equal(v.transform,'none','no synthetic camera motion on actors');
    if(video==='seek')assert.ok(Math.abs(v.time-(t-roles[scene].start))<.05,'real media seek within one source frame');
    else{const table=tables.get(v.id),i=frameAt(table.pts,t-roles[scene].start);assert.equal(v.poster,table.base+String(i+1).padStart(8,'0')+'.'+table.ext,'production extracted source frame poster');assert.ok(Math.abs(table.pts[i]-(t-roles[scene].start))<1/24+.001,'source PTS within one original frame');}
    assert.ok(v.x<=1&&v.y<=1&&v.x+v.w>=1919&&v.y+v.h>=1079,'native footage fills frame');
    assert.ok(state.text.some(x=>x.text==='AI dramatization'),'readable AI disclosure');
   }else{assert.equal(state.media.length,0,'no actor freeze under product scene');assert.ok(state.images.some(x=>x.id===(scene==='insert'?'real-product':scene==='bridge'?'bridge-product':'end-product')),'authentic official product present');}
   for(const im of state.images)assert.ok(im.ready&&im.x>=0&&im.y>=0&&im.x+im.w<=1920&&im.y+im.h<=1080,'complete decoded product bounds');
   const shot=await film.shot({format:'png'}),png=decodePng(shot);
   let sum=0;for(let y=100;y<850;y+=51)for(let x=80;x<1840;x+=61){const o=(y*1920+x)*4;sum+=png.px[o]+png.px[o+1]+png.px[o+2]}assert.ok(sum>10000,'nonempty actual scene pixels');
   if(roles[scene]){let black=0,total=0;for(let y=33;y<78;y+=2)for(let x=1520;x<1876;x+=2){const o=(y*1920+x)*4;total++;if(png.px[o]<8&&png.px[o+1]<8&&png.px[o+2]<8)black++}if(black/total>=.01){mkdirSync('evidence/diagnostics',{recursive:true});const stem=`evidence/diagnostics/${video}-${process.env.DAERDO_MINIMAX_MUTATION||'original'}-${t}`;writeFileSync(stem+'.png',shot);writeFileSync(stem+'.json',JSON.stringify({video,t,black,total,fraction:black/total,roi:[1520,33,356,45]}));}assert.ok(black/total<.01,'no encoded-style black compositor rectangle at '+t);}
   for(const word of state.text){assert.ok(word.x>=0&&word.y>=0&&word.x+word.w<=1920&&word.y+word.h<=1080,'text bounds '+word.text);const o=(Math.min(1079,Math.ceil(word.y+word.h+6))*1920+Math.floor(word.x+word.w/2))*4;const c=contrast(word.color,[...png.px.subarray(o,o+3)]);minimum=Math.min(minimum,c);assert.ok(c>=4.5,'text contrast '+word.text+' '+c)}
   for(let i=0;i<state.text.length;i++)for(let j=i+1;j<state.text.length;j++){const a=state.text[i],b=state.text[j];assert.ok(Math.min(a.x+a.w,b.x+b.w)<=Math.max(a.x,b.x)||Math.min(a.y+a.h,b.y+b.h)<=Math.max(a.y,b.y),'text overlap '+t);}
   if(t===1.5||t===17.5)assert.ok(state.text.some(x=>x.text==='Mum?'),'unified call timing');
   if(t===6.5)assert.ok(state.text.some(x=>x.text==='A little something for you.'),'gift line timing');
   if(t===19.8)assert.ok(state.text.some(x=>x.text==='I hear you, darling.'),'reply timing');
  }
  const progression=[];
  for(const[name,d]of Object.entries(roles)){
   const frames=[];for(const local of [.1,1.4,2.8,4.2,5.5]){await film.seek(d.start+local);await film.evaluate("document.querySelectorAll('.caption,#later').forEach(e=>e.style.opacity='0')");frames.push(roi(decodePng(await film.shot({format:'png'})),d.roi));}
   const deltas=frames.slice(1).map((p,i)=>difference(p,frames[i]));assert.ok(deltas.filter(x=>x>1).length>=2&&Math.max(...deltas)>2,'actual native '+name+' subject progression');progression.push({name,deltas});
  }
  await film.seek(3.5);const first=hash(await film.shot({format:'png'}));await film.seek(20.5);await film.seek(3.5);assert.equal(hash(await film.shot({format:'png'})),first,'same native frame after non-sequential seek');
  assert.equal(film.info.duration,30);assert.equal(film.errors.length,0);console.log(JSON.stringify({video,minimumTextContrast:minimum,progression,duration:film.info.duration}));
 }finally{await film.close()}
});
