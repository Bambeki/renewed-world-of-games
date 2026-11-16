const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateProductionEnvironment,jwtAccessSeconds}=require('../dist/config/production');
const {AttemptWindow}=require('../dist/auth/guards/auth-rate-limit.guard');
test('production refuses missing secrets and non-HTTPS origins',()=>{
 const env={NODE_ENV:'production',JWT_SECRET:'test-only-32-character-key-never-deploy',DATABASE_URL:'postgresql://user:password@db/app',CORS_ORIGIN:'https://example.com'};
 assert.doesNotThrow(()=>validateProductionEnvironment(env));
 for(const change of [{JWT_SECRET:undefined},{JWT_SECRET:'development-secret'},{DATABASE_URL:undefined},{CORS_ORIGIN:'http://example.com'},{CORS_ORIGIN:'https://example.com/path'}])assert.throws(()=>validateProductionEnvironment({...env,...change}));
 assert.doesNotThrow(()=>validateProductionEnvironment({NODE_ENV:'test'}));
});
test('JWT lifetime honors configuration and rejects unbounded/invalid values',()=>{
 assert.equal(jwtAccessSeconds('2h'),7200);assert.equal(jwtAccessSeconds(),900);
 for(const value of ['forever','0m','7d','-1h','1.5h'])assert.throws(()=>jwtAccessSeconds(value));
});
test('authentication limiter isolates callers and permits retry after expiry',()=>{
 const limiter=new AttemptWindow();assert.equal(limiter.allow('caller-a',2,1000),0);assert.equal(limiter.allow('caller-a',2,1100),0);
 assert.equal(limiter.allow('caller-a',2,1200),60);assert.equal(limiter.allow('caller-b',2,1200),0);assert.equal(limiter.allow('caller-a',2,61001),0);
});
test('new passwords reject bcrypt truncation while legacy long passwords still log in',async()=>{
 const bcrypt=require('bcrypt'),{AuthService}=require('../dist/auth/auth.service');
 const password='legacy-long-password-'.repeat(5),user={id:'test-user',email:'test@example.com',username:'legacy',passwordHash:await bcrypt.hash(password,4)};
 const service=new AuthService({user:{findUnique:async()=>user}},{sign:()=> 'test-token'});
 assert.equal((await service.login(user.email,password)).access_token,'test-token');
 await assert.rejects(service.register('new@example.com','newuser',password),/72 UTF-8 bytes/);
});
