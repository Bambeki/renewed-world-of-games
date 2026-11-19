/* eslint-disable @typescript-eslint/no-require-imports -- Node behavior checks. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const file=path.resolve(__dirname,'../src/lib/football-performance.ts'),m=new Module(file,module);
m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {FootballFrameMonitor,footballPixelRatio}=m.exports;
function frames(m,count,seconds){for(let i=0;i<count;i++)m.record(seconds,4)}
test('automatic graphics progressively reduces sustained slow frames, then recovers with hysteresis',()=>{
 const m=new FootballFrameMonitor();frames(m,61,1/30);assert.equal(m.scale,.875);
 frames(m,61,1/30);assert.equal(m.scale,.875,'cooldown prevents another immediate resize');
 frames(m,700,1/30);assert.equal(m.scale,.5,'bounded minimum at sustained 30 FPS');
 frames(m,122,1/60);assert.equal(m.scale,.5,'one fast window cannot trigger recovery');
 frames(m,1800,1/60);assert.equal(m.scale,1,'sustained smooth play restores detail');
 frames(m,500,1/120);assert.equal(m.scale,1,'never exceeds automatic budget');
});
test('fixed graphics presets stay fixed and a preference change discards mixed measurements',()=>{
 for(const [preset,scale] of [['performance',.7],['balanced',1],['high',1.5]]){
  const m=new FootballFrameMonitor(preset);frames(m,500,.1);assert.equal(m.scale,scale);
  assert.equal(m.sample.fps,10);m.setQuality('auto');assert.equal(m.sample,null);assert.equal(m.scale,1);
 }
});
test('frame reports use real intervals and tail latency, exclude pauses and reject invalid clocks',()=>{
 const m=new FootballFrameMonitor('balanced');
 for(let i=0;i<100;i++)m.record(.016,3);
 for(let i=0;i<8;i++)m.record(.05,12);
 assert.equal(m.sample.frames,108);assert.equal(m.sample.fps,54);assert.equal(m.sample.p95FrameMs,50);assert.equal(m.sample.p95WorkMs,12);
 const result=m.sample;m.resetWindow();frames(m,30,.016);m.resetWindow();frames(m,30,.016);
 assert.equal(m.sample,result,'short runs on either side of a pause are not joined');
 for(const dt of [NaN,Infinity,-1,0,12])assert.equal(m.record(dt,0),false);
 assert.equal(m.record(.016,NaN),false);assert.equal(m.sample,result);
});
test('drawing buffer obeys preset, device ratio and two-megapixel budget on phone and 4K displays',()=>{
 assert.equal(footballPixelRatio(390,340,3,1),1);
 assert.equal(footballPixelRatio(1400,700,1,.7),.7);
 assert.equal(footballPixelRatio(1400,700,.8,1.5),.8);
 const ratio=footballPixelRatio(3840,2160,2,1.5);
 assert.ok(3840*2160*ratio*ratio<=2_000_001);assert.ok(ratio>0);
});
