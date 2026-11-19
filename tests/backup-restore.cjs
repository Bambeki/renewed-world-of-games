// Rehearsal against the disposable CI database only. Never restores over source.
const {PrismaClient}=require('@prisma/client'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const sourceUrl=new URL(process.env.DATABASE_URL||'postgresql://invalid/invalid');
if(process.env.CI!=='true'||sourceUrl.pathname!=='/rwog_test')throw Error('Backup rehearsal requires CI=true and the disposable rwog_test database.');
const restoredName=`rwog_restore_${process.pid}`,restoredUrl=new URL(sourceUrl);restoredUrl.pathname='/'+restoredName;
const source=new PrismaClient(),restored=new PrismaClient({datasources:{db:{url:restoredUrl.href}}});
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rwog-restore-')),backup=path.join(directory,'backup.dump');
const pgEnv={...process.env,PGHOST:sourceUrl.hostname,PGPORT:sourceUrl.port||'5432',PGUSER:decodeURIComponent(sourceUrl.username),PGPASSWORD:decodeURIComponent(sourceUrl.password),PGDATABASE:'rwog_test'};
function run(command,args,env=pgEnv){
 const r=spawnSync(command,args,{env,encoding:'utf8',timeout:60000});
 if(r.error||r.status!==0)throw Error(`${command} failed (${r.status}): ${r.error?.message||r.stderr}`);
}
async function snapshot(client){
 const tables=await client.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
 const rows=[];
 for(const {tablename} of tables){
  const name='"'+tablename.replace(/"/g,'""')+'"';
  const data=await client.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM public.${name} t ORDER BY to_jsonb(t)::text`);
  rows.push({table:tablename,rows:data.length,sha256:crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')});
 }
 return rows;
}
(async()=>{
 let created=false;
 const began=Date.now();
 try{
  const before=await snapshot(source);
  assert.ok(before.find(t=>t.table==='users')?.rows>0,'registered test users must exist');
  assert.ok(before.find(t=>t.table==='game_states')?.rows>0,'played manager states must exist');
  run('pg_dump',['--format=custom','--no-owner','--file',backup]);
  await source.$executeRawUnsafe(`CREATE DATABASE "${restoredName}"`);created=true;
  run('pg_restore',['--no-owner','--no-privileges','--exit-on-error','--dbname',restoredName,backup]);
  const after=await snapshot(restored);assert.deepEqual(after,before,'every restored table must match its source row count and complete row digest');
  const report={verifiedAt:new Date().toISOString(),elapsedMs:Date.now()-began,archiveBytes:fs.statSync(backup).size,tables:after,scope:'Disposable CI database. The deployment host and off-site backups require a separate rehearsal.'};
  if(process.env.RESTORE_REPORT)fs.writeFileSync(process.env.RESTORE_REPORT,JSON.stringify(report,null,2));
  console.log(`PASS PostgreSQL backup/restore: ${after.length} tables, ${after.reduce((n,t)=>n+t.rows,0)} rows identical; restored into a separate database and removed it. Source not changed.`);
 }finally{
  await restored.$disconnect();
  try{if(created)await source.$executeRawUnsafe(`DROP DATABASE "${restoredName}"`)}finally{await source.$disconnect();fs.rmSync(directory,{recursive:true,force:true})}
 }
})().catch(error=>{console.error(error);process.exit(1)});
