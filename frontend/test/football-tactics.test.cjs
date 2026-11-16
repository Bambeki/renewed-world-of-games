/* eslint-disable @typescript-eslint/no-require-imports -- Behavioral checks against the fixed-step TypeScript simulation. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(name){const file=path.resolve(__dirname,'../src/lib/'+name+'.ts'),m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports}
const {createFootball,stepFootball,neutralInput,planFootballMovement}=load('football-3d');
const {encodeFootballSave,decodeFootballSave}=load('football-session');
const step=(s,n=1,input={})=>{for(let i=0;i<n;i++)s=stepFootball(s,{...neutralInput(),...input},1/60);return s};
const play=(formation='4-4-2')=>{const s=createFootball([],formation);s.phase='playing';return s};

test('off-ball support offers two different passing angles while a forward stretches play',()=>{
 const s=play(),before=JSON.stringify(s),plan=planFootballMovement(s);
 const support=plan.filter((p,i)=>i<11&&p?.role==='support'),runs=plan.filter((p,i)=>i<11&&p?.role==='run');
 assert.equal(support.length,2);assert.ok(support[0].z*support[1].z<0);
 assert.ok(support.some(p=>p.x<s.ball.x)&&support.some(p=>p.x>s.ball.x));
 assert.ok(runs.length>=1);assert.ok(runs.every(p=>p.x>s.ball.x+8));
 assert.equal(JSON.stringify(s),before);assert.deepEqual(planFootballMovement(s),plan);
});
test('the defending side assigns one presser and a separate goal-side cover instead of swarming',()=>{
 const s=play(),plan=planFootballMovement(s),away=plan.slice(11);
 assert.equal(away.filter(p=>p?.role==='press').length,1);assert.equal(away.filter(p=>p?.role==='cover').length,1);
 const cover=away.find(p=>p?.role==='cover');assert.ok(cover.x>s.ball.x+3);
 const marks=away.filter(p=>p?.role==='mark');assert.ok(marks.length>0);
 assert.ok(new Set(marks.map(p=>`${p.x},${p.z}`)).size===marks.length,'each marker tracks a different runner');
 assert.ok(away.filter(p=>p&&Math.hypot(p.x-s.ball.x,p.z-s.ball.z)<3).length<=1);
});
test('back lines stay behind a supported attack in every supported formation',()=>{
 for(const formation of ['4-4-2','4-3-3','3-5-2']){
  const s=play(formation);Object.assign(s.players[9],{x:35,z:12});Object.assign(s.ball,{x:35,z:12});
  const plan=planFootballMovement(s),defenders=s.players.map((p,i)=>({p,i})).filter(({p})=>p.team===0&&!p.keeper&&p.baseX<-20);
  assert.ok(defenders.every(({i})=>plan[i].x<s.ball.x-15),formation);
  assert.ok(plan.every(p=>!p||Math.abs(p.x)<=49&&Math.abs(p.z)<=30));
 }
});
test('support looks for a clearer angle when an opponent blocks its passing lane',()=>{
 const s=play(),first=planFootballMovement(s),target=first.find((p,i)=>i<11&&p?.role==='support');
 // Put a defender halfway down that lane; other match state stays unchanged.
 Object.assign(s.players[12],{x:(s.ball.x+target.x)/2,z:(s.ball.z+target.z)/2});
 const next=planFootballMovement(s).filter((p,i)=>i<11&&p?.role==='support');
 assert.ok(next.some(p=>Math.sign(p.z)===Math.sign(target.z)&&Math.abs(p.z-target.z)>1));
});
test('movement plans mirror with possession and attack direction, without a home-field information advantage',()=>{
 const s=play(),plan=planFootballMovement(s),mirrored=structuredClone(s);
 mirrored.players=[...s.players.slice(11),...s.players.slice(0,11)].map(p=>({...p,team:1-p.team,x:-p.x,baseX:-p.baseX,vx:-p.vx,facing:-p.facing}));
 Object.assign(mirrored.ball,{x:-s.ball.x,vx:-s.ball.vx,owner:20,lastTouch:1});mirrored.selected=9;
 const other=planFootballMovement(mirrored);
 for(let i=0;i<22;i++){
  const a=plan[i],b=other[(i+11)%22];assert.equal(a.role,b.role);
  assert.ok(Math.abs(a.x+b.x)<1e-9);assert.ok(Math.abs(a.z-b.z)<1e-9);assert.equal(a.speed,b.speed);
 }
});
test('a turnover immediately replaces attacking runs with pressure, cover and recovery',()=>{
 const s=play();assert.ok(planFootballMovement(s).slice(0,11).some(p=>p?.role==='support'));
 s.ball.owner=20;Object.assign(s.ball,{x:s.players[20].x,z:s.players[20].z});
 const plan=planFootballMovement(s).slice(0,11);assert.ok(!plan.some(p=>p?.role==='support'||p?.role==='run'));
 assert.equal(plan.filter(p=>p?.role==='press').length,1);assert.equal(plan.filter(p=>p?.role==='cover').length,1);
});
test('loose-ball pursuit anticipates a short piece of the ball trajectory for each team',()=>{
 const s=play();Object.assign(s.ball,{owner:null,x:10,z:10,vx:8,vz:-4});
 const plan=planFootballMovement(s);
 for(const side of [plan.slice(0,11),plan.slice(11)]){
  const press=side.filter(p=>p?.role==='press');assert.equal(press.length,1);
  assert.ok(press[0].x>s.ball.x&&press[0].z<s.ball.z);
  assert.ok(Math.hypot(press[0].x-s.ball.x,press[0].z-s.ball.z)<5);
 }
});
function incoming(team){
 const s=play(),receiver=team===0?9:18;
 s.players.forEach((p,i)=>{p.inactive=![0,9,11,18,20].includes(i);p.x=p.team===0?-40:40;p.z=20;p.vx=p.vz=0});
 Object.assign(s.players[0],{x:-48,z:0});Object.assign(s.players[11],{x:48,z:0});
 Object.assign(s.players[receiver],{x:-10,z:3});s.selected=9;s.passTarget=receiver;s.passTeam=team;
 Object.assign(s.ball,{owner:null,x:0,z:0,y:.22,vx:-14,vz:0,vy:0,releasedBy:20,cooldown:.23,lastTouch:team});
 return s;
}
test('an autonomous receiver moves into the pass and completes it under ordinary ball physics',()=>{
 const s=incoming(1),startZ=s.players[18].z;let n=step(s,15);
 assert.ok(n.players[18].z<startZ-.3);
 for(let i=0;i<150&&n.ball.owner===null;i++)n=step(n);
 assert.equal(n.ball.owner,18);assert.equal(n.completedPasses[1],1);
});
test('an idle human receiver meets a pass, and directional or shot input overrides the assist',()=>{
 const s=incoming(0),auto=step(s,12),manual=step(s,12,{z:1}),charge=step(s,12,{shootHeld:true});
 assert.ok(auto.players[9].z<s.players[9].z-.2);assert.ok(manual.players[9].z>s.players[9].z+.2);
 assert.equal(charge.players[9].z,s.players[9].z);assert.ok(charge.charge>0);
});
test('derived tactics survive save/resume deterministically and leave training opponents inactive',()=>{
 let s=step(play(),120,{x:1,z:.4,shield:true});
 const saved=decodeFootballSave(encodeFootballSave(s,'tactics'),'tactics');assert.ok(saved);
 assert.deepEqual(JSON.parse(JSON.stringify(step(s,120))),JSON.parse(JSON.stringify(step(saved.state,120))));
 s=createFootball([],'4-4-2',true);s.phase='playing';const plan=planFootballMovement(s),n=step(s,180);
 assert.ok(s.players.every((p,i)=>!p.inactive||plan[i]===null));
 assert.ok(n.players.every(p=>!p.inactive||p.vx===0&&p.vz===0));
});
