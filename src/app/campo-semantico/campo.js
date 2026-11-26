import { synonyms, antonyms, known, catalog, formsFor, nameFor, canonical, schemeText, vocabulary, makeSpeller, replaceWord, WIKI_MIN, wikiRhymes, wikiLexicon, wikiRae, fold, parseScheme } from "./semantic";

export function mountCampo(page,{icons, regionPrefs, suggestRhymes, forms, variantOf, meterAt, loadRegion, wordInfo, rhymeOf, rhymeWords, restoreTilde, readLine, detect, mountComposer, mountFichas, userVocabulary, addUserVocabulary, onRegionChange, cleanups, controller}) {
const $=s=>page.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:controller.signal});
const MIN_WORDS=10,MIN_COLS=4,GRID_COLS=12,GRID_ROWS=10,SHOWN=12,MORE_STEP=20;
const mobile=window.matchMedia?.('(max-width: 30rem)');
const exampleInputs=[...page.querySelectorAll('[placeholder^="Por ejemplo:"]')].map(input=>({input,placeholder:input.placeholder}));
function syncExamples(){for(const {input,placeholder} of exampleInputs)input.placeholder=mobile?.matches?placeholder.replace(/^Por ejemplo: (.)/,(_,first)=>first.toUpperCase()):placeholder;}
syncExamples();
if(mobile)listen(mobile,'change',syncExamples);
loadRegion();
const KINDS=[{id:'consonante',title:'Rimas consonantes'},{id:'asonante',title:'Rimas asonantes'},{id:'sinonimo',title:'Sinónimos'},{id:'antonimo',title:'Antónimos'},{id:'relacionada',title:'Relacionadas'}];
const base=catalog(forms,variantOf,meterAt);
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));$('#campo-save').textContent='';}catch{$('#campo-save').textContent='No se pudo guardar: copiá tu composición para conservarla.';}};
const load=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback;}catch{return fallback;}};

// --- Composiciones (tabs): cada una guarda por separado su tema, palabras, esquema y versos. La primera conserva las claves de siempre. ---
const TABS_KEY='el-silbador-campo-tabs';
const freshTabs=()=>({active:'c1',next:2,tabs:[{id:'c1',name:'Composición 1'}]});
let tabs=(()=>{const t=load(TABS_KEY,null);return t&&Array.isArray(t.tabs)&&t.tabs.length&&t.tabs.every(x=>x&&typeof x.id==='string'&&/^c\d+$/.test(x.id)&&typeof x.name==='string')&&t.tabs.some(x=>x.id===t.active)?{active:t.active,next:Math.max(+t.next||0,...t.tabs.map(x=>+x.id.slice(1)+1)),tabs:t.tabs}:freshTabs();})();
const keyOf=(base,id=tabs.active)=>id==='c1'?base:`${base}-${id}`;
const storeOf=(id=tabs.active)=>id==='c1'?'-campo':`-campo-${id}`;
// --- Tema y palabras ---
let bank=[];
// Lo elegido entre rimas, sinónimos y antónimos: cada uno recuerda de qué palabra y de qué lista salió.
let extras=[];
const persist=()=>save(keyOf('el-silbador-campo'),{topic:$('#campo-topic').value,plot:$('#campo-plot').value,words:bank,extras});
// Una entrada puede tener varias palabras (el espacio no la parte): se quitan signos, y se ignoran las repetidas sin mirar tildes ni mayúsculas.
function addWords(text){
 for(const raw of text.split(/[,;]+/)){
  const w=raw.toLocaleLowerCase('es').replace(/[^\p{L}\s]/gu,'').replace(/\s+/g,' ').trim();
  if(w&&!bank.some(x=>fold(x.w)===fold(w)))bank.push({w,on:false});
 }
}
function renderWords(){
 $('#campo-words').innerHTML=bank.map((x,i)=>`<li class="${x.on?'on':''}"><button type="button" class="pick" data-pick="${i}" aria-pressed="${x.on}"><span class="campo-pick-check" aria-hidden="true">${x.on?icons.check:''}</span>${esc(x.w)}</button><button type="button" class="drop" data-drop="${i}" aria-label="Quitar ${esc(x.w)} de la lista" data-tooltip="Quitar">${icons.x}</button></li>`).join('');
 const n=bank.length,missing=MIN_WORDS-n;
 const count=$('#campo-count');
 $('#campo-count-text').textContent=n===0?`Todavía no hay palabras. Hacen falta ${MIN_WORDS} como mínimo.`:missing>0?`${n} ${n===1?'palabra':'palabras'}: faltan ${missing} para llegar a ${MIN_WORDS}.`:`${n} palabras. ¡Excelente! Tenés un buen caudal para empezar a escribir.`;
 count.className='campo-count '+(missing>0?'short':'ok');
 count.querySelector('[data-metrica-icon]').hidden=n!==0;
 const pickSection=$('#campo-pick-section');
 pickSection.classList.toggle('is-off',n===0);
 pickSection.setAttribute('aria-disabled',String(n===0));
 $('#campo-words').toggleAttribute('inert',n===0);
 renderResults();renderField();renderLock();persist();
}
// Las palabras que se escriben quedan como fichas (la coma o Tab las cierran) y "Agregar" las envía todas juntas.
let pending=[];
const wordInput=$('#campo-word');
function renderPending(){
 $('#campo-tokens').innerHTML=pending.map((w,i)=>`<li class="campo-token"><span>${esc(w)}</span><button type="button" data-untoken="${i}" aria-label="Quitar ${esc(w)}">${icons.x}</button></li>`).join('');
}
function tokenize(text){
 for(const raw of text.split(/[,;]+/)){
  const w=raw.replace(/\s+/g,' ').trim();
  if(w)pending.push(w);
 }
 renderPending();
}
function submitWords(){
 tokenize(wordInput.value);wordInput.value='';
 addWords(pending.join(','));pending=[];renderPending();renderWords();wordInput.focus();
}
$('#campo-add').addEventListener('submit',e=>{e.preventDefault();submitWords();});
wordInput.addEventListener('input',()=>{
 if(!/[,;]/.test(wordInput.value))return;
 const parts=wordInput.value.split(/[,;]/),rest=parts.pop();
 tokenize(parts.join(','));wordInput.value=rest.replace(/^\s+/,'');
});
wordInput.addEventListener('keydown',e=>{
 if(e.key==='Backspace'&&!wordInput.value&&pending.length){pending.pop();renderPending();return;}
 if(e.key!=='Tab'||e.shiftKey||!wordInput.value.trim())return;
 e.preventDefault();tokenize(wordInput.value);wordInput.value='';
});
$('#campo-tokens').addEventListener('click',e=>{const b=e.target.closest('[data-untoken]');if(!b)return;pending.splice(+b.dataset.untoken,1);renderPending();wordInput.focus();});
// La primera letra de lo que se escribe va siempre en mayúscula.
for(const sel of ['#campo-topic','#campo-plot','#campo-free-text'])$(sel)?.addEventListener('input',e=>{
 const el=e.target,v=el.value,k=v.search(/\S/);
 if(k<0)return;
 const up=v[k].toLocaleUpperCase('es');
 if(up===v[k])return;
 const s=el.selectionStart,t=el.selectionEnd;el.value=v.slice(0,k)+up+v.slice(k+1);el.setSelectionRange(s,t);
});
$('#campo-words').addEventListener('click',e=>{
 const pick=e.target.closest('[data-pick]'),drop=e.target.closest('[data-drop]');
 if(pick){const x=bank[+pick.dataset.pick];x.on=!x.on;}
 else if(drop){bank.splice(+drop.dataset.drop,1);}
 else return;
 const focus=pick?`[data-pick="${pick.dataset.pick}"]`:null;
 renderWords();if(focus)$(focus)?.focus();else $('#campo-word').focus();
});
$('#campo-topic').addEventListener('input',()=>{persist();renderLock();if(tabsReady)renderTabs();});
$('#campo-plot').addEventListener('input',persist);
$('#campo-plot').addEventListener('input',()=>fitPlot());
listen(window,'resize',()=>fitPlot());

// --- Resultados por palabra ---
const rhymeCache=new Map();
// Diccionario: se pide una sola vez, la primera vez que se usa el paso 2, y se suma a las rimas del taller sin repetirlas.
const DICT_CAP=120;
let dict=null,dictState='idle';
const dictGroups=new Map();
const DICT_URL='/diccionario-rimas.json',DICT_TTL=30*864e5;
async function dictionarySource(){
 let cache;
 try{
  cache=await caches.open('el-silbador-diccionario');
  const hit=await cache.match(DICT_URL);
  if(hit&&Date.now()-Number(hit.headers.get('x-cached-at'))<DICT_TTL)return hit.json();
 }catch{}
 const response=await fetch(DICT_URL,{signal:controller.signal});
 if(!response.ok)throw new Error(`Diccionario: ${response.status}`);
 const data=await response.json();
 if(cache)try{await cache.put(DICT_URL,new Response(JSON.stringify(data),{headers:{'content-type':'application/json','x-cached-at':String(Date.now())}}));}catch{}
 return data;
}
function ensureDictionary(){
 if(dictState!=='idle')return;
 dictState='loading';
 dictionarySource().then(data=>{
  if(controller.signal.aborted)return;
  dict=data;dictState='ready';rhymeCache.clear();renderResults();checkSpelling();
 }).catch(()=>{
  if(controller.signal.aborted)return;
  dictState='error';renderResults();
 });
}
function dictGroup(key){
 if(!dictGroups.has(key))dictGroups.set(key,(dict?.[key]||'').split(' ').filter(Boolean).flatMap(word=>{const info=wordInfo(word),r=info&&rhymeOf(info,'consonante');return r?[{word,cons:r.key,dict:true,rhyme:r}]:[];}));
 return dictGroups.get(key);
}
// Formas de número de una palabra: ella misma, su plural y su singular (sin tildes ni mayúsculas).
function numberForms(w){
 const f=fold(w),forms=[f,f+'s',f+'es'];
 if(f.endsWith('es')&&f.length>3)forms.push(f.slice(0,-2));
 if(f.endsWith('s')&&f.length>2)forms.push(f.slice(0,-1));
 return forms;
}
// Cercanía sonora entre dos asonantes: todas valen por regla, pero suenan más cerca de una consonante las que comparten más letras finales,
// la misma sílaba tónica completa (an–an) y la misma forma del final (ia–ia). Lo que más pesa es tener la misma cantidad de sílabas desde la tónica (grave con grave).
const vowelsOnly=s=>fold(s).replace(/[^aeiouy]/g,'');
function closeness(base,cand){
 const a=fold(base.tail),b=fold(cand.tail);
 let suffix=0;
 while(suffix<a.length&&suffix<b.length&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
 const last=x=>x.syllables.at(-1);
 return suffix*10+(fold(base.syllables[0])===fold(cand.syllables[0])?6:0)+(vowelsOnly(last(base))===vowelsOnly(last(cand))?3:0)+(base.syllables.length===cand.syllables.length?40:0);
}
// Lectura de rima de cada palabra propia, calculada una vez y renovada cuando el vocabulario crece.
let userRhymeList=null;
function userRhymes(){
 if(!userRhymeList)userRhymeList=userVocabulary().flatMap(word=>{const info=wordInfo(word),c=info&&rhymeOf(info,'consonante'),a=info&&rhymeOf(info,'asonante');return c&&a?[{word,cons:c.key,aso:a.key,rhyme:c,own:true}]:[];});
 return userRhymeList;
}
function rhymesOf(word){
 const place=regionPrefs(),key=`${fold(word)}|${place.region}|${place.register}`;
 if(rhymeCache.has(key))return rhymeCache.get(key);
 const info=wordInfo(restoreTilde(word));
 let out=null;
 if(info){
  // Sin verso de referencia: la medida no limita, sólo se ordenan los finales (primero los del folklore).
  const consonant=suggestRhymes('',info,'consonante',99,undefined,place),taken=new Set(consonant.map(w=>w.word));
  const assonant=suggestRhymes('',info,'asonante',99,undefined,place).filter(w=>!taken.has(w.word));
  const cons=rhymeOf(info,'consonante')?.key,aso=rhymeOf(info,'asonante')?.key;
  // Las palabras que el usuario agregó antes van primero entre las que no son del vocabulario del taller.
  if(aso){
   const seen=new Set([fold(word),...consonant.map(w=>fold(w.word)),...assonant.map(w=>fold(w.word))]);
   const mine=userRhymes().filter(x=>x.aso===aso&&!seen.has(fold(x.word)));
   consonant.push(...mine.filter(x=>x.cons===cons));
   assonant.push(...mine.filter(x=>x.cons!==cons));
  }
  if(dict&&aso){
   const seen=new Set([fold(word),...consonant.map(w=>fold(w.word)),...assonant.map(w=>fold(w.word))]);
   const group=dictGroup(aso).filter(x=>!seen.has(fold(x.word)));
   consonant.push(...group.filter(x=>x.cons===cons).slice(0,DICT_CAP));
   assonant.push(...group.filter(x=>x.cons!==cons));
  }
  // Una palabra y su plural cuentan como una sola: lo que ya está en consonantes no vuelve en asonantes, y dentro de cada lista sólo queda la primera forma.
  // De la más a la menos parecida; a igual cercanía se conserva el orden anterior (folklore primero, luego las más usadas).
  if(info&&assonant.length){const base=rhymeOf(info,'consonante'),score=new Map(assonant.map(w=>[w,closeness(base,w.rhyme||rhymeOf(w.info,'consonante'))]));assonant.sort((x,y)=>score.get(y)-score.get(x));}
  const used=new Set(numberForms(word)),keepNew=list=>list.filter(w=>{const forms=numberForms(w.word);if(forms.some(f=>used.has(f)))return false;forms.forEach(f=>used.add(f));return true;});
  const finalConsonant=keepNew(consonant);
  let dictLeft=DICT_CAP;
  const finalAssonant=keepNew(assonant).filter(w=>!w.dict||dictLeft-->0);
  consonant.length=0;consonant.push(...finalConsonant);assonant.length=0;assonant.push(...finalAssonant);
  out={consonant,assonant};
 }
 rhymeCache.set(key,out);
 return out;
}
// Resalta en negrita lo que la palabra comparte con la original: la rima consonante desde la vocal tónica; la asonante, sólo las vocales que cuentan.
function vowelAt(syllable){
 const f=[...fold(syllable)],skip=k=>f[k]==='u'&&'qg'.includes(f[k-1]||'#')&&'ei'.includes(f[k+1]||'#');
 const at=re=>f.findIndex((c,k)=>re.test(c)&&!skip(k));
 const j=at(/[aeo]/);
 return j>=0?j:at(/[iuy]/);
}
function highlight(word,kind){
 const info=wordInfo(word),r=info&&rhymeOf(info,kind);
 if(!r||r.tail.length>word.length)return esc(word);
 const start=word.length-r.tail.length,head=esc(word.slice(0,start));
 if(kind==='consonante')return `${head}<b>${esc(word.slice(start))}</b>`;
 const keep=new Set(r.syllables.length>2?[0,r.syllables.length-1]:r.syllables.map((_,i)=>i));
 let at=start,html=head;
 r.syllables.forEach((syl,i)=>{
  const piece=word.slice(at,at+syl.length),j=keep.has(i)?vowelAt(piece):-1;
  html+=j<0?esc(piece):`${esc(piece.slice(0,j))}<b>${esc(piece[j])}</b>${esc(piece.slice(j+1))}`;
  at+=syl.length;
 });
 return html;
}
const revealed=new Map();
const extraKey=(from,kind,w)=>`${fold(from)}|${kind}|${fold(w)}`;
// Una palabra elegida lo está en todas las listas de su tarjeta donde aparezca (por ejemplo, rima y antónimo a la vez).
const sameChip=(x,from,w)=>fold(x.from)===fold(from)&&fold(x.w)===fold(w);
const isPicked=(from,kind,w)=>extras.some(x=>sameChip(x,from,w));
const chipList=(list,empty,kind,from)=>{
 if(!list.length)return `<p class="campo-empty">${empty}</p>`;
 const item=x=>{const w=x.word??x,on=isPicked(from,kind,w);return `<li${x.folk?' class="folk" title="Palabra de uso folklórico"':''}><button type="button" class="chip" data-extra="${esc(w)}" data-kind="${kind}" data-from="${esc(from)}" aria-pressed="${on}">${kind==='consonante'||kind==='asonante'?highlight(w,kind):esc(w)}</button></li>`;};
 // «Ver más» revela de a MORE_STEP; lo revelado se recuerda por palabra y lista.
 const key=extraKey(from,kind,''),shown=Math.min(list.length,SHOWN+(revealed.get(key)||0)),left=list.length-shown;
 return `<ul class="campo-chips">${list.slice(0,shown).map(item).join('')}</ul>${left?`<button type="button" class="campo-more" data-more="${esc(key)}">Ver más</button>`:''}`;
};
// --- Apoyo del Wikcionario: sólo si los recursos del taller dan menos de WIKI_MIN resultados ---
const wikiData=new Map(),wikiAsked=new Set();
let wikiPending=0,wikiFailed=false;
// Suma las palabras nuevas de «extra» a «list»: una palabra y su plural cuentan como una sola.
function addNew(list,extra,skip=[]){
 const used=new Set(skip.flatMap(numberForms));
 list.forEach(w=>numberForms(w.word??w).forEach(f=>used.add(f)));
 const out=[...list];
 for(const w of extra){const forms=numberForms(w);if(forms.some(f=>used.has(f)))continue;forms.forEach(f=>used.add(f));out.push(w);}
 return out;
}
function askWiki(kind,word,run){
 const key=`${kind}|${fold(word)}`;
 if(wikiAsked.has(key)||typeof fetch!=='function')return;
 wikiAsked.add(key);wikiPending++;
 run().then(data=>{wikiData.set(key,data);},()=>{wikiFailed=true;}).finally(()=>{wikiPending--;if(!controller.signal.aborted)renderResults();});
}
// Position rich help beside its trigger, keeping it above sticky sections and inside the viewport.
function placeInfo(popup,trigger){
 if(!popup||!trigger)return;
 const gap=8,edge=16,anchor=trigger.getBoundingClientRect();
 popup.classList.add('campo-info-popup');
 Object.assign(popup.style,{position:'fixed',width:`${Math.min(380,window.innerWidth-edge*2)}px`,maxWidth:'none',maxHeight:`${Math.min(520,window.innerHeight-edge*2)}px`,overflowY:'auto',right:'auto',transform:'none',zIndex:'60'});
 const {width,height}=popup.getBoundingClientRect();
 const left=Math.max(edge,Math.min(anchor.right-width,window.innerWidth-width-edge));
 const below=anchor.bottom+gap,above=anchor.top-gap-height;
 const top=below+height<=window.innerHeight-edge?below:above>=edge?above:Math.max(edge,window.innerHeight-height-edge);
 Object.assign(popup.style,{left:`${left}px`,top:`${top}px`});
}
const infoDetails=[...page.querySelectorAll('#campo-results-info,#campo-scheme-info')];
for(const details of infoDetails){
 const trigger=details.querySelector('summary'),popup=details.querySelector('.composer-tooltip');
 popup.id=`${details.id}-popup`;
 popup.setAttribute('role','dialog');
 popup.setAttribute('aria-label',trigger.getAttribute('aria-label'));
 trigger.setAttribute('aria-haspopup','dialog');
 trigger.setAttribute('aria-controls',popup.id);
 trigger.setAttribute('aria-expanded','false');
 listen(details,'toggle',()=>{trigger.setAttribute('aria-expanded',String(details.open));if(details.open)placeInfo(popup,trigger);});
}
// Un clic fuera de un tooltip de info lo cierra (el <details> nativo sólo se cierra con su propio ícono).
listen(document,'click',e=>{for(const open of page.querySelectorAll('.composer-info[open]'))if(!e.composedPath().includes(open))open.open=false;});
function positionOpenInfo(){
 const visible=trigger=>{const rect=trigger.getBoundingClientRect();return rect.bottom>=0&&rect.top<=window.innerHeight;};
 for(const details of infoDetails)if(details.open){
  const trigger=details.querySelector('summary');
  if(visible(trigger))placeInfo(details.querySelector('.composer-tooltip'),trigger);else details.open=false;
 }
 const popup=$('#campo-results .campo-popover'),trigger=$('#campo-results .info-btn[aria-expanded="true"]');
 if(popup&&trigger){if(visible(trigger))placeInfo(popup,trigger);else{infoOpen=null;renderResults();}}
}
listen(window,'resize',positionOpenInfo);
listen(window,'scroll',positionOpenInfo,{capture:true});
const INFO_ICON=icons["info"];
const ASO_TEXT=['En la rima asonante cuentan solo las vocales desde la última sílaba tónica, la que lleva el acento. Las consonantes no importan.','En ca-<b>LÁN</b>-dria, la sílaba tónica es «lán» y las vocales que cuentan son <b>a</b> (de lán) y <b>a</b> (del final -dria): a–a. Por eso rima con pa-<b>LA</b>-bra.','Si hay un diptongo, cuenta la vocal fuerte (a, e, o) y no la débil (i, u): en «dria» cuenta la a, no la i. Por eso «fiaca» (FIA-ca, a–a) también rima con calandria.','Las vocales en negrita son las que se comparan. Las rimas van de las más a las menos parecidas: primero las que tienen el mismo largo de final (grave con grave, esdrújula con esdrújula) y, dentro de eso, las que comparten más letras finales con la palabra.'].map(t=>`<p>${t}</p>`).join('');
let infoOpen=null;// palabra de la tarjeta cuyo popup está abierto
function renderResults(){
 const picked=bank.filter(x=>x.on);
 if(picked.length)ensureDictionary();
 const wikiNote=wikiPending>0?' Consultando diccionarios en línea…':wikiFailed?' No pudimos consultar algún diccionario en línea.':'';
 const dictNote=dictState==='loading'?' Ampliando las rimas con el diccionario…':dictState==='error'?' No pudimos cargar el diccionario: se muestran sólo las rimas del vocabulario del taller.':'';
 $('#campo-results-note').textContent=!bank.length?'Agregá palabras en el paso 2 y elegí las mejores en el paso 3.':!picked.length?'Elegí una o más palabras en el paso 3 para ver sus rimas, sinónimos y antónimos.':`${dictNote}${wikiNote}`.trim();
 $('#campo-results').innerHTML=picked.map(({w},i)=>{
  let r=rhymesOf(w),syn=synonyms(w),ant=antonyms(w);
  const inLexicon=known(w),info=wordInfo(restoreTilde(w)),tail=info&&rhymeOf(info,'consonante');
  if(r&&tail&&r.consonant.length<WIKI_MIN&&dictState!=='loading'&&dictState!=='idle')askWiki('rima',w,()=>wikiRhymes(tail.syllables));
  if(syn.length<WIKI_MIN||ant.length<WIKI_MIN)askWiki('lex',w,()=>wikiLexicon(restoreTilde(w)));
  const wr=wikiData.get(`rima|${fold(w)}`),wl=wikiData.get(`lex|${fold(w)}`);
  if(r&&wr){
   const exact=wr.filter(x=>{const i=wordInfo(x);return i&&rhymeOf(i,'consonante')?.key===tail.key;});
   r={consonant:addNew(r.consonant,exact,[w,...r.assonant.map(x=>x.word)]),assonant:r.assonant};
  }
  if(wl){syn=addNew(syn,wl.syn,[w]);ant=addNew(ant,wl.ant,[w]);}
  // La RAE se consulta sólo cuando el Wikcionario ya respondió y, entre sinónimos, antónimos y relacionadas, la palabra tiene menos de WIKI_MIN sugerencias.
  const raeKey=`rae|${fold(w)}`;
  if(wl&&syn.length+ant.length+(wl.rel||[]).length<WIKI_MIN)askWiki('rae',w,()=>wikiRae(restoreTilde(w)));
  const rae=wikiData.get(raeKey);
  if(rae){syn=addNew(syn,rae.syn,[w]);ant=addNew(ant,rae.ant,[w]);}
  // Las relacionadas (no son sinónimos exactos) van aparte y sin repetir lo que ya está en sinónimos o antónimos.
  const rel=wl?addNew([],wl.rel||[],[w,...syn,...ant].map(x=>x.word??x)):[];
  const searching=wikiPending>0&&((wikiAsked.has(`lex|${fold(w)}`)&&!wl)||(wikiAsked.has(raeKey)&&!rae));
  const noRhyme=r?(dictState==='loading'?'Buscando más rimas en el diccionario…':'No encontramos rimas para esta palabra.'):'No pudimos leer esta palabra para buscar rimas.';
  const noSyn=searching?'Buscando en diccionarios en línea…':inLexicon?'No tenemos sinónimos registrados.':'No encontramos sugerencias.';
  const noAnt=searching?'Buscando en diccionarios en línea…':inLexicon?'No tenemos antónimos registrados.':'No encontramos sugerencias.';
  return `<article class="campo-card"><h3>${esc(w)}</h3><h4>Rimas consonantes</h4>${chipList(r?.consonant||[],noRhyme,'consonante',w)}<h4 class="campo-h4-info">Rimas asonantes <button type="button" class="info-btn" data-info="${esc(w)}" aria-haspopup="dialog" aria-expanded="${infoOpen===w}" aria-controls="aso-info-${i}" aria-label="¿Qué es una rima asonante?">${INFO_ICON}</button>${infoOpen===w?`<div class="campo-popover" id="aso-info-${i}" role="dialog" aria-label="Rima asonante"><button type="button" class="close-x campo-popover-x" data-info="${esc(w)}" aria-label="Cerrar explicación">${icons["x"]}</button>${ASO_TEXT}</div>`:''}</h4>${chipList(r?.assonant||[],noRhyme,'asonante',w)}<h4>Sinónimos</h4>${chipList(syn,noSyn,'sinonimo',w)}<h4>Antónimos</h4>${chipList(ant,noAnt,'antonimo',w)}${rel.length?`<h4>Relacionadas</h4>${chipList(rel,'','relacionada',w)}`:''}</article>`;
 }).join('');
 positionOpenInfo();
}
onRegionChange(()=>{rhymeCache.clear();renderResults();});
// Pasar por el paso 2 (escribir o tocar una palabra) inicia la descarga del diccionario en segundo plano.
$('#palabras-title').closest('section').addEventListener('focusin',ensureDictionary);
$('#campo-results').addEventListener('click',e=>{
 const more=e.target.closest('[data-more]');
 if(more){const k=more.dataset.more;revealed.set(k,(revealed.get(k)||0)+MORE_STEP);renderResults();[...$('#campo-results').querySelectorAll('[data-more]')].find(b=>b.dataset.more===k)?.focus();return;}
 const info=e.target.closest('[data-info]');
 if(info){const w=info.dataset.info;infoOpen=infoOpen===w?null:w;renderResults();[...$('#campo-results').querySelectorAll('[data-info]')].find(b=>b.dataset.info===w)?.focus();return;}
 const b=e.target.closest('[data-extra]');if(!b)return;
 const x={w:b.dataset.extra,kind:b.dataset.kind,from:b.dataset.from};
 extras=isPicked(x.from,x.kind,x.w)?extras.filter(y=>!sameChip(y,x.from,x.w)):[...extras,x];
 $('#campo-results').querySelectorAll('[data-extra]').forEach(c=>c.setAttribute('aria-pressed',String(isPicked(c.dataset.from,c.dataset.kind,c.dataset.extra))));
 persist();renderField();
});

// El popup se cierra con un clic afuera o con Escape (devolviendo el foco al ícono).
// La ruta original del evento conserva el botón aunque renderResults haya retirado el SVG pulsado.
listen(document,'click',e=>{if(infoOpen&&!e.composedPath().some(node=>node instanceof Element&&node.matches('.campo-popover,[data-info]'))){infoOpen=null;renderResults();}});
listen(document,'keydown',e=>{
 if(e.key!=='Escape'||!infoOpen)return;
 const w=infoOpen;infoOpen=null;renderResults();
 [...$('#campo-results').querySelectorAll('[data-info]')].find(b=>b.dataset.info===w)?.focus();
});

// --- Campo semántico: sólo las palabras, las del tema primero y luego lo elegido de cada lista ---
function fieldWords(){
 const picked=bank.filter(x=>x.on),origin=new Set(picked.map(x=>fold(x.w))),seen=new Set(),out=[];
 for(const w of [...picked.map(x=>x.w),...extras.filter(x=>origin.has(fold(x.from))).map(x=>x.w)])if(!seen.has(fold(w))){seen.add(fold(w));out.push(w);}
 return out;
}
// Los boxes «El tema» y «El campo semántico» pueden pasar a un drawer lateral: el tema a la izquierda y el campo a la derecha. Un solo botón con chevron lo abre y, una vez abierto, se vuelve una X que lo cierra y devuelve el box a su lugar.
const FIELD_SHOWN=20;
let fieldDrawer=false,temaDrawer=false;
const ICON_LEFT=icons["chevron-left"],ICON_RIGHT=icons["chevron-right"],ICON_CLOSE=icons.x;
// Palabras (o frases) del campo que ya aparecen en los versos del cuaderno; se compara sin tildes ni mayúsculas.
function usedInVerses(list){
 const lines=(editor?editor.lines():[]).map(l=>` ${fold(l).match(/[a-zñü]+/g)?.join(' ')||''} `);
 return new Set(list.filter(w=>{const phrase=` ${fold(w).match(/[a-zñü]+/g)?.join(' ')||''} `;return phrase.trim()&&lines.some(l=>l.includes(phrase));}));
}
function renderField(){
 const list=fieldWords(),used=usedInVerses(list),shown=fieldDrawer?list.length:Math.min(list.length,FIELD_SHOWN),left=list.length-shown;
 if(!list.length)fieldDrawer=false;
 const toggle=$('#campo-field-toggle');
 $('#campo-field-note').textContent=list.length?'':'Elegí palabras en el paso 3 y sumá rimas, sinónimos o antónimos en el paso 4.';
 $('#campo-field-section').classList.toggle('is-drawer',fieldDrawer);
 toggle.hidden=!list.length;
 toggle.innerHTML=fieldDrawer?ICON_CLOSE:ICON_RIGHT;
 toggle.setAttribute('aria-label',fieldDrawer?'Cerrar el panel lateral':'Abrir el campo semántico en un panel lateral');
 toggle.setAttribute('aria-expanded',String(fieldDrawer));
 $('#campo-field').innerHTML=list.length?`<ul class="campo-chips">${list.slice(0,shown).map(w=>`<li class="own${used.has(w)?' used':''}">${esc(w)}${used.has(w)?'<span class="sr-only"> (ya usada en tu letra)</span>':''}</li>`).join('')}</ul>${left?`<button type="button" class="campo-more" data-field-more aria-haspopup="dialog">Ver más (${left})</button>`:''}`:'';
}
// Sólo en desktop y con el tema en el drawer, el argumento crece con el texto hasta el borde del viewport.
const DESKTOP=window.matchMedia?.('(min-width:651px)');
function fitPlot(){
 const ta=$('#campo-plot'),max=+ta.maxLength,len=ta.value.length,words=(ta.value.match(/\p{L}[\p{L}\p{N}'’-]*/gu)||[]).length;
 const count=$('#campo-plot-count');
 count.textContent=`${words} ${words===1?'palabra':'palabras'} · ${len}/${max} caracteres${len>=max?' (límite alcanzado)':''}`;
 count.classList.toggle('full',len>=max);
 ta.style.height='';
 if(!temaDrawer||!DESKTOP?.matches)return;
 const room=window.innerHeight-ta.offsetTop-20;
 ta.style.height=`${Math.min(ta.scrollHeight+2,Math.max(room,0))}px`;
}
function renderTema(){
 const toggle=$('#campo-tema-toggle');
 $('#campo-tema-section').classList.toggle('is-drawer-left',temaDrawer);
 toggle.innerHTML=temaDrawer?ICON_CLOSE:ICON_LEFT;
 toggle.setAttribute('aria-label',temaDrawer?'Cerrar el panel lateral':'Abrir el tema en un panel lateral');
 toggle.setAttribute('aria-expanded',String(temaDrawer));
 fitPlot();
}
// Pueden estar abiertos los dos a la vez. Sólo la X cierra un drawer y devuelve el box a su versión original.
function setDrawer(which,open,focus=true){
 if(which==='field')fieldDrawer=open;else temaDrawer=open;
 renderField();renderTema();
 if(focus)$(which==='field'?'#campo-field-toggle':'#campo-tema-toggle').focus();
}
renderTema();
$('#campo-field').addEventListener('click',e=>{if(e.target.closest('[data-field-more]'))setDrawer('field',true);});
$('#campo-field-toggle').addEventListener('click',()=>setDrawer('field',!fieldDrawer));
$('#campo-tema-toggle').addEventListener('click',()=>setDrawer('tema',!temaDrawer));

// --- Estrofa: se habilita con el tema y las palabras mínimas ---
let hasScheme=false;
function renderLock(){
 // Las etapas 4 a 6 se habilitan juntas: apenas hay una palabra elegida, el campo semántico tiene contenido.
 const picked=bank.some(x=>x.on),off=!picked;
 for(const id of ['#campo-results-section','#campo-field-section','#campo-free-section','#campo-matrix-section']){$(id).classList.toggle('is-off',off);$(id).setAttribute('aria-disabled',String(off));}
 for(const id of ['#campo-results','#campo-field','#campo-free-form','#campo-matrix-body'])$(id).toggleAttribute('inert',off);
 // Dice qué hacer ahora, según dónde esté el usuario.
 const todo=!bank.length?'Primero escribí algunas palabras del tema en el paso 2 y después tocá al menos una en el paso 3 para elegirla.':'Tocá al menos una de tus palabras en el paso 3 para elegirla.';
 $('#campo-lock').textContent=off?`Todavía no se puede armar la estrofa. ${todo}`:'';
 $('#campo-lock').classList.toggle('campo-alert',off);
 // El cuaderno necesita además una estrofa: un tamaño elegido o un esquema escrito.
 const notebookOff=off||!hasScheme;
 $('#campo-notebook-section').classList.toggle('is-off',notebookOff);$('#campo-notebook-section').setAttribute('aria-disabled',String(notebookOff));
 $('#campo-notebook-body').toggleAttribute('inert',notebookOff);
 $('#campo-notebook-lock').textContent=notebookOff?(off?`Todavía no se puede escribir. ${todo}`:'Todavía no se puede escribir. Elegí el tamaño de la estrofa en el paso 5, o escribí su esquema, para que aparezcan los versos.'):'';
 $('#campo-notebook-lock').classList.toggle('campo-alert',notebookOff);
}

// --- Selector de matriz ---
const grid=$('#campo-grid'),picker=$('#campo-picker');
// La primera fila lleva el número de columna y la primera columna el de fila, dentro de los cuadros.
grid.innerHTML=Array.from({length:GRID_COLS*GRID_ROWS},(_,i)=>{const c=i%GRID_COLS,r=Math.floor(i/GRID_COLS);return `<i class="${c<MIN_COLS-1?'min':''}">${r===0?c+1:c===0?r+1:''}</i>`;}).join('');
const cells=[...grid.children],labels=cells.map(cell=>cell.textContent);
let chosen=null,preview=null,celebrate=false,sizeKey='';
const CHECK_SVG=icons["check"];
const clampSize=(c,r)=>({cols:Math.min(GRID_COLS,Math.max(MIN_COLS,c)),rows:Math.min(GRID_ROWS,Math.max(1,r))});
function paintGrid(){
 const shown=preview||chosen;
 cells.forEach((cell,i)=>{const c=i%GRID_COLS+1,r=Math.floor(i/GRID_COLS)+1;cell.classList.toggle('in',!!shown&&c<=shown.cols&&r<=shown.rows);cell.classList.toggle('chosen',!!chosen&&c===chosen.cols&&r===chosen.rows);cell.textContent=preview&&c===preview.cols&&r===preview.rows?`${c}×${r}`:labels[i];});
 grid.classList.toggle('has-chosen',!!chosen);
 const text=shown?`${shown.rows} ${shown.rows===1?'verso':'versos'} de ${shown.cols} sílabas`:'Pasá el cursor o tocá para elegir',done=!preview&&!!chosen,key=`${done}|${text}`,box=$('#campo-picker-size');
 // Al confirmar el tamaño, el tilde aparece con chispas; si sólo se restaura al volver a la página, queda quieto.
 if(key!==sizeKey||celebrate){
  sizeKey=key;
  box.innerHTML=done?`<span class="size-check${celebrate?' pop':''}">${celebrate?Array.from({length:10},(_,n)=>`<i class="spark" style="--a:${n*36}deg;--d:${n%2?34:46}px;--c:${['#f2b632','#3f8f4f','#3e7bd6','#d6578c','#ff8a3d'][n%5]}"></i>`).join(''):''}${CHECK_SVG}</span><span>${text}</span>`:`<span>${text}</span>`;
  celebrate=false;
 }
}
const sizeAt=e=>{const box=grid.getBoundingClientRect();return clampSize(Math.floor((e.clientX-box.left)/box.width*GRID_COLS)+1,Math.floor((e.clientY-box.top)/box.height*GRID_ROWS)+1);};
// Mientras hay un tamaño elegido queda fijo: el cursor ya no lo cambia, sólo otro clic (o el teclado).
grid.addEventListener('pointermove',e=>{if(chosen)return;preview=sizeAt(e);paintGrid();});
grid.addEventListener('pointerleave',()=>{preview=null;paintGrid();});
grid.addEventListener('click',e=>{preview=null;pickSize(sizeAt(e));});
// Teclado: las flechas mueven el tamaño y Enter lo elige.
picker.addEventListener('keydown',e=>{
 const step={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowUp:[0,-1]}[e.key];
 if(step){e.preventDefault();const from=preview||chosen||{cols:MIN_COLS-1,rows:0};preview=clampSize(from.cols+step[0],from.rows+step[1]);paintGrid();}
 else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(preview){const size=preview;preview=null;pickSize(size);}}
 else if(e.key==='Escape'&&preview){preview=null;paintGrid();}
});
picker.addEventListener('blur',()=>{preview=null;paintGrid();});

// --- Esquema y cuaderno ---
const form={title:'A medida',pattern:['a'],meters:[8],kind:'asonante'};
let editor;
// El esquema es un contenteditable: las letras de rima se pintan mientras se escribe, sin mover el cursor.
const schemeEl=$('#campo-scheme');
Object.defineProperty(schemeEl,'value',{get:()=>schemeEl.textContent,set:v=>{schemeEl.innerHTML=paintScheme(String(v));}});
const paintScheme=text=>esc(text).replace(/(\d+)([a-zñ]|[—–-])(?=\s|$|[,;/])/gi,(_,n,l)=>`${n}<b class="${famOf(l)}">${l}</b>`);
const caretOffset=()=>{const s=getSelection();if(!s||!s.rangeCount||!schemeEl.contains(s.anchorNode))return null;const r=s.getRangeAt(0).cloneRange();r.selectNodeContents(schemeEl);r.setEnd(s.anchorNode,s.anchorOffset);return r.toString().length;};
function setCaret(n){
 const w=document.createTreeWalker(schemeEl,NodeFilter.SHOW_TEXT);let node,left=n;
 while((node=w.nextNode())){if(left<=node.length){const r=document.createRange();r.setStart(node,left);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);return;}left-=node.length;}
}
function repaintScheme(){
 const text=schemeEl.textContent,html=paintScheme(text);
 if(schemeEl.innerHTML===html)return;
 let at=null;try{at=caretOffset();}catch{}
 schemeEl.innerHTML=html;
 try{if(at!==null)setCaret(at);}catch{}
}
schemeEl.addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});
schemeEl.addEventListener('paste',e=>{e.preventDefault();const t=(e.clipboardData?.getData('text')||'').replace(/\s+/g,' ');document.execCommand('insertText',false,t);});
listen(document,'click',e=>{for(const d of page.querySelectorAll('#campo-scheme-info,#campo-results-info'))if(d.open&&!d.contains(e.target))d.open=false;});
listen(document,'keydown',e=>{if(e.key!=='Escape')return;for(const d of page.querySelectorAll('#campo-scheme-info,#campo-results-info'))if(d.open){d.open=false;d.querySelector('summary').focus();}});
const uniform=m=>m.length&&m.every(x=>x===m[0]);
// El tamaño elegido propone la primera forma que le corresponde; si ninguna, versos libres para completar.
function pickSize({cols,rows}){
 celebrate=true;
 const options=formsFor(base,cols,rows);
 $('#campo-scheme').value=options.length?schemeText(options[0].scheme,cols):Array(rows).fill(`${cols}—`).join(' ');
 renderScheme();
}
// Las letras de rima llevan los colores del cuaderno (a azul, b verde…); pasada la h se repiten, y el verso libre va gris.
const famOf=l=>l==='—'?'fam-free':`fam-${'abcdefgh'[(l.charCodeAt(0)-97)%8]}`;
const colorScheme=(letters,meters)=>[...letters].map((l,i)=>`${[].concat(meters)[i%[].concat(meters).length]}<b class="${famOf(l)}">${esc(l)}</b>`).join(' ');
function renderScheme(){
 const text=$('#campo-scheme').value,{pattern,meters,ignored}=parseScheme(text);
 save(keyOf('el-silbador-campo-esquema'),{text});
 const skipped=ignored.length?` No entendí ${ignored.map(t=>`«${t}»`).join(', ')}: usá un número y una letra, como 8a.`:'';
 $('#campo-editor').hidden=!pattern.length;
 hasScheme=pattern.length>0;renderLock();
 chosen=pattern.length&&uniform(meters)?{cols:Math.min(meters[0],GRID_COLS),rows:Math.min(pattern.length,GRID_ROWS)}:null;
 if(meters[0]>GRID_COLS||pattern.length>GRID_ROWS)chosen=null;
 paintGrid();
 if(!pattern.length){$('#campo-status').textContent=text.trim()?`No hay versos todavía.${skipped}`:'Elegí un tamaño en la grilla o escribí un esquema, como 8a 8b 8a 8b 8a.';$('#campo-chips').innerHTML='';return;}
 Object.assign(form,{pattern,meters});
 if(editor)editor.select(0);else editor=mountComposer($('#campo-editor'),[form],{lab:true,title:'Escribí tus versos con métrica y rima.',resizable:true,storage:storeOf(),priority:()=>fieldWords(),dictionary:key=>dict?.[key],onChange:()=>renderField()});
 const name=nameFor(base,pattern,meters),size=uniform(meters)?`${pattern.length} ${pattern.length===1?'verso':'versos'} de ${meters[0]} sílabas`:`${pattern.length} versos de ${meters.join(', ')} sílabas`;
 const free=pattern.every(p=>p==='—');
 $('#campo-status').innerHTML=`${name?`<span class="campo-formname">${esc(name)}</span> · `:''}${size}.${name||!uniform(meters)?'':free?' Sin rimas marcadas: escribí letras en el esquema (8a 8b…) para pedirlas.':' No coincide con una forma tradicional conocida.'}${esc(skipped)}`;
 // Otras formas con la misma medida y cantidad de versos.
 const options=uniform(meters)?formsFor(base,meters[0],pattern.length):[],current=canonical(pattern);
 $('#campo-chips').innerHTML=options.length>1||(options.length===1&&options[0].scheme!==current)?options.map(o=>`<button type="button" class="outline${o.scheme===current?' active':''}" data-scheme="${schemeText(o.scheme,meters[0])}" aria-pressed="${o.scheme===current}">${esc(o.name)} · ${colorScheme(o.scheme,meters[0])}</button>`).join(''):'';
}
$('#campo-scheme').addEventListener('input',()=>{repaintScheme();renderScheme();});
$('#campo-scheme-form').addEventListener('submit',e=>e.preventDefault());
$('#campo-chips').addEventListener('click',e=>{const b=e.target.closest('[data-scheme]');if(!b)return;$('#campo-scheme').value=b.dataset.scheme;renderScheme();});

// --- Campo libre: texto suelto, un verso por renglón, leído como en Libre (sílabas métricas y rimas). ---
const FREE_SET_KEY='el-silbador-campo-libre-ajustes';
const freeSet={underline:false,nums:false,accents:false,...load(FREE_SET_KEY,{})};
const freeArea=$('#campo-free-text');
function freeVerse(r){
 const reading=readLine(r.line),w=reading.words;
 if(!reading.groups.length)return esc(r.line);
 const startOf=g=>w[g.wi].index+w[g.wi].syllables.slice(0,g.si).join('').length;
 let html='',cursor=0;
 for(const group of reading.groups){
  let slot='',end=startOf(group[0]);
  group.forEach((g,k)=>{
   const start=startOf(g),piece=esc(r.line.slice(start,start+g.text.length));
   if(k)slot+=esc(r.line.slice(end,start));
   slot+=r.tonic&&start===r.tonic[0]?`<mark class="detect-tonic">${piece}</mark>`:g.tonic&&freeSet.accents?`<span class="other-accent">${piece}</span>`:piece;
   end=start+g.text.length;
  });
  html+=esc(r.line.slice(cursor,startOf(group[0])))+`<span class="slot${group.length>1?' joined':''}">${slot}</span>`;
  cursor=end;
 }
 return html+esc(r.line.slice(cursor));
}
function applyFreeSet(){
 const box=$('#campo-free-result');
 box.classList.toggle('hide-lines',!freeSet.underline);box.classList.toggle('hide-nums',!freeSet.nums);
 $('#campo-free-underline').checked=freeSet.underline;$('#campo-free-nums').checked=freeSet.nums;$('#campo-free-accents').checked=freeSet.accents;
}
function renderFree(){
 const rows=detect(freeArea.value);
 $('#campo-free-summary [data-metrica-icon]').hidden=rows.length>0;$('#campo-free-summary-text').textContent=rows.length?`${rows.length} ${rows.length===1?'verso':'versos'} · esquema detectado: ${rows.map(r=>r.count+r.letter).join(' ')}`:'Escribí o pegá tus versos con tildes, son importantes para detectar bien los acentos y las rimas.';
 $('#campo-free-result').innerHTML=rows.map((r,i)=>{const first=i===0||rows[i-1].stanza!==r.stanza,n=first?1:(rows[i-1].n||0)+1;r.n=n;return `<article class="compose-line detect-row${first&&i?' stanza-start':''}" data-rhyme-family="${r.letter}"><span class="vnum">${n}</span><span class="detect-text">${freeVerse(r)}</span><span class="detect-count" title="Sílabas métricas${r.pronounced!==r.count?`: ${r.pronounced} pronunciadas más el ajuste del final`:''}"><b>${r.count}</b> sílabas</span><span class="rhyme-badge ${r.letter==='—'?'fam-free':`fam-${r.letter}`}" role="img" aria-label="${r.letter==='—'?'Sin rima detectada':`Rima ${r.letter}, ${r.kind}`}">${r.letter}</span><span class="rhyme-text">${r.letter==='—'?'Sin pareja':`Rima ${r.letter} · ${r.kind}`}</span></article>`;}).join('');
}
const persistFree=()=>save(keyOf('el-silbador-campo-libre'),{text:freeArea.value});
freeArea.addEventListener('input',()=>{renderFree();persistFree();});
$('#campo-free-form').addEventListener('submit',e=>e.preventDefault());
for(const [id,key] of [['campo-free-underline','underline'],['campo-free-nums','nums'],['campo-free-accents','accents']])$('#'+id).addEventListener('change',e=>{freeSet[key]=e.target.checked;save(FREE_SET_KEY,freeSet);applyFreeSet();if(key==='accents')renderFree();});
listen(document,'pointerdown',e=>{page.querySelectorAll('.composer-settings[open]').forEach(d=>{if(!d.contains(e.target))d.open=false;});});
onRegionChange(renderFree);

// Carga en pantalla la composición activa; el cuaderno se vuelve a montar con su propio borrador.
function loadComposition(){
 const stored=load(keyOf('el-silbador-campo'),{});
 $('#campo-topic').value=String(stored.topic||'');
 $('#campo-plot').value=String(stored.plot||'');fitPlot();
 bank=(Array.isArray(stored.words)?stored.words:[]).filter(w=>w&&typeof w.w==='string').map(w=>({w:w.w,on:!!w.on}));
 extras=(Array.isArray(stored.extras)?stored.extras:[]).filter(x=>x&&typeof x.w==='string'&&typeof x.from==='string'&&KINDS.some(k=>k.id===x.kind)).filter((x,i,all)=>all.findIndex(y=>sameChip(y,x.from,x.w))===i);
 $('#campo-scheme').value=String(load(keyOf('el-silbador-campo-esquema'),{}).text||'');
 freeArea.value=String(load(keyOf('el-silbador-campo-libre'),{}).text||'');applyFreeSet();renderFree();
 editor?.dispose();editor=null;preview=null;infoOpen=null;fieldDrawer=false;temaDrawer=false;renderTema();
 renderWords();renderScheme();renderLock();if(tabsReady)renderTabs();
}

// --- Tabs ---
let tabsReady=false;
const tabsBox=$('#campo-tabs'),confirmBox=$('#campo-confirm'),layoutTabs=mountFichas(tabsBox);
const X_ICON=icons["x"];
const PLUS_ICON=icons["plus"];
const saveTabs=()=>save(TABS_KEY,tabs);
// El nombre del tab es el tema de la composición; sin tema, «Composición N».
function tabLabel(t){
 const topic=t.id===tabs.active?$('#campo-topic').value:load(keyOf('el-silbador-campo',t.id),{}).topic;
 const text=String(topic||'').trim();
 return text?(text.length>24?text.slice(0,23)+'…':text):t.name;
}
function renderTabs(){
 const html=tabs.tabs.map(t=>{const on=t.id===tabs.active,label=esc(tabLabel(t));return `<div class="ficha${on?' on':''}"><button type="button" class="ficha-name" role="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="${on}" aria-controls="campo-panel" tabindex="${on?0:-1}">${label}</button><button type="button" class="ficha-x" data-close-tab="${t.id}" aria-label="Eliminar ${label}" title="Eliminar">${X_ICON}</button></div>`;}).join('');
 tabsBox.innerHTML=`${html}<button type="button" class="ficha-add" id="campo-tab-add" aria-label="Nueva composición" title="Nueva composición">${PLUS_ICON}</button>`;
 $('#campo-panel').setAttribute('aria-labelledby',`tab-${tabs.active}`);
 layoutTabs();
}
function switchTab(id){
 if(id===tabs.active)return;
 persist();
 tabs.active=id;saveTabs();loadComposition();checkSpelling();
}
function addTab(){
 persist();
 const id=`c${tabs.next}`;
 tabs.tabs.push({id,name:`Composición ${tabs.next}`});tabs.next++;tabs.active=id;saveTabs();
 loadComposition();checkSpelling();
 $('#campo-topic').focus();
}
function removeStored(id){
 for(const k of [keyOf('el-silbador-campo',id),keyOf('el-silbador-campo-esquema',id),keyOf('el-silbador-campo-libre',id),'el-silbador-metrica-editor'+storeOf(id),'el-silbador-metrica-editor-joins'+storeOf(id),'el-silbador-metrica-editor-tails'+storeOf(id)]){try{localStorage.removeItem(k);}catch{}}
}
function removeTab(id){
 const at=tabs.tabs.findIndex(t=>t.id===id);if(at<0)return;
 removeStored(id);
 tabs.tabs.splice(at,1);
 if(!tabs.tabs.length){const fresh={id:`c${tabs.next}`,name:`Composición ${tabs.next}`};tabs.tabs.push(fresh);tabs.next++;}
 if(tabs.active===id){tabs.active=(tabs.tabs[at]||tabs.tabs[at-1]).id;saveTabs();loadComposition();checkSpelling();}
 else{saveTabs();renderTabs();}
}
// Modal de confirmación: se resuelve con true sólo si se elige «Eliminar»; Escape o Cancelar lo cierran sin borrar.
function askDelete(label){
 return new Promise(resolve=>{
  $('#campo-confirm-title').textContent=`¿Eliminar «${label}»?`;
  const done=ok=>{confirmBox.removeEventListener('cancel',onCancel);$('#campo-confirm-yes').onclick=$('#campo-confirm-no').onclick=$('#campo-confirm-x').onclick=null;if(confirmBox.open||confirmBox.hasAttribute('open')){if(typeof confirmBox.close==='function')confirmBox.close();else confirmBox.removeAttribute('open');}resolve(ok);};
  const onCancel=e=>{e.preventDefault();done(false);};
  confirmBox.addEventListener('cancel',onCancel);
  $('#campo-confirm-yes').onclick=()=>done(true);
  $('#campo-confirm-no').onclick=$('#campo-confirm-x').onclick=()=>done(false);
  if(typeof confirmBox.showModal==='function')confirmBox.showModal();else confirmBox.setAttribute('open','');
  $('#campo-confirm-no').focus();
 });
}
tabsBox.addEventListener('click',async e=>{
 const close=e.target.closest('[data-close-tab]'),name=e.target.closest('[data-tab]');
 if(name){switchTab(name.dataset.tab);$(`#tab-${tabs.active}`)?.focus();return;}
 if(e.target.closest('#campo-tab-add')){addTab();return;}
 if(!close)return;
 const t=tabs.tabs.find(x=>x.id===close.dataset.closeTab);if(!t)return;
 const label=tabLabel(t);
 if(await askDelete(label)){removeTab(t.id);$(`#tab-${tabs.active}`)?.focus();}
 else close.focus();
});
tabsReady=true;loadComposition();
// Flechas entre tabs.
tabsBox.addEventListener('keydown',e=>{
 const name=e.target.closest('[data-tab]');if(!name)return;
 const i=tabs.tabs.findIndex(t=>t.id===name.dataset.tab),n=tabs.tabs.length;
 const to={ArrowRight:(i+1)%n,ArrowLeft:(i-1+n)%n,Home:0,End:n-1}[e.key];
 if(to===undefined)return;
 e.preventDefault();switchTab(tabs.tabs[to].id);$(`#tab-${tabs.active}`)?.focus();
});

// --- Corrector pasivo ---
const sampleWords=forms.flatMap(f=>[f,...(f.variants||[])]).flatMap(f=>f.lines||[]).join(' ').toLocaleLowerCase('es').match(/\p{L}+/gu)||[];
const baseVocab=vocabulary([...rhymeWords.map(w=>w.word),...sampleWords]);
let dictSet=null,dictUnaccented=null;
// Con el diccionario cargado el corrector lo usa entero: tildes, diéresis y tipeos se miden contra todas sus formas.
let spellHasDict=false;
const makeSpell=()=>{spellHasDict=!!dictSet;return makeSpeller(new Set([...baseVocab,...userVocabulary(),...(dictSet||[])]),restoreTilde);};
let speller=makeSpell();
// Vocabulario propio: toda palabra agregada que no esté en los diccionarios ni tenga dudas de ortografía se guarda para usarla en cualquier composición.
function dictionaryIndex(){
 if(dictSet||!dict)return;
 const all=Object.values(dict).flatMap(v=>v.split(' ')).filter(Boolean);
 dictSet=new Set(all);
 dictUnaccented=new Set(all.filter(w=>fold(w)!==w).map(fold));
}
function learnWords(){
 // Sin el diccionario cargado no se sabe si la palabra existe: se espera a que llegue.
 if(dictState!=='ready'||!dict)return;
 dictionaryIndex();
 const mine=new Set(userVocabulary().map(fold)),fresh=[];
 for(const {w} of bank){
  const word=w.toLocaleLowerCase('es');
  if(word.length<3||!/^[a-záéíóúüñ]+$/.test(word)||baseVocab.has(word)||dictSet.has(word)||mine.has(fold(word)))continue;
  // «cancion» sin tilde es un descuido de ortografía, no una palabra nueva.
  if(dictUnaccented.has(word)||speller([word]).length)continue;
  fresh.push(word);
 }
 if(addUserVocabulary(fresh).length){userRhymeList=null;rhymeCache.clear();speller=makeSpell();renderResults();}
}
// Dos revisiones separadas, cada una con su botón y su panel: sólo las palabras del paso 2, y los versos del cuaderno.
const X_SVG=icons["x"];
const RESET_SVG=icons["rotate-ccw"];
function makeSpellCheck({btn,panel,store,sources,hidden,place,fix}){
 let ignored=new Set(load(store,[])),issues=[],ignoredCount=0,shown=[];
 const id=panel.id,saveIgnored=()=>save(store,[...ignored]);
 panel.setAttribute('aria-labelledby',`${id}-title`);
 function check(){
  const list=sources(),found=speller(list.map(([,text])=>text)),where=new Map();
  for(const [label,text] of list)for(const {word} of speller([text]))where.set(word,[...(where.get(word)||[]),label]);
  issues=found.filter(i=>!ignored.has(i.word)).map(i=>({...i,where:place(where.get(i.word)||[])}));
  ignoredCount=found.length-issues.length;
  btn.hidden=hidden();
  if(btn.hidden&&!panel.hidden)setOpen(false);
  btn.innerHTML=issues.length?`${icons["circle-alert"]} Ortografía · ${issues.length}`:`${icons["circle-check"]} Ortografía`;
  btn.classList.toggle('has-issues',issues.length>0);
  btn.setAttribute('aria-label',issues.length?`Revisar ortografía: ${issues.length} ${issues.length===1?'palabra dudosa':'palabras dudosas'}`:'Revisar ortografía: nada para corregir');
  if(!panel.hidden){syncShown();render();}
 }
 // Mientras el panel está abierto, lo corregido o ignorado sigue en la lista como resuelto; se descarta al cerrarlo.
 function syncShown(){
  for(const entry of shown)if(!entry.resolved&&!issues.some(i=>i.word===entry.word)){entry.resolved=true;entry.how=how.get(entry.word)||'corregida';}
  issues.forEach(it=>{
   const entry=shown.find(x=>x.word===it.word&&!x.resolved);
   if(entry)Object.assign(entry,it);else shown.push({...it,resolved:false});
  });
 }
 const how=new Map();
 function render(){
  const pending=shown.some(x=>!x.resolved);
  const item=(it,i)=>it.resolved
   ?`<li class="spell-resolved" data-issue="${i}"><p>${icons["circle-check"]} <b>${esc(it.word)}</b> <span class="spell-kind">${it.how==='ignorada'?'ignorada':'corregida'}</span></p></li>`
   :`<li data-issue="${i}"><p><b>${esc(it.word)}</b> <span class="spell-kind">${it.kind==='tilde'?'¿falta la tilde?':it.kind==='dieresis'?'¿falta la diéresis?':'¿error de tipeo?'}</span>${it.where?` <span class="spell-where">${it.where}</span>`:''}</p><div class="spell-fix"><label class="sr-only" for="${id}-in-${i}">Corrección para ${esc(it.word)}</label><input id="${id}-in-${i}" type="text" value="${esc(it.suggestions[0])}" spellcheck="false" autocomplete="off"><button type="button" class="primary" data-fix="${i}">Corregir</button><button type="button" class="outline" data-ignore="${i}">Ignorar</button></div>${it.suggestions.length>1?`<p class="spell-alt">Otras: ${it.suggestions.slice(1).map(w=>`<button type="button" class="link" data-use="${i}" data-word="${esc(w)}">${esc(w)}</button>`).join(' ')}</p>`:''}</li>`;
  const list=(shown.length?`<ul>${shown.map(item).join('')}</ul>`:'')+(pending?'':'<div class="spell-happy"><img src="/04-happy.svg" alt="" width="64" height="64"><p class="campo-empty">No encontramos palabras dudosas.</p></div>');
  panel.innerHTML=`<div class="spell-head"><h2 id="${id}-title">Revisión ortográfica</h2><button type="button" class="spell-icon" data-close aria-label="Cerrar">${X_SVG}</button></div>${list}${ignoredCount?`<button type="button" class="spell-reset" data-reset>${RESET_SVG} Volver a revisar las ignoradas</button>`:''}`;
 }
 function setOpen(open){panel.hidden=!open;btn.setAttribute('aria-expanded',String(open));shown=[];if(open){syncShown();render();panel.querySelector('input,button')?.focus();}}
 panel.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if('close' in t.dataset){setOpen(false);btn.focus();return;}
  if('reset' in t.dataset){ignored=new Set();saveIgnored();check();return;}
  if(t.dataset.use!==undefined){const input=panel.querySelector(`#${id}-in-${t.dataset.use}`);input.value=t.dataset.word;input.focus();return;}
  if(t.dataset.fix!==undefined){const it=shown[+t.dataset.fix];if(it.resolved)return;how.set(it.word,'corregida');fix(it.word,panel.querySelector(`#${id}-in-${t.dataset.fix}`).value);}
  if(t.dataset.ignore!==undefined){const it=shown[+t.dataset.ignore];how.set(it.word,'ignorada');ignored.add(it.word);saveIgnored();check();}
 });
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){setOpen(false);btn.focus();}else if(e.key==='Enter'&&e.target.matches('.spell-fix input')){e.preventDefault();e.target.closest('li').querySelector('[data-fix]').click();}});
 btn.addEventListener('click',()=>setOpen(panel.hidden));
 return {check};
}
const validFix=(from,to)=>{to=to.trim();return /^\p{L}+$/u.test(to)&&to!==from?to:null;};
// «en el verso 1», «en los versos 1 y 2», «en los versos 1, 2 y 3».
const versesPlace=labels=>{const n=labels.map(Number);return !n.length?'':n.length===1?`en el verso ${n[0]}`:`en los versos ${n.slice(0,-1).join(', ')} y ${n.at(-1)}`;};
const wordsSpell=makeSpellCheck({
 btn:$('#spell-btn'),panel:$('#spell-panel'),store:'el-silbador-campo-ignoradas',
 sources:()=>bank.map(x=>['',x.w]),
 hidden:()=>bank.length===0,
 place:()=>'',
 fix(from,to){
  to=validFix(from,to);if(!to)return;
  bank=bank.map(x=>({...x,w:replaceWord(x.w,from,to)})).filter((x,i,all)=>all.findIndex(y=>fold(y.w)===fold(x.w))===i);
  renderWords();
  checkSpelling();
 }
});
const versesSpell=makeSpellCheck({
 btn:$('#spell-btn-versos'),panel:$('#spell-panel-versos'),store:'el-silbador-campo-ignoradas-versos',
 sources:()=>(editor?editor.lines():[]).map((l,i)=>[String(i+1),l]),
 hidden:()=>!editor||!editor.lines().some(l=>l.trim()),
 place:versesPlace,
 fix(from,to){
  to=validFix(from,to);if(!to)return;
  editor?.mapLines(l=>replaceWord(l,from,to));
  checkSpelling();
 }
});
// Tercera revisión, al pie del campo libre: sólo lo escrito en ese cuadro de texto.
const freeLines=()=>freeArea.value.split('\n');
const freeSpell=makeSpellCheck({
 btn:$('#spell-btn-libre'),panel:$('#spell-panel-libre'),store:'el-silbador-campo-ignoradas-libre',
 sources:()=>freeLines().map((l,i)=>[String(i+1),l]),
 hidden:()=>!freeArea.value.trim(),
 place:versesPlace,
 fix(from,to){
  to=validFix(from,to);if(!to)return;
  freeArea.value=freeLines().map(l=>replaceWord(l,from,to)).join('\n');
  freeArea.dispatchEvent(new Event('input',{bubbles:true}));
  checkSpelling();
 }
});
function checkSpelling(){
 // El diccionario llega async: se pide en cuanto hay palabras y, al cargar, onload vuelve a revisar.
 if(bank.length)ensureDictionary();
 learnWords();
 dictionaryIndex();
 if(dictSet&&!spellHasDict)speller=makeSpell();
 wordsSpell.check();
 versesSpell.check();
 freeSpell.check();
}
// Pasivo: se vuelve a revisar al escribir, sin interrumpir.
let spellTimer;
const scheduleSpell=()=>{clearTimeout(spellTimer);spellTimer=setTimeout(checkSpelling,400);};
for(const sel of ['#campo-topic','#campo-plot','#campo-word','#campo-editor','#campo-free-text'])$(sel).addEventListener('input',scheduleSpell);
for(const [sel,type] of [['#campo-add','submit'],['#campo-words','click']])$(sel).addEventListener(type,scheduleSpell);
checkSpelling();


cleanups.push(()=>{clearTimeout(spellTimer);editor?.dispose();});
}
