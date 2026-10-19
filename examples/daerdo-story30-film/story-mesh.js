// Owns continuous local person motion and eyelid-only compositing for the three story photos.
// Depends on native WebGL, OM.ready/clock/region and hash-pinned photos; called by index.html.
// Invariants: a connected UV surface, rigid central contact patches, fixed external references,
// deterministic source time. WebGL stays off DOM; visible 2D blits safely accept HTML captions.
(() => {
 const W=1672,H=941,NX=209,NY=118,SW=1920,SH=1080;
 const surface=document.createElement('canvas');surface.width=SW;surface.height=SH;
 const gl=surface.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
 if(!gl)throw new Error('Native WebGL unavailable');
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const p=gl.createProgram();
 gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 uv;varying vec2 tex;void main(){tex=uv;gl_Position=vec4(p.x/836.0-1.0,1.0-p.y/470.5,0.0,1.0);}'));
 gl.attachShader(p,shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 tex;uniform sampler2D photo;uniform sampler2D closed;uniform float blink;
 float eye(vec2 at,vec2 c,vec2 r){float q=length((at-c)/r);return 1.0-smoothstep(0.62,1.0,q);}
 void main(){vec2 xy=tex*vec2(1672.0,941.0);float m=max(eye(xy,vec2(526.0,312.0),vec2(43.0,27.0)),eye(xy,vec2(638.5,263.0),vec2(35.0,25.0)));vec3 a=texture2D(photo,tex).rgb;vec3 b=texture2D(closed,tex).rgb;gl_FragColor=vec4(mix(a,b,m*blink),1.0);}`));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const base=[],indices=[];for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++)base.push(x*W/NX,y*H/NY);
 for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const i=y*(NX+1)+x;indices.push(i,i+1,i+NX+1,i+1,i+NX+2,i+NX+1)}
 const vertices=new Float32Array(base),uv=new Float32Array(base.map((v,i)=>v/(i%2?H:W)));
 const attribute=(name,data,usage)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage);const a=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);return b};
 const positionBuffer=attribute('p',vertices,gl.DYNAMIC_DRAW);attribute('uv',uv,gl.STATIC_DRAW);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const textures={},images={},targets={};let ready=false,lastTime=0,lastScene='wash',lastOptions={};
 const clamp=v=>Math.max(0,Math.min(1,v));const smooth=v=>(v=clamp(v))*v*(3-2*v);
 function patch(x,y,cx,cy,rx,ry){return 1-smooth((Math.hypot((x-cx)/rx,(y-cy)/ry)-.45)/.55)}
 function rectangle(x,y,x0,y0,x1,y1,fade){const d=Math.max(x0-x,x-x1,y0-y,y-y1,0);return 1-smooth(d/fade)}
 function field(scene,x,y,t,options={}){
  if(options.freezeMotion)t=scene==='wash'?.15:scene==='gift'?7:17;
  if(scene==='wash'){
   const local=((t-.15)%2.7+2.7)%2.7+.15,phase=4*Math.PI*(local-.15)/2.7;
   const hand=Math.max(patch(x,y,305,636,67,48),patch(x,y,285,673,72,46),.72*patch(x,y,378,601,68,33));
   const head=patch(x,y,502,211,164,181),nod=.0015*Math.sin(2*Math.PI*t/3);
   return{x:x+hand*8*Math.sin(phase)-head*(y-330)*nod,y:y+hand*2*Math.sin(2*phase)+head*(x-555)*nod+patch(x,y,585,456,118,130)*.65*Math.sin(2*Math.PI*t/3)};
  }
  if(scene==='gift'){
   const a=smooth((t-7)/3.6),weight=rectangle(x,y,600,610,1110,770,90);
   return{x:x-weight*10*a,y:y-weight*2*a};
  }
  const local=clamp((t-17)/8),angle=.0105*Math.sin(2*Math.PI*local),w=rectangle(x,y,295,40,790,535,105),dx=x-590,dy=y-570;
  return{x:x+w*(Math.cos(angle)*dx-Math.sin(angle)*dy-dx),y:y+w*(Math.sin(angle)*dx+Math.cos(angle)*dy-dy)};
 }
 function blinkAt(t){const a=Math.abs(t-20.72);return a<.07?1:a<.15?1-smooth((a-.07)/.08):0}
 function sceneAt(t){return t<7?'wash':t<13?'gift':t<17?null:t<25?'response':null}
 function draw(t,options={}){
  lastTime=t;lastOptions=options;const scene=sceneAt(t);if(!ready||!scene)return;lastScene=scene;
  for(let i=0;i<base.length;i+=2){const v=field(scene,base[i],base[i+1],t,options);vertices[i]=v.x;vertices[i+1]=v.y}
  gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[options.replaceGift&&scene==='gift'?'wash':scene]);gl.uniform1i(gl.getUniformLocation(p,'photo'),0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures.blink);gl.uniform1i(gl.getUniformLocation(p,'closed'),1);
  gl.uniform1f(gl.getUniformLocation(p,'blink'),scene==='response'&&!options.freezeBlink?blinkAt(t):0);
  gl.viewport(0,0,SW,SH);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);gl.finish();
  targets[scene].drawImage(surface,0,0);
 }
 window.storyMesh={draw,field,sceneAt,blinkAt,snapshot(){let min=Infinity,max=0;for(let i=0;i<indices.length;i+=3){const[a,b,c]=indices.slice(i,i+3).map(v=>v*2);const ratio=((vertices[b]-vertices[a])*(vertices[c+1]-vertices[a+1])-(vertices[b+1]-vertices[a+1])*(vertices[c]-vertices[a]))/(W/NX*H/NY);min=Math.min(min,ratio);max=Math.max(max,ratio)}return{ready,t:lastTime,scene:lastScene,minAreaRatio:min,maxAreaRatio:max,blink:blinkAt(lastTime),image:images[lastScene]?.src,options:lastOptions}}};
 document.addEventListener('DOMContentLoaded',()=>{
  for(const scene of ['wash','gift','response'])targets[scene]=document.querySelector('#'+scene+'-photo').getContext('2d',{alpha:false,willReadFrequently:true});
  const assets={wash:'wash.png',gift:'gift.png',response:'response.png',blink:'response-blink.png'};
  OM.ready(Promise.all(Object.entries(assets).map(([name,file])=>new Promise((resolve,reject)=>{const im=new Image();images[name]=im;im.onload=()=>{const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);textures[name]=texture;resolve()};im.onerror=()=>reject(Error('Story asset failed '+file));im.src='assets/'+file}))).then(()=>{ready=true;for(const t of [0,7,17])draw(t);draw(lastTime=0)}));
 });
 const screen=b=>b.map((v,i)=>v*(i%2?SH/H:SW/W));
 OM.region('wash-sponge',t=>t<7?screen([245,605,130,115]):null,'Actual photographed hand and sponge');
 OM.region('gift-contact',t=>t>=7&&t<13?screen([600-10*smooth((t-7)/3.6),610,510,160]):null,'Both hands and closed gift move together');
 OM.region('mother-answer',t=>t>=17&&t<25?screen([295,40,495,495]):null,'Whole head gentle inclination, no mouth fabrication');
})();
