# DAERDO · G25BT — website film
2026-10-19. Direction A: current official brand, complete catalogue photography, restrained type.
The user requested a video for the hearing-aid website; an established brand already exists. A is selected directly. B (typographic explainer) and C (lifestyle montage) would replace the product with generic material, so are not developed.

## Source and palette
Official product: https://daerdo.com/products/g25bt-bluetooth-bte
Only claims: DAERDO, G25BT, Bluetooth BTE, Rechargeable.
Official cutout and wordmark are fetched with fixed SHA256 in CI; no generated device, invented charging case, medical effect, certification or performance claim.
Palette source: https://daerdo.com/_next/static/chunks/1veuqwp3r-1l1.css (2026-10-19).
Paper #fff; warm paper #f8fafc; ink #062b4f; soft #16466e; secondary #526576; inverse #fff/#dce7f0; line #d6e0e8. Inter font comes from official CSS's woff2 asset.

## Rhythm and continuity
12 s / 1920×1080 / 30 fps. Continuous route; four 3-second phrases, 80 BPM.
0–3 hook: full navy/beige real devices occupy the right half from frame one; G25BT left. Gentle product arrival, energy 3→4.
3–6 turn: deep brand-blue left field arrives, Bluetooth BTE reveals on the landing. Same complete devices carry through, energy 6.
6–9 hero: field opens back to light, Rechargeable, slight optical push of the intact pair (no fake charging animation), energy 5.
9–12 resolve: wordmark breathes forward while product stays; return to the exact opening arrangement by 11.3 s, hold to 12 s. Energy 3→2.
Continuity chain: same photo object + fixed right product axis + shared baseline + uninterrupted typography/field movement. No cutout warping, control cropping, fake perspective or product reconstruction.
Four key frames: 0.75 hook; 3.75 turn/densest; 6.75 hero/hardest shot; 10.0 brand resolve. Export them with the actual capture engine before render and upload a draft artifact.
Muted-first website loop; preview contains a sparse original synth motif and three quiet landing cues, no narration. No external music or sample download.

## Acceptance
CI only: fixed official asset SHA/dimensions/transparency/alpha bounds; every complete image stays within frame; actual text bounds and pixel-ground contrast ≥4.5; frame 0 equals frame 12. Inject missing-image/overflow/low-contrast/loop defects and require semantic RED for each, then current GREEN. Existing 29 smoke tests remain. om check zero findings, om still keyframes, real H264/AAC MP4, om qa --loop seamless, encoded probe/negative control/full decode; actual frames/contact sheet, soundtrack spectrogram and loudness receipts.
No deployment. Review actual frames and normal-speed video independently before acceptance. Source remains editable HTML/GSAP.
