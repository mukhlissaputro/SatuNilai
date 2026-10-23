import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { matrix } from '../scripts/setup-itkp-2026.mjs';
import mysql from 'mysql2/promise';
import {randomUUID} from 'node:crypto';
import {itkpBands} from '../lib/score-interpretation.ts';

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
  await call('/api/interpretations','PUT',{periodId,bands:itkpBands});
  const sourceId=await create({resource:'period',typeId,year:2024,maxScore:100,scoringMode:'direct_points',name:'ITKP 2024',startsAt:'2024-01-01',dueAt:'2024-12-31'});
  await call('/api/interpretations','PUT',{periodId:sourceId,bands:itkpBands});
  await call('/api/interpretations','PUT',{periodId,sourcePeriodId:sourceId});
  assert.deepEqual((await(await call(`/api/interpretations?periodId=${periodId}`)).json()).bands,itkpBands);
  await call('/api/interpretations','PUT',{periodId:sourceId,bands:[{minimum:0,predicate:'SOURCE',interpretation:'Source changed'}]});
  assert.deepEqual((await(await call(`/api/interpretations?periodId=${periodId}`)).json()).bands,itkpBands,'copied rules must remain independent');
  assert.equal((await(await call(`/api/dashboard?periodId=${periodId}`)).json()).comparison.internal,null,'unfilled period must not receive a zero-value predicate');
  await call('/api/interpretations','PUT',{periodId:sourceId,sourcePeriodId:periodId},409);
  await call('/api/admin','PATCH',{resource:'period',id:sourceId,year:2024,maxScore:5,scoringMode:'weighted_average',name:'ITKP 2024',startsAt:'2024-01-01',dueAt:'2024-12-31',status:'draft'},409);
  const otherType=await create({resource:'type',code:'OTHER',name:'Other interpretation'});
  const otherPeriod=await create({resource:'period',typeId:otherType,year:2023,maxScore:100,name:'Other',startsAt:'2023-01-01',dueAt:'2023-12-31'});
  await call('/api/interpretations','PUT',{periodId:otherPeriod,bands:itkpBands});
  await call('/api/interpretations','PUT',{periodId,sourcePeriodId:otherPeriod},409);
  const smallPeriod=await create({resource:'period',typeId,year:2023,maxScore:5,name:'Small scale',startsAt:'2023-01-01',dueAt:'2023-12-31'});
  await call('/api/interpretations','PUT',{periodId:smallPeriod,bands:[{minimum:0,predicate:'X',interpretation:'Example'}]});
  await call('/api/interpretations','PUT',{periodId,sourcePeriodId:smallPeriod},409);
  await call('/api/interpretations','PUT',{periodId,bands:[itkpBands[1]]},400);
  const setup=()=>{const result=spawnSync(process.execPath,['scripts/setup-itkp-2026.mjs','--apply'],{env:process.env,encoding:'utf8'});assert.equal(result.status,0,result.stderr+result.stdout);return JSON.parse(result.stdout.trim());};
  assert.equal(setup().maximum,100);assert.equal(setup().unchanged,true);
  await create({resource:'user',email:'scoring-staff@localhost',name:'Scoring staff',role:'staff',password:'Scoring-test-2026!',assessmentTypeIds:[typeId]});
  await login('scoring-staff@localhost','Scoring-test-2026!');
  await call(`/api/interpretations?periodId=${periodId}`,'GET',undefined,403);
  await call('/api/interpretations','PUT',{periodId,bands:[]},403);
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
  const assessorValues=Object.fromEntries(workspace.subcategories.map(row=>[row.id,row.code==='2.3'?3:row.code==='3.1'?20:0]));
  const renaksiSub=workspace.subcategories.find(row=>row.code==='2.3');
  await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId,finalValues:{tampered:1000}},400);
  for(const bad of [null,'',false,-1,6.01]) await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId,finalValues:{...assessorValues,[renaksiSub.id]:bad}},400);
  const stillDraft=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(stillDraft.selectedPeriod.status,'draft');assert.ok(stillDraft.subcategories.every(row=>row.finalValue==null));
  await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId,finalValues:assessorValues});
  const publicData=await(await call('/api/public-dashboard')).json();
  assert.equal(publicData.assessments.find(t=>t.id===typeId).latest.score,23);
  const final=await(await call(`/api/assessment-workspace?periodId=${periodId}`)).json();
  assert.equal(final.comparison.internal,25);assert.equal(final.comparison.final,23);
  assert.equal(final.comparison.internalInterpretation.predicate,'D');assert.equal(final.comparison.finalInterpretation.predicate,'D');
  const finalDashboard=await(await call(`/api/dashboard?periodId=${periodId}`)).json();
  assert.deepEqual(finalDashboard.comparison,final.comparison);
  assert.equal(publicData.assessments.find(t=>t.id===typeId).latest.interpretation.predicate,'D');
  assert.equal(publicData.assessments.find(t=>t.id===typeId).latest.comparison,undefined);
  await call('/api/interpretations','PUT',{periodId,bands:[]},409);
  await call('/api/interpretations','PUT',{periodId,sourcePeriodId:sourceId},409);
  assert.equal(final.subcategories.reduce((sum,s)=>sum+s.finalValue,0),23);
  assert.equal(final.subcategories.reduce((sum,s)=>sum+s.score,0),25);
  assert.equal(final.subcategories.reduce((sum,s)=>sum+s.verifiedScore,0),25);
  assert.ok(final.indicators.every(row=>row.assessorValue==null),'no fabricated per-indicator assessor values');
  await call('/api/assessment-workspace','PATCH',{action:'finalize',periodId,finalValues:assessorValues},409);
  const excel=await(await call(`/api/reports/excel?periodId=${periodId}`)).text();
  assert.match(excel,/Total Final/);assert.match(excel,/>23<\/Data>/);assert.match(excel,/>25<\/Data>/);assert.match(excel,/Maksimum Indikator/);
  const pdf=await(await call(`/api/reports/pdf?periodId=${periodId}`)).text();
  assert.match(pdf,/%PDF/);assert.match(pdf,/23,00/);
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
    const [[nextVersion]]=await db.query('SELECT COALESCE(MAX(version),0)+1 AS number FROM instrument_versions WHERE assessment_type_id=?',[types[0].id]);
    await db.execute('INSERT INTO instrument_versions(id,assessment_type_id,version,name) VALUES(?,?,?,?)',[version,types[0].id,nextVersion.number,'Multi-unit test']);
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

test('weighted historical final uses one total for public score and predicate; staff scope stays private', {skip:!base}, async()=>{
  let cookie='';
  const call=async(path,method='GET',body,expected=200)=>{
    const response=await fetch(`${base}${path}`,{method,headers:{origin:base,cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    assert.equal(response.status,expected,await response.clone().text());return response;
  };
  const login=await call('/api/auth/login','POST',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});cookie=login.headers.get('set-cookie').split(';')[0];
  const create=async body=>(await(await call('/api/admin','POST',body,201)).json()).id;
  const typeId=await create({resource:'type',code:'WEIGHTED-RULES',name:'Weighted rules',isPublic:true});
  const periodId=await create({resource:'period',typeId,year:2026,name:'Historical final',maxScore:5,startsAt:'2026-01-01',dueAt:'2026-12-31'});
  const admin=await(await call('/api/admin')).json();
  const versionId=admin.periods.find(row=>row.id===periodId).instrumentVersionId;
  const cat=await create({resource:'category',versionId,code:'1',name:'Category',weight:100});
  const sub=await create({resource:'subcategory',parentId:cat,code:'1',name:'Sub',weight:100,target:5});
  const indicator=await create({resource:'indicator',parentId:sub,code:'1',name:'Indicator'});
  await call('/api/interpretations','PUT',{periodId,bands:[{minimum:0,predicate:'LOW',interpretation:'Below three'},{minimum:3,predicate:'HIGH',interpretation:'At least three'}]});
  await create({resource:'user',email:'scope-staff@localhost',name:'Scope staff',role:'staff',password:'Scope-staff-2026!',assessmentTypeIds:[typeId]});
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  try {
    await db.execute("UPDATE assessment_periods SET interpretation_rules='invalid-json' WHERE id=?",[periodId]);
    const recovery=await(await call(`/api/interpretations?periodId=${periodId}`)).json();
    assert.deepEqual(recovery.bands,[]);assert.ok(recovery.configurationError);
    await call('/api/interpretations','PUT',{periodId,bands:[{minimum:0,predicate:'LOW',interpretation:'Below three'},{minimum:3,predicate:'HIGH',interpretation:'At least three'}]});
    const [[staff]]=await db.query("SELECT id,unit_id AS unitId FROM users WHERE email='scope-staff@localhost'");
    const unit2=randomUUID();await db.execute('INSERT INTO units(id,code,name) VALUES(?,?,?)',[unit2,'WEIGHTED-SECOND','Second']);
    for(const [unitId,value,count] of [[staff.unitId,0,1],[unit2,5,3]]){
      const score=randomUUID();await db.execute("INSERT INTO indicator_scores(id,period_id,indicator_id,unit_id,internal_value,assessor_value,status) VALUES(?,?,?,?,?,?,'locked')",[score,periodId,indicator,unitId,value,value]);
      for(let n=0;n<count;n++){
        const evidence=randomUUID();await db.execute("INSERT INTO evidence(id,unit_id,title,source_type,created_by) VALUES(?,?,?,'link',?)",[evidence,unitId,'Evidence',staff.id]);
        await db.execute('INSERT INTO evidence_links(id,evidence_id,score_id) VALUES(?,?,?)',[randomUUID(),evidence,score]);
      }
    }
    await db.execute("UPDATE assessment_periods SET status='finalized' WHERE id=?",[periodId]);
    const publicData=await(await call('/api/public-dashboard')).json();
    const result=publicData.assessments.find(row=>row.id===typeId).latest;
    assert.equal(result.score,2.5);assert.equal(result.interpretation.predicate,'LOW');
    assert.equal(result.categories[0].internal,undefined);
    const staffLogin=await call('/api/auth/login','POST',{email:'scope-staff@localhost',password:'Scope-staff-2026!'});cookie=staffLogin.headers.get('set-cookie').split(';')[0];
    for(const endpoint of ['dashboard','assessment-workspace']){
      const data=await(await call(`/api/${endpoint}?periodId=${periodId}`)).json();
      assert.equal(data.comparison.scope,'unit');assert.equal(data.comparison.internal,0);assert.equal(data.comparison.final,2.5);assert.equal(data.comparison.finalInterpretation.predicate,'LOW');
    }
    await db.execute('UPDATE users SET unit_id=NULL WHERE id=?',[staff.id]);
    await call(`/api/dashboard?periodId=${periodId}`,'GET',undefined,409);
    await call(`/api/assessment-workspace?periodId=${periodId}`,'GET',undefined,409);
  } finally {await db.end();}
});
