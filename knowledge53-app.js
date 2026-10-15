// Chapter knowledge is connected to the existing analysis, exports and archives.
function source53(k){return k.source?`${k.source.title}｜${k.source.chapter}｜${k.source.pages}（未注明PDF者为书内页码）。${k.source.scope}。教辅版本不等于考试政策或地方分值依据。`:'';}
function adaptation53(k,feedback=''){
 const notes=[];
 if(/听得懂|一做就|不会做|依赖|提示/.test(feedback)) notes.push(`若是“听懂但不能独立做”，先请孩子复述“${k.pieces.split('；')[0]}”，再遮住示例完成验证任务；记录在哪一步开始需要提示。`);
 if(/粗心|计算|符号|漏|审题/.test(feedback)) notes.push(`若反馈为粗心或审题问题，不先归因态度：让孩子圈条件、逐步作答，标出首次漏项或符号错误，再检验换题后是否重现。`);
 if(/背|记不住|材料|表达|理解/.test(feedback)) notes.push(`若背过仍不会表达，先让孩子用自己的话解释概念，再指出题目证据；参考解析只能在独立尝试后使用。`);
 return notes.join(' ')||'先核对是否已学本章、学校教材和当前作业；未学内容列入后续衔接，不认定为当前薄弱。';
}
function detail53(k,feedback=''){
 if(!k.source)return '';
 return `<div class="box wide source53"><b>教辅知识融入 · 先修与复测</b><p><b>知识链：</b>${esc(k.pieces)}</p><p><b>结合本次反馈：</b>${esc(adaptation53(k,feedback))}</p><p><b>复测标准：</b>${esc(k.retest)}</p><p class="small">${esc(source53(k))}</p></div>`;
}
const before53Talk=talk;talk=function(k){if(!k.source)return before53Talk(k);return `“您反馈的是${current.feedback||'学科整体学习情况'}。先以${k.point}为候选方向，我们会核对是否已经学过。这个部分主要看孩子能否${k.ability}，不只是背结论。可以先问：${k.probe} 例如${k.task}。如果出现‘${k.error}’，再通过实际作答确认原因。确认后，${k.action}。${k.risk} 下一次用同要求新任务看独立完成、解释依据和提示次数的变化。仅凭${scoreText(current)}不能认定这一章薄弱，也不承诺固定提分。”\n教学参考：${source53(k)}`;};
const before53Report=reportHTML;reportHTML=function(name,minutes,goal){const html=before53Report(name,minutes,goal),ks=selected().filter(k=>k.source);if(!ks.length)return html;const part=`<section><h3>五科教辅融入 · 知识链、学情排查与复测</h3>${ks.map(k=>`<div class="box"><h4>${esc(k.point)}</h4><p>考查目标：${esc(k.ability)}</p><p>验证示例（自编）：${esc(k.task)}</p><p>参考解析：${esc(k.answer)}</p><p>排查方向：${esc(k.error)}</p>${detail53(k,current.feedback)}</div>`).join('')}</section>`;return html.replace('<section><h3>短期路径',part+'<section><h3>短期路径');};
const before53Student=toStudent;toStudent=function(){const student=before53Student();student.phone.knowledge53Version=KNOWLEDGE53.version;student.phone.knowledge53=states.flatMap(s=>s.cards.filter(k=>s.chosen.includes(k.id)&&k.source).map(k=>({subject:s.subject,id:k.id,point:k.point,source:k.source,feedback:s.feedback,adaptation:adaptation53(k,s.feedback),task:k.task,action:k.action,retest:k.retest,status:'候选方向，已学进度与实际作答待核对'})));return student;};
function render53Library(){
 const box=document.getElementById('knowledge53-library');if(!box)return;
 const query=document.getElementById('knowledge53-query').value.trim().toLowerCase(),subject=document.getElementById('knowledge53-subject').value;
 const cards=KNOWLEDGE53.cards.filter(k=>(!subject||k.subject===subject)&&(!query||[k.point,k.subject,k.source.chapter,k.pieces,...k.aliases].join(' ').toLowerCase().includes(query)));
 box.innerHTML=`<p class="small">找到${cards.length}条 / 新增40条。资料以目录定位及15页正文抽样核对；不是2305页逐页解析，也未覆盖所有章节。按学校实际已学进度选用。</p>`+cards.map(k=>`<details class="samples"><summary>${esc(k.subject)} · ${esc(k.point)}</summary><div class="kgrid"><div class="box"><b>知识拆解</b><p>${esc(k.pieces)}</p><p>${esc(k.ability)}</p></div><div class="box"><b>失分排查与追问</b><p>${esc(k.error)}</p><p>${esc(k.probe)}</p></div><div class="box wide"><b>验证任务（自编）</b><p>${esc(k.task)}</p><p>解析：${esc(k.answer)}</p><p>确认后的行动：${esc(k.action)}</p><p>衔接：${esc(k.risk)}</p></div>${detail53(k)}</div><p><button type="button" data-copy53="${k.id}">复制专业沟通提纲</button></p></details>`).join('');
 box.querySelectorAll('[data-copy53]').forEach(b=>b.onclick=()=>{const k=KNOWLEDGE53.cards.find(k=>k.id===b.dataset.copy53);copy(`${k.subject}｜${k.point}\n先核对孩子是否已学本章，以下为候选排查。\n知识链：${k.pieces}\n主要看能否${k.ability}\n可以先问：${k.probe}\n自编验证任务：${k.task}\n参考解析（尝试后核对）：${k.answer}\n可能表现：${k.error}\n确认后：${k.action}\n后续衔接：${k.risk}\n复测：${k.retest}\n来源：${source53(k)}`);});
}
const hub=document.createElement('section');hub.className='panel section';hub.id='knowledge53-hub';hub.innerHTML=`<div class="section-head"><div><span class="eyebrow">SUBJECT KNOWLEDGE → CONVERSATION</span><h2>五科知识与沟通参考</h2><p>2027版教辅参考 · 数学 / 物理 / 化学 / 生物 / 历史 · 已融入高中电话分析、家长方案和档案</p></div><span class="pill">40条新增细分知识卡</span></div><div class="row"><label class="field"><span>学科</span><select id="knowledge53-subject"><option value="">全部五科</option>${KNOWLEDGE53.sources.map(s=>`<option>${esc(s.subject)}</option>`).join('')}</select></label><label class="field"><span>知识点 / 章节搜索</span><input id="knowledge53-query" placeholder="如：定义域、平抛、离子、光合、宋" maxlength="80"></label></div><div id="knowledge53-library"></div>`;
document.getElementById('analysis').before(hub);document.getElementById('knowledge53-query').addEventListener('input',render53Library);document.getElementById('knowledge53-subject').addEventListener('change',render53Library);render53Library();
