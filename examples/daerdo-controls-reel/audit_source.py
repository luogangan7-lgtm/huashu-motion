"""Hosted-runner source inspection; never run locally. No network or platform writes."""
import hashlib, json, os, pathlib, subprocess, sys
r=pathlib.Path(sys.argv[1]).resolve(); out=r/'out'; out.mkdir(exist_ok=True)
def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True,timeout=180).stdout
brief=json.loads((r/'brief.json').read_text())
assert hashlib.sha256((r/'source.mp4').read_bytes()).hexdigest()==brief['source_sha256']
p=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(r/'source.mp4')]))
(out/'source-probe.json').write_text(json.dumps(p,indent=2))
assert float(p['format']['duration'])>40
run(['ffmpeg','-v','error','-y','-i',str(r/'source.mp4'),'-vf','fps=1/2,scale=384:216,tile=6x4','-frames:v','1',str(out/'source-contact.png')])
for at in [0,2,4,6,8,10,12,14,16,18,20,30,32,34,36,38,40,42]:
    run(['ffmpeg','-v','error','-y','-ss',str(at),'-i',str(r/'source.mp4'),'-frames:v','1',str(out/f'source-at-{at}.png')])
(out/'source-audit.json').write_text(json.dumps({'source_sha':brief['source_sha256'],'commit':os.environ.get('SOURCE_SHA'),'probe':p['format']['duration'],'scope':'CI original-source frames only, not film acceptance'},indent=2))
print('SOURCE_AUDIT_READY',brief['source_sha256'])
