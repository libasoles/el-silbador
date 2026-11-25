const MAX_VERSES=40,MIN_METER=1,MAX_METER=20;
function parseScheme(text){
 const pattern=[],meters=[],ignored=[];
 for(const token of text.trim().split(/[\s,;/]+/).filter(Boolean)){
  const m=/^(\d{1,2})([a-zñ]|[—–-])?$/i.exec(token);
  if(!m||+m[1]<MIN_METER||+m[1]>MAX_METER){ignored.push(token);continue;}
  if(pattern.length>=MAX_VERSES){ignored.push(token);continue;}
  meters.push(+m[1]);
  pattern.push(!m[2]||/[—–-]/.test(m[2])?'—':m[2].toLocaleLowerCase('es'));
 }
 return {pattern,meters,ignored};
}

// Léxico curado a mano para el campo semántico: cada línea de SETS es un grupo de sinónimos; OPPOSITES enfrenta dos grupos por una palabra de cada uno.
// No es un diccionario completo: una palabra ausente devuelve listas vacías y la página lo dice.
const SETS=`amor cariño afecto ternura querer pasión
odio rencor aversión inquina
dolor pena sufrimiento tormento angustia
tristeza melancolía congoja nostalgia añoranza
alegría gozo dicha júbilo felicidad contento
triste apenado afligido melancólico sombrío
feliz dichoso alegre contento radiante
vida existencia vivir
muerte fin ocaso deceso
morir fallecer expirar partir
nacer brotar surgir amanecer
olvido omisión descuido
memoria recuerdo evocación remembranza
recordar evocar rememorar
olvidar descuidar omitir
soledad aislamiento abandono desamparo
compañía amparo cobijo
libertad independencia albedrío
cadena yugo atadura prisión
pueblo gente comunidad vecindario
patria nación país terruño suelo
tierra suelo terruño campo chacra
casa hogar morada rancho vivienda
rancho choza casucha
hogar fogón lar
madre mamá vieja
padre papá viejo taita
hijo vástago chango
hermano compañero camarada
amigo compadre compinche camarada
corazón pecho alma
alma espíritu ánima
sueño ilusión fantasía anhelo
soñar imaginar fantasear ilusionar
esperanza ilusión confianza fe
desesperanza desconsuelo desaliento
lluvia chubasco aguacero llovizna
río arroyo cauce torrente corriente
agua linfa
mar océano oleaje
ola onda marejada
monte sierra cerro montaña
montaña cerro cumbre sierra
valle llanura pampa quebrada
camino sendero senda ruta rumbo huella
sendero senda vereda trocha
cielo firmamento bóveda
sol astro rey
luna lucero selene
estrella lucero astro
noche oscuridad penumbra
día jornada luz
amanecer alba aurora madrugada
atardecer ocaso crepúsculo anochecer
viento brisa aire céfiro ráfaga
tormenta temporal tempestad borrasca
fuego llama lumbre brasa
luz claridad resplandor brillo
sombra penumbra tiniebla oscuridad
frío helada hielo escarcha
calor ardor fuego
canto canción copla melodía tonada
cantar entonar coplear trovar
voz acento tono garganta
guitarra vihuela viola
música melodía armonía
silencio calma mutismo quietud
ruido estruendo bullicio estrépito
grito alarido clamor
llorar sollozar lagrimear gemir
lágrima llanto gota
reír sonreír carcajear
amar querer adorar
odiar aborrecer detestar
caminar andar marchar peregrinar transitar
volver regresar retornar tornar
partir marchar irse alejarse
llegar arribar venir
ir marchar partir
huir escapar fugar
buscar rastrear hallar indagar
encontrar hallar descubrir
perder extraviar
ganar vencer triunfar
lucha batalla combate pelea
guerra contienda conflicto
paz concordia armonía sosiego
fuerza vigor potencia energía
miedo temor pavor espanto
valiente bravo audaz arrojado coraje
cobarde temeroso miedoso
grande enorme inmenso vasto gigante
chico pequeño menudo diminuto
viejo anciano antiguo
joven mozo muchacho chango
lejos distante remoto
cerca próximo junto
subir ascender trepar elevar
bajar descender caer
abrir destapar desatar
cerrar clausurar tapar
principio comienzo origen inicio raíz
final término desenlace cierre
raíz origen cepa fundamento
flor capullo pétalo
árbol tronco ceibo
pájaro ave gorrión
ave pájaro pluma
caballo corcel potro pingo
gaucho paisano criollo
trabajo faena labor tarea
cansancio fatiga agotamiento
descanso reposo pausa sosiego
verdad certeza realidad
mentira engaño falsedad embuste
bueno bondadoso noble
malo perverso cruel
hermoso bello lindo precioso
feo horrible espantoso
rico adinerado acaudalado
pobre humilde necesitado
humilde sencillo modesto
orgulloso soberbio altivo
tiempo época edad era
siempre eternamente constantemente
nunca jamás
ahora hoy actualmente
ayer pasado antaño
mañana futuro porvenir
dulce suave tierno
amargo agrio áspero
suave blando delicado
duro áspero rígido
vacío hueco
lleno repleto colmado
sed ansia anhelo
hambre necesidad carencia
sangre savia
herida llaga lastimadura
beso caricia
abrazo caricia
mirada vista ojos
ojos pupilas luceros
mano palma
sendero huella rastro
puente pasarela
puerta entrada portón
ventana postigo
campo pradera pampa llanura
bosque selva arboleda
selva jungla
desierto yermo páramo
isla islote
puerto muelle
barco nave embarcación
viaje travesía trayecto
exilio destierro ausencia
ausencia falta carencia
destino suerte fortuna sino
suerte fortuna azar
promesa juramento compromiso
secreto misterio
misterio enigma arcano
herencia legado
raza estirpe linaje
sombra reflejo
espejo reflejo
cuna cuna nido
nido refugio
refugio abrigo cobijo
abrigo amparo
cárcel prisión calabozo
esclavo siervo cautivo
rey monarca soberano
patrón amo jefe
obrero trabajador peón
peón jornalero
pan sustento alimento
vino caldo
fiesta festejo celebración jolgorio
baile danza zamba
danza baile
cuento relato historia
historia relato crónica
palabra vocablo voz
verso renglón estrofa
rima consonancia asonancia
poeta trovador payador cantor
cantor trovador payador
guerrero soldado combatiente
soldado militar
sagrado santo divino
dios creador señor
cielo paraíso edén
infierno averno abismo
ángel querubín
demonio diablo
brillo fulgor destello
oro riqueza tesoro
plata moneda
sal sabor
semilla simiente grano
cosecha siega recolección
siembra plantío
trigo cereal
maíz choclo
espiga mies
sembrar plantar
cosechar recolectar segar
nube nubarrón cirro
niebla bruma neblina
rocío relente sereno
roca peña piedra peñasco
piedra roca guijarro
arena polvo
polvo tierra
ceniza cenizas
humo vapor
cuerda soga
hilo hebra
tejido trama
manta poncho frazada
poncho manta
pena castigo
castigo condena
ley norma regla
justicia equidad
injusticia agravio atropello
dolor herida
silbido chiflido
luz faro
camino viaje
enemigo adversario rival contrincante contrario
extraño forastero desconocido
alma mía`.split('\n').map(l=>l.trim().split(/\s+/).filter(Boolean)).filter(s=>s.length>1);
// Cada par enfrenta el grupo de la primera palabra con el de la segunda.
const OPPOSITES=[['amor','odio'],['dolor','alegría'],['tristeza','alegría'],['triste','feliz'],['vida','muerte'],['nacer','morir'],['olvido','memoria'],['recordar','olvidar'],['soledad','compañía'],['libertad','cadena'],['esperanza','desesperanza'],['desesperanza','confianza'],['cerca','lejos'],['subir','bajar'],['abrir','cerrar'],['principio','final'],['grande','chico'],['viejo','joven'],['noche','día'],['amanecer','atardecer'],['luz','sombra'],['frío','calor'],['silencio','ruido'],['llorar','reír'],['amar','odiar'],['partir','llegar'],['partir','volver'],['ir','volver'],['huir','buscar'],['perder','ganar'],['guerra','paz'],['valiente','cobarde'],['verdad','mentira'],['bueno','malo'],['hermoso','feo'],['rico','pobre'],['orgulloso','humilde'],['siempre','nunca'],['ayer','mañana'],['dulce','amargo'],['suave','duro'],['vacío','lleno'],['cielo','infierno'],['dios','demonio'],['justicia','injusticia'],['sembrar','cosechar'],['fuerza','cansancio'],['trabajo','descanso'],['ausencia','compañía'],['esperanza','miedo'],['alegría','pena'],['paz','lucha'],['hogar','exilio'],['ángel','demonio'],['valle','montaña'],['fiesta','silencio'],['luna','sol'],['cantar','callar'],['sed','agua'],['amigo','enemigo'],['amigo','adversario'],['amigo','extraño'],['hogar','forastero'],['paz','guerra'],['bueno','perverso']];
// Sin tilde y en minúscula: «Canción» y «cancion» encuentran la misma entrada.
const fold=s=>String(s).toLowerCase().replaceAll('ñ','~').normalize('NFD').replace(/[̀-ͯ]/g,'').replaceAll('~','ñ').trim();
const index=new Map();
SETS.forEach((set,i)=>set.forEach(word=>{const k=fold(word);index.set(k,[...(index.get(k)||[]),i]);}));
const opposing=new Map();
for(const [a,b] of OPPOSITES)for(const x of index.get(fold(a))||[])for(const y of index.get(fold(b))||[]){
 opposing.set(x,[...(opposing.get(x)||[]),y]);
 opposing.set(y,[...(opposing.get(y)||[]),x]);
}
// Si la palabra no está tal cual, se prueba sin plural y con el otro género.
function setsOf(word){
 const k=fold(word);
 const tries=[k,k.replace(/(es|s)$/,''),k.replace(/s$/,''),k.replace(/a$/,'o'),k.replace(/as$/,'o'),k.replace(/os$/,'o'),k.replace(/o$/,'a')];
 for(const t of tries)if(t&&index.has(t))return {sets:index.get(t),key:t};
 return {sets:[],key:k};
}
const unique=(list,skip)=>[...new Set(list)].filter(w=>fold(w)!==skip);
function synonyms(word){
 const {sets,key}=setsOf(word);
 return unique(sets.flatMap(i=>SETS[i]),key);
}
function antonyms(word){
 const {sets,key}=setsOf(word);
 return unique(sets.flatMap(i=>(opposing.get(i)||[]).flatMap(j=>SETS[j])),key);
}
const known=word=>setsOf(word).sets.length>0;

// Formas conocidas, por esquema: sirven para nombrar lo que el usuario arma o escribe.
// Las formas del laboratorio (forms.js) se suman en «formsCatalog»; aquí van las que ese cuaderno no tiene.
const extraForms=[
 {name:'Pareado',scheme:'aa',rhyme:'consonante'},
 {name:'Terceto',scheme:'aba',rhyme:'consonante'},
 {name:'Quintilla',scheme:'ababa',rhyme:'consonante',maxMeter:8},
 {name:'Quintilla',scheme:'aabab',rhyme:'consonante',maxMeter:8},
 {name:'Quintilla',scheme:'abaab',rhyme:'consonante',maxMeter:8},
 {name:'Quintilla',scheme:'abbab',rhyme:'consonante',maxMeter:8},
 {name:'Quintilla',scheme:'aabba',rhyme:'consonante',maxMeter:8},
 {name:'Quinteto',scheme:'ababa',rhyme:'consonante',minMeter:9},
 {name:'Quinteto',scheme:'abaab',rhyme:'consonante',minMeter:9},
 {name:'Cuarteto',scheme:'abba',rhyme:'consonante',minMeter:9},
 {name:'Serventesio',scheme:'abab',rhyme:'consonante',minMeter:9},
 {name:'Redondilla',scheme:'abba',rhyme:'consonante',maxMeter:8},
 {name:'Cuarteta',scheme:'abab',rhyme:'consonante',maxMeter:8},
 {name:'Copla',scheme:'—a—a',rhyme:'asonante',maxMeter:8},
 {name:'Sextilla',scheme:'aabccb',rhyme:'consonante',maxMeter:8},
 {name:'Octava real',scheme:'abababcc',rhyme:'consonante',meter:11},
 {name:'Octavilla',scheme:'abbaabba',rhyme:'consonante',maxMeter:8},
 {name:'Décima espinela',scheme:'abbaaccddc',rhyme:'consonante',meter:8}
];
// Letras por orden de aparición: «bcb» y «aba» son el mismo esquema; el verso libre sigue siendo —.
function canonical(pattern){
 const seen=new Map();
 return pattern.map(p=>p==='—'?'—':seen.get(p)||(seen.set(p,String.fromCharCode(97+seen.size)),seen.get(p))).join('');
}
function catalog(labForms,variantOf,meterAt){
 const out=[];
 for(const form of labForms)for(let v=0;v<Math.max(form.variants?.length||0,1);v++){
  const f=variantOf(form,v);
  if(f.title==='Romance')continue;
  out.push({name:f.variants?.[v]?.label.split(' · ')[0]||f.title,meters:f.pattern.map((_,i)=>meterAt(f,i)),scheme:canonical(f.pattern),kind:f.kind||(['Décima','Sextilla'].includes(f.title)?'consonante':'asonante')});
 }
 return out;
}
const sameMeters=m=>m.every(x=>x===m[0]);
// Formas que corresponden a «versos» de «meter» sílabas, cada una con su esquema completo.
function formsFor(base,meter,rows){
 const found=[];
 const add=(name,scheme)=>{if(scheme.length===rows&&!found.some(f=>f.scheme===scheme))found.push({name,scheme});};
 for(const f of base)if(f.meters.length===rows&&sameMeters(f.meters)&&f.meters[0]===meter)add(f.name,f.scheme);
 for(const f of extraForms){
  if(f.meter&&f.meter!==meter)continue;
  if(f.maxMeter&&meter>f.maxMeter)continue;
  if(f.minMeter&&meter<f.minMeter)continue;
  add(f.name,f.scheme);
 }
 return found;
}
// Nombre de lo que está escrito en el esquema, sea de una matriz o tecleado a mano; null si no se reconoce.
function nameFor(base,pattern,meters){
 const scheme=canonical(pattern);
 const exact=base.find(f=>f.scheme===scheme&&f.meters.length===meters.length&&f.meters.every((m,i)=>m===meters[i]));
 if(exact)return exact.name;
 if(!sameMeters(meters))return null;
 return formsFor(base,meters[0],meters.length).find(f=>f.scheme===scheme)?.name||null;
}
const schemeText=(scheme,meter)=>[...scheme].map(l=>meter+l).join(' ');

// Palabras de uso corriente que el léxico no cubre: el corrector sólo marca lo que se parece a una palabra conocida.
const FUNCTION_WORDS='a al algo allá allí ante aquí así aun aunque bajo cada como con contra cual cuando de del desde donde dos e el ella ellas ellos en entre era eran es esa ese eso esta este esto estoy está están fue fueron ha han hasta hay he la las le les lo los me mi mis mucho muy más menos ni no nos nuestra nuestro o os otra otro para pero por porque que qué quien se sea ser si sin sobre son soy su sus también tan tanto te tengo tiene tienen todo todos toda todas tu tus tú un una uno unas unos va vamos van vas veo voy vos y ya yo él'.split(' ');
const vocabulary=extra=>new Set([...SETS.flat(),...OPPOSITES.flat(),...FUNCTION_WORDS,...extra].map(w=>w.toLocaleLowerCase('es')));

// Corrector pasivo sin diccionario completo: sólo marca lo que se parece mucho a una palabra del vocabulario del taller.
// Dos casos: falta una tilde («cancion»), o hay un error de tipeo antes de las dos últimas letras («tojo» por «rojo»).
// Cambiar sólo el final se deja pasar, porque suele ser otra forma de la misma palabra.
const SPELL_MIN=4;
const unaccent=s=>s.replaceAll('ñ','~').normalize('NFD').replace(/[̀-ͯ]/g,'').replaceAll('~','ñ');
// Distancia 1: una letra cambiada, sobrante, faltante o dos contiguas intercambiadas. Devuelve la posición del primer cambio, o -1.
function firstEdit(a,b){
 if(Math.abs(a.length-b.length)>1)return -1;
 let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
 if(i===a.length&&i===b.length)return -1;
 const rest=(x,y)=>x===y;
 if(a.length===b.length){
  if(rest(a.slice(i+1),b.slice(i+1)))return i;
  if(a[i]===b[i+1]&&a[i+1]===b[i]&&rest(a.slice(i+2),b.slice(i+2)))return i;
 }else if(a.length>b.length){if(rest(a.slice(i+1),b.slice(i)))return i;}
 else if(rest(a,b.slice(0,i)+b.slice(i+1)))return i;
 return -1;
}
function makeSpeller(vocab,restoreTilde){
 const byFold=new Map();
 for(const w of vocab){const k=unaccent(w);if(k===w)continue;const list=byFold.get(k);if(list)list.push(w);else byFold.set(k,[w]);}
 const byLength=new Map();
 for(const w of vocab){const list=byLength.get(w.length);if(list)list.push(w);else byLength.set(w.length,[w]);}
 const cache=new Map();
 function issue(word){
  if(cache.has(word))return cache.get(word);
  let out=null;
  if(word.length>=SPELL_MIN&&!vocab.has(word)){
   const tilde=[...new Set([...(byFold.get(unaccent(word))||[]),restoreTilde(word)])].filter(w=>w!==word);
   if(tilde.length)out={kind:tilde.some(w=>w.includes('ü'))&&!word.includes('ü')?'dieresis':'tilde',suggestions:tilde.slice(0,3)};
   else{
    const near=[];
    for(const n of [word.length-1,word.length,word.length+1])for(const w of byLength.get(n)||[]){
     const at=firstEdit(word,w);
     if(at>=0&&at<Math.max(word.length,w.length)-2)near.push(w);
    }
    if(near.length)out={kind:'typo',suggestions:near.slice(0,3)};
   }
  }
  cache.set(word,out);
  return out;
 }
 // Lista única de palabras dudosas en los textos dados.
 return texts=>{
  const seen=new Map();
  for(const text of texts)for(const [raw] of text.matchAll(/\p{L}+/gu)){
   const word=raw.toLocaleLowerCase('es'),found=issue(word);
   if(found&&!seen.has(word))seen.set(word,{word,...found});
  }
  return [...seen.values()];
 };
}
// Reemplaza la palabra entera, sin mirar mayúsculas, y conserva la inicial en mayúscula.
function replaceWord(text,from,to){
 return text.replace(new RegExp(`(?<![\\p{L}])${from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\p{L}])`,'giu'),m=>m[0]!==m[0].toLocaleLowerCase('es')?to[0].toLocaleUpperCase('es')+to.slice(1):to);
}

// Consulta de apoyo al Wikcionario en español (es.wiktionary.org, CC BY-SA): sólo se usa cuando los recursos del taller dan menos de WIKI_MIN resultados.
// Si ahí no hay sinónimos ni antónimos, se prueba la sección en español del Wiktionary en inglés (en.wiktionary.org, CC BY-SA).
// Si aun así la palabra tiene menos de WIKI_MIN sugerencias, se consulta rae-api.com (API no oficial del diccionario de la RAE; sin clave: 10 pedidos por minuto y 100 por día).
// Cada respuesta se guarda 7 días en el navegador; los errores no se guardan.
const WIKI_MIN=5,WIKI_TTL=7*24*60*60*1000,WIKI_KEY='el-silbador-wiki';
const wikiBase='https://es.wiktionary.org/w/api.php',wikiBaseEn='https://en.wiktionary.org/w/api.php';
function wikiStore(env){try{return JSON.parse(env.localStorage.getItem(WIKI_KEY)||'{}')||{};}catch{return {};}}
function wikiCached(key,env=globalThis,now=Date.now()){
 const hit=wikiStore(env)[key];
 return hit&&now-hit.t<WIKI_TTL?hit.d:null;
}
function wikiSave(key,data,env=globalThis,now=Date.now()){
 const all=wikiStore(env);
 for(const k of Object.keys(all))if(now-all[k].t>=WIKI_TTL)delete all[k];
 all[key]={t:now,d:data};
 try{env.localStorage.setItem(WIKI_KEY,JSON.stringify(all));}catch{}
}
async function wikiGet(params,env,base=wikiBase){
 const url=`${base}?${new URLSearchParams({format:'json',formatversion:'2',origin:'*',...params})}`;
 const response=await env.fetch(url);
 if(!response.ok)throw new Error(`Wiktionary respondió ${response.status}`);
 const data=await response.json();
 if(data.error)throw new Error(`${data.error.code}: ${data.error.info}`);
 return data;
}
// Formas que el español no admite: s + consonante al comienzo (stand), dos consonantes al final salvo -ns/-rs/-ps/-cs (grand, hall), consonantes dobles que no sean cc, ll, rr, nn (jazz, watt), w, los grupos ck, sh (salvo des-h y ns-h), th, ph, kn, gh, y -aid/-eid/-oid (raid).
function looksForeign(w){
 if(/[^aeiouáéíóúüy]{2}$/.test(w)&&!/(ns|rs|ps|cs)$/.test(w))return true;
 return /^s[^aeiouáéíóúüñ]/.test(w)||/w|ck|(?<!de|n)sh|th|ph|kn|gh|[aeo]id$|([^celnroa])\1/.test(w);
}
const wikiWord=w=>/^[\p{L}]+$/u.test(w)&&!looksForeign(w);
// Rimas consonantes: la categoría «ES:Rimas:» lleva la terminación silabeada desde la vocal tónica (i.go).
async function wikiRhymes(syllables,env=globalThis){
 const category=syllables.map(s=>s.replaceAll('ñ','~').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('~','ñ')).join('.').toLocaleLowerCase('es'),key=`rima|${category}`;
 const hit=wikiCached(key,env);
 if(hit)return hit;
 const data=await wikiGet({action:'query',list:'categorymembers',cmtitle:`Categoría:ES:Rimas:${category}`,cmlimit:'200',cmnamespace:'0'},env);
 const words=(data.query?.categorymembers||[]).map(m=>m.title).filter(t=>t===t.toLocaleLowerCase('es')&&wikiWord(t));
 wikiSave(key,words,env);
 return words;
}
// Del texto de la página se toma sólo la sección en español y, de ella, las plantillas de sinónimos, antónimos y relacionados.
function parseLexicon(text){
 const section=/==\s*\{\{lengua\|es\}\}\s*==([\s\S]*?)(?=\n==\s*\{\{lengua\||$)/.exec(text)?.[1]||'';
 const grab=name=>[...new Set([...section.matchAll(new RegExp(`\\{\\{${name}\\|([^{}]*)\\}\\}`,'gi'))].flatMap(m=>{
  const args=m[1].split('|').map(a=>a.trim());
  if(args.some(a=>/^leng=/.test(a)&&a!=='leng=es'))return [];
  return args.filter(a=>!a.includes('=')).map(a=>a.replace(/\[\[|\]\]/g,'').toLocaleLowerCase('es')).filter(wikiWord);
 }))];
 return {syn:grab('sinónimos?'),ant:grab('antónimos?'),rel:grab('relacionados?')};
}
// En el Wiktionary en inglés las plantillas son {{syn|es|…}} y {{ant|es|…}}; los argumentos pueden llevar notas entre <> que se descartan.
function parseEnLexicon(text){
 const section=/==\s*Spanish\s*==([\s\S]*?)(?=\n==[^=]|$)/.exec(text)?.[1]||'';
 const grab=name=>[...new Set([...section.matchAll(new RegExp(`\\{\\{${name}\\|es\\|([^{}]*)\\}\\}`,'gi'))].flatMap(m=>m[1].split('|').map(a=>a.replace(/<[^>]*>/g,'').trim()).filter(a=>!a.includes('=')).map(a=>a.replace(/\[\[|\]\]/g,'').toLocaleLowerCase('es')).filter(wikiWord)))];
 return {syn:grab('syn(?:onyms)?'),ant:grab('ant(?:onyms)?'),rel:[]};
}
const wikiText=async(word,env,base)=>(await wikiGet({action:'parse',page:word,prop:'wikitext',redirects:'1'},env,base).catch(error=>{if(/missingtitle/.test(String(error)))return null;throw error;}))?.parse?.wikitext||'';
async function wikiLexicon(word,env=globalThis){
 const key=`lex2|${word.toLocaleLowerCase('es')}`,hit=wikiCached(key,env);
 if(hit)return hit;
 let result=parseLexicon(await wikiText(word,env,wikiBase));
 if(!result.syn.length&&!result.ant.length){
  const en=parseEnLexicon(await wikiText(word,env,wikiBaseEn));
  result={...result,syn:en.syn,ant:en.ant};
 }
 wikiSave(key,result,env);
 return result;
}
// rae-api.com: una consulta por palabra. Cada acepción trae sinónimos y antónimos, a veces con la forma femenina («dichoso, dichosa»): se toma la primera y se descartan las expresiones de varias palabras.
const raeBase='https://rae-api.com/api/words';
function parseRae(data){
 const grab=field=>[...new Set((data?.meanings||[]).flatMap(m=>(m.senses||[]).flatMap(s=>s[field]||[])).map(x=>String(x).split(',')[0].trim().toLocaleLowerCase('es')).filter(wikiWord))];
 return {syn:grab('synonyms'),ant:grab('antonyms')};
}
async function wikiRae(word,env=globalThis){
 const key=`rae|${word.toLocaleLowerCase('es')}`,hit=wikiCached(key,env);
 if(hit)return hit;
 const response=await env.fetch(`${raeBase}/${encodeURIComponent(word.toLocaleLowerCase('es'))}`);
 // Una palabra que la RAE no tiene (404) es una respuesta válida y se guarda; un límite de pedidos (429) o un error no.
 if(!response.ok&&response.status!==404)throw new Error(`RAE API respondió ${response.status}`);
 const result=response.ok?parseRae((await response.json()).data):{syn:[],ant:[]};
 wikiSave(key,result,env);
 return result;
}


export { synonyms, antonyms, known, catalog, formsFor, nameFor, canonical, schemeText, vocabulary, makeSpeller, replaceWord, WIKI_MIN, wikiRhymes, wikiLexicon, wikiRae, fold, parseScheme };
