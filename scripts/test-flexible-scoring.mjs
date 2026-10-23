import mysql from 'mysql2/promise';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const name=`satunilai_scoring_test_${Date.now()}`;
const scratch=await mkdtemp(join(tmpdir(),'satunilai-scoring-'));
const env={...process.env,DB_HOST:'127.0.0.1',DB_PORT:process.env.TEST_DB_PORT??'3307',DB_NAME:name,DB_USER:'root',DB_PASSWORD:process.env.DB_ROOT_PASSWORD,EVIDENCE_DIR:join(scratch,'evidence'),NODE_ENV:'production',TEST_BASE_URL:'http://127.0.0.1:3002'};
const root=await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASSWORD});
const run=(args)=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Test command exited ${code}`)));});
let server;let log;
try {
  await root.query(`CREATE DATABASE \`${name}\``);
  await run(['scripts/init-db.mjs']);
  log=await open(join(scratch,'server.log'),'w');
  server=spawn(process.execPath,['node_modules/vinext/dist/cli.js','start','--hostname','127.0.0.1','--port','3002'],{env,stdio:['ignore',log.fd,log.fd]});
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {
    if(server.exitCode!=null) throw new Error(`Test server stopped: ${server.exitCode}`);
    try { if((await fetch(`${env.TEST_BASE_URL}/api/health`)).ok) {ready=true;break;} } catch { /* Wait for readiness, not a fixed startup delay. */ }
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ready) throw new Error('Test server readiness timeout');
  await run(['--test','tests/flexible-scoring.integration.test.mjs','tests/docker-integration.test.mjs']);
} catch(error) {
  if(log) {const {readFile}=await import('node:fs/promises');process.stderr.write((await readFile(join(scratch,'server.log'),'utf8')).slice(-5000));}
  throw error;
} finally {
  if(server && server.exitCode==null) {const ended=new Promise(resolve=>server.once('exit',resolve));server.kill('SIGTERM');await Promise.race([ended,new Promise(resolve=>setTimeout(resolve,3000))]);if(server.exitCode==null)server.kill('SIGKILL');}
  await log?.close();
  await root.query(`DROP DATABASE IF EXISTS \`${name}\``);await root.end();await rm(scratch,{recursive:true,force:true});
}
