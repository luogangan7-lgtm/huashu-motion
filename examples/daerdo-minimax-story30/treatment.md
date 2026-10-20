# DAERDO — A familiar voice

Status: parent-approved edit plan for the new MiniMax footage. Each of wash, gift and response has independently passed GitHub source hash/probe/full decode: 1918×1080, 24 fps, 141 frames, 5.875 seconds, timebase 1/12288, no audio. Gift and response discovery run `39366420795@289d939a` supplied their actual metadata; full-film acceptance remains pending.

## Authority and delivery

Latest human direction: use the MiniMax subscription together with huashu-motion. Parent charter: `4608a679-2aa7-4e56-ae74-6d9704973514`. Media timing: `runtime/om-engine.js@8860d13080edab0d1bd64f843654d28e9fc4fe82`, native video `data-start`, `data-duration`, `data-media-start` and rate 1. No engine changes.

Deliver one 1920×1080, 30 fps, exactly 900-frame / 30-second H.264 + AAC MP4. Build, tests, source ffprobe, extraction and full decode run exclusively on GitHub. Keep the historical photo/mesh film intact; the new module uses native video and contains no mesh implementation or CSS camera motion on the actors.

## Story and rhythm

The hook is a recognisable everyday action: an older mother washes a white plate while her adult son stands behind her with a closed gift. The action plays in its original medium-wide framing, which keeps the hand, sponge, plate, mother and son readable. A second shot makes the closed-box gift exchange explicit. A separate official product insert identifies the hearing aid. After a brief editorial ellipsis, the mother looks up and responds to a renewed call. The last movement gives the emotion room to settle, then resolves in one brand CTA.

The film uses three distinct generated performances, not still-image pans. Cut on complete gestures where the available footage supports them; never invent walking, wearing, product-to-skin contact or a continuous installation step. No miraculous sound restoration, cure claim, colour-change metaphor or supernatural effect.

## Time map — bound to actual clips

Let `W`, `G`, `R` be the verified usable source durations. Play each source once at rate 1, without loops, reverse playback, tpad, last-frame holds or slow motion. Wash `W=5.875s` is already verified (141 frames at 24 fps); gift and response will receive their own independent metadata. Their API request of 6 seconds is not a duration authority.

| Film window | Picture / action | Editable on-screen text | Sound intention |
|---|---|---|---|
| `0 → W` | Original wash footage. Actual sponge and plate movement; son remains visible. No added zoom. | “Mum?” around 1.4–2.8s; then clean picture. | Soft score opening; restrained water / dish foley if supported by the existing score/SFX tooling. |
| `W → W+G` | Original gift footage. Mother, son, hands and the same closed white/navy box remain in frame. | “A little something for you.” after the cut, held about 2.5s clear of faces and hands. | Gentle score lift; one small gift-placement accent only if the gesture matches. |
| `W+G → W+G+4` | Official G25BT isolated product on clean white/navy. A restrained product reveal and short feature labels provide a clear proof beat. | “G25BT hearing aids” / “Bluetooth · Rechargeable”. | The same score carries the transition; no fake hearing-aid operation sound. |
| `W+G+4 → W+G+4+R` | Original response footage. Actual look-up, nod or smile, in the framing delivered by the model. No mesh, replacement eyelids or added mouth animation. | Brief “A little later…”; renewed “Mum?”; then “I hear you, darling.” timed to the actual expression, with no claim of lip sync. | Score opens warmly. Dialogue is subtitle-only; all generated video is explicitly muted. |
| `W+G+4+R → 25` | Official product / quiet brand bridge, with a deliberate detail-to-pair reveal. This absorbs real source-duration differences without freezing a person. | “Closer to everyday moments.” No additional CTA. | Musical resolution and a small breathing space before the endcard. |
| `25 → 30` | White/navy endcard: official wordmark, real G25BT pair, one legible CTA. | “Hear what matters.” / “Explore G25BT” / `daerdo.com` | Score resolves, clean tail through frame 899. |

All three independently probed sources are 5.875s, so the implementation boundaries are 0 / 5.875 / 11.75 / 15.75 / 21.625 / 25 / 30. Father viewed the gift/response contact sheets and representative actual full frames with no sampled P1, and retained the original medium-wide gift framing. If a later review finds a shorter usable performance, shorten its source window and give the freed time to the informative product bridge. Report the specific defect; do not conceal it with actor-frame holds.

## Continuity, typography and disclosure

Keep the same silver-haired mother in navy cardigan / terracotta apron, olive-shirted adult son, warm blue kitchen and closed white gift with navy ribbon. Use cover-fit without stretching; the wash source is genuinely 1918×1080. Product imagery is always the pinned official G25BT PNG, never an AI-rendered aid in a hand or ear.

Reuse the existing Inter typography, navy/white product system, official wordmark, score and modular subtitle/endcard design. Narrative text stays out of faces, plate, sponge and box contact areas: the wash call and gift line use the son's shirt/negative space above the hands; the response subtitle uses the lower frame below the faces. Calls consistently use British English “Mum?”. One readable `AI dramatization` label remains visible during generated footage, with `Individual experiences vary.` on the product/end section. No repeated paragraph overlays. Subtitle safe zones and actual rendered disclosure are checked in the output, not inferred from CSS.

## Minimal implementation and acceptance

Reuse the existing film workflow, official-asset fetch/hash checks, GSAP scene/caption timeline, score, 900-frame/probe/decode/audio checks and raw warning receipts. New native video elements are muted, playsinline and carry explicit start/duration/media-start at rate 1. Do not introduce a new synchronization layer or rendering dependency.

Extend the current small asset QA only enough to inspect each original source independently and sample its actual action ROI: wash hand/sponge; gift hands/closed box; response mother face/head. Each gets its own hash, bytes, task ID, width/height, exact duration, frame count, fps and timebase. Source-motion negative controls really freeze that source MP4, then run the same pixel assertion and require RED; the original must return GREEN. Keep the existing real bad-duration and bad-frame-count controls. Pixel motion proves non-static footage, not natural acting.

The full render must retain real source-frame progression, readable subtitles/disclosure, no blank transitions or old-shot leakage, and no encoded black compositor rectangles. Export actual early keyframes for all three actor shots and the product/endcard before the full render completes. Preserve check/QA warnings for review. Complete E3 only with current-SHA test/render receipts, actual 900-frame MP4, full decode, non-silent unclipped score, sampled encoded frames and source/output hashes. One final independent review follows E3. Normal-speed viewing and listening remain `NOT_RUN` unless actually performed.
