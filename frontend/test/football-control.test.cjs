/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the fixed-step football simulation. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(name){const file=path.resolve(__dirname,'../src/lib/'+name+'.ts'),m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports}
const {createFootball,stepFootball,neutralInput}=load('football-3d');
const {encodeFootballSave,decodeFootballSave}=load('football-session');
const step=(s,input={},n=1)=>{for(let i=0;i<n;i++)s=stepFootball(s,{...neutralInput(),...input},1/60);return s};
function incoming(x=-1.1){
 const s=createFootball();s.phase='playing';s.players.forEach((p,i)=>{p.inactive=![8,9,11].includes(i)});
 Object.assign(s.players[9],{x:0,z:0,vx:0,vz:0});Object.assign(s.players[8],{x:0,z:12,vx:0,vz:0});
 Object.assign(s.ball,{x,z:0,y:.22,vx:18,vz:0,vy:0,owner:null,releasedBy:20,cooldown:.23});
 return s;
}
test('shooting and every pass launch from the actual ball position without a preset jump',()=>{
 for(const action of ['shoot','pass','through','lob']){
  const s=createFootball();s.phase='playing';s.ball.x=-.35;s.ball.z=.55;
  const original=JSON.stringify(s),n=step(s,{[action]:true});
  assert.equal(n.ball.owner,null);assert.equal(n.ball.x,s.ball.x);assert.equal(n.ball.z,s.ball.z);assert.equal(n.ball.y,s.ball.y);
  assert.equal(JSON.stringify(s),original);assert.ok(Math.hypot(n.ball.vx,n.ball.vz)>15);
 }
});
test('a neutral first touch cushions an incoming pass without relocating the ball',()=>{
 const s=incoming(),n=step(s);assert.equal(n.ball.owner,9);
 assert.ok(Math.hypot(n.ball.vx,n.ball.vz)<=1.2);assert.ok(n.ball.vx>0);
 assert.ok(n.ball.x>s.ball.x&&n.ball.x<s.ball.x+.31);assert.equal(n.ball.z,0);
 assert.ok(n.players[9].receiving>0);assert.ok(n.players[9].touchClock>0);
});
test('movement directs the first touch while shielding keeps it close',()=>{
 const directed=step(incoming(),{z:1}),sprint=step(incoming(),{z:1,sprint:true}),shield=step(incoming(),{z:1,shield:true});
 assert.equal(directed.ball.owner,9);assert.ok(directed.ball.vz>1);
 assert.ok(sprint.ball.vz>directed.ball.vz);assert.ok(Math.hypot(shield.ball.vx,shield.ball.vz)<.7);
 const after=step(directed,{},3);assert.ok(after.ball.z>directed.ball.z,'the cushioned ball keeps rolling between touches');
});
test('a pass pressed just before reception executes once from that receiver',()=>{
 const s=incoming(-1.45),original=JSON.stringify(s);let n=step(s,{pass:true});
 assert.equal(n.ball.owner,null);assert.equal(n.actionBuffer.action,'pass');assert.equal(JSON.stringify(s),original);
 for(let i=0;i<8&&n.passes[0]===0;i++)n=step(n);
 assert.equal(n.passes[0],1);assert.equal(n.ball.owner,null);assert.equal(n.selected,8);assert.equal(n.actionBuffer,undefined);
 n=step(n,{},4);assert.equal(n.passes[0],1);
});
test('a queued first-time shot retains its aim and power while the receiver changes direction',()=>{
 const s=incoming(-1.45);s.charge=.7;let n=step(s,{shoot:true,z:1});
 assert.equal(n.actionBuffer.action,'shoot');
 for(let i=0;i<8&&n.shots[0]===0;i++)n=step(n,{z:-1});
 assert.equal(n.shots[0],1);assert.ok(n.ball.vz>0);assert.ok(Math.hypot(n.ball.vx,n.ball.vz)>28);assert.equal(n.charge,0);
});
test('an intended receiver can charge a first-time shot, while an early release discards the power',()=>{
 const s=incoming(-10);s.passTarget=9;s.passTeam=0;
 const early=step(step(s,{shootHeld:true},3),{shoot:true});assert.equal(early.charge,0);assert.equal(early.actionBuffer,undefined);
 let n=s;for(let i=0;i<100&&n.ball.owner===null&&Math.abs(n.ball.x)>1.8;i++)n=step(n,{shootHeld:true});
 assert.equal(n.ball.owner,null);assert.ok(n.charge>.4);n=step(n,{shoot:true});
 for(let i=0;i<8&&n.shots[0]===0;i++)n=step(n);
 assert.equal(n.shots[0],1);assert.ok(Math.hypot(n.ball.vx,n.ball.vz)>26);assert.equal(n.charge,0);
});
test('first-time shots keep the same default and diagonal aiming convention as direct shots',()=>{
 for(const aim of [{x:0,z:0},{x:1,z:1},{x:-1,z:-1}]){
  const s=incoming(-1.45);s.players[9].facing=0;s.charge=.7;let queued=step(s,{...aim,shoot:true});
  for(let i=0;i<8&&queued.ball.owner===null;i++)queued=step(queued);
  assert.equal(queued.ball.owner,9);assert.ok(queued.actionBuffer);
  const direct={...queued,actionBuffer:undefined};const first=step(queued),regular=step(direct,{...aim,shoot:true});
  assert.ok(Math.abs(Math.atan2(first.ball.vz,first.ball.vx)-Math.atan2(regular.ball.vz,regular.ball.vx))<.001);
 }
});
test('queued actions expire and player switching cancels them',()=>{
 const s=incoming(-2);s.ball.vx=.5;let n=step(s,{pass:true});assert.ok(n.actionBuffer);
 n=step(n,{},20);assert.equal(n.actionBuffer,undefined);n.ball.x=-.3;n.ball.vx=0;
 n=step(n,{},3);assert.equal(n.ball.owner,9);assert.equal(n.passes[0],0);
 const queued=step(incoming(-1.45),{shoot:true}),switched=step(queued,{switch:true});
 assert.equal(switched.actionBuffer,undefined);assert.equal(switched.shots[0],0);
});
test('an interception cancels the intended receiver\'s queued action',()=>{
 const s=step(incoming(-1.45),{pass:true});Object.assign(s.players[18],{inactive:false,x:-1.4,z:0,vx:0,vz:0});
 const n=step(s);assert.equal(n.ball.owner,18);assert.equal(n.actionBuffer,undefined);assert.equal(n.passes[0],0);
});
test('queued controls survive device saves deterministically and malformed controls are rejected',()=>{
 const s=createFootball();s.phase='playing';Object.assign(s.ball,{owner:null,x:s.players[9].x-1.45,vx:18,releasedBy:20,cooldown:.23});
 const queued=step(s,{pass:true});assert.ok(queued.actionBuffer);
 const raw=encodeFootballSave(queued,'club',123),saved=decodeFootballSave(raw,'club');
 assert.ok(saved);assert.deepEqual(JSON.parse(JSON.stringify(step(saved.state,{},30))),JSON.parse(JSON.stringify(step(queued,{},30))));
 for(const change of [{remaining:5},{player:0},{player:11},{action:'invalid'},{x:null},{z:3},{charge:99}]){
  const bad=JSON.parse(raw);Object.assign(bad.state.actionBuffer,change);assert.equal(decodeFootballSave(JSON.stringify(bad),'club'),null);
 }
});
