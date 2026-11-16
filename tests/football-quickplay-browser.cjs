const {chromium,expect}=require('@playwright/test'),fs=require('node:fs');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[],api=[];
  if(process.env.CI)page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+r.url())});
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url())});
  const base=process.env.WEB_URL||'http://localhost:4000',out=process.env.FOOTBALL_VISUAL_SCREENSHOTS;
  if(out)fs.mkdirSync(out,{recursive:true});
  await page.goto(base+'/');await page.getByRole('link',{name:'Play football now',exact:true}).click();
  await expect(page).toHaveURL(/\/games\/football$/);
  await expect(page.getByText('No sign-in needed',{exact:true})).toBeVisible();
  for(const [width,height] of [[1280,950],[390,844],[844,390]]){
   await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
   if(out)await page.screenshot({path:out+`/quick-play-${width}x${height}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1280,height:950});
  await page.getByLabel('Your formation',{exact:true}).selectOption('4-3-3');
  // Hydration precedes the clock, and the clock precedes the 3D renderer.
  await page.clock.install();await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+200));
  const region=page.getByRole('region',{name:'3D football exhibition',exact:true}),controls=region.getByRole('group',{name:'3D match controls',exact:true});
  async function open(name){
   await page.getByRole('button',{name,exact:true}).press('Enter');
   for(let i=0;i<200;i++){
    const kick=region.getByRole('button',{name:'Kick off',exact:true});
    if(await kick.isVisible()&&await kick.isEnabled())break;
    await page.clock.runFor(32);await page.waitForTimeout(50);
   }
   await expect(region.getByRole('button',{name:'Kick off',exact:true})).toBeEnabled();
  }
  async function close(played=false){
   if(played)page.once('dialog',d=>d.accept());
   await region.getByRole('button',{name:'Close 3D match',exact:true}).press('Enter');await expect(region).toHaveCount(0);
  }
  await open('Play quick match');
  await expect(region.getByText('11 v 11 · 4-3-3 · Exhibition XI · Exhibition',{exact:true})).toBeVisible();
  await region.getByLabel('Graphics quality',{exact:true}).selectOption('performance');
  const minimap=region.getByRole('img',{name:'Live tactical minimap',exact:true});
  const positions=()=>minimap.locator('circle[fill="#6ae6b9"],circle[fill="#f1776a"]').evaluateAll(nodes=>nodes.map(n=>({x:Number(n.getAttribute('cx')),z:Number(n.getAttribute('cy'))})));
  const before=await positions();expect(before.length).toBe(22);
  await region.getByRole('button',{name:'Kick off',exact:true}).press('Enter');await page.keyboard.down('f');await page.clock.runFor(3000);await page.keyboard.up('f');
  await expect(controls).toHaveAttribute('data-phase','playing');const after=await positions();
  const moving=after.filter((p,i)=>i!==9&&Math.hypot(p.x-before[i].x,p.z-before[i].z)>.4);
  expect(moving.length).toBeGreaterThan(10);
  const x=Number(await controls.getAttribute('data-controlled-x'));
  await page.keyboard.down('d');await page.clock.runFor(350);await page.keyboard.up('d');
  expect(Number(await controls.getAttribute('data-controlled-x'))).toBeGreaterThan(x+.2);
  await region.getByRole('button',{name:'Pause 3D match',exact:true}).press('Enter');await page.clock.runFor(150);
  const savedX=await controls.getAttribute('data-controlled-x'),savedZ=await controls.getAttribute('data-controlled-z');
  if(out)await page.screenshot({path:out+'/quick-play-match.png'});
  await close(true);
  // The anonymous saves cannot replace club checkpoints or another formation/drill.
  await page.getByLabel('Your formation',{exact:true}).selectOption('4-4-2');await open('Play quick match');
  await expect(region.getByRole('button',{name:/^Resume saved match/})).toHaveCount(0);await close();
  await page.getByLabel('Your formation',{exact:true}).selectOption('4-3-3');await open('Play quick match');
  await region.getByRole('button',{name:/^Resume saved match/}).press('Enter');
  await expect(controls).toHaveAttribute('data-controlled-x',savedX);await expect(controls).toHaveAttribute('data-controlled-z',savedZ);await close(true);
  await open('Practice finishing');await expect(region).toHaveAttribute('data-mode','training');
  await expect(region.getByRole('button',{name:/^Resume saved match/})).toHaveCount(0);expect((await positions()).length).toBe(2);
  await close();
  expect(api).toEqual([]);expect(errors).toEqual([]);
  console.log('PASS anonymous football: home entry, responsive setup, 4-3-3 exhibition, 22 players, coordinated off-ball movement, keyboard control, isolated formation/training saves and resume; no API requests, page errors or 5xx responses.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
