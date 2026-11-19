const {chromium,expect}=require('@playwright/test'),fs=require('node:fs');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const errors=[],api=[],base=process.env.WEB_URL||'http://localhost:4000',out=process.env.FOOTBALL_VISUAL_SCREENSHOTS;
 function observe(page){
  if(process.env.CI)page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+r.url())});
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url())});
 }
 const region=page=>page.getByRole('region',{name:'3D football exhibition',exact:true});
 const controls=page=>region(page).getByRole('group',{name:'3D match controls',exact:true});
 async function open(page,mocked=false){
  await page.getByRole('button',{name:'Play quick match',exact:true}).press('Enter');
  const kick=region(page).getByRole('button',{name:'Kick off',exact:true});
  if(mocked)for(let i=0;i<200;i++){
   if(await kick.isVisible()&&await kick.isEnabled())break;
   await page.clock.runFor(32);await page.waitForTimeout(40);
  }
  await expect(kick).toBeEnabled({timeout:30000});
 }
 try{
  // Ordinary wall time is essential here: a mocked RAF cannot benchmark a device.
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),page=await context.newPage();observe(page);
  await page.goto(base+'/games/football');await open(page);
  await region(page).getByRole('button',{name:'Kick off',exact:true}).click();
  await expect(controls(page)).toHaveAttribute('data-phase','playing',{timeout:30000});
  // Ensure active play has advanced beyond kickoff before testing the save.
  const before=Number(await controls(page).getAttribute('data-controlled-x'));
  await controls(page).focus();await page.keyboard.down('d');
  await expect.poll(async()=>Number(await controls(page).getAttribute('data-controlled-x')),{timeout:10000}).toBeGreaterThan(before+.2);
  await page.keyboard.up('d');
  await region(page).getByText('Performance on this device',{exact:true}).click();
  const reportButton=region(page).getByRole('button',{name:'Download performance report',exact:true});
  await expect(reportButton).toBeVisible({timeout:45000});
  await region(page).getByRole('button',{name:'Pause 3D match',exact:true}).click();
  const sample=await region(page).getByLabel('Last active performance sample',{exact:true}).innerText();
  await page.waitForTimeout(300);await expect(region(page).getByLabel('Last active performance sample',{exact:true})).toHaveText(sample,{useInnerText:true});
  const pending=page.waitForEvent('download');await reportButton.click();const download=await pending;
  expect(download.suggestedFilename()).toBe('rwg-football-performance.json');
  const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
  const report=JSON.parse(Buffer.concat(chunks).toString());
  expect(report.version).toBe(1);expect(report.fps).toBeGreaterThan(0);expect(report.p95FrameMs).toBeGreaterThan(0);
  expect(report.frames).toBeGreaterThanOrEqual(8);expect(report.width*report.height).toBeLessThanOrEqual(2_000_000);
  expect(report.drawCalls).toBeGreaterThan(0);expect(report.animatedPlayers).toBeGreaterThan(0);expect(report.animatedPlayers).toBeLessThanOrEqual(22);
  for(const key of ['token','signature','state','roster','home','away'])expect(report[key]).toBeUndefined();
  if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/football-performance.json',JSON.stringify(report,null,2));await page.screenshot({path:out+'/football-performance.png',fullPage:true})}
  const saved=await context.storageState();
  // Repeated open/close releases the independent skeletons, renderer and input loop.
  for(let i=0;i<2;i++){
   if(i===0)page.once('dialog',d=>d.accept());
   await region(page).getByRole('button',{name:'Close 3D match',exact:true}).click();await expect(region(page)).toHaveCount(0);
   await open(page);await expect(controls(page).locator('canvas')).toHaveCount(1);
  }
  await context.close();

  for(const [kind,ball] of [
   ['throw-in',{x:0,z:34.15,vx:0,vz:12}],
   ['corner',{x:52.65,z:12,vx:8,vz:0}],
   ['goal-kick',{x:-52.65,z:12,vx:-8,vz:0}],
   ['fulltime',{x:0,z:0,vx:0,vz:0}],
  ]){
   // Seed only a validated device checkpoint, then exercise ordinary controls.
   const state=structuredClone(saved),entry=state.origins.flatMap(o=>o.localStorage).find(e=>e.name==='rwog.football.match.v1:quickplay:4-4-2:exhibition');
   if(!entry)throw Error('Expected public quick-play checkpoint');
   const value=JSON.parse(entry.value),s=value.state;
   Object.assign(s,{phase:'playing',phaseTime:0,elapsed:10,selected:9,charge:0,keeperHold:0,actionBuffer:undefined,restart:undefined,passTarget:undefined,passTeam:undefined,score:[0,0],passes:[0,0],completedPasses:[0,0]});
   if(kind==='fulltime')s.elapsed=179.95;
   s.players.forEach(p=>Object.assign(p,{x:p.baseX,z:p.baseZ,vx:0,vz:0,kick:0,tackle:0,skill:0,receiving:0,throwing:0,pressure:0}));
   Object.assign(s.ball,ball,{y:.22,vy:0,owner:null,lastTouch:1,cooldown:1,releasedBy:undefined,restartKind:undefined});
   entry.value=JSON.stringify(value);
   const context=await browser.newContext({storageState:state,viewport:{width:1280,height:900}}),page=await context.newPage();observe(page);
   try{
    await page.goto(base+'/games/football');await expect(page.getByRole('button',{name:'Play quick match',exact:true})).toBeVisible();
    await page.clock.install();await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+200));
    await open(page,true);await region(page).getByRole('button',{name:/^Resume saved match/}).press('Enter');
    await region(page).getByRole('button',{name:'Continue play',exact:true}).press('Enter');await page.clock.runFor(160);
    if(kind==='fulltime'){
     await expect(controls(page)).toHaveAttribute('data-phase','fulltime');
     const saved=await page.evaluate(()=>localStorage.getItem('rwog.football.match.v1:quickplay:4-4-2:exhibition'));
     expect(JSON.parse(saved).state.phase).toBe('fulltime');
     page.once('dialog',d=>d.accept());await region(page).getByRole('button',{name:'Play again',exact:true}).press('Enter');
     await expect(controls(page)).toHaveAttribute('data-phase','kickoff');await expect(region(page).getByRole('button',{name:'Kick off',exact:true})).toBeEnabled();
     continue;
    }
    await expect(controls(page)).toHaveAttribute('data-restart',kind);await expect(controls(page)).toHaveAttribute('data-restart-team','0');
    await expect(controls(page)).toHaveAttribute('data-phase','restart');
    const notice=region(page).getByRole('status',{name:'Restart instructions',exact:true});
    await expect(notice).toBeVisible();await expect(notice).toContainText(kind==='throw-in'?'THROW-IN':kind==='corner'?'CORNER':'GOAL KICK');
    if(out){
     await page.clock.runFor(500);await page.screenshot({path:out+'/football-'+kind+'-setup.png',fullPage:true});
     if(kind==='throw-in'){
      for(const [width,height] of [[390,950],[844,390]]){
       await page.setViewportSize({width,height});await page.clock.runFor(160);
       expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
       await page.screenshot({path:out+`/football-throw-in-${width}x${height}.png`,fullPage:true});
      }
      await page.setViewportSize({width:1280,height:900});await page.clock.runFor(160);
     }
    }
    await page.keyboard.press('Escape');await page.clock.runFor(100);
    const checkpoint=await page.evaluate(()=>localStorage.getItem('rwog.football.match.v1:quickplay:4-4-2:exhibition'));
    expect(JSON.parse(checkpoint).state.restart.kind).toBe(kind);
    await region(page).getByRole('button',{name:'Continue play',exact:true}).press('Enter');
    await page.keyboard.down('a');await page.clock.runFor(500);await page.keyboard.press('p');await page.clock.runFor(150);await page.keyboard.up('a');
    await expect(controls(page)).toHaveAttribute('data-phase','playing');await expect(controls(page)).toHaveAttribute('data-restart','');
    await expect(controls(page)).toHaveAttribute('data-home-passes','1');
    await page.keyboard.press('Escape');
    if(out){await page.clock.resume();await page.screenshot({path:out+'/football-'+kind+'.png',fullPage:true})}
   }finally{await context.close()}
  }
  expect(errors).toEqual([]);expect(api).toEqual([]);
  console.log('PASS browser release: real-time movement, frame report and JSON download, paused metrics, two renderer reopen cycles, throw-in/corner/goal-kick awards and directional releases through ordinary controls, checkpoint saves, full-time save and replay; no API requests, page exceptions or 5xx responses.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
