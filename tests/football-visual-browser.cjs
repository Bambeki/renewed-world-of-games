const {chromium,expect}=require('@playwright/test'),fs=require('node:fs');
async function capture(element,path){
 await element.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await element.page().screenshot({path,clip:await element.boundingBox(),timeout:30000});
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+r.url())});
  const base=process.env.WEB_URL||'http://localhost:4000',key='visual'+Date.now(),out=process.env.FOOTBALL_VISUAL_SCREENSHOTS;
  await page.goto(base+'/register');await page.getByLabel('Email',{exact:true}).fill(key+'@example.com');await page.getByLabel('Username',{exact:true}).fill(key);await page.getByLabel('Password',{exact:true}).fill('VisualFootball2026!');await page.getByRole('button',{name:'Register',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto(base+'/matches');await page.getByRole('button',{name:'Play 3D match',exact:true}).click();
  const region=page.getByRole('region',{name:'3D football exhibition',exact:true}),controls=region.getByRole('group',{name:'3D match controls',exact:true}),canvas=controls.locator('canvas');
  await expect(region.getByRole('button',{name:'Kick off',exact:true})).toBeEnabled({timeout:30000});
  await region.getByLabel('Graphics quality',{exact:true}).selectOption('performance');await page.bringToFront();
  await region.getByRole('button',{name:'Kick off',exact:true}).click();await expect(controls).toHaveAttribute('data-phase','playing',{timeout:30000});
  const x=Number(await controls.getAttribute('data-controlled-x')),pose=await canvas.getAttribute('data-player-pose');
  await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');
  expect(Number(await controls.getAttribute('data-controlled-x'))).toBeGreaterThan(x+0.15);
  expect(await canvas.getAttribute('data-player-pose')).not.toBe(pose);
  await region.getByRole('button',{name:'Pause 3D match',exact:true}).click();await page.waitForTimeout(200);
  const frozen=await canvas.getAttribute('data-player-pose');await page.waitForTimeout(300);expect(await canvas.getAttribute('data-player-pose')).toBe(frozen);
  if(out)fs.mkdirSync(out,{recursive:true});
  for(const camera of ['telecast','close','follow','broadcast']){
   await region.getByLabel('3D camera',{exact:true}).selectOption(camera);await page.waitForTimeout(650);
   if(out)await capture(controls,out+'/matchday-'+camera+'.png');
  }
  for(const [width,height] of [[1440,950],[768,950],[390,950],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(250);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'overflow '+width+'x'+height).toBe(false);
   if(out)await capture(region,out+'/matchday-'+width+'x'+height+'.png');
  }
  page.once('dialog',d=>d.accept());await region.getByRole('button',{name:'Close 3D match',exact:true}).click();await expect(region).toHaveCount(0);expect(errors).toEqual([]);
  console.log('PASS real-time football: ordinary RAF kickoff, keyboard movement and bone animation, frozen pause, four cameras, desktop/tablet/phone portrait/landscape, screenshots and close; no page/5xx errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
