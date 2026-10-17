/* Evidence-led consultation workspace. Local rules, no remote model calls. */
(() => {
  'use strict';
  const VERSION='2026.10.17';
  const labels={pending:'待验证',reported_strength:'口述已掌握',unlearned:'尚未学习',observed_gap:'作答显示困难',stable:'复测已稳定'};
  const stamp=()=>new Date().toISOString();
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  let activeId=null, entries={}, callId=uid('call'), storageError='', savedName='', archiveEnabled=false;
  const drafts=new Map();
  function records(){
    if(!archiveEnabled)return [];
    try{const raw=localStorage.getItem('one-to-one-v2')||localStorage.getItem('zhixing-v1');const rows=raw?JSON.parse(raw):[];if(!Array.isArray(rows))throw Error('档案格式异常，请先备份后处理');storageError='';return rows;}
    catch(e){storageError=e.message||'当前浏览器无法读取档案';return [];}
  }
  function persist(rows){if(!archiveEnabled)throw Error('当前为临时使用，不写入学生档案。');if(storageError)throw Error(storageError);localStorage.setItem('one-to-one-v2',JSON.stringify(rows));}
  function classify(card,feedback){
    const aliases=[card.point,...card.aliases].filter(x=>x.length>1);
    const clauses=String(feedback||'').split(/[；;。！？!?\n，,]/).filter(Boolean);
    const matched=clauses.filter(t=>aliases.some(a=>t.includes(a)));
    if(!matched.length)return {status:'pending',quote:'',reason:'年级候选，尚无直接学情信息'};
    const statesFound=matched.map(t=>{
      const unlearned=/还没学|尚未学|未学过|没有学过|没学过|暂未学|下学期才学|尚未开课/.test(t);
      const difficulty=/不会|不懂|没掌握|未掌握|不熟|薄弱|困难|不稳|混淆|需要提示|需提示|需要帮助|依赖|容易错|总错|做不出|找不到|漏要点|不太会|没学会/.test(t);
      const strength=/已经掌握|完全掌握|已经会|没问题|没有问题|很熟练|很熟悉|掌握得好|都能做|不薄弱|不需要补|不用补|已掌握/.test(t);
      return {status:unlearned?'unlearned':difficulty?'pending':strength?'reported_strength':'pending',quote:t,reason:unlearned?'家长反馈未学，暂不安排补弱':difficulty?'反馈有困难信号，需要作答验证':strength?'家长反馈掌握较好，暂不安排修复':'提及本知识点，需确认具体表现'};
    });
    const unique=new Set(statesFound.map(x=>x.status));
    if(unique.size>1)return {status:'pending',quote:matched.join('；'),reason:'反馈含不同状态，请核对时间、子知识点和当前表现'};
    return statesFound[statesFound.length-1];
  }
  const basePool=pool;
  function allCandidates(c){return basePool(c).map(k=>({...k,signal:classify(k,c.feedback)}));}
  pool=function(c){return allCandidates(c).filter(k=>!['reported_strength','unlearned'].includes(k.signal.status));};
  window.initialResearchSelection=function(c){const direct=c.cards.filter(k=>k.signal.quote);if(direct.length)return direct.slice(0,1);if(allCandidates(c).some(k=>['reported_strength','unlearned'].includes(k.signal.status)))return [];return c.cards.slice(0,1);};
  const basePriority=priority;
  priority=function(c){const k=selectedFor(c)[0];return k?'本次先核对“'+k.point+'”：'+k.probe:basePriority(c);};
  const selectedFor=c=>(c.cards||[]).filter(k=>(c.chosen||[]).includes(k.id));
  const evidenceKey=(c,k)=>c.subject+'::'+k.id;
  const evidenceContext=c=>[c.grade,c.subject,c.feedback].join('|');
  function evidenceFor(c,k){const previous=entries[evidenceKey(c,k)];if(previous?.context===evidenceContext(c))return previous;return {status:k.signal?.status||'pending',source:'家长口述',note:'',task:k.task,prompts:'',duration:'',date:'',quote:k.signal?.quote||c.feedback||'',context:evidenceContext(c),history:previous?.history||[]};}
  function eligibleRows(){return states.flatMap(c=>selectedFor(c).map(k=>({c,k,e:evidenceFor(c,k)})));}

  // Shared student context is always visible; saving is explicit.
  const context=document.createElement('section');context.className='research-context';
  context.innerHTML=`<div class="context-identity"><span class="context-symbol">◎</span><label>当前学生<select id="research-student" aria-label="当前学生"><option value="">本次沟通 · 尚未存档</option></select></label></div><label class="context-name">学生称呼<input id="research-name" maxlength="30" placeholder="可先沟通，存档时填写" autocomplete="off"></label><span class="context-state" id="research-save-state">本次内容尚未保存</span><button type="button" id="research-save" class="primary">保存到学生档案</button><button type="button" id="research-new">新沟通</button>`;
  document.querySelector('.studio-heading').after(context);
  const privacyMode=document.createElement('label');privacyMode.className='research-privacy-mode';privacyMode.innerHTML='<input id="research-archive-optin" type="checkbox"> <span>启用本机学生档案<small>可选 · 默认临时使用，不保存、不备份</small></span>';context.prepend(privacyMode);
  const modeNotice=document.createElement('p');modeNotice.className='research-mode-notice';modeNotice.textContent='临时使用：本次输入与验证只在当前页面保留。刷新或关闭后不保留本次内容；专业支持始终可独立浏览。';context.after(modeNotice);
  const contextSelect=document.getElementById('research-student'),nameInput=document.getElementById('research-name');
  function refreshContext(){
    context.querySelector('.context-identity').hidden=!archiveEnabled;document.getElementById('research-save').hidden=!archiveEnabled;document.getElementById('research-student').disabled=!archiveEnabled;
    modeNotice.textContent=archiveEnabled?'已启用本机档案：仅在点击保存或保存验证记录时写入；备份仍由你自行点击。':'临时使用：本次输入与验证只在当前页面保留。刷新或关闭后不保留本次内容；专业支持始终可独立浏览。';
    const rows=records().filter(s=>s.id!=='demo');contextSelect.innerHTML='<option value="">本次沟通 · 尚未存档</option>'+rows.map(s=>`<option value="${esc(s.id)}">${esc(s.name||'未命名学生')} · ${esc(s.grade||'')}</option>`).join('');contextSelect.value=activeId||'';
    const saved=rows.find(s=>s.id===activeId);document.getElementById('research-save-state').textContent=!archiveEnabled?'临时使用 · 不保存、不备份':storageError|| (saved?'当前档案：'+saved.name+' · 修改后请保存':'本次内容尚未保存');
  }
  function clearDraft(){states=[];current=null;chosen=[];sample={};entries={};callId=uid('call');activeId=null;savedName='';nameInput.value='';document.getElementById('child-name').value='';document.getElementById('intake-form').reset();subjects();invalidateReport();document.getElementById('report-section').hidden=true;document.getElementById('analysis').innerHTML='<div class="panel research-empty"><span class="eyebrow">A NEW CONVERSATION</span><h2>从一句真实反馈开始。</h2><p>选择地区、年级和学科，记录家长原话。先找到要问的问题，再形成学习安排。</p></div>';refreshContext();showDashboardView('phone');}
  function saveCurrent(){
    if(!archiveEnabled)throw Error('当前为临时使用，可继续分析和生成报告；如需存档，请自行勾选“启用本机学生档案”。');
    if(!states.length)throw Error('请先生成首通分析，再保存本次沟通。');
    const name=nameInput.value.trim()||document.getElementById('child-name').value.trim();if(!name)throw Error('请在“学生称呼”填写称呼后保存。');
    const rows=records();if(storageError)throw Error(storageError);
    const index=rows.findIndex(s=>s.id===activeId),previous=index>=0?rows[index]:null;
    const base=toStudent(),now=stamp();activeId=previous?.id||activeId||uid('student');
    const consultation={id:callId,updatedAt:now,rows:states.map(c=>({subject:c.subject,score:c.score,total:c.total,feedback:c.feedback,chosen:[...c.chosen]})),region:states[0].region,city:states[0].city,grade:states[0].grade};
    const history=[...(previous?.consultations||[])],old=history.findIndex(x=>x.id===callId);if(old>=0)history[old]=consultation;else history.push(consultation);
    const snapshot={entries:structuredClone(entries),callId,updatedAt:now,version:VERSION};
    const next={...base,...previous,id:activeId,name,stage:base.stage,grade:base.grade,province:base.province,city:base.city,subjects:base.subjects,notes:base.notes,phone:{...previous?.phone,...base.phone},consultations:history,research:snapshot,updatedAt:now};
    // Preserve teacher-confirmed scores and all existing questions/checks/visits.
    next.scores=previous?previous.scores||[]:base.scores;
    if(index>=0)rows[index]=next;else rows.push(next);persist(rows);savedName=name;document.getElementById('child-name').value=name;refreshContext();renderNativePages();toast('已保存 '+name+' · 更新同一档案，保留历史记录');return next;
  }
  function loadStudent(id){
    if(states.length)drafts.set(activeId||'draft',{states,entries,callId,name:nameInput.value});
    const row=records().find(s=>s.id===id);if(!row){activeId=null;return;}
    activeId=id;savedName=row.name||'';nameInput.value=savedName;document.getElementById('child-name').value=savedName;
    const latest=row.consultations?.slice(-1)[0],phoneRows=latest?.rows||row.phone?.rows||[];
    const pending=drafts.get(id);entries=pending?.entries||structuredClone(row.research?.entries||{});callId=pending?.callId||row.research?.callId||uid('call');
    document.getElementById('region').value=row.province||latest?.region||'';document.getElementById('city').value=row.city||'';document.getElementById('grade').value=row.grade||'';subjects();
    document.querySelectorAll('[data-subject]').forEach(el=>el.checked=phoneRows.some(x=>x.subject===el.value));scoreRows();
    document.querySelectorAll('[data-score-subject]').forEach(el=>{const x=phoneRows.find(x=>x.subject===el.dataset.scoreSubject);if(x){el.querySelector('[data-score]').value=x.score??'';el.querySelector('[data-total]').value=x.total??'';el.querySelector('[data-feedback]').value=x.feedback||'';}});
    document.getElementById('feedback').value='';
    if(phoneRows.length){document.getElementById('intake-form').dispatchEvent(new Event('submit',{cancelable:true}));for(const c of states){const old=phoneRows.find(x=>x.subject===c.subject);if(old?.chosen){c.chosen=old.chosen.filter(id=>c.cards.some(k=>k.id===id));}}renderAll();}
    else{states=[];current=null;document.getElementById('analysis').innerHTML='<div class="panel research-empty"><h2>已切换到'+esc(row.name)+'</h2><p>这份档案尚无首通记录，填写已知情况后生成分析。</p></div>';invalidateReport();document.getElementById('report-section').hidden=true;}
    refreshContext();renderNativePages();
  }
  contextSelect.onchange=()=>{if(!contextSelect.value){clearDraft();return;}loadStudent(contextSelect.value);};
  document.getElementById('research-save').onclick=()=>{try{saveCurrent();}catch(e){toast(e.message);}};
  document.getElementById('research-new').onclick=()=>{if(activeId){callId=uid('call');document.getElementById('research-save-state').textContent='新一轮沟通 · 保存后新增记录';toast('已开始新一轮沟通，修改学情后保存到当前学生');showDashboardView('phone');}else clearDraft();};
  const newStudent=document.createElement('button');newStudent.type='button';newStudent.textContent='切换新学生';newStudent.onclick=()=>{if(states.length)drafts.set(activeId||'draft',{states,entries,callId,name:nameInput.value});clearDraft();};context.append(newStudent);
  document.getElementById('research-archive-optin').onchange=e=>{archiveEnabled=e.target.checked;activeId=null;drafts.clear();refreshContext();renderNativePages();if(!archiveEnabled)toast('已切换临时使用，本次不再写入档案；已有档案未删除。');};
  document.getElementById('reset').onclick=()=>{if(states.length)drafts.set(activeId||'draft',{states,entries,callId,name:nameInput.value});clearDraft();};
  nameInput.oninput=()=>{document.getElementById('child-name').value=nameInput.value;document.getElementById('research-save-state').textContent='内容已修改 · 待保存';};
  document.getElementById('child-name').addEventListener('input',e=>{nameInput.value=e.target.value;});
  // The old save entry now updates the shared identity instead of appending a fresh ID.
  document.getElementById('send-to-workbench').onclick=()=>{try{saveCurrent();showDashboardView('profile');}catch(e){toast(e.message);}};

  // Keep consultation insights short; full teaching reference remains expandable.
  const oldRender=render;
  render=function(){
    oldRender();const c=current,root=c.root,ks=selectedFor(c),all=allCandidates(c),outside=all.filter(k=>['reported_strength','unlearned'].includes(k.signal.status));
    root.querySelectorAll('.overview,.knowledge').forEach(el=>el.classList.add('research-reference'));
    const overview=root.querySelector('.overview');const overviewDetails=document.createElement('details');overviewDetails.className='research-score-details';overviewDetails.innerHTML='<summary>查看成绩信息与判断边界</summary>';overview.before(overviewDetails);overviewDetails.append(overview);
    root.querySelectorAll('article.knowledge').forEach(article=>{const head=article.querySelector('.knowledge-head'),details=document.createElement('details');details.className='research-deep';details.innerHTML='<summary>展开专业依据 · 知识拆解、示例与完整话术</summary>';for(const child of [...article.children])if(child!==head)details.append(child);article.append(details);});
    const focus=document.createElement('section');focus.className='research-focus';
    const first=ks[0];focus.innerHTML=`<div class="research-focus-top"><span class="eyebrow">LISTEN → VERIFY → PLAN</span><span class="research-badge">${ks.length?'先验证，再安排':'暂无待排查重点'}</span></div><h3>${first?'先把“'+esc(first.point)+'”问清楚。':'本次先核对已学进度与实际表现。'}</h3><div class="research-focus-grid"><div><span class="research-label">家长已知信息</span><p>${esc(c.feedback||'尚未提供具体表现，可先询问最近一道需要帮助的题。')}</p><small>${esc(scoreText(c))} · 来源为本次口述录入</small></div><div class="research-next"><span class="research-label">下一句怎么问</span><p>${esc(first?.probe||'哪些内容已学？最近有没有一题是孩子需要提示才能完成的？')}</p></div></div><div class="research-parent"><span class="research-label">简短沟通建议</span><p>${first?'“我们先用一个小任务看孩子能否'+esc(first.ability)+'，再根据实际表现确定练习重点。您方便说说，孩子通常从哪一步开始需要帮助吗？”':'“您提到的已掌握或未学内容，我们先单独记录，不直接安排补弱。接下来核对学校进度和一个实际作答样本。”'}</p></div>${outside.length?'<div class="research-signals">'+outside.map(k=>`<span class="research-tag ${k.signal.status}">${esc(k.point)} · ${labels[k.signal.status]}</span>`).join('')+'</div>':''}<div class="actions"><button type="button" data-evidence-next>记录验证结果</button><button type="button" data-short-copy>复制简短沟通建议</button></div>`;
    const resultActions=root.querySelector('.studio-result-actions');resultActions.after(focus);
    focus.querySelector('[data-evidence-next]').onclick=()=>{activate(c);showDashboardView('diagnosis');};focus.querySelector('[data-short-copy]').onclick=()=>copy(focus.querySelector('.research-parent p').textContent);
    resultActions.children[0].textContent='整理家长方案 →';resultActions.children[1].textContent='保存到当前学生';resultActions.children[1].hidden=!archiveEnabled;
    const chipContainer=root.querySelector('.chips');if(chipContainer){const hint=document.createElement('p');hint.className='research-hint';hint.textContent='默认只选一个主要排查方向。下面是备选参考，点击才加入本次分析；待验证不等于已确认薄弱。';chipContainer.before(hint);}
    root.querySelectorAll('.knowledge-head .pill').forEach((pill,i)=>{const k=ks[i];if(k)pill.textContent=labels[evidenceFor(c,k).status]||'待验证';});
  };
  const oldAll=renderAll;renderAll=function(){oldAll();renderNativePages();document.getElementById('research-save-state').textContent=archiveEnabled?'分析已更新 · 可选择保存':'临时使用 · 不保存、不备份';};
  const oldInvalidate=invalidateInput;invalidateInput=function(){oldInvalidate();renderNativePages();document.getElementById('research-save-state').textContent=archiveEnabled?'信息已修改 · 请重新生成':'临时使用 · 不保存、不备份';};

  // Native shared pages replace duplicated nested workspaces for the main workflow.
  const native={};for(const key of ['profile','diagnosis','plan','review']){native[key]=makePage('research-'+key);}
  dashboardRoutes.profile=['学生档案','STUDENT CONTEXT','每一次沟通、验证与复盘，都回到同一个孩子。'];
  dashboardRoutes.diagnosis=['学情验证','LEARNING EVIDENCE','记录真实任务、提示次数和结果，让判断有据可查。'];
  dashboardRoutes.plan=['学习行动','LEARNING ACTIONS','已验证的困难进入训练；待确认的方向先安排验证。'];
  dashboardRoutes.review=['复盘记录','PROGRESS REVIEW','保留每次验证的时间、来源与表现，观察变化。'];
  const navText={diagnosis:'学情验证',plan:'学习行动',review:'复盘记录',report:'家长报告'};
  for(const [key,text] of Object.entries(navText))document.querySelector(`[data-view="${key}"] span`).textContent=text;
  dashboardRoutes.report=['家长报告','PARENT REPORT','把已知情况、待验证方向和下一步，整理成家长能执行的方案。'];
  const oldShow=showDashboardView;
  showDashboardView=function(view){
    if(native[view]){
      dashboardView=view;const [title,eyebrow,description]=dashboardRoutes[view];document.querySelectorAll('[data-page]').forEach(el=>el.hidden=el!==native[view]);document.querySelectorAll('.studio-nav-item').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
      document.getElementById('studio-title').innerHTML=esc(title)+'<span class="title-dot">.</span>';document.getElementById('studio-breadcrumb').textContent=title;document.getElementById('studio-eyebrow').textContent=eyebrow;document.getElementById('studio-description').textContent=description;document.querySelector('.studio-mode').textContent='同一学生 · 连续跟进';renderNativePages();window.scrollTo({top:0,behavior:'smooth'});
    }else{oldShow(view);if(view==='knowledge'){document.getElementById('studio-description').textContent='按学科和章节查阅教学参考；资料范围与核对方式在每张卡片标明。';}}
  };
  function empty(title,text){return `<div class="panel research-empty"><span class="eyebrow">START WITH EVIDENCE</span><h2>${title}</h2><p>${text}</p><button type="button" data-return-phone class="primary">前往电话首通</button></div>`;}
  function renderNativePages(){
    if(!native.profile)return;const saved=records().filter(s=>s.id!=='demo'),active=saved.find(s=>s.id===activeId),rows=eligibleRows();
    native.profile.innerHTML=`<div class="research-section-head"><div><span class="eyebrow">ONE STUDENT, ONE HISTORY</span><h2>学生与沟通记录</h2><p>重复保存更新本次沟通；“新沟通”后保存到已有学生，会增加一次记录。</p></div><button type="button" data-backup>备份全部档案</button></div>${storageError?'<div class="notice">'+esc(storageError)+'</div>':''}${saved.length?'<div class="research-student-grid">'+saved.map(s=>`<article class="panel research-student-card"><div class="student-monogram">${esc((s.name||'学').slice(0,1))}</div><h3>${esc(s.name||'未命名学生')}</h3><p>${esc(s.province||'')} · ${esc(s.grade||'')} · ${esc((s.subjects||[]).join(' / '))}</p><div class="research-student-meta"><span>${s.consultations?.length||0} 次沟通</span><span>${Object.keys(s.research?.entries||{}).length} 条验证记录</span></div><button type="button" data-open-student="${esc(s.id)}">${s.id===activeId?'继续当前学生':'进入学生档案'} →</button></article>`).join('')+'</div>':empty('还没有保存的学生档案','先完成首通，再填写称呼并保存。旧工作台中的演示学生不会自动成为正式档案。')}${active?'<section class="panel"><h3>'+esc(active.name)+' · 沟通时间线</h3>'+(active.consultations||[]).slice().reverse().map(c=>`<div class="research-history"><time>${esc(new Date(c.updatedAt).toLocaleString('zh-CN'))}</time><p>${esc(c.rows.map(x=>x.subject+'：'+(x.feedback||'尚无具体反馈')).join('；'))}</p></div>`).join('')+'</section>':''}`;
    if(!archiveEnabled)native.profile.innerHTML=empty('学生档案按需启用','当前为临时使用，不保存本次信息，也不会自动备份。首通、验证、报告和专业支持均可继续使用。需要保存时，再勾选上方“启用本机学生档案”。');
    native.diagnosis.innerHTML=states.length?`<div class="research-section-head"><div><span class="eyebrow">OBSERVE BEFORE CONCLUDING</span><h2>本次验证清单</h2><p>先独立尝试，再记录结果。“已观察困难”或“复测稳定”必须填写实际表现。${archiveEnabled?'':'当前仅记入本次页面，不写入档案。'}</p></div><button type="button" data-save-evidence class="primary">${archiveEnabled?'保存验证记录':'记入本次页面'}</button></div>${rows.length?rows.map(({c,k,e},i)=>`<article class="panel research-evidence-card" data-evidence-index="${i}"><div class="section-head"><h3>${esc(c.subject)} · ${esc(k.point)}</h3><span class="research-badge">${esc(labels[e.status]||'待验证')}</span></div><div class="research-evidence-origin"><b>触发信息</b><p>${esc(e.quote||c.feedback||'按年级提出的候选方向，暂无直接反馈')}</p><small>教学参考：${esc(k.source?source53(k):'内置自编知识卡 '+k.id+'；非官方真题')}</small></div><div class="row"><label class="field"><span>当前状态</span><select data-e-status>${Object.entries(labels).map(([v,l])=>`<option value="${v}" ${v===e.status?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span>本次信息来源</span><select data-e-source>${['家长口述','教师观察','已核对作答','复测记录'].map(v=>`<option ${v===e.source?'selected':''}>${v}</option>`).join('')}</select></label></div><label class="field"><span>验证任务 / 题目位置</span><textarea data-e-task maxlength="1200">${esc(e.task||k.task)}</textarea></label><div class="row"><label class="field"><span>提示次数（未知留空）</span><input type="number" min="0" max="100" step="1" data-e-prompts value="${esc(e.prompts)}"></label><label class="field"><span>用时（分钟，未知留空）</span><input type="number" min="0" max="600" step="0.5" data-e-duration value="${esc(e.duration)}"></label></div><label class="field"><span>实际表现 / 首次错误 / 回答依据</span><textarea data-e-note maxlength="2000" placeholder="例如：能列式，但把初始费用当作变化率；解释后仍需2次提示。">${esc(e.note)}</textarea></label><div class="research-evidence-footer"><span>${e.date?'上次记录：'+esc(new Date(e.date).toLocaleString('zh-CN')):'尚未记录实际作答'}</span><button type="button" data-record-one="${i}">记录这一项</button></div></article>`).join(''):empty('本次没有待验证知识点','已掌握或未学的反馈不会自动进入补弱，请回到首通补充一个需要排查的实际表现。')}`:empty('先确定一个需要验证的问题','在电话首通选择学科并生成分析，这里会接续本次选择的知识点。');
    const gaps=rows.filter(x=>x.e.status==='observed_gap'),pending=rows.filter(x=>x.e.status==='pending'),stable=rows.filter(x=>['stable','reported_strength'].includes(x.e.status));
    native.plan.innerHTML=states.length?`<div class="research-section-head"><div><span class="eyebrow">EVIDENCE INTO ACTION</span><h2>${gaps.length?'围绕已观察到的困难安排训练':'先验证一个方向，再决定怎么练'}</h2><p>这里沿用当前学生与本次沟通；不会切换到演示学生。</p></div><button type="button" data-parent-report class="primary">整理家长报告 →</button></div><div class="research-metrics"><div><strong>${gaps.length}</strong><span>作答显示困难</span></div><div><strong>${pending.length}</strong><span>等待验证</span></div><div><strong>${stable.length}</strong><span>稳定或口述优势</span></div></div>${gaps.map(({c,k,e})=>`<article class="panel research-action"><span class="research-badge">训练方向 · ${esc(c.subject)}</span><h3>${esc(k.point)}</h3><p><b>依据：</b>${esc(e.note)}</p><div class="research-action-grid"><div><small>01 / 聚焦修复</small><p>${esc(k.action)}</p></div><div><small>02 / 独立迁移</small><p>改变一个数字、条件或材料，独立完成并解释“${esc(k.ability)}”。</p></div><div><small>03 / 复测调整</small><p>${esc(k.retest||'隔次用同要求新任务，比较首次错误、提示次数和解释质量；没有稳定完成就继续当前方向。')}</p></div></div></article>`).join('')}${pending.map(({c,k})=>`<article class="panel research-action"><span class="research-badge">验证任务 · ${esc(c.subject)}</span><h3>${esc(k.point)}</h3><p>${esc(k.task)}</p><p class="research-hint">先观察：${esc(k.probe)} 暂不推定这就是薄弱点。</p><button type="button" data-open-evidence>记录作答 →</button></article>`).join('')}${!gaps.length&&!pending.length?'<div class="panel"><h3>暂无需要修复的已确认困难</h3><p>先保留已掌握与未学信息，后续有实际困难再安排验证。</p></div>':''}`:empty('规划从本次学情开始','先生成首通分析，或在上方选择一位已有学生。');
    const history=Object.entries(entries).flatMap(([key,e])=>(e.history||[]).map(h=>({...h,key}))).sort((a,b)=>b.date.localeCompare(a.date));
    native.review.innerHTML=history.length?`<div class="research-section-head"><div><span class="eyebrow">REVIEW THE EVIDENCE</span><h2>验证与复测时间线</h2><p>按知识点查看历次表现。只有任务要求可比时，才比较变化。</p></div><button type="button" data-review-export>导出复盘记录</button></div>${history.map(h=>`<article class="panel research-review-card"><div class="section-head"><h3>${esc(h.point)}</h3><span class="research-badge">${esc(labels[h.status])}</span></div><small>${esc(new Date(h.date).toLocaleString('zh-CN'))} · ${esc(h.source)}</small><p>${esc(h.task)}</p><blockquote>${esc(h.note||'未填写实际表现')}</blockquote><div class="research-signals"><span class="research-tag">提示：${h.prompts===''?'未知':esc(h.prompts)+'次'}</span><span class="research-tag">用时：${h.duration===''?'未知':esc(h.duration)+'分钟'}</span></div></article>`).join('')}`:empty('让第一次作答成为比较的起点','在“学情验证”记录任务与实际表现后，这里会保留历次状态，不自动推定学生已经进步。');
    for(const page of Object.values(native))page.querySelectorAll('[data-return-phone]').forEach(b=>b.onclick=()=>showDashboardView('phone'));
    native.profile.querySelectorAll('[data-open-student]').forEach(b=>b.onclick=()=>{loadStudent(b.dataset.openStudent);showDashboardView('phone');});
    native.profile.querySelector('[data-backup]')?.addEventListener('click',()=>{if(storageError)return toast(storageError);download('学生档案备份_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({version:1,students:records()},null,2),'application/json');});
    native.diagnosis.querySelectorAll('[data-record-one]').forEach(b=>b.onclick=()=>recordEvidence([+b.dataset.recordOne]));
    native.diagnosis.querySelector('[data-save-evidence]')?.addEventListener('click',()=>recordEvidence(rows.map((_,i)=>i)));
    native.plan.querySelectorAll('[data-open-evidence]').forEach(b=>b.onclick=()=>showDashboardView('diagnosis'));
    native.plan.querySelector('[data-parent-report]')?.addEventListener('click',()=>showDashboardView('report'));
    native.review.querySelector('[data-review-export]')?.addEventListener('click',()=>download('学情复盘记录.json',JSON.stringify({student:nameInput.value,entries,exportedAt:stamp()},null,2),'application/json'));
  }
  function recordEvidence(indices){
    const rows=eligibleRows(),updates=[];try{
      for(const i of indices){const {c,k,e}=rows[i],el=native.diagnosis.querySelector(`[data-evidence-index="${i}"]`),value=key=>el.querySelector('[data-e-'+key+']').value.trim();
        const status=value('status'),source=value('source'),note=value('note'),task=value('task'),prompts=value('prompts'),duration=value('duration');
        if(!task)throw Error(k.point+'：请填写验证任务。');
        if(['observed_gap','stable'].includes(status)&&(!note||source==='家长口述'))throw Error(k.point+'：请记录实际表现，并选择教师观察、已核对作答或复测来源。');
        if(prompts!==''&&(!Number.isInteger(+prompts)||+prompts<0||+prompts>100))throw Error('提示次数应为0—100的整数。');
        if(duration!==''&&(!Number.isFinite(+duration)||+duration<0||+duration>600))throw Error('用时应为0—600分钟。');
        const snapshot={point:c.subject+' · '+k.point,status,source,note,task,prompts,duration,date:stamp()};
        updates.push([evidenceKey(c,k),{...e,...snapshot,context:evidenceContext(c),quote:e.quote||c.feedback,history:[...(e.history||[]),snapshot]}]);
      }
      for(const [key,value]of updates)entries[key]=value;invalidateReport();
      if(archiveEnabled&&nameInput.value.trim())saveCurrent();else{renderNativePages();toast('已记入本次页面，不写入学生档案；可直接继续查看行动与报告');}
    }catch(e){toast(e.message);}
  }
  // Add explicit evidence status to every exported parent report.
  const oldReport=reportHTML;
  reportHTML=function(name,minutes,goal){const c=current,ks=selectedFor(c),before=chosen;let html;try{chosen=ks.filter(k=>['pending','observed_gap'].includes(evidenceFor(c,k).status)).map(k=>k.id);html=oldReport(name,minutes,goal);}finally{chosen=before;}const part=`<section class="research-report-evidence"><h3>本次安排的依据与状态</h3>${ks.length?ks.map(k=>{const e=evidenceFor(c,k);return `<div class="box"><b>${esc(k.point)} · ${esc(labels[e.status])}</b><p>触发信息：${esc(e.quote||c.feedback||'年级候选，缺少直接学情信息')}</p><p>来源：${esc(e.source)}${e.date?' · '+esc(new Date(e.date).toLocaleString('zh-CN')):''}</p><p>${e.note?'实际表现：'+esc(e.note):'尚无独立作答记录，以下时间用于初步验证，不代表已确定需要补弱。'}</p><p>本阶段安排：${e.status==='observed_gap'?'围绕已观察到的困难训练，并用新任务复测。':e.status==='stable'?'保留复测记录，优先处理其他已确认困难。':e.status==='unlearned'?'未学内容，暂不安排补弱。':e.status==='reported_strength'?'家长反馈掌握较好，需要时用小任务核对。':'先完成验证任务，再确定是否进入修复。'}</p></div>`;}).join(''):'<p>本次没有待排查知识点，先核对进度与实际表现，不自动生成补弱任务。</p>'}</section>`;return html.replace('<section><h3>本阶段先做什么',part+'<section><h3>本阶段先做什么');};
  // Retain advanced tools, but use a single visual shell when embedded.
  const frame=document.getElementById('legacy-frame');frame.addEventListener('load',()=>{try{const doc=frame.contentDocument;if(!doc)return;const style=doc.createElement('style');style.textContent='.sidebar,.topbar{display:none!important}main{margin-left:0!important;width:100%!important}.content{padding:22px!important}.page-heading h1{font-size:23px}body{background:#f8f6f2!important}:root{--purple:#a77858;--soft:#f4ede7}.sample-note{display:block!important}';doc.head.append(style);}catch{}});
  const extra=document.createElement('div');extra.className='research-advanced';extra.innerHTML='<a href="legacy.html" target="_blank" rel="noopener">打开原完整工作台 ↗</a><small>原诊断、导入恢复与全部工具保留</small>';document.querySelector('.sidebar-signature').before(extra);
  const footer=document.querySelector('.studio-footer');footer.firstElementChild.textContent='一对一 · 学情研究室 / '+VERSION;
  refreshContext();renderNativePages();showDashboardView('phone');
  window.ResearchWorkspace={version:VERSION,classify,saveCurrent,loadStudent,records,get entries(){return entries;},get activeId(){return activeId;},get archiveEnabled(){return archiveEnabled;}};
})();
