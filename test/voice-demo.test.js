// Voice-demo readability gate. Uses the real bundled composition, capture engine and PNG pixels.
// Called only by CI node:test; every word must be opaque and >=4.5:1 against sampled caption background.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openProject } from '../cli/lib/project.js';
import { openFilm } from '../cli/lib/capture.js';
import { decodePng } from '../cli/lib/check.js';
const lum = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i], 0);
const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('voice-demo: every spoken word stays opaque and readable; settled title fits the frame', async () => {
  const film = await openFilm(openProject('examples/voice-demo').index, { shotFormat: 'png' });
  try {
    const times = await film.evaluate("OM.words().map(w => (w.start+w.end)/2)");
    const seen = new Set(); let minimum = Infinity;
    for (const t of times) {
      await film.seek(t);
      const words = await film.evaluate(`(() => [...document.querySelectorAll('.captions .line')].filter(el => Number(getComputedStyle(el).opacity) > .95).flatMap(el => [...el.querySelectorAll('.w')].map(w => { const s=getComputedStyle(w), r=w.getBoundingClientRect(); return { text:w.textContent, opacity:Number(s.opacity), color:s.color.match(/[0-9.]+/g).slice(0,3).map(Number), x:r.x,y:r.y,w:r.width,h:r.height }; })))()`);
      const image = decodePng(await film.shot({ format:'png' }));
      for (const word of words) {
        assert.equal(word.opacity, 1, `${t}: ${word.text} must be opaque`);
        assert.ok(word.x >= 0 && word.y >= 0 && word.x+word.w <= image.width && word.y+word.h <= image.height, JSON.stringify(word));
        // Sample the actual ground immediately below the caption, outside the glyph ink.
        for (const x of [word.x, word.x+word.w/2, word.x+word.w-1]) {
          const o=(Math.min(image.height-1,Math.ceil(word.y+word.h+5))*image.width+Math.max(0,Math.floor(x)))*4;
          const contrast=ratio(word.color,[...image.px.subarray(o,o+3)]); minimum=Math.min(minimum,contrast);
          assert.ok(contrast>=4.5, `${t}: ${word.text} contrast ${contrast}`);
        }
        seen.add(word.text);
      }
    }
    const expected = await film.evaluate('OM.words().map(w=>w.word)');
    for (const word of expected) assert.ok(seen.has(word), `word checked: ${word}`);
    await film.seek(2.25);
    const bounds = await film.evaluate(`(() => {const r=document.createRange();r.selectNodeContents(document.querySelector('.title'));const b=r.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,text:document.querySelector('.title').textContent}})()`);
    assert.equal(bounds.text, '一句话出片');
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.right<=1920 && bounds.bottom<=1080, JSON.stringify(bounds));
    console.log(JSON.stringify({ wordsChecked:seen.size, minimumCaptionContrast:minimum, settledTitle:bounds }));
  } finally { await film.close(); }
});
