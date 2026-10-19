# Washing movement prototype — 3 seconds

Authority: human “人物没办法动起来？只是这样的？”; movement gate/brief 986f02a3-b699-4a6b-ad39-bbb2fe8f79df. Formal language: skills/huashu-motion/references/library/languages/character.md @8860d13080edab0d1bd64f843654d28e9fc4fe82. This is a photographic cutout rig experiment, not a promise of natural live-action motion.

1920×1080, 30fps, 3 seconds, 90 frames. One fixed medium shot: the same silver-haired mother in navy cardigan and terracotta apron, facing the sink, holding a complete white plate with her left arm. Her right upper arm and forearm articulate at shoulder and elbow; the yellow sponge follows a visible closed scrubbing arc on the plate. The kitchen, torso and left plate support remain fixed. No camera movement, whole-image shaking, face warping or product fitting. The prototype may be silent; it tests contact and joints rather than score or dialogue. Readable small label: “AI photographic cutout animation · Motion prototype”.

| Time | Gesture |
|---|---|
| 0–0.3 | Resting contact pose. Sponge already on plate, no sudden jump. |
| 0.3–1.4 | First complete scrub cycle. Upper arm gently changes angle; forearm pivots at the shared elbow. Sponge travels inside the plate surface. |
| 1.4–2.6 | Second cycle with the same connected chain, no rigid-arm sliding. |
| 2.6–3 | Ease to resting contact. |

Use genuine alpha art layers, not generated body geometry. Place arm roots underneath the torso sleeve opening and forearm root underneath the upper-arm overlap. Calibrate from the actual atlas: shoulder anchor, both sides of shared elbow, sponge center, complete plate ellipse and image transparency. If these cannot connect without a visible anatomical break, report asset failure rather than force assembly. A matched photographic clean kitchen is required; never cover an existing photograph's old arms with new moving arms or mix the illustrated kitchen into this test.

Only after the atlas and clean plate arrive: export five actual GitHub stills at 0.15/0.65/1.25/1.85/2.65s plus an actual 3s MP4. Review complete shoulder/elbow/wrist/plate/sponging region, not just a crop proving something changed. Visual acceptance: joint continuity, plausible hand orientation, sponge contact throughout, no double arm, hard splice, detached elbow, plate penetration or conspicuous cutout distortion. A technically green gate does not approve appearance; the actual prototype must be independently viewed before the 30-second film expands.

GitHub-only acceptance: hash-pinned source art; fixed torso/kitchen references; shoulder/elbow/wrist positions measured relative to the torso and plate; sponge-contact path inside the visible plate surface; actual arm pixels change while reference pixels remain fixed. Freeze the actual arm DOM transforms, then freeze the actual forearm/tool in world space: the unchanged acceptance gate must fail before restored GREEN. These are actual rendered mutations, not changes to expected values. Verify H264 1920×1080 yuv420p, 30fps, exactly 90 frames/3s and complete error-free decode. No local project execution. No merge or expansion based on technical checks alone.
