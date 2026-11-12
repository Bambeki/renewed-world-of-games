const {chromium,expect}=require('@playwright/test');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const errors=[],writes=[],base=process.env.WEB_URL||'http://localhost:4000';
  function observe(page){
   if(process.env.CI)page.setDefaultTimeout(60000);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('response',response=>{if(response.status()>=500)errors.push(`${response.status()} ${response.url()}`)});
   page.on('request',request=>{if(request.url().includes('/api/v1/game')&&request.method()!=='GET')writes.push(request.url())});
  }
  // Create the club and its normal checkpoint without a synthetic clock.
  const setup=await browser.newContext({viewport:{width:1280,height:900}}),page=await setup.newPage();observe(page);
  const key=`touch${Date.now()}`;
  await page.goto(base+'/register');await page.getByLabel('Email',{exact:true}).fill(key+'@example.com');await page.getByLabel('Username',{exact:true}).fill(key);await page.getByLabel('Password',{exact:true}).fill('FirstTouch2026!');await page.getByRole('button',{name:'Register',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto(base+'/matches');await page.getByRole('button',{name:'Play 3D match',exact:true}).click();
  const initial=page.getByRole('region',{name:'3D football exhibition',exact:true});
  await expect(initial.getByRole('button',{name:'Kick off',exact:true})).toBeEnabled({timeout:30000});
  await initial.getByLabel('Graphics quality',{exact:true}).selectOption('performance');await initial.getByRole('button',{name:'Kick off',exact:true}).click();
  await expect(initial.getByRole('group',{name:'3D match controls',exact:true})).toHaveAttribute('data-phase','playing',{timeout:30000});
  await initial.getByRole('button',{name:'Pause 3D match',exact:true}).click();
  const saved=await setup.storageState();await setup.close();
  function fixture(moving,longPass){
   const state=JSON.parse(JSON.stringify(saved));
   const entry=state.origins.flatMap(o=>o.localStorage).find(e=>e.name.startsWith('rwog.football.match.v1:')&&e.name.endsWith(':exhibition'));
   if(!entry)throw Error('Expected the exhibition checkpoint created by pause');
   const value=JSON.parse(entry.value),s=value.state;
   s.phase='playing';s.phaseTime=0;s.elapsed=10;s.selected=9;s.charge=0;s.actionBuffer=undefined;
   s.score=[0,0];s.shots=[0,0];s.passes=[1,0];s.completedPasses=[0,0];s.possession=[5,5];s.passTarget=9;s.passTeam=0;s.keeperHold=0;
   s.players.forEach((p,i)=>{
    Object.assign(p,{inactive:false,vx:0,vz:0,kick:0,tackle:0,skill:0,gait:0,touchClock:0,receiving:0,pressure:0,decisionClock:0,shielding:false});
    p.x=i<11?-30-i:32+i%3;p.z=(i%5-2)*6;
   });
   Object.assign(s.players[0],{x:-48,z:0});Object.assign(s.players[11],{x:48,z:0});
   Object.assign(s.players[9],{x:0,z:0,facing:Math.PI/2});Object.assign(s.players[10],{x:14,z:10});
   Object.assign(s.ball,{x:longPass?-10:-2.3,y:.22,z:0,vx:moving?18:0,vy:0,vz:0,owner:null,lastTouch:0,releasedBy:8,cooldown:.23});
   value.savedAt=Date.now();entry.value=JSON.stringify(value);return state;
  }
  async function scenario(moving,run,longPass=false){
   // Each scenario starts through the public device-save interface in an isolated
   // context. No live simulation objects or application globals are modified.
   const context=await browser.newContext({storageState:fixture(moving,longPass),viewport:{width:1280,height:900}});
   try{
    const page=await context.newPage();observe(page);await page.goto(base+'/matches');
    await expect(page.getByRole('button',{name:'Play 3D match',exact:true})).toBeVisible();
    await page.clock.install();await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+200));
    await page.getByRole('button',{name:'Play 3D match',exact:true}).press('Enter');
    const region=page.getByRole('region',{name:'3D football exhibition',exact:true}),controls=region.getByRole('group',{name:'3D match controls',exact:true}),resume=region.getByRole('button',{name:/^Resume saved match/});
    for(let attempt=0;attempt<200;attempt++){
     if(await resume.isVisible()&&await resume.isEnabled())break;
     await page.clock.runFor(32);await page.waitForTimeout(50);
    }
    await expect(resume).toBeEnabled();await resume.press('Enter');
    await expect(controls).toHaveAttribute('data-ball-owner','loose');
    await region.getByRole('button',{name:'Continue play',exact:true}).press('Enter');
    await run(page,controls);
   }finally{await context.close()}
  }
  await scenario(true,async(page,controls)=>{
   await page.keyboard.press('p');await page.clock.runFor(350);
   await expect(controls).toHaveAttribute('data-home-passes','2');await expect(controls).toHaveAttribute('data-buffered-action','');
  });
  await scenario(true,async(page,controls)=>{
   await page.keyboard.down('Space');await page.clock.runFor(550);
   await expect(controls).toHaveAttribute('data-ball-owner','loose');expect(Number(await controls.getAttribute('data-charge'))).toBeGreaterThan(.4);
   await page.keyboard.up('Space');await page.clock.runFor(350);
   await expect(controls).toHaveAttribute('data-shots','1');await expect(controls).toHaveAttribute('data-buffered-action','');
  },true);
  await scenario(false,async(page,controls)=>{
   await page.keyboard.press('Space');await page.clock.runFor(120);
   await expect(controls).toHaveAttribute('data-buffered-action','shoot');await page.keyboard.press('Escape');
   await expect(controls).toHaveAttribute('data-buffered-action','');await expect(controls).toHaveAttribute('data-shots','0');
  });
  expect(writes).toEqual([]);expect(errors).toEqual([]);
  console.log('PASS first-touch browser: valid device-checkpoint restoration, first-time pass and shot through ordinary keyboard controls, pause cancellation and unchanged league; no page/5xx errors.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
