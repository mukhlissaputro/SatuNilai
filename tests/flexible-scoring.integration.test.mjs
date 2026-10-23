import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { matrix } from '../scripts/setup-itkp-2026.mjs';
import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';

const base = process.env.TEST_BASE_URL;
test('direct scoring: fresh ITKP matrix, bounds, evidence, review, finalization and consistent exports', {skip: !base}, async () => {
  let cookie='';
  async function call(path,method='GET',data,status=200) {
    const response=await fetch(`${base}${path}`,{method,headers:{origin:base,cookie,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
    assert.equal(response.status,status,`${method} ${path}: ${await response.clone().text()}`);
    return response;
  }
  async function login(email,password) {
    const response=await call('/api/auth/login','POST',{email,password});
    cookie=response.headers.get('set-cookie').split(';')[0]; return cookie;
  }
  const admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
  const create=async(data)=>(await(await call('/api/admin','POST',data,201)).json()).id;
  const typeId=await create({resource:'type',code:'ITKP',name:'ITKP test',isPublic:true});
  const periodId=await create({resource:'period',typeId,year:2026,maxScore:100,scoringMode:'direct_points',name:'ITKP 2026',startsAt:'2026-01-01',dueAt:'2026-12-31'});
  const setup=()=>{const result=spawnSync(process.execPath,['scripts/setup-itkp-2026.mjs','--apply'],{env:process.env,encoding:'utf8'});assert.equal(result.status,0,result.stderr+result.stdout);return JSON.parse(result.stdout.trim());};
  assert.equal(setup().maximum,100);assert.equal(setup().unchanged,true);
  await create({resource:'user',email:'scoring-staff@localhost',name:'Scoring staff',role:'staff',password:'Scoring-test-2026!',assessmentTypeIds:[typeId]});
  await login('scoring-staff@localhost','Scoring-test-2026!');
  let workspace=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(workspace.indicators.length,12);assert.equal(workspace.selectedPeriod.scoringMode,'direct_points');
  assert.deepEqual(workspace.indicators.map(i=>i.maxValue),matrix.flatMap(c=>c[3].flatMap(s=>s[3].map(i=>i[2]))));
  const renaksi=workspace.indicators.find(i=>i.code==='2.3.1');
  const maturity=workspace.indicators.find(i=>i.code==='3.1.1');
  for(const [indicator,value] of [[renaksi,6.01],[maturity,30.01],[renaksi,-1],[renaksi,null],[renaksi,'']]) await call('/api/assessment-workspace','POST',{periodId,indicatorId:indicator.id,value},400);
  for(const indicator of workspace.indicators) {
    const value=indicator.id===renaksi.id?4:indicator.id===maturity.id?21:0;
    const {scoreId}=await(await call('/api/assessment-workspace','POST',{periodId,indicatorId:indicator.id,value})).json();
    // Two pieces of evidence must not double the score.
    for(let n=0;n<(indicator.id===renaksi.id?2:1);n++) {
      const data=new FormData(); data.set('scoreId',scoreId);data.set('title','Scoring fixture');data.set('url','https://example.com/proof');
      const response=await fetch(`${base}/api/evidence`,{method:'POST',headers:{origin:base,cookie},body:data});
      assert.equal(response.status,201,await response.text());
    }
  }
  workspace=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(workspace.subcategories.reduce((sum,s)=>sum+s.score,0),25);
  const dashboard=await(await call(`/api/dashboard?periodId=${periodId}`)).json();
  assert.equal(dashboard.categories.reduce((sum,c)=>sum+c.score,0),0);
  assert.equal(dashboard.categories.reduce((sum,c)=>sum+c.internalScore,0),25);
  assert.equal(dashboard.metrics.currentValue,0);assert.equal(dashboard.history.find(h=>h.year===2026).value,0);
  assert.equal(setup().scores,12); // Re-running configuration preserves entered values.
  cookie=admin;
  await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId},409);
  for(const indicator of workspace.indicators) await call('/api/assessment-workspace','PATCH',{action:'review',scoreId:indicator.scoreId,decision:'approved'});
  await call('/api/admin','PATCH',{resource:'indicator',id:renaksi.id,name:renaksi.name,code:renaksi.code,maxValue:3,weight:6},409);
  await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId,finalValues:{tampered:1000}});
  const publicData=await(await call('/api/public-dashboard')).json();
  assert.equal(publicData.assessments.find(t=>t.id===typeId).latest.score,25);
  const final=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(final.subcategories.reduce((sum,s)=>sum+s.finalValue,0),25);
  const excel=await(await call(`/api/reports/excel?periodId=${periodId}`)).text();
  assert.match(excel,/Total Final/);assert.match(excel,/>25<\/Data>/);assert.match(excel,/Maksimum Indikator/);
  const pdf=await(await call(`/api/reports/pdf?periodId=${periodId}`)).text();
  assert.match(pdf,/%PDF/);assert.match(pdf,/25,00/);
  await call('/api/admin','PATCH',{resource:'indicator',id:renaksi.id,name:renaksi.name,code:renaksi.code,maxValue:6,weight:6},409);
});

test('Rencana Pengadaan: two accepted indicators and one rejected show 7.5 of 10 and 2 of 3 accepted', {skip:!base}, async () => {
  let cookie='';
  const call=async(path,method='GET',data,status=200)=>{
    const response=await fetch(`${base}${path}`,{method,headers:{origin:base,cookie,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
    assert.equal(response.status,status,await response.clone().text());return response;
  };
  const login=async(email,password)=>{const response=await call('/api/auth/login','POST',{email,password});cookie=response.headers.get('set-cookie').split(';')[0];return cookie;};
  const admin=await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
  const create=async data=>(await(await call('/api/admin','POST',data,201)).json()).id;
  const typeId=await create({resource:'type',code:'VERIFY',name:'Verified contribution'});
  const periodId=await create({resource:'period',typeId,year:2026,maxScore:10,scoringMode:'direct_points',name:'Rencana verification',startsAt:'2026-01-01',dueAt:'2026-12-31'});
  const config=await(await call('/api/admin')).json();const versionId=config.periods.find(row=>row.id===periodId).instrumentVersionId;
  const category=await create({resource:'category',versionId,code:'1',name:'Pemanfaatan Sistem',weight:10});
  const sub=await create({resource:'subcategory',parentId:category,code:'1.1',name:'Rencana Pengadaan',target:10,weight:10});
  const indicators=[];
  for(const [index,maximum] of [5,2.5,2.5].entries()) indicators.push({id:await create({resource:'indicator',parentId:sub,code:`1.1.${index+1}`,name:`Indicator ${index+1}`,maxValue:maximum,weight:maximum}),maximum});
  await create({resource:'user',email:'verify-staff@localhost',name:'Verifier staff',role:'staff',password:'Scoring-test-2026!',assessmentTypeIds:[typeId]});
  const staff=await login('verify-staff@localhost','Scoring-test-2026!');
  const scoreIds=[];
  const addEvidence=async scoreId=>{const form=new FormData();form.set('scoreId',scoreId);form.set('url','https://example.com/evidence');const response=await fetch(`${base}/api/evidence`,{method:'POST',headers:{origin:base,cookie},body:form});assert.equal(response.status,201,await response.text());};
  for(const indicator of indicators){const result=await(await call('/api/assessment-workspace','POST',{periodId,indicatorId:indicator.id,value:indicator.maximum})).json();scoreIds.push(result.scoreId);await addEvidence(result.scoreId);}
  cookie=admin;
  for(const [index,scoreId] of scoreIds.entries()) await call('/api/assessment-workspace','PATCH',{action:'review',scoreId,decision:index===1?'rejected':'approved',note:index===1?'Kurang bukti':''});
  const workspace=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  const row=workspace.subcategories[0];
  assert.equal(row.score,10,'raw staff values must be retained');assert.equal(row.verifiedScore,7.5);assert.equal(row.accepted,2);assert.equal(row.rejected,1);assert.equal(row.indicatorCount,3);
  const dashboard=await(await call(`/api/dashboard?periodId=${periodId}`)).json();
  assert.equal(dashboard.categories[0].score,7.5);assert.equal(dashboard.categories[0].completed,2);assert.equal(dashboard.categories[0].internalScore,10);assert.equal(dashboard.metrics.currentValue,7.5);
  await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId},409);
  const rejected=workspace.indicators.find(row=>row.id===indicators[1].id);assert.equal(rejected.internalValue,2.5);assert.equal(rejected.status,'rejected');
  cookie=staff;await addEvidence(scoreIds[1]);
  const pending=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(pending.subcategories[0].verifiedScore,7.5,'resubmission is not approval');
  cookie=admin;await call('/api/assessment-workspace','PATCH',{action:'review',scoreId:scoreIds[1],decision:'approved'});
  const accepted=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(accepted.subcategories[0].verifiedScore,10);assert.equal(accepted.subcategories[0].accepted,3);
});

test('admin finalization preview uses the same cross-unit scope as dashboard and finalization', {skip:!base}, async () => {
  const login=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  try {
    const [types]=await db.query("SELECT id FROM assessment_types WHERE code='ITKP'");
    const [[unit]]=await db.query('SELECT id FROM units ORDER BY created_at LIMIT 1');
    const version=randomUUID(),period=randomUUID(),category=randomUUID(),sub=randomUUID(),indicator=randomUUID(),unit2=randomUUID();
    await db.execute('INSERT INTO units(id,code,name) VALUES(?,?,?)',[unit2,'SECOND','Second unit']);
    await db.execute('INSERT INTO instrument_versions(id,assessment_type_id,version,name) VALUES(?,?,?,?)',[version,types[0].id,2,'Multi-unit test']);
    await db.execute('INSERT INTO assessment_periods(id,assessment_type_id,instrument_version_id,year,name,max_score,scoring_mode,starts_at,due_at) VALUES(?,?,?,?,?,?,?,?,?)',[period,types[0].id,version,2027,'Multi-unit test',6,'direct_points','2027-01-01','2027-12-31']);
    await db.execute('INSERT INTO categories(id,instrument_version_id,code,name,weight_percent) VALUES(?,?,?,?,?)',[category,version,'1','Category',6]);
    await db.execute('INSERT INTO subcategories(id,category_id,code,name,weight_percent,target_value) VALUES(?,?,?,?,?,?)',[sub,category,'1','Subcategory',6,6]);
    await db.execute('INSERT INTO indicators(id,subcategory_id,code,name,weight_percent,max_value) VALUES(?,?,?,?,?,?)',[indicator,sub,'1','Indicator',6,6]);
    for(const [unitId,value] of [[unit.id,6],[unit2,0]]) await db.execute('INSERT INTO indicator_scores(id,period_id,indicator_id,unit_id,internal_value,status) VALUES(?,?,?,?,?,?)',[randomUUID(),period,indicator,unitId,value,'approved']);
    const workspace=await(await fetch(`${base}/api/assessment-workspace?periodId=${period}`,{headers:{cookie}})).json();
    assert.equal(workspace.subcategories[0].score,3);
    const update=await fetch(`${base}/api/admin`,{method:'PATCH',headers:{origin:base,cookie,'content-type':'application/json'},body:JSON.stringify({resource:'indicator',id:indicator,code:'1',name:'Indicator',maxValue:6,weight:99})});
    assert.equal(update.status,200);
    const structure=await(await fetch(`${base}/api/admin`,{headers:{cookie}})).json();
    const configured=structure.structure.find(row=>row.indicatorId===indicator);
    assert.equal(configured.indicatorWeight,6,'direct contribution must follow indicator maximum');
    assert.equal(configured.subcategoryWeight,6); assert.equal(configured.categoryWeight,6);
  } finally {await db.end();}
});
