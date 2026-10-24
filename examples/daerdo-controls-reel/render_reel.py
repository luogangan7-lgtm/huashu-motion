#!/usr/bin/env python3
"""CI-only Daerdo live-footage edit; stdlib orchestrates ffmpeg/ffprobe.

Input: source.mp4, brief.json, assets/voice.wav and Huashu voice.words.json.
brief: source_sha256, narration, segments[{source_start,duration,label,title}],
optional brand (DAERDO), font_file, source_width_fraction (0.60),
segments[].crop_x_fraction (0.5, left-to-right position in available crop travel).
The central crop must be visually approved from exported review frames: automated
motion/dimension checks cannot establish that every hand/product remains visible.
No local execution; no original audio, still frames, generated video or network.
"""
import argparse
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import textwrap


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def run(args, log=None, timeout=900):
    result = subprocess.run([str(a) for a in args], capture_output=True,
                            timeout=timeout, check=False)
    if log:
        log.write_bytes(result.stderr)
    require(result.returncode == 0,
            f'Command failed ({result.returncode}): {args[0]}; '
            + result.stderr.decode(errors='replace')[-2500:])
    return result


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_format',
                          '-show_streams', '-of', 'json', path]).stdout)


def number(value):
    require(isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value), f'Invalid finite number: {value!r}')
    return float(value)


def clean(value, maximum):
    require(isinstance(value, str) and 0 < len(value) <= maximum,
            f'Text length must be 1..{maximum}')
    require(not re.search(r'[\x00-\x1f{}\\]', value), 'Unsafe text control/ASS syntax')
    return value


def stamp(seconds, ass=False):
    scale = 100 if ass else 1000
    ticks = round(seconds * scale)
    hours, ticks = divmod(ticks, 3600 * scale)
    minutes, ticks = divmod(ticks, 60 * scale)
    secs, fraction = divmod(ticks, scale)
    return (f'{hours}:{minutes:02}:{secs:02}.{fraction:02}' if ass else
            f'{hours:02}:{minutes:02}:{secs:02},{fraction:03}')


def subtitles(sidecar, narration, duration):
    """Preserve sentence punctuation; split only at supplied word boundaries.

    Huashu `tts` words are interpolated within measured sentence speech spans.
    They are used as supplied, never represented as forced-aligned measurements.
    Unknown schemas, missing words and text mismatch fail closed.
    """
    require(isinstance(sidecar, dict) and
            {'source', 'precision', 'offset', 'duration', 'sentences', 'words'}
            <= sidecar.keys(), 'Unknown Huashu sidecar schema')
    require(sidecar['precision'] in ('tts', 'asr', 'asr+script', 'silence'),
            'Unknown Huashu precision')
    require(sidecar['precision'] != 'silence', 'Silence-only timing is insufficient')
    offset = number(sidecar['offset'])
    require(offset >= 0, 'Negative voice offset')
    require(abs(number(sidecar['duration']) - duration) < .15,
            'Sidecar/audio duration mismatch')
    sentences, words = sidecar['sentences'], sidecar['words']
    require(isinstance(sentences, list) and sentences and
            isinstance(words, list) and words, 'Missing sentences/words')
    normalize = lambda s: re.sub(r'\s+', ' ', s).strip()
    require(normalize(' '.join(s['text'] for s in sentences)) == normalize(narration),
            'Sidecar sentence text differs from approved narration')
    previous = 0.0
    for word in words:
        clean(word['word'], 45)
        start, end = number(word['start']), number(word['end'])
        require(previous <= start + .002 and 0 <= start < end <= duration + .1,
                'Invalid or overlapping word timestamps')
        previous = end
    cues, wi = [], 0
    for sentence in sentences:
        text = clean(sentence['text'], 1000)
        start, end = number(sentence['start']), number(sentence['end'])
        own = []
        while wi < len(words) and words[wi]['start'] < end + .002:
            word = words[wi]
            require(word['start'] >= start - .02 and word['end'] <= end + .02,
                    'Word crosses sentence boundary')
            own.append(word)
            wi += 1
        require(own, 'Sentence has no timed words')
        positions, cursor = [], 0
        for word in own:
            position = text.find(word['word'], cursor)
            require(position >= cursor and not re.search(r'\w', text[cursor:position]),
                    'Word text differs from sentence; no inferred alignment allowed')
            positions.append(position)
            cursor = position + len(word['word'])
        require(not re.search(r'\w', text[cursor:]), 'Untimed sentence suffix')
        cut = 0
        while cut < len(own):
            best = None
            for stop in range(cut + 1, len(own) + 1):
                a = 0 if cut == 0 else positions[cut]
                b = positions[stop] if stop < len(own) else len(text)
                fragment = text[a:b].strip()
                lines = textwrap.wrap(fragment, 34, break_long_words=False,
                                      break_on_hyphens=False)
                if len(lines) > 2 or any(len(line) > 34 for line in lines):
                    break
                if own[stop - 1]['end'] - own[cut]['start'] > 4.8 and best:
                    break
                best = (stop, fragment, lines)
            require(best is not None, 'Subtitle token cannot fit safe width')
            stop, fragment, lines = best
            cues.append({'start': own[cut]['start'] + offset,
                         'end': own[stop - 1]['end'] + offset,
                         'text': fragment, 'lines': lines})
            cut = stop
    require(wi == len(words), 'Unconsumed timed words')
    require(normalize(' '.join(c['text'] for c in cues)) == normalize(narration),
            'Subtitle text lost content')
    return cues, offset


def motion(source, start, duration, log):
    """Sample cropped live footage, not animated labels/background, at 4 fps."""
    raw = run(['ffmpeg', '-v', 'error', '-ss', start, '-t', duration,
               '-i', source, '-an', '-vf',
               'crop=iw:trunc(ih*0.82/2)*2:0:0,fps=4,scale=96:44,format=gray',
               '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], log).stdout
    size = 96 * 44
    require(len(raw) % size == 0, 'Partial decoded motion frame')
    frames = [raw[i:i + size] for i in range(0, len(raw), size)]
    require(len(frames) >= 5, 'Insufficient frames to establish source motion')
    deltas = [sum(abs(a - b) for a, b in zip(left, right)) / size
              for left, right in zip(frames, frames[1:])]
    receipt = {'frames': len(frames), 'sample_fps': 4,
               'mean_absolute_differences': deltas,
               'moving_fraction': sum(d > .5 for d in deltas) / len(deltas),
               'max_difference': max(deltas)}
    require(receipt['moving_fraction'] >= .12 and max(deltas) >= 1.0,
            f'Source segment lacks measurable live motion: {start}')
    return receipt


def validate_output(data, duration, cues):
    videos = [s for s in data['streams'] if s['codec_type'] == 'video']
    audios = [s for s in data['streams'] if s['codec_type'] == 'audio']
    require(len(videos) == len(audios) == 1, 'Require one video and one audio stream')
    v, a = videos[0], audios[0]
    require((v['width'], v['height']) == (1080, 1920), 'Wrong Reel dimensions')
    require(v['codec_name'] == 'h264' and v['pix_fmt'] == 'yuv420p'
            and v['r_frame_rate'] == '30/1', 'Wrong video encoding')
    require(abs(int(v.get('nb_frames', 0)) - duration * 30) <= 3,
            'Encoded frame count does not cover expected duration')
    require(a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000
            and a['channels'] == 2, 'Wrong audio encoding')
    for stream in (v, a):
        require(abs(float(stream['duration']) - duration) < .15,
                'Audio/video duration mismatch')
    require(20 <= duration <= 35 and abs(float(data['format']['duration']) - duration) < .15,
            'Wrong final duration')
    require(cues and cues[-1]['end'] <= duration and cues[0]['start'] >= 0,
            'Subtitle outside final duration')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project', type=Path)
    args = parser.parse_args()
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'Execution permitted only in GitHub Actions')
    source_commit = os.environ.get('SOURCE_SHA', '')
    require(re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', source_commit) is not None,
            'CI must supply checked-out SOURCE_SHA')
    project = args.project.resolve()
    os.chdir(project)
    source, voice = Path('source.mp4'), Path('assets/voice.wav')
    brief = json.loads(Path('brief.json').read_text())
    require(re.fullmatch('[0-9a-f]{64}', brief['source_sha256']) is not None,
            'Expected source hash missing')
    require(digest(source) == brief['source_sha256'], 'Source hash mismatch')
    require(not Path('out/daerdo-g25bt-controls-reel.mp4').exists(),
            'Refusing to overwrite an existing final video')
    out = Path('out')
    review, logs = out / 'review', out / 'logs'
    review.mkdir(parents=True, exist_ok=True)
    logs.mkdir(exist_ok=True)
    source_probe, voice_probe = probe(source), probe(voice)
    voice_duration = float(voice_probe['format']['duration'])
    sidecar = json.loads(Path('assets/voice.words.json').read_text())
    cues, offset = subtitles(sidecar, brief['narration'], voice_duration)
    duration = round(voice_duration + offset + 1, 3)
    require(20 <= duration <= 35, 'Voice+offset+1 must be 20..35 seconds')
    segments = copy.deepcopy(brief['segments'])
    require(isinstance(segments, list) and 2 <= len(segments) <= 8, 'Require 2..8 live segments')
    if all('start_sentence' in item for item in segments):
        starts = [0.0 if i == 0 else number(sidecar['sentences'][item['start_sentence']]['start']) + offset
                  for i, item in enumerate(segments)]
        require(all(a < b for a, b in zip(starts, starts[1:])), 'Sentence cut order invalid')
        for i, item in enumerate(segments):
            item['duration'] = (starts[i+1] if i+1 < len(starts) else duration) - starts[i]
    source_duration = float(source_probe['format']['duration'])
    total, motions = 0.0, []
    for i, segment in enumerate(segments):
        start, length = number(segment['source_start']), number(segment['duration'])
        require(start >= 0 and length >= 1.5 and start + length <= source_duration,
                'Source segment outside footage or too short')
        clean(segment['label'], 28)
        clean(segment['title'], 32)
        total += length
        motions.append(motion(source, start, length, logs / f'motion-{i}.log'))
    require(total >= duration and total - segments[-1]['duration'] < duration,
            'Segment windows must cover voice+1; only final segment may be shortened')
    save(out / 'motion.json', motions)
    v = next(s for s in source_probe['streams'] if s['codec_type'] == 'video')
    retained = number(brief.get('source_width_fraction', .60))
    require(.55 <= retained <= 1, 'Must retain at least 55% of source width')
    cropped_height = int(int(v['height']) * .82 / 2) * 2
    footage_height = int(1080 * cropped_height / (int(v['width']) * retained) / 2) * 2
    require(800 <= footage_height <= 1080, 'Live footage height must be 800..1080')
    font = Path(brief.get('font_file', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    require(font.is_file() and not re.search(r"[,:;'\\]", str(font)), 'Invalid font path')
    brand = clean(brief.get('brand', 'DAERDO'), 16)
    (out / 'brand.txt').write_text(brand)
    srt, events = [], []
    for i, cue in enumerate(cues, 1):
        lines = '\n'.join(cue['lines'])
        srt.append(f'{i}\n{stamp(cue["start"])} --> {stamp(cue["end"])}\n{lines}\n')
        ass_text = r'\N'.join(cue['lines'])
        events.append(f'Dialogue: 0,{stamp(cue["start"], True)},{stamp(cue["end"], True)},Default,,0,0,0,,{ass_text}')
    (out / 'subtitles.srt').write_text('\n'.join(srt))
    (out / 'subtitles.ass').write_text('''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,DejaVu Sans,48,&H00FFFFFF,&H00FFFFFF,&H001C160C,&H001C160C,-1,0,0,0,100,100,0,0,3,9,0,2,90,90,390,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
''' + '\n'.join(events) + '\n')
    save(out / 'timing.json', {'duration': duration, 'voice_duration': voice_duration,
         'offset': offset, 'source': sidecar['source'], 'precision': sidecar['precision'],
         'timing_note': 'TTS sentence spans measured; word timing interpolated by Huashu, not forced alignment.',
         'cues': cues, 'segments': segments, 'source_width_fraction': retained})
    filters, labels, at = [], [], 0.0
    for i, segment in enumerate(segments):
        length = min(segment['duration'], duration - at)
        crop_x = number(segment.get('crop_x_fraction', .5))
        require(0 <= crop_x <= 1, 'Crop travel fraction must be 0..1')
        (out / f'label-{i}.txt').write_text(segment['label'])
        (out / f'title-{i}.txt').write_text(segment['title'])
        filters.append(f'[0:v]trim=start={segment["source_start"]}:duration={length},'
                       f'setpts=PTS-STARTPTS,crop=iw:trunc(ih*0.82/2)*2:0:0,'
                       f'scale=-2:{footage_height},crop=1080:{footage_height}:'
                       f'(iw-1080)*{crop_x}:0,'
                       f'fps=30,setsar=1[v{i}]')
        labels.append(f'[v{i}]')
        segment['timeline_start'], segment['timeline_end'] = at, at + length
        at += length
    timing_path = out / 'timing.json'
    timing = json.loads(timing_path.read_text())
    timing['segments'] = segments
    timing['footage_height'] = footage_height
    save(timing_path, timing)
    filters.append(''.join(labels) + f'concat=n={len(segments)}:v=1:a=0[live]')
    filters.append(f'[live]pad=1080:1920:0:390:color=0x0B182B,'
                   'drawbox=x=0:y=160:w=1080:h=200:color=0x102743:t=fill,'
                   f'drawtext=fontfile={font}:textfile=out/brand.txt:expansion=none:'
                   'fontsize=37:fontcolor=0x6CE2D7:x=90:y=185[base]')
    prior = 'base'
    for i, segment in enumerate(segments):
        enable = f"between(t,{segment['timeline_start']},{segment['timeline_end']})"
        title_size = min(46, 900 // len(segment['title']))
        filters.append(f'[{prior}]drawtext=fontfile={font}:textfile=out/title-{i}.txt:'
                       f'expansion=none:fontsize={title_size}:fontcolor=white:x=90:y=265:'
                       f"enable='{enable}',drawtext=fontfile={font}:textfile=out/label-{i}.txt:"
                       'expansion=none:fontsize=30:fontcolor=0x6CE2D7:x=90:y=350:'
                       f"enable='{enable}'[txt{i}]")
        prior = f'txt{i}'
    filters.append(f'[{prior}]ass=out/subtitles.ass[vout]')
    filters.append(f'[1:a]adelay={round(offset*1000)}:all=1,'
                   f'loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration={duration},'
                   'aresample=48000,aformat=channel_layouts=stereo[aout]')
    (out / 'filters.txt').write_text(';\n'.join(filters))
    target = out / 'daerdo-g25bt-controls-reel.mp4'
    run(['ffmpeg', '-hide_banner', '-nostdin', '-i', source, '-i', voice,
         '-filter_complex_script', out / 'filters.txt', '-map', '[vout]', '-map', '[aout]',
         '-t', duration, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
         '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k',
         '-ar', '48000', '-ac', '2', '-movflags', '+faststart', target], logs / 'render.log')
    data = probe(target)
    save(out / 'probe.json', data)
    bad = copy.deepcopy(data)
    next(s for s in bad['streams'] if s['codec_type'] == 'video')['width'] = 720
    try:
        validate_output(bad, duration, cues)
    except ValueError as error:
        negative = {'injected': 'width=720', 'result': 'EXPECTED_RED', 'reason': str(error)}
    else:
        raise ValueError('Negative control incorrectly passed')
    validate_output(data, duration, cues)
    run(['ffmpeg', '-v', 'error', '-xerror', '-i', target, '-map', '0:v',
         '-map', '0:a', '-f', 'null', '-'], logs / 'full-decode.log')
    loud = run(['ffmpeg', '-hide_banner', '-i', target, '-vn', '-af',
                'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
                '-f', 'null', '-'], logs / 'loudness.log').stderr.decode()
    block = re.findall(r'\{\s*"input_i".*?\}', loud, re.S)
    require(block, 'Missing loudness measurement')
    loudness = json.loads(block[-1])
    require(-20 <= float(loudness['input_i']) <= -12
            and float(loudness['input_tp']) <= -.5, 'Loudness/true peak outside gate')
    save(out / 'loudness.json', loudness)
    run(['ffmpeg', '-v', 'error', '-i', target, '-vn', '-c:a', 'libmp3lame',
         '-b:a', '128k', out / 'final-audio.mp3'], logs / 'audio-preview.log')
    for i, segment in enumerate(segments):
        midpoint = (segment['timeline_start'] + segment['timeline_end']) / 2
        run(['ffmpeg', '-v', 'error', '-ss', midpoint, '-i', target, '-frames:v', '1',
             review / f'segment-{i+1}.jpg'], logs / f'keyframe-{i}.log')
    run(['ffmpeg', '-v', 'error', '-i', target, '-vf',
         f'fps=8/{duration},scale=270:480,tile=4x2', '-frames:v', '1',
         review / 'contact-sheet.jpg'], logs / 'contact-sheet.log')
    save(out / 'gate.json', {'status': 'PASS', 'environment': 'GitHub Actions',
         'source_commit': source_commit,
         'negative_control': negative, 'positive_control': 'GREEN',
         'full_decode': 'PASS', 'motion': 'PASS', 'subtitle_text': 'EXACT',
         'visual_crop_review': 'REQUIRED: human or independent review of exported frames',
         'video_sha256': digest(target), 'script_sha256': digest(Path(__file__))})
    files = [source, voice, Path('brief.json'), Path('assets/voice.words.json'), Path(__file__)]
    files.extend(sorted(p for p in out.rglob('*') if p.is_file()))
    save(out / 'hashmanifest.json', {'source_commit': source_commit,
                                   'files': {str(p): digest(p) for p in files}})
    print(json.dumps({'video': str(target), 'sha256': digest(target), 'gate': 'PASS',
                      'visual_acceptance': 'REQUIRED'}, indent=2))


if __name__ == '__main__':
    main()
