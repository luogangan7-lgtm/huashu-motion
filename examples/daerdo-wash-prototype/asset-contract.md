# Photographic rig asset contract

Status: awaiting original assets. No image generation or render has started in this subtask.

One transparent 2×2 atlas, consistent photographic light, skin texture, camera direction and scale. Four separate parts, no words/grid/opaque matte. Each part stays in its own region, with transparent gutter and naturally overlapping rounded joint ends. Actual dimensions, crop bounds and anchors will be measured after viewing the returned PNG rather than assumed from equal grid cells.

| Slot | Part | Required anchors / visible content |
|---|---|---|
| TL | Mother's head and torso, no arms; navy cardigan, terracotta apron | Recognizable reference identity; natural shoulder sockets/sleeve openings; fixed torso. |
| TR | Complete left arm holding the full white plate | Shoulder root and full hand; entire white plate rim, no missing fingers; plate surface broad enough for visible sponge path. |
| BL | Right upper arm in matching navy sleeve | Shoulder root and elbow end, overlapping edge; no hand or extra forearm. |
| BR | Right forearm and hand holding yellow sponge | Elbow root, wrist, complete hand and sponge; consistent angle/scale; overlap at elbow. |

Also required: photographic clean blue kitchen with sink and counter, same visual family as photoreal-anchor-v1, with no people/hands/plate props at the action position. The old illustrative kitchen and the original wash photograph with baked-in arms are unsuitable backgrounds.

Record immutable original SHA256, dimensions and alpha status. Runtime uses CSS/SVG viewport crops from the original hashed atlas; do not silently raster-edit or redraw skin/body parts. Calibration table to fill from the returned image: part crop [x0,y0,x1,y1], source shoulder/elbow/wrist/sponge anchors, target scale, plate surface polygon and occlusion order. Determine reachable sponge path from actual limb lengths and plate position; do not stretch flesh or move the plate to hide failed contact.

Planned render order: clean kitchen → left support arm/plate → torso (sleeve-root occlusion) → right upper arm → forearm/hand/sponge, adjusted only where the actual sleeve edge requires the torso in front. Nested shoulder/elbow transforms preserve shared joint points. A small hidden diagnostic point may identify a source anchor; it never substitutes for moving art pixels in the acceptance test.

Reject/return for replacement if: nontransparent background; old or duplicate arms; mismatched identities/light/scale; impossible elbow connection; forearm/sponge unusable angle; hand missing or materially distorted; plate too occluded to inspect contact; parts cross slots so that safe crops destroy joints. Body art is never reconstructed with geometric primitives.

## V1 original calibration

rig.png:1254×1254 RGBA SHA80f754ca344cce987e7193e391a183ad87bba509534b63371d5c6f7c8091b42c; kitchen.png:1672×941 SHA3611a1099c30308d1722481691bcea4b3166e343fab11fcd6e3b3c8347dfae5d. Parent native receipts preserved. Actual crops: torso[0,0,610,780] with residual side sleeve clipped at runtime; support[580,200,1234,740] polygon excludes neighboring torso; upper[150,780,520,1210]; forearm[640,870,1200,1240]. Source anchors: upper shoulder[380,830],elbow[255,1130]; forearm elbow[1120,930],sponge[725,1160],wrist[835,1100]. Uniform arm scale .95. Fixed plate contact ellipse screen[555,912,100,50]; sponge centre traverses centre[555,895] radius[28,12]. Shoulder screen[1153,549]. These measured initial placements require actual GitHub frame review; no appearance PASS is claimed.

## V1 crop repair after actual GitHub frames

Source9690d14 actual5 frames and90-frameMP4 showed shoulder/waist holes and neighboring atlas fragments, appearance FAIL. Original alpha row inspection confirms torso pixels end at y780 and empty rows790/800 before upper begins y810. Upper crop now starts y800, preserving the shoulder anchor830 and excluding torso hem. Support polygon follows actual alpha gaps: torso/plate intervals at y620 [193,590]/[644,1218],y660 [217,563]/[605,928],y680 [225,563]/[597,890],y700 [217,574]/[600,869],y720 [210,584]/[624,816]. Thus original plate remains intact while torso residue is excluded. Torso notch now applies only beside sleeve below y400 and returns to full width by y700, retaining complete shoulder root and waist. All original PNG bytes and motion/gate assertions unchanged; requires new actual frames, not a claimed appearance fix.
