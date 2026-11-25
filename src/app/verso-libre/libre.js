export function mountLibre(page,{icons,detect,matchForms,forms,readLine,esc,mountFichas,notebookSettings,cleanups,onRegionChange}) {
const $=s=>page.querySelector(s);
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));$('#libre-save').textContent='';}catch{$('#libre-save').textContent='No se pudo guardar: copiá tu texto para conservarlo.';}};
const load=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback;}catch{return fallback;}};
const slug=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,'-');

// --- Solapas: cada una es un documento «detectar» con su propio texto. La primera hereda el texto que se guardaba antes. ---
const TABS_KEY='el-silbador-metrica-libre',TEXT_KEY=id=>`el-silbador-metrica-libre-texto-${id}`;
const getText=id=>{try{const t=localStorage.getItem(TEXT_KEY(id));return t!==null?t:id==='l1'?localStorage.getItem('el-silbador-metrica-detectar')||'':'';}catch{return '';}};
const setText=(id,text)=>{try{localStorage.setItem(TEXT_KEY(id),text);$('#libre-save').textContent='';}catch{$('#libre-save').textContent='No se pudo guardar: copiá tu texto para conservarlo.';}};
const valid=t=>t&&Array.isArray(t.tabs)&&t.tabs.length&&t.tabs.every(x=>x&&/^l\d+$/.test(x.id))&&t.tabs.some(x=>x.id===t.active)&&Number.isInteger(t.next);
let tabs=load(TABS_KEY,null);
if(!valid(tabs))tabs={active:'l1',next:2,tabs:[{id:'l1'}]};
const tabsBox=$('#libre-tabs'),area=$('#detect-text'),layoutTabs=mountFichas(tabsBox);
const X_ICON=icons.x,PLUS_ICON=icons.plus;
// El nombre sale del primer renglón escrito; sin texto, «Texto N».
const tabLabel=(t,i)=>{const first=(t.id===tabs.active?area.value:getText(t.id)).split(/\r?\n/).map(s=>s.trim()).find(Boolean);return first?(first.length>24?first.slice(0,24)+'…':first):`Texto ${i+1}`;};
function renderTabs(){
 tabsBox.innerHTML=tabs.tabs.map((t,i)=>{const on=t.id===tabs.active,label=esc(tabLabel(t,i));return `<div class="ficha${on?' on':''}"><button type="button" class="ficha-name" role="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="${on}" aria-controls="detect-panel" tabindex="${on?0:-1}">${label}</button><button type="button" class="ficha-x" data-close-tab="${t.id}" aria-label="Eliminar ${label}" data-tooltip="Eliminar">${X_ICON}</button></div>`;}).join('')+`<button type="button" class="ficha-add" id="libre-tab-add" aria-label="Nuevo texto" data-tooltip="Nuevo texto">${PLUS_ICON}</button>`;
 $('#detect-panel').setAttribute('aria-labelledby',`tab-${tabs.active}`);
 layoutTabs();
}
function openTab(){area.value=getText(tabs.active);renderDetect();renderTabs();}
function switchTab(id){
 if(id===tabs.active)return;
 setText(tabs.active,area.value);tabs.active=id;save(TABS_KEY,tabs);openTab();
}
function addTab(){
 setText(tabs.active,area.value);
 const id=`l${tabs.next}`;tabs.tabs.push({id});tabs.next++;tabs.active=id;save(TABS_KEY,tabs);openTab();area.focus();
}
function removeTab(id){
 const at=tabs.tabs.findIndex(t=>t.id===id);if(at<0)return;
 const text=id===tabs.active?area.value:getText(id);
 if(text.trim()&&typeof confirm==='function'&&!confirm('¿Eliminar este texto? No se puede deshacer.'))return;
 try{localStorage.removeItem(TEXT_KEY(id));if(id==='l1')localStorage.removeItem('el-silbador-metrica-detectar');}catch{}
 tabs.tabs.splice(at,1);
 if(!tabs.tabs.length){tabs.tabs.push({id:`l${tabs.next}`});tabs.next++;}
 if(tabs.active===id)tabs.active=(tabs.tabs[at]||tabs.tabs[at-1]).id;
 else setText(tabs.active,area.value);
 save(TABS_KEY,tabs);openTab();
}
tabsBox.addEventListener('click',e=>{
 if(e.target.closest('#libre-tab-add'))return addTab();
 const name=e.target.closest('[data-tab]');if(name){switchTab(name.dataset.tab);$(`#tab-${tabs.active}`)?.focus();return;}
 const close=e.target.closest('[data-close-tab]');if(close){removeTab(close.dataset.closeTab);$(`#tab-${tabs.active}`)?.focus();}
});
// Flechas entre solapas.
tabsBox.addEventListener('keydown',e=>{
 const name=e.target.closest('[data-tab]');if(!name)return;
 const i=tabs.tabs.findIndex(t=>t.id===name.dataset.tab),n=tabs.tabs.length;
 const to=e.key==='ArrowRight'?(i+1)%n:e.key==='ArrowLeft'?(i-1+n)%n:e.key==='Home'?0:e.key==='End'?n-1:-1;
 if(to<0)return;
 e.preventDefault();switchTab(tabs.tabs[to].id);$(`#tab-${tabs.active}`)?.focus();
});

// Cada verso se muestra por sílabas métricas (sinalefas incluidas); la tónica de la rima va en terracota y, si se pide, las demás en naranja.
const ajustes={nums:true,accents:false,restart:false};
function verseHtml(r){
 const reading=readLine(r.line),w=reading.words;
 if(!reading.groups.length)return esc(r.line);
 const startOf=g=>w[g.wi].index+w[g.wi].syllables.slice(0,g.si).join('').length;
 let html='',cursor=0;
 for(const group of reading.groups){
  let slot='',end=startOf(group[0]);
  group.forEach((g,k)=>{
   const start=startOf(g),piece=esc(r.line.slice(start,start+g.text.length));
   if(k)slot+=esc(r.line.slice(end,start));
   slot+=r.tonic&&start===r.tonic[0]?`<mark class="detect-tonic">${piece}</mark>`:g.tonic&&ajustes.accents?`<span class="other-accent">${piece}</span>`:piece;
   end=start+g.text.length;
  });
  html+=esc(r.line.slice(cursor,startOf(group[0])))+`<span class="slot${group.length>1?' joined':''}">${slot}</span>`;
  cursor=end;
 }
 return html+esc(r.line.slice(cursor));
}
// --- Detectar: cuenta y agrupa rimas del texto, sin corregir nada. ---
function renderDetect(){
 const rows=detect($('#detect-text').value);
 $('#detect-hint-icon').hidden=!!rows.length;
 $('#detect-summary-text').textContent=rows.length?`${rows.length} ${rows.length===1?'verso':'versos'} · esquema detectado: ${rows.map(r=>r.count+r.letter).join(' ')}`:'Escribí o pegá tus versos con tildes: son importantes para detectar bien los acentos y las rimas.';
 const found=matchForms(rows,forms),exact=found.filter(f=>!f.approximate);
 // Cada coincidencia va en su renglón, con las letras de rima en su color.
 const colored=scheme=>scheme.split(' ').map(t=>t.replace(/^(\d+)(.)$/,(_,n,l)=>`${n}<b class="${l==='—'?'fam-free':`fam-${l}`}">${l}</b>`)).join(' ');
 const item=f=>`<li><span class="detect-form-title">${f.stanzas>1?`${f.stanzas} × `:''}${esc(f.name)}</span>${f.scheme?` <span class="detect-form-scheme">${colored(f.scheme)}</span>`:' <span class="detect-form-scheme">rima en los versos pares</span>'}<button type="button" class="detect-go" data-go-form="${f.form}" data-go-variant="${f.variant}" aria-label="Pasar el texto a la solapa ${esc(forms[f.form].title)}" data-tooltip="Pasar el texto a la solapa ${esc(forms[f.form].title)}">${icons["arrow-right"]}</button></li>`;
 $('#detect-form-name').innerHTML=!found.length?'':`<p>${exact.length?'Coincide con:':'Se parece a (con medidas aproximadas):'}</p><ul>${(exact.length?exact:found).map(item).join('')}</ul>`;
 $('#detect-result').innerHTML=rows.map((r,i)=>{const first=i===0||rows[i-1].stanza!==r.stanza,n=ajustes.restart?(first?1:(rows[i-1].n||0)+1):i+1;r.n=n;return `<article class="compose-line detect-row${first&&i?' stanza-start':''}" data-rhyme-family="${r.letter}"><span class="vnum">${n}</span><span class="detect-text">${verseHtml(r)}</span><span class="detect-count" data-tooltip="Sílabas métricas${r.pronounced!==r.count?`: ${r.pronounced} pronunciadas más el ajuste del final`:''}"><b>${r.count}</b> sílabas</span><span class="rhyme-badge ${r.letter==='—'?'fam-free':`fam-${r.letter}`}" role="img" aria-label="${r.letter==='—'?'Sin rima detectada':`Rima ${r.letter}, ${r.kind}`}">${r.letter}</span><span class="rhyme-text">${r.letter==='—'?'Sin pareja':`Rima ${r.letter} · ${r.kind}`}</span></article>`;}).join('');
}

area.addEventListener('input',()=>{renderDetect();setText(tabs.active,area.value);const name=tabsBox.querySelector(`#tab-${tabs.active}`);if(name)name.textContent=tabLabel(tabs.tabs.find(t=>t.id===tabs.active),tabs.tabs.findIndex(t=>t.id===tabs.active));});
// La flecha lleva el texto a la solapa de la forma detectada en Métrica (lab.html), en su variante.
$('#detect-form-name').addEventListener('click',e=>{
 const b=e.target.closest('[data-go-form]');if(!b)return;
 const form=+b.dataset.goForm,variant=+b.dataset.goVariant,lines=area.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 save('el-silbador-metrica-libre-envio',{form,variant,lines});
 const id=variant>0&&forms[form].variants?.[variant]?.id;
 location.href=`/metrica#${slug(forms[form].title)}${id?`/${id}`:''}`;
});
$('#detect-form').addEventListener('submit',e=>e.preventDefault());
cleanups.push(notebookSettings.subscribe(settings=>{
 ajustes.nums=settings.nums;ajustes.accents=settings['other-accents'];ajustes.restart=settings.restart;
 $('#detect-result').classList.toggle('hide-nums',!ajustes.nums);
 $('#detect-result').classList.toggle('hide-notes',!settings.notes);
 renderDetect();
}));
openTab();
// La región cambia qué rima con qué (z y c en España): el texto se vuelve a leer.
cleanups.push(onRegionChange(renderDetect));


}
