/* eslint-disable @typescript-eslint/no-require-imports -- Deterministic football behavior checks. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(name){const file=path.resolve(__dirname,'../src/lib/'+name+'.ts'),m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports}
const {createFootball,stepFootball,neutralInput}=load('football-3d');
const {encodeFootballSave,decodeFootballSave}=load('football-session');
function step(s,n=1,input={}){for(let i=0;i<n;i++)s=stepFootball(s,{...neutralInput(),...input},1/60);return s}
function exit(x,z,lastTouch,y=.22){const s=createFootball();s.phase='playing';Object.assign(s.ball,{x,z,y,lastTouch,owner:null,vx:0,vz:0,vy:0,cooldown:1});return step(s)}

test('both touchlines give a throw-in to the side that did not touch the ball last',()=>{
 for(const side of [-1,1])for(const team of [0,1]){
  const s=exit(14,side*35,team);assert.equal(s.restart.kind,'throw-in');assert.equal(s.restart.team,1-team);
  assert.equal(s.ball.lastTouch,1-team);assert.equal(s.players[s.restart.taker].keeper,false);assert.equal(s.ball.y,1.95);
  assert.equal(s.restart.z,side*34);assert.equal(s.restart.x,14);assert.deepEqual(s.score,[0,0]);
  assert.ok(s.players.filter(p=>p.team===team).every(p=>Math.hypot(p.x-s.ball.x,p.z-s.ball.z)>=2));
 }
});
test('each goal line distinguishes a defender corner from an attacker goal kick at either corner',()=>{
 for(const end of [-1,1])for(const side of [-1,1]){
  const defender=end>0?1:0,attacker=1-defender;
  const corner=exit(end*53,side*16,defender),goalKick=exit(end*53,side*16,attacker);
  assert.equal(corner.restart.kind,'corner');assert.equal(corner.restart.team,attacker);
  assert.equal(Math.sign(corner.ball.x),end);assert.equal(Math.sign(corner.ball.z),side);
  assert.ok(Math.abs(corner.ball.x)>52&&Math.abs(corner.ball.z)>33);
  assert.ok(corner.players.filter(p=>p.team===defender).every(p=>Math.hypot(p.x-corner.ball.x,p.z-corner.ball.z)>=9.15));
  assert.equal(goalKick.restart.kind,'goal-kick');assert.equal(goalKick.restart.team,defender);
  assert.equal(goalKick.players[goalKick.restart.taker].keeper,true);
  assert.ok(Math.abs(goalKick.ball.x)>=47&&Math.abs(goalKick.ball.z)<=9.16);
  assert.ok(goalKick.players.filter(p=>p.team===attacker).every(p=>p.x*end<=36||Math.abs(p.z)>=20.16));
 }
});
test('a partly overlapping ball stays live and a diagonal exit uses the first line crossed',()=>{
 assert.equal(exit(52.6,0,0,4).phase,'playing');assert.equal(exit(0,34.1,0).phase,'playing');
 const s=createFootball();s.phase='playing';Object.assign(s.ball,{x:52,z:34.19,y:.22,vx:60,vz:30,vy:0,owner:null,lastTouch:0,cooldown:1});
 const n=step(s);assert.equal(n.restart.kind,'throw-in');assert.equal(n.restart.team,1);assert.ok(n.restart.x<52.5);
});
test('human set pieces can be aimed and taken early; unattended and CPU restarts resume automatically',()=>{
 let s=exit(0,35,1);s=step(s,30);assert.equal(s.phase,'restart');
 const before=JSON.stringify(s);const left=step(s,1,{x:-1,z:-.1,pass:true}),right=step(s,1,{x:1,z:-.1,pass:true});
 assert.equal(JSON.stringify(s),before);assert.equal(left.phase,'playing');assert.equal(right.phase,'playing');
 assert.ok(left.ball.vx<0);assert.ok(right.ball.vx>0);assert.equal(left.ball.owner,null);
 assert.equal(left.ball.restartKind,'throw-in');assert.ok(left.players[left.ball.releasedBy].throwing>0);
 assert.equal(left.passes[0],1);assert.equal(left.selected,left.passTarget);
 for(const start of [exit(0,35,0),exit(53,12,1),exit(-53,12,1)]){
  const n=step(start,145);assert.equal(n.phase,'playing');assert.equal(n.restart,undefined);assert.ok(Math.hypot(n.ball.vx,n.ball.vz)>0);
 }
});
test('a throw cannot score directly and a direct own-goal restart gives a corner',()=>{
 for(const [kind,end,lastTouch,expected] of [['throw-in',1,0,'goal-kick'],['throw-in',-1,0,'corner'],['goal-kick',-1,0,'corner'],['corner',1,1,'corner']]){
  const s=createFootball();s.phase='playing';Object.assign(s.ball,{x:end*53,z:0,y:1,vx:0,vz:0,vy:0,owner:null,lastTouch,releasedBy:lastTouch?20:9,restartKind:kind,cooldown:0});
  const n=step(s);assert.deepEqual(n.score,[0,0]);assert.equal(n.restart.kind,expected);
 }
});
test('a thrower cannot reclaim the ball before another player touches it',()=>{
 let s=step(exit(0,35,1),145);const thrower=s.ball.releasedBy;
 s.ball.cooldown=0;Object.assign(s.ball,{x:0,z:20,y:.22,vx:0,vz:0,vy:0});
 s.players.forEach((p,i)=>{p.x=i===thrower?0:40;p.z=i===thrower?20:0});
 const n=step(s);assert.equal(n.ball.owner,null);assert.equal(n.ball.restartKind,'throw-in');
 const other=thrower===9?10:9;Object.assign(n.players[other],{x:n.ball.x,z:n.ball.z});
 const caught=step(n);assert.equal(caught.ball.owner,other);assert.equal(caught.ball.restartKind,undefined);
});
test('restart checkpoints continue identically and invalid restart metadata is rejected',()=>{
 for(const s of [exit(0,35,1),exit(53,12,1),exit(-53,12,1)]){
  const raw=encodeFootballSave(s,'a'),resumed=decodeFootballSave(raw,'a');assert.ok(resumed);
  assert.deepEqual(JSON.parse(JSON.stringify(step(resumed.state,150))),JSON.parse(JSON.stringify(step(s,150))));
  const value=JSON.parse(raw);
  for(const mutate of [v=>v.state.restart.taker=80,v=>v.state.restart.kind='penalty',v=>v.state.restart.team=8,v=>v.state.restart.target=21,v=>v.state.restart.x=100,v=>v.state.phase='playing',v=>v.state.ball.owner=null]){
   const bad=structuredClone(value);mutate(bad);assert.equal(decodeFootballSave(JSON.stringify(bad),'a'),null);
  }
 }
 const old=createFootball();old.phase='restart';old.phaseTime=.2;assert.ok(decodeFootballSave(encodeFootballSave(old,'a'),'a'),'old generic restart saves remain readable');
});
test('solo finishing always resets to its active attacker after an out-of-play ball',()=>{
 const s=createFootball([],'4-4-2',true);s.phase='playing';Object.assign(s.ball,{x:53,z:12,owner:null,lastTouch:0});
 const n=step(s);assert.equal(n.phase,'restart');assert.equal(n.restart,undefined);assert.equal(n.ball.owner,9);assert.equal(n.players.filter(p=>!p.inactive).length,2);
 assert.equal(step(n,75).phase,'playing');
});
