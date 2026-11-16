/* eslint-disable @typescript-eslint/no-require-imports -- Node behavior checks against compiled TypeScript. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(name){const file=path.resolve(__dirname,'../src/lib/'+name+'.ts'),m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports}
const {createFootball,stepFootball,neutralInput}=load('football-3d');
const {encodeFootballSave,decodeFootballSave,decodeFootballSettings}=load('football-session');
const step=(s,n=1,input={})=>{for(let i=0;i<n;i++)s=stepFootball(s,{...neutralInput(),...input},1/60);return s};

test('CPU plays a clear forward pass and tracks a completed team pass',()=>{
 const s=createFootball();s.phase='playing';s.ball.cooldown=0;s.ball.owner=20;
 s.players.forEach((p,i)=>{p.x=p.team===0?40:30;p.z=p.baseZ;if(i===20){p.x=0;p.z=-12}if(i===18){p.x=-13;p.z=-12}});
 Object.assign(s.ball,{x:0,z:-12});const original=JSON.stringify(s);const next=step(s);
 assert.equal(next.ball.owner,null);assert.equal(next.ball.releasedBy,20);assert.equal(next.passTarget,18);assert.equal(next.passes[1],1);assert.equal(JSON.stringify(s),original);
 // Put the receiver on the approaching ball to verify ordinary reception credit.
 const target=next.players[18];target.x=next.ball.x+next.ball.vx/60;target.z=next.ball.z+next.ball.vz/60;target.vx=target.vz=0;
 const caught=step(next);assert.equal(caught.completedPasses[1],1);assert.equal(caught.passTarget,undefined);
});
test('CPU retains possession when every passing lane is blocked',()=>{
 const s=createFootball();s.phase='playing';s.ball.owner=20;s.ball.cooldown=0;
 s.players.forEach((p,i)=>{p.inactive=i!==9&&i!==20;p.x=i===20?0:12;p.z=0});Object.assign(s.ball,{x:0,z:0});
 const n=step(s);assert.equal(n.passes[1],0);assert.equal(n.ball.owner,20);
});
test('difficulty gives a casual carrier a longer reaction opportunity',()=>{
 function scenario(difficulty){const s=createFootball();s.phase='playing';s.difficulty=difficulty;s.ball.cooldown=0;s.players.forEach((p,i)=>{p.inactive=i!==9&&i!==20});s.players[20].x=s.players[9].x+1;s.players[20].z=0;return step(s,18)}
 assert.equal(scenario('casual').ball.owner,9);assert.equal(scenario('elite').ball.owner,20);
});
test('exhibition checkpoint round trip preserves gameplay and rejects a different club/lineup',()=>{
 let s=createFootball();s=step(s,180,{x:1});const raw=encodeFootballSave(s,'club-a:lineup-v1',123);
 const resumed=decodeFootballSave(raw,'club-a:lineup-v1').state;
 assert.deepEqual(resumed,JSON.parse(JSON.stringify(s)));
 assert.deepEqual(JSON.parse(JSON.stringify(step(resumed,120,{x:0.3,z:0.8}))),JSON.parse(JSON.stringify(step(s,120,{x:0.3,z:0.8}))));
 assert.equal(decodeFootballSave(raw,'club-b:lineup-v1'),null);
 assert.equal(decodeFootballSave(raw,'club-a:lineup-v2'),null);
});
test('tampered saves cannot inject invalid owners, players, phases or nonfinite physics',()=>{
 const base=JSON.parse(encodeFootballSave(createFootball(),'a'));
 for(const mutate of [v=>v.state.selected=22,v=>v.state.ball.owner=-1,v=>v.state.players[9].x=1e300,v=>v.state.players[9].stamina=null,v=>v.state.phase='published',v=>v.state.players[2].team=1,v=>v.state.score=[-1,0],v=>v.state.players[9].keeper=true,v=>v.state.ball.cooldown=-1,v=>v.state.passTarget=55]){
  const bad=structuredClone(base);mutate(bad);assert.equal(decodeFootballSave(JSON.stringify(bad),'a'),null);
 }
 assert.equal(decodeFootballSave('{broken','a'),null);assert.equal(decodeFootballSave('x'.repeat(100001),'a'),null);
});
test('saved settings validate each preference and recover from corrupt storage',()=>{
 assert.deepEqual(decodeFootballSettings('{broken'),{camera:'telecast',graphics:'auto',difficulty:'club'});
 assert.deepEqual(decodeFootballSettings(JSON.stringify({camera:'close',graphics:'performance',difficulty:'elite'})),{camera:'close',graphics:'performance',difficulty:'elite'});
 assert.deepEqual(decodeFootballSettings(JSON.stringify({camera:'unknown',graphics:'ultra',difficulty:99})),{camera:'telecast',graphics:'auto',difficulty:'club'});
});
