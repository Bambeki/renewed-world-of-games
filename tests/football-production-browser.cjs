const {chromium,expect}=require('@playwright/test'),fs=require('node:fs');
async function capture(element,path){await element.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await element.page().screenshot({path,clip:await element.boundingBox()})}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+r.url())});page.on('request',r=>{if(r.url().includes('/api/v1/game')&&r.method()!=='GET')writes.push(r.url())});
  const base=process.env.WEB_URL||'http://localhost:4000',key='matchday'+Date.now();
  await page.goto(base+'/register');await page.getByLabel('Email',{exact:true}).fill(key+'@example.com');await page.getByLabel('Username',{exact:true}).fill(key);await page.getByLabel('Password',{exact:true}).fill('MatchdayBuild!2026');await page.getByRole('button',{name:'Register',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto(base+'/matches');await page.clock.install();await page.getByRole('button',{name:'Play 3D match',exact:true}).click();
  const region=page.getByRole('region',{name:'3D football exhibition',exact:true}),controls=region.getByRole('group',{name:'3D match controls',exact:true});
  await expect(region.getByRole('button',{name:'Kick off',exact:true})).toBeEnabled({timeout:30000});
  await expect(region.getByLabel('3D camera',{exact:true})).toHaveValue('telecast');
  await region.getByLabel('Graphics quality',{exact:true}).selectOption('performance');
  await expect(controls.locator('canvas')).toHaveAttribute('data-graphics-quality','performance');
  await region.getByLabel('Opponent difficulty',{exact:true}).selectOption('casual');
  await region.getByRole('button',{name:'Kick off',exact:true}).click();await page.clock.runFor(2300);
  await expect(controls).toHaveAttribute('data-phase','playing');
  await expect(region.getByLabel('Opponent difficulty',{exact:true})).toBeDisabled();
  const before=Number(await controls.getAttribute('data-controlled-x'));
  await page.keyboard.down('d');await page.keyboard.down('s');await page.clock.runFor(700);await page.keyboard.up('d');await page.keyboard.up('s');
  expect(Number(await controls.getAttribute('data-controlled-x'))).toBeGreaterThan(before+0.5);
  await region.getByRole('button',{name:'Pause 3D match',exact:true}).click();
  const savedX=await controls.getAttribute('data-controlled-x'),savedZ=await controls.getAttribute('data-controlled-z');
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('rwog.football.match.v1:')))).toBe(true);
  await page.reload();await page.getByRole('button',{name:'Play 3D match',exact:true}).click();
  await expect(region.getByRole('button',{name:/^Resume saved match/})).toBeVisible({timeout:30000});
  await region.getByRole('button',{name:/^Resume saved match/}).click();
  await expect(controls).toHaveAttribute('data-controlled-x',savedX);await expect(controls).toHaveAttribute('data-controlled-z',savedZ);
  await expect(region.getByLabel('Graphics quality',{exact:true})).toHaveValue('performance');
  await expect(region.getByLabel('Opponent difficulty',{exact:true})).toHaveValue('casual');
  await region.getByRole('button',{name:'Continue play',exact:true}).click();await page.clock.runFor(300);
  await region.getByLabel('3D camera',{exact:true}).selectOption('close');await page.clock.runFor(500);
  if(process.env.FOOTBALL3D_SCREENSHOTS){fs.mkdirSync(process.env.FOOTBALL3D_SCREENSHOTS,{recursive:true});await capture(controls,process.env.FOOTBALL3D_SCREENSHOTS+'/matchday-playing.png')}
  await region.getByRole('button',{name:'Pause 3D match',exact:true}).click();await page.clock.runFor(200);
  for(const [width,height] of [[1440,950],[768,950],[390,950],[844,390]]){
   await page.setViewportSize({width,height});await page.clock.runFor(300);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'viewport overflow at '+width).toBe(false);
   if(process.env.FOOTBALL3D_SCREENSHOTS)await capture(region,process.env.FOOTBALL3D_SCREENSHOTS+'/matchday-'+width+'x'+height+'.png');
  }
  page.once('dialog',d=>d.accept());await region.getByRole('button',{name:'Close 3D match',exact:true}).click();await expect(region).toHaveCount(0);
  await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('rwog.football.match.v1:'));localStorage.setItem(k,'{broken')});
  await page.reload();await page.getByRole('button',{name:'Play 3D match',exact:true}).click();
  await expect(region.getByText(/previous save is incompatible/)).toBeVisible();await expect(region.getByRole('button',{name:/^Resume saved match/})).toHaveCount(0);
  await expect(region.getByRole('button',{name:'Kick off',exact:true})).toBeEnabled({timeout:30000});
  expect(writes).toEqual([]);expect(errors).toEqual([]);
  console.log('PASS matchday Chromium: TV camera, graphics switching, difficulty, movement, isolated device save/reload/resume, persisted settings, corrupt save recovery, desktop/tablet/phone layouts including landscape and unchanged league; no page/5xx errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
