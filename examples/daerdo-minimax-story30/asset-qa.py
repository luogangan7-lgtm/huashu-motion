#!/usr/bin/env python3
"""Owns first MiniMax wash asset QA, not rendering or model generation.
Uses GitHub-hosted ffmpeg/ffprobe + Python stdlib; called by focused asset workflow.
Invariant: freeze RED changes real video frames; original clip must pass the same motion assertion.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

TIMES = [0, .8, 1.6, 2.4, 3.2, 4, 4.8, 5.5]
# Candidate normalized action ROI; inspect actual eight frames before accepting/calibrating it.
ROIS = {'hands_sponge': [.14, .60, .30, .30], 'mother_face': [.21, .10, .26, .37], 'kitchen': [.54, .10, .17, .30]}

def run(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

def pixels(file, t, roi):
    x, y, w, h = roi
    crop = f'crop=iw*{w}:ih*{h}:iw*{x}:ih*{y},scale=64:64,format=gray'
    return run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', str(file), '-frames:v', '1', '-vf', crop, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'])

def delta(a, b):
    assert len(a) == len(b) == 4096, 'decoded action ROI must contain a complete real frame'
    return sum(abs(x-y) for x, y in zip(a, b)) / len(a)

def motion(file, out):
    metrics = {}
    for name, roi in ROIS.items():
        frames = [pixels(file, t, roi) for t in TIMES]
        metrics[name] = {'roi': roi, 'fromFirst': [delta(frames[0], a) for a in frames], 'adjacent': [delta(a, b) for a, b in zip(frames, frames[1:])]}
    out.write_text(json.dumps({'times': TIMES, 'metrics': metrics}, indent=2))
    hand = metrics['hands_sponge']
    assert max(hand['fromFirst']) > 2 and sum(d > 1 for d in hand['adjacent']) >= 2, 'actual hand and sponge pixel motion'
    print('DYNAMIC_GATE_GREEN actual hand and sponge pixel motion')

def inspect(file, manifest, out):
    out.mkdir(parents=True, exist_ok=True)
    expected = json.loads(manifest.read_text())
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    assert digest == expected['sha256'], 'source clip hash'
    assert expected['task_id'] and expected['input_sha256'], 'source receipt identity'
    probe = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(file)]))
    (out/'probe.json').write_text(json.dumps(probe, indent=2))
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height']) == (expected['width'], expected['height']) == (1918, 1080), 'exact original 1918x1080 source; no stretch'
    assert 5.9 <= float(probe['format']['duration']) <= 6.2, 'six seconds of genuine source footage'
    assert int(video['nb_read_frames']) > 100, 'source contains decoded frames'
    result = subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(file), '-f', 'null', '-'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    (out/'decode.log').write_bytes(result.stderr)
    assert result.returncode == 0, 'complete source decode'
    frames = out/'frames'
    frames.mkdir(exist_ok=True)
    for t in TIMES:
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', str(file), '-frames:v', '1', str(frames/f'at-{t}.png')])
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(file), '-vf', 'fps=4/3,scale=480:-1,tile=4x2', '-frames:v', '1', str(out/'contact-sheet.png')])
    (out/'source-sha256.txt').write_text(digest+'\n')

def freeze(file, output):
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(file), '-vf', 'trim=end_frame=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=6', '-t', '6', '-r', '30', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(output)])

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('action', choices=['inspect', 'motion', 'freeze'])
    p.add_argument('--file', required=True, type=Path)
    p.add_argument('--manifest', type=Path)
    p.add_argument('--out', required=True, type=Path)
    a = p.parse_args()
    try:
        if a.action == 'inspect':
            inspect(a.file, a.manifest, a.out)
        elif a.action == 'motion':
            motion(a.file, a.out)
        else:
            freeze(a.file, a.out)
    except (AssertionError, subprocess.CalledProcessError, ValueError, KeyError) as e:
        print(f'ASSET_QA_FAIL: {e}', file=sys.stderr)
        sys.exit(1)
