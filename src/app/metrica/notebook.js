import { mountNotebookTabs } from "./notebookTabs";
import { mountCampo } from "../campo-semantico/campo";
import { mountLibre } from "../verso-libre/libre";
import { mountNotebookSettings } from "./notebookSettings";

// Adapted from verso-y-raíz/lab.html. Keep the metric, rhyme and editing behavior together.
// This imperative editor owns only the descendants of `page`; React owns its lifecycle.
export function mountMetrica(page, icons, mode = "metrica") {
 const controller=new AbortController(),cleanups=[];
 const notebookSettings=mountNotebookSettings(page,icons.settings,controller.signal);
 const mountFichas=box=>mountNotebookTabs(box,{signal:controller.signal,onCleanup:fn=>cleanups.push(fn)});

const vowels = 'aeiouáéíóúü';
const isV = c => vowels.includes(c);
const strong = c => 'aeoáéó'.includes(c);
const weakAccent = c => 'íú'.includes(c);
const onsets = new Set(['bl','br','cl','cr','dr','fl','fr','gl','gr','pl','pr','tr','ch','ll','rr','tl','qu','gu']);
const unstressed = new Set(['el','la','los','las','un','una','unos','unas','me','te','se','lo','le','nos','os','les','mi','mis','tu','tus','su','sus','de','del','a','al','en','con','por','sin','y','o','u','ni','que','si']);
function wordInfo(raw) {
 const word = raw.toLocaleLowerCase('es').normalize('NFC');
 if (!/^[a-záéíóúüñ]+$/i.test(word)) return null;
 const chars = [...word];
 const vocal = i => isV(chars[i]) && !(chars[i]==='u' && i>0 && 'qg'.includes(chars[i-1]) && 'eéií'.includes(chars[i+1]||' ')) || (chars[i]==='y' && i===chars.length-1);
 const nuclei=[];
 for(let i=0;i<chars.length;i++) {
  if(!vocal(i)) continue;
  const previous=nuclei.at(-1);
  if(previous && (i===previous.end+1 || (i===previous.end+2 && chars[i-1]==='h'))) {
   const a=chars[previous.end],b=chars[i];
   if(!weakAccent(a)&&!weakAccent(b)&&!(strong(a)&&strong(b))&&a!==b) {previous.end=i;continue;}
  }
  nuclei.push({start:i,end:i});
 }
 if(!nuclei.length) return null;
 const cuts=[0];
 for(let i=1;i<nuclei.length;i++) {
  const prev=nuclei[i-1], next=nuclei[i];
  const gap=word.slice(prev.end+1,next.start);
  let cut=next.start;
  if(gap.length===1) cut=prev.end+1;
  else if(gap.length>=2) cut=next.start-(onsets.has(gap.slice(-2))?2:1);
  cuts.push(cut);
 }
 cuts.push(word.length);
 const syllables=cuts.slice(0,-1).map((c,i)=>word.slice(c,cuts[i+1]));
 let stress=syllables.findIndex(s=>/[áéíóú]/.test(s));
 if(stress<0) stress=syllables.length===1?0:Math.max(0,syllables.length-(/[aeiouü]$|[aeiouü][ns]$/.test(word)?2:1));
 const distance=syllables.length-stress;
 const type=syllables.length===1?'monosílaba':distance===1?'aguda':distance===2?'grave':distance===3?'esdrújula':'sobresdrújula';
 const special=word.endsWith('mente')&&word.length>5;
 const base=special?wordInfo(word.slice(0,-5)):null;
 const stresses=special&&base?[base.stress,syllables.length-2]:[stress];
 return {word,syllables,stress,stresses,type,tonic:!unstressed.has(word),special};
}
// Hiatos de dos vocales abiertas distintas (tra·or, po·e·ta, le·ón): suelen leerse como una sola sílaba (sinéresis).
const openBase = c => c.normalize('NFD')[0];
const openHiatus = (a, b) => 'aeoáéó'.includes(a.at(-1)) && 'aeoáéó'.includes(b[0]) && openBase(a.at(-1)) !== openBase(b[0]);
// «synaeresis» puede ser true (sólo «extraordinaria») o un objeto con has(clave): las sinéresis elegidas, con clave palabra#sílaba.
function scan(text, disabled=new Set(), synaeresis=false) {
 const words=[...text.matchAll(/[a-záéíóúüñ]+/gi)].map(m=>{const w=wordInfo(m[0]);if(w)w.index=m.index;return w;}).filter(Boolean);
 if(synaeresis===true)for(const w of words)if(w.word==='extraordinaria'){w.syllables=['ex','traor','di','na','ria'];w.stress=3;w.stresses=[3];}
 const groups=[], joins=[], hiatus=[]; let total=0;
 words.forEach((w,wi)=>w.syllables.forEach((s,si)=>{
  const item={text:s,tonic:w.stresses.includes(si)&&w.tonic,wi,si};
  const prev=words[wi-1];let key;
  const canJoin=si===0&&prev&&/[aeiouáéíóúüy]$/.test(prev.word)&&(/^h?[aeiouáéíóúü]/.test(w.word)||w.word==='y');
  if(canJoin){key=prev.word+'|'+w.word;joins.push({id:wi,key,label:prev.syllables.at(-1)+'‿'+s,active:!disabled.has(wi,key)});}
  const hKey=`${w.word}#${si}`,canMerge=si>0&&openHiatus(w.syllables[si-1],s),merged=canMerge&&typeof synaeresis==='object'&&!!synaeresis&&synaeresis.has(hKey);
  if(canMerge)hiatus.push({id:wi,si,key:hKey,label:w.syllables[si-1]+'‿'+s,active:merged});
  if(merged||(canJoin&&!disabled.has(wi,key))) groups.at(-1).push(item);
  else groups.push([item]);
  total++;
 }));
 const last=words.at(-1);
 // Una sinéresis después del último acento acorta el final: héroe (hé·ro·e) se lee grave.
 const after=last?last.syllables.length-last.stress-hiatus.filter(h=>h.id===words.length-1&&h.active&&h.si>last.stress).length:0;
 const adjustment=!last||last.special?0:after<=1?1:after===2?0:-1;
 return {words,groups,joins,hiatus,total,adjustment,count:groups.length+adjustment,last};
}

// Regiones del español, registros y léxico regional para la ayuda de rima.
// La región se deduce sin red: zona horaria del navegador y, si no alcanza, el idioma. Nada sale de la página.
const regions=[
 {id:'rioplatense',label:'Río de la Plata',countries:{AR:'Argentina',UY:'Uruguay',PY:'Paraguay'}},
 {id:'chile',label:'Chile',countries:{CL:'Chile'}},
 {id:'andina',label:'Región andina',countries:{PE:'Perú',BO:'Bolivia',EC:'Ecuador'}},
 {id:'colombia_ve',label:'Colombia y Venezuela',countries:{CO:'Colombia',VE:'Venezuela'}},
 {id:'mexico',label:'México',countries:{MX:'México'}},
 {id:'caribe',label:'Caribe hispano',countries:{CU:'Cuba',DO:'República Dominicana',PR:'Puerto Rico'}},
 {id:'centroamerica',label:'Centroamérica',countries:{GT:'Guatemala',SV:'El Salvador',HN:'Honduras',NI:'Nicaragua',CR:'Costa Rica',PA:'Panamá'}},
 {id:'espana',label:'España',countries:{ES:'España'}}
];
const registers=[
 {id:'folklore',label:'Campero y folklore',short:'campero'},
 {id:'popular',label:'Urbano y popular',short:'popular'}
];
const zoneRegion=[
 [/^America\/(Argentina\/|Buenos_Aires|Cordoba|Mendoza|Jujuy|Catamarca|Rosario|Montevideo|Asuncion)/,'rioplatense'],
 [/^(America\/(Santiago|Punta_Arenas)|Pacific\/Easter)/,'chile'],
 [/^(America\/(Lima|La_Paz|Guayaquil)|Pacific\/Galapagos)/,'andina'],
 [/^America\/(Bogota|Caracas)/,'colombia_ve'],
 [/^America\/(Mexico_City|Monterrey|Merida|Cancun|Tijuana|Chihuahua|Ciudad_Juarez|Hermosillo|Mazatlan|Matamoros|Ojinaga|Bahia_Banderas)/,'mexico'],
 [/^America\/(Havana|Santo_Domingo|Puerto_Rico)/,'caribe'],
 [/^America\/(Guatemala|El_Salvador|Tegucigalpa|Managua|Costa_Rica|Panama)/,'centroamerica'],
 [/^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta)/,'espana']
];
const countryRegion=Object.fromEntries(regions.flatMap(r=>Object.keys(r.countries).map(c=>[c,r.id])));
// Primero dónde está el visitante (zona horaria); si no se reconoce, la variante del idioma (es-AR, es-MX…).
function detectRegion({timeZone='',languages=[]}={}){
 const byZone=zoneRegion.find(([pattern])=>pattern.test(timeZone));
 if(byZone)return {region:byZone[1],source:'tu zona horaria'};
 for(const tag of languages){
  const [lang,...rest]=String(tag).toUpperCase().split('-');
  const country=lang==='ES'&&rest.find(part=>countryRegion[part]);
  if(country)return {region:countryRegion[country],source:'el idioma del navegador'};
 }
 return null;
}
// En España la z y la c ante e, i se pronuncian distinto de la s; en el resto del mundo hispano no.
const phonology={distincion:false};
const regionKey='el-silbador-metrica-region';
const prefs={region:'',register:'',source:''};
const listeners=new Set();
let loaded=false;
const apply=patch=>{Object.assign(prefs,patch);phonology.distincion=prefs.region==='espana';};
const regionPrefs=()=>({...prefs});
const onRegionChange=fn=>{listeners.add(fn);return ()=>listeners.delete(fn);};
function setRegion(patch,env=globalThis){
 apply({...patch,source:'tu elección'});
 try{env.localStorage?.setItem(regionKey,JSON.stringify({region:prefs.region,register:prefs.register}));}catch{}
 listeners.forEach(fn=>fn());
}
// Una elección guardada manda; si no hay, se detecta. Se llama una sola vez al montar el cuaderno.
function loadRegion(env=globalThis){
 if(loaded)return;
 loaded=true;
 let saved=null;
 try{saved=JSON.parse(env.localStorage?.getItem(regionKey)||'null');}catch{}
 if(saved&&typeof saved==='object'){
  apply({region:regions.some(r=>r.id===saved.region)?saved.region:'',register:registers.some(r=>r.id===saved.register)?saved.register:'',source:'tu elección'});
  return;
 }
 let timeZone='';
 try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{}
 const found=detectRegion({timeZone,languages:env.navigator?.languages||[]});
 apply({region:found?.region||'',register:'',source:found?.source||''});
}
// Vocabulario con que se distingue cada región. «words» son sustantivos y adjetivos; «verbs» se conjugan en el compositor.
// Los modismos vulgares se dejaron afuera a propósito.
const lexicon={
 rioplatense:{
  folklore:{
   words:`gaucho rancho mate pampa ombú ñandú facón bombacha guasca lazo poncho yerra galpón tranquera mangrullo cañada pajonal arroyo sauce algarrobo vizcacha carpincho churrasco asado payador bagual potro pingo overo tordillo cuchilla milonga candombe vidala chamamé zamba chacarera guitarrero ceibo jilguero hornero cardenal tala quebracho yatay totora estancia aguada fogón`,
   verbs:`payar domar enlazar arrear pialar`},
  popular:{
   words:`pibe piba laburo mina bondi quilombo barrio esquina conventillo arrabal tango bandoneón malevo cafetín guita mufa chamuyo pucho junada fiaca birra curda atorrante otario gotán bacán bulín escabio yuta tano fulero canyengue cancha hincha tablón potrero`,
   verbs:`laburar chamuyar morfar junar mangar afanar chusmear bardear`}
 },
 chile:{
  folklore:{
   words:`huaso chacra cueca tonada ruca copihue pehuén araucaria cóndor mapu mapuche trutruca kultrún machi huemul ramada fonda chicha cazuela humita chamanto chupalla rodeo estero cordillera canelo quillay peumo litre boldo lingue maqui arrayán ñire lenga volcán`,
   verbs:``},
  popular:{
   words:`pololo polola carrete luca guagua cabro fome bacán pega chela copete micro flaite cuico pituto once`,
   verbs:`carretear pololear`}
 },
 andina:{
  folklore:{
   words:`quena charango zampoña bombo huayno yaraví wiracocha inca ayllu puna apu quinua papa chuño coca llama alpaca vicuña cóndor altiplano nevado cumbre tambo chakana tinku sikuri morenada wawa pututu huaca yunga ichu kantuta cantuta chasqui quipu pirca chacra chullo`,
   verbs:``},
  popular:{
   words:`chamba pata causa jato yapa chifa combi ñaño guagua pana chuchaqui chévere bacán huachafo`,
   verbs:`chambear`}
 },
 colombia_ve:{
  folklore:{
   words:`joropo arpa cuatro maraca llano llanero sabana morichal pajarillo araguato garza corocora vallenato acordeón caja guacharaca cumbia gaita bambuco pasillo currulao marimba guadua páramo frailejón ceiba arepa chinchorro conuco caney araguaney turpial cachicamo morrocoy cacao`,
   verbs:``},
  popular:{
   words:`parcero parce paisa rumba guayabo pelao tinto bacano chamo chama pana chévere vaina chamba burda`,
   verbs:`rumbear parchar`}
 },
 mexico:{
  folklore:{
   words:`mariachi ranchera corrido huapango sandunga jarabe huarache sombrero maguey nopal tequila mezcal pulque charro adelita soldadera milpa cempasúchil ofrenda calaca catrina panteón ahuehuete colibrí quetzal rancho cantina agave sarape compadre comadre jarana`,
   verbs:``},
  popular:{
   words:`cuate chavo chava chido chamba neta pachanga parranda cruda chamaco chaparro tianguis ahorita órale ándale escuincle carnal`,
   verbs:`chambear cotorrear apapachar`}
 },
 caribe:{
  folklore:{
   words:`son guaracha bolero rumba guajira guajiro bohío guateque décima tres bongó clave maraca marímbula palmar bahía malecón conuco yuca ñame plátano guanábana caña cañaveral ingenio batey tabaco vega mambí cimarrón palenque merengue bachata plena bomba jíbaro`,
   verbs:``},
  popular:{
   words:`asere chévere jeva jevo guagua bodega colmado tíguere chinchorro boricua guayabera yipeta`,
   verbs:`janguear bregar rumbear`}
 },
 centroamerica:{
  folklore:{
   words:`marimba quetzal milpa tamal atol pupusa pinol guaro chicha tortilla comal ceiba guanacaste volcán lago`,
   verbs:``},
  popular:{
   words:`cipote cipota chapín tico tica catracho pulpería mae tuanis chunche chele bolo pisto`,
   verbs:`chambear`}
 },
 espana:{
  folklore:{
   words:`flamenco copla jota seguidilla fandango saeta soleá bulería cante cantaor bailaor tablao alboreá romance juglar trovador castillo romería verbena dehesa encina olivar viñedo aljibe alcázar torre ronda rondalla zambomba pandereta castañuela bandurria laúd gaita muñeira`,
   verbs:``},
  popular:{
   words:`chaval chavala guay curro pasta colega botellón tasca chiringuito guiri gamberro mogollón cutre chulo peña finde piso`,
   verbs:`currar flipar molar`}
 }
};

// Lectura aproximada rioplatense: seseo y yeísmo; no reemplaza el oído.
const plain=s=>s.replaceAll('ñ','~').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('~','ñ');
function rhymeOf(raw,kind='consonante'){
 const w=typeof raw==='string'?wordInfo(raw):raw;
 if(!w)return null;
 const syllable=w.syllables[w.stress];
 const nuclei=[...syllable.matchAll(/[aeiouáéíóúüy]/g)];
 const vowel=nuclei.find(m=>/[áéíóú]/.test(m[0]))||nuclei.find(m=>/[aeo]/.test(m[0]))||nuclei.at(-1);
 if(!vowel)return null;
 const tail=syllable.slice(vowel.index)+w.syllables.slice(w.stress+1).join('');
 let sound=plain(tail).replace(/qu/g,'k').replace(/gu(?=[ei])/g,'g').replace(/g(?=[ei])/g,'j').replace(/ch/g,'§').replace(/ll/g,'y').replace(/h/g,'').replace(/c(?=[ei])|z/g,phonology.distincion?'θ':'s').replace(/c/g,'k').replace(/v/g,'b');
 if(kind==='asonante'){
  const syllables=[syllable.slice(vowel.index),...w.syllables.slice(w.stress+1)];
  const selected=syllables.length>2?[syllables[0],syllables.at(-1)]:syllables;
  sound=selected.map(s=>{s=plain(s).replace(/qu/g,'q').replace(/gu(?=[ei])/g,'g');return s.match(/[aeo]/)?.[0]||s.match(/[iuy]/)?.[0]?.replace('y','i')||'';}).join('');
 }
 return {key:sound,tail,word:w.word,syllables:[syllable.slice(vowel.index),...w.syllables.slice(w.stress+1)],type:w.type};
}
const folk=`copla baguala vidala guitarra vihuela chacarera zamba cueca payada tonada quebrada alborada madrugada empanada ramada enamorada callada cantada tierra sierra guerra primavera espera madera tranquera carrera hoguera frontera cantora aurora señora hora sonora mora llorona luna fortuna cuna laguna tuna puna pluma espuma bruma río rocío frío mío bravío vacío desvío camino destino vino pino peregrino remolino vecino molino campesino argentino sendero guitarrero coplero lucero sombrero arriero aguacero enero febrero romero compañero pañuelo cielo consuelo desvelo vuelo suelo anhelo abuelo duelo velo memoria historia gloria victoria canto llanto encanto espanto tanto santo campo pampa estampa guitarra parra cigarra jarra barro carro cerro hierro destierro pueblo sueño dueño leño pequeño norte monte horizonte noche broche derroche estrella huella bella doncella querella desvela consuela escuela espuela canela vela solitaria extraordinaria plegaria milenaria diaria mañana ventana cercana hermana lejana paisana campana lana gana temprana canción corazón fogón malón facón pasión emoción ilusión tradición oración reunión rincón región amor dolor cantor payador tambor flor calor valor fulgor rumor voz arroz adiós sol arrebol caracol farol cantar bailar soñar andar guitarrear regresar recordar lugar hogar mar volar aromar mamá papá allá acá está será va paz luz cruz raíz maíz país feliz aprendiz poncho rancho ancho chancho lazo abrazo paso ocaso pedazo brazo verano hermano lejano serrano paisano mano piano humano brisa sonrisa prisa ceniza caricia delicia alma calma palma rama fama llama cama drama casa brasa masa plaza raza pájaro pájaros cántaro cántaros música músico músicos mágico mágicos mágico trágico trágicos rústico rústicos último últimos íntimo íntimos lágrima lágrimas ánima ánimas décima décimas séptima séptimas América`;
const common=`vida herida querida perdida partida salida bienvenida olvido nido ruido latido sentido vestido sonido oído vivido nacido florecido florecer crecer nacer querer volver saber amanecer atardecer mujer ayer placer correr beber leer ver tener poder ser hacer sueño ensueño silencio ausencia presencia paciencia ciencia esencia distancia infancia fragancia esperanza danza lanza balanza confianza templanza belleza tristeza riqueza pobreza firmeza nobleza certeza pureza alegría poesía melodía armonía día todavía compañía lejanía agonía maravilla semilla orilla sencilla amarilla mejilla lucir vivir sentir partir latir venir reír abrir seguir escribir porvenir azul abedul amistad soledad libertad verdad claridad eternidad bondad ciudad andariegoiego redondo hondo profundo mundo segundo fecundo oscuro puro futuro maduro seguro duro apuro verde pierde muerde recuerdo acuerdo cuerdo izquierdo agua fragua lengua yegua nieve leve breve mueve suave ave llave nave llueve nueve suerte muerte fuerte verte puerta abierta despierta despierto puerto muerto cierto desierto concierto cuento viento aliento tiempo intento pensamiento sentimiento contento momento tormento lento acento alimento alimento florido floresta fiesta siesta cuesta respuesta propuesta puente fuente corriente valiente creciente gente mente frente caliente paciente siempre simple libre tigre sangre hambre nombre hombre cobre pobre sobre`.replace('andariegoiego','andariego');
const extra=`cama dama trama gama flama panorama programa poema tema sistema problema ola cola paloma loma goma aroma idioma sombra nube altura dulzura ternura locura hermosura cintura figura ventura aventura criatura pintura montura costura frescura amargura bravura llanura lectura cultura aldea idea marea chacra tapera ribera pradera bandera quimera cantera ladera villa capilla vaina lluvia envidia audacia gracia desgracia noticia justicia malicia pericia grupa tropa copa sopa ropa popa tierra piedra hiedra yedra estrella centella botella rosa mariposa hermosa preciosa dichosa maravillosa airosa pampa lampa rampa carpa harpa cuerda cuerpo cuero puerco duerme verso universo reverso diverso inverso viaje coraje paisaje mensaje lenguaje ropaje homenaje salvaje mensajero pasajero cartero artesano guerrero obrero compañera ligera vera entera primera postrera pregonero lugareño pañuelo cielo hielo pelo celo fuego juego ruego riego sosiego manto quebranto sino trino tino vino pino mensual caudal cristal canal rural total mortal final ideal real leal sal mal tal metal puñal umbral ventanal trigal maizal pajonal arenal rosal naranjal sauzal ombú tabú bambú jamás además atrás detrás compás demás más quizás estás serás darás verás irás sabrás podrás tendrás vendrás dirás harás querrás amén también después adiós aquí allí ahí así allá acá cantá bailá soñá andá volvé vení viví comé bebé sentí partí corazones`;
const regular={
 ar:`cantar bailar amar llamar esperar mirar besar llorar nadar cuidar ayudar ganar pasar dejar lograr guardar alegrar brillar callar cortar dibujar escuchar estudiar hablar ilusionar levantar llevar mandar nombrar olvidar parar pintar pisar pregonar regalar rimar terminar tirar tomar tardar trabajar usar velar viajar visitar clamar derramar reclamar proclamar aclamar engañar extrañar enamorar adorar charlar acompañar celebrar desatar cantar enredar alumbrar arrullar bordar`.split(' '),
 er:`temer beber correr comer vender aprender barrer coser meter prometer ofender responder sorprender esconder deber tejer`.split(' '),
 ir:`vivir partir subir sufrir decidir permitir existir recibir cumplir unir resistir insistir asistir discutir definir`.split(' ')
};
const endings={
 ar:['o','as','a','amos','áis','an','é','aste','ó','asteis','aron','aba','abas','ábamos','abais','aban','aré','arás','ará','aremos','aréis','arán','aría','arías','aríamos','aríais','arían','e','es','emos','éis','en','ara','aras','áramos','arais','aran','ando','ado','ada','ados','adas','ás','á'],
 er:['o','es','e','emos','éis','en','í','iste','ió','imos','isteis','ieron','ía','ías','íamos','íais','ían','eré','erás','erá','eremos','eréis','erán','ería','erías','eríamos','eríais','erían','a','as','amos','áis','an','iera','ieras','iéramos','ierais','ieran','iendo','ido','ida','idos','idas','és','é'],
 ir:['o','es','e','imos','ís','en','í','iste','ió','isteis','ieron','ía','ías','íamos','íais','ían','iré','irás','irá','iremos','iréis','irán','iría','irías','iríamos','iríais','irían','a','as','amos','áis','an','iera','ieras','iéramos','ierais','ieran','iendo','ido','ida','idos','idas','ís','í']
};
const conjugations=Object.entries(regular).flatMap(([type,verbs])=>verbs.flatMap(infinitive=>endings[type].map(ending=>infinitive.slice(0,-2)+ending)));
const notPlural=new Set('va está será allá acá ya siempre todavía sobre nueve mamá papá cantar bailar soñar andar guitarrear regresar recordar volar aromar florecer crecer nacer querer volver saber correr beber leer ver tener poder ser hacer lucir vivir sentir partir latir venir reír abrir seguir escribir ayer a o y u e no sí sin con por tras amén también después adiós aquí allí ahí así más jamás además atrás detrás compás demás quizás estás serás darás verás irás sabrás podrás tendrás vendrás dirás harás querrás cantá bailá soñá andá volvé vení viví comé bebé sentí partí'.split(' '));
const plural=w=>notPlural.has(w)||/s$/.test(w)||/[áéíóú]$/.test(w)||/(ar|er|ir)$/.test(w)&&!/^(lugar|hogar|mar|mujer|placer|porvenir|amanecer|atardecer)$/.test(w)?null:/[aeiou]$/.test(w)?w+'s':/ón$/.test(w)?w.slice(0,-2)+'ones':/z$/.test(w)?w.slice(0,-1)+'ces':/[lrdjny]$/.test(w)?w+'es':null;
const folkWords=new Set(folk.split(/\s+/));
// Familias que faltaban y se piden a menudo en canciones (amigo, testigo, contigo…).
const added=`amigo enemigo testigo abrigo castigo mendigo ombligo postigo trigo higo contigo conmigo consigo`;
const baseWords=[...new Set((folk+' '+common+' '+extra+' '+added).split(/\s+/).filter(Boolean))];
const curated=new Set([...baseWords,...baseWords.map(plural).filter(Boolean)]);
// Léxico regional: una misma palabra puede valer en varias regiones (guagua, chamba). Si no está en el vocabulario general, sólo se ofrece en esas regiones.
// Las formas conjugadas se ofrecen, pero no pasan por delante de las palabras base de la región.
const regional=new Map(),regionalBase=new Set();
const tag=(word,region,register,base=true)=>{if(!regional.has(word))regional.set(word,{});regional.get(word)[region]=register;if(base)regionalBase.add(word);};
const words=text=>text.split(/\s+/).filter(Boolean);
for(const [region,byRegister] of Object.entries(lexicon))for(const [register,{words:nouns,verbs}] of Object.entries(byRegister)){
 words(nouns).forEach(word=>{tag(word,region,register);const many=plural(word);if(many)tag(many,region,register);});
 words(verbs).forEach(verb=>{tag(verb,region,register);endings[verb.slice(-2)].forEach(ending=>tag(verb.slice(0,-2)+ending,region,register,false));});
}
const general=new Set(conjugations);
// Vocabulario propio: palabras que el usuario agregó y no están en los diccionarios. Se guarda en el navegador y vale en cualquier composición.
const USER_VOCAB_KEY='el-silbador-metrica-vocabulario';
function userVocabulary(env=globalThis){
 try{const list=JSON.parse(env.localStorage.getItem(USER_VOCAB_KEY)||'[]');return Array.isArray(list)?list.filter(w=>typeof w==='string'&&w):[];}catch{return [];}
}
function addUserVocabulary(words,env=globalThis){
 const have=userVocabulary(env),fresh=[...new Set(words)].filter(w=>!have.includes(w));
 if(fresh.length){try{env.localStorage.setItem(USER_VOCAB_KEY,JSON.stringify([...have,...fresh]));}catch{return [];}}
 return fresh;
}
const rhymeWords=[...new Set([...curated,...conjugations,...regional.keys()])].map(word=>{
 const tags=regional.get(word)||null;
 return {word,folk:folkWords.has(word),tier:folkWords.has(word)?0:curated.has(word)?1:2,tags,base:regionalBase.has(word),exclusive:!!tags&&!curated.has(word)&&!general.has(word),verb:general.has(word)&&!curated.has(word),info:wordInfo(word)};
}).filter(w=>w.info);
// Las tildes que casi nunca se escriben en un borrador se restauran sólo para leer el verso: la palabra sin tilde no existe.
const tildeless=new Map('jamás además atrás detrás quizás también después adiós así aquí allí ahí allá acá canción corazón razón pasión emoción ilusión tradición oración reunión rincón región fogón malón balcón perdón ladrón camión estación nación versión sensación visión decisión día días tía tías mía mías mío míos vía vías guía guías lío río ríos frío fría frías fríos vacío vacía vacías ríe sonríe sonrío oído oídos país países raíz raíces maíz baúl ataúd poesía alegría melodía armonía energía compañía fantasía melancolía agonía sinfonía biografía geografía travesía osadía cortesía bahía policía valentía cobardía hipocresía filosofía teoría ironía sabiduría simpatía tenía venía decía podía quería sabía vivía sentía salía veía creía leía caía oía reía habría podría tendría vendría haría diría iría estaría'.split(' ').map(w=>[plain(w),w]));
// Una palabra sin tilde que termina en «on» casi siempre es aguda escrita sin tilde (chabón, melocotón); lo grave en «-on» no existe salvo nombres propios.
const graveOn=new Set(['jason','newton','aaron']);
const guessOn=k=>/^[a-zñ]{2,}on$/.test(k)&&!graveOn.has(k);
// Terminaciones que casi siempre llevan tilde en la í (brujerías, geografía). Otras en «-ia» son diptongo (historia, gracia): ahí no se puede saber sin la palabra.
const guessIa=k=>/^[a-zñ]+(er|log|graf|fon|nom)ias?$/.test(k);
const restoreTilde=text=>text.replace(/[a-záéíóúüñ]+/gi,w=>{const k=w.toLowerCase();return tildeless.get(k)||(guessOn(k)?w.slice(0,-2)+(w.endsWith('ON')?'ÓN':'ón'):guessIa(k)?w.replace(/ia(s?)$/i,(m,z)=>'ía'+z):w);});
// «joined» es el conjunto de sinalefas elegidas en ese verso; sin él se aplican todas las posibles.
const policy=joined=>joined&&{has:(wi,key)=>!joined.has(key)};
const readLine=(line,joined)=>scan(restoreTilde(line),policy(joined),joined&&{has:key=>joined.has(key)});
// «place» acota por región y registro: lo regional de ese lugar va primero y lo exclusivo de otros lugares se oculta; lo neutro sirve en todas partes.
function suggestRhymes(prefix,reference,kind,meter,joined,place={},extra=[]){
 const key=rhymeOf(reference,kind)?.key;
 if(!key)return [];
 const {region='',register=''}=place,choosing=!!(region||register);
 const mine=new Set(extra.map(w=>w.word)),exact=kind==='asonante'?rhymeOf(reference,'consonante')?.key:null;
 return [...rhymeWords.filter(w=>!mine.has(w.word)),...extra].filter(w=>w.word!==reference.word&&rhymeOf(w.info,kind)?.key===key).flatMap(w=>{
  const here=w.tags&&Object.entries(w.tags).find(([r,reg])=>(!region||r===region)&&(!register||reg===register));
  if(w.exclusive&&!here)return [];
  const reading=readLine([prefix.trim(),w.word].filter(Boolean).join(' '),joined);
  return [{...w,tier:w.priority?-2:choosing&&here&&w.base?-1:w.tier,local:here?{region:here[0],register:here[1]}:null,count:reading.count,remaining:meter-reading.count,cons:!!exact&&rhymeOf(w.info,'consonante')?.key===exact}];
 }).filter(w=>w.remaining>=0&&(!prefix.trim()||w.remaining===0)).sort((a,b)=>b.cons-a.cons||!a.priority-!b.priority||a.tier-b.tier||(a.rank??0)-(b.rank??0)||a.remaining-b.remaining||a.word.localeCompare(b.word,'es'));
}
const variantOf=(form,v=0)=>({...form,...(form.variants?.[v]||{})});
const meterAt=(form,i)=>form.meters?.[i%form.pattern.length]||form.meter||8;
function stanzaState(lines,form,joins){
 const kind=form.kind||(['Décima','Sextilla'].includes(form.title)?'consonante':'asonante');
 const readings=lines.map((l,i)=>readLine(l,joins&&(joins[i]||new Set())));const anchors={};
 readings.forEach((r,i)=>{const family=form.pattern[i%form.pattern.length];if(family!=='—'&&r.last&&!anchors[family])anchors[family]={...rhymeOf(r.last,kind),source:i,last:r.last};});
 return readings.map((reading,i)=>{
  const family=form.pattern[i%form.pattern.length],anchor=anchors[family],meter=meterAt(form,i);
  // El ajuste por el final solo tiene sentido cuando el último acento cae en la sílaba 7 (meter−1) o después; antes, el verso aún está incompleto.
  const stressAt=reading.last?reading.groups.length-(reading.last.syllables.length-1-reading.last.stress):0;
  if(reading.adjustment&&stressAt<meter-1){reading.adjustment=0;reading.count=reading.groups.length;}
  const ending=reading.last&&rhymeOf(reading.last,kind);
  return {reading,family,anchor,meter,kind,status:!reading.last?'empty':family==='—'?'free':anchor.source===i?'anchor':ending?.key===anchor.key?'match':'mismatch'};
 });
}
function mountComposer(root,forms,options={}){
 loadRegion();
 const composerController=new AbortController(),composerCleanups=[];
 const listen=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:composerController.signal});
 const dispose=()=>{composerController.abort();composerCleanups.forEach(fn=>fn());};
 cleanups.push(dispose);
 const lab=!!options.lab;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const metricIcon=kind=>icons[kind];
 const metricEquality=(left,right)=>`<span class="metric-equality"><code>${left}</code><span>son iguales a</span><code>${right}</code></span>`;
 const infoIcon=icons.info;
 const infoTip=(label,body,id='')=>`<details class="composer-info"><summary aria-label="${label}">${infoIcon}</summary><div class="composer-tooltip"${id?` id="${id}"`:''}>${body}</div></details>`;
 root.innerHTML=`<div class="composer-heading"><div><div class="eyebrow">${lab?'CUADERNO DE COMPOSICIÓN':'TU CUADERNO DE COMPOSICIÓN'}</div><h3>${options.title||'Escribí tus versos con rima.'}</h3></div></div><div class="variant-row" id="composer-variants" hidden><span class="variant-label" id="composer-variant-label">Variante</span><div class="variant-menu"><button type="button" id="composer-variant" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="composer-variant-label composer-variant"></button><ul id="composer-variant-list" role="listbox" aria-labelledby="composer-variant-label" tabindex="-1" hidden></ul></div><p id="composer-variant-intro"></p></div><div class="composer-actions">${lab?'':'<button class="outline" id="composer-example">Usar el ejemplo</button>'}${lab?'':'<button class="outline" id="composer-more" hidden>Agregar dos versos</button>'}<span id="composer-save" role="status"></span>${lab?'':`<span class="composer-copied" id="composer-copied" role="status"></span><button class="composer-copy" id="composer-copy" type="button" aria-label="Copiar todo el texto" data-tooltip="Copiar todo el texto">${icons["copy"]}</button>`}</div>${lab?'':`<div class="composer-text-label"><span class="composer-label" id="composer-label">Tu texto</span>${infoTip('Cómo usar el editor','<p>Escribí directamente sobre las líneas: cada sílaba queda subrayada a medida que escribís. Pegá un texto de varios versos y se reparte, uno por línea.</p><p>Las sinalefas no se aplican solas. Entre dos palabras que podrían unirse aparece un arco tenue ‿: tocalo para contarlas como una sílaba.</p><p>El acento requerido por la métrica se destaca en terracota. El engranaje permite mostrar los demás acentos. Palabras habituales sin tilde, como «jamas», se leen con su tilde.</p><p>La letra en el círculo del final indica la familia de rima. Tocá una guía punteada para buscar palabras que rimen, o el conteo para entender la medida. Guardamos un borrador por forma en este navegador.</p><p>Las rimas se comparan con el primer verso escrito de cada familia. El análisis es orientativo, con sinalefas, seseo y yeísmo rioplatenses. Revisá las licencias con el oído. El vocabulario de sugerencias es local y limitado.</p>','composer-help')}</div>`}<div id="composer-summary" role="status" aria-live="polite"></div><div id="composer-lines" class="verse-editor" role="group" ${lab?'aria-label="Tu texto"':'aria-labelledby="composer-label"'}></div>${lab?`<button type="button" class="add-group" id="composer-add-group" aria-label="Agregar un grupo de versos" data-tooltip="Agregar un grupo de versos">${icons["plus"]}</button>`:''}<dialog id="rhyme-dialog" aria-labelledby="suggest-title"><div class="suggest-head"><h3 id="suggest-title">Palabras para tu verso</h3><button class="close-x" id="suggest-close" type="button" aria-label="Cerrar sugerencias">${icons["x"]}</button></div><p id="suggest-context"></p><button class="outline" id="suggest-clear" hidden>Quitar terminación</button><div id="suggest-filters" hidden><div class="suggest-place"><div><label for="suggest-region">Región</label><select id="suggest-region"><option value="">Todas las regiones</option>${regions.map(r=>`<option value="${r.id}">${esc(r.label)} (${esc(Object.values(r.countries).join(', '))})</option>`).join('')}</select></div><div><label for="suggest-register">Registro</label><select id="suggest-register"><option value="">Todos los registros</option>${registers.map(r=>`<option value="${r.id}">${esc(r.label)}</option>`).join('')}</select></div></div><p id="suggest-region-note" aria-live="polite"></p><label for="suggest-type">Acentuación de la palabra</label><select id="suggest-type"><option value="">Todas las que caben</option><option value="aguda">Agudas</option><option value="grave">Graves</option><option value="esdrújula">Esdrújulas</option><option value="monosílaba">Monosílabas</option></select></div><div id="suggest-list"></div><p class="small">Se comprueba la medida del verso completo, incluyendo sinalefas y el ajuste final. Si el verso está vacío, elegí un final y completá su inicio.</p></dialog><dialog id="metric-dialog" aria-labelledby="metric-title"><div class="suggest-head"><h3 id="metric-title">Sílabas métricas</h3><button class="close-x" id="metric-close" type="button" aria-label="Cerrar explicación de métrica">${icons["x"]}</button></div><div id="metric-current" class="metric-report" role="status"></div><h4 class="metric-subtitle">¿Qué es una sílaba métrica?</h4><p>Es la unidad del conteo de sílabas en los versos.</p><p>No todas las sílabas cuentan igual. La última sílaba de un verso, si va acentuada, vale por dos.</p><div class="metric-examples">${[
 ['agudo','Por el valle va mi voz',`La última sílaba lleva el acento:<br>${metricEquality('7 pronunciadas + 1','8 métricas.')} Ese +1 es una convención: no hay una sílaba extra para decir.`],
 ['grave','Por el valle va mi canto',`Queda una sílaba después del último acento:<br>${metricEquality('8 pronunciadas','8 métricas.')} Es la referencia; no se ajusta.`],
 ['esdrújulo','Por el valle van los pájaros',`Quedan dos sílabas después del último acento:<br>${metricEquality('9 pronunciadas − 1','8 métricas.')} Se dicen todas las sílabas, aunque el cómputo reste una.`]
 ].map(([type,verse,why])=>`<article><h4>Final ${type}</h4><p class="metric-example-syllables">${(()=>{const groups=scan(verse).groups,stress=groups.flat().findLastIndex(g=>g.tonic);let k=0;return groups.map((group,n)=>`<span class="metric-syl"><span>${group.map(g=>k++===stress?`<b>${esc(g.text)}</b>`:esc(g.text)).join('‿')}</span><small>${n+1}</small></span>`).join('');})()}</p>${why.split(/(?<=\.) |(?<=<\/span>) /).map(t=>`<p>${t}</p>`).join('')}</article>`).join('')}</div><p>Los tres ejemplos tienen el último acento en el lugar 7 y cuentan 8 sílabas métricas.</p></dialog>`;
  const q=s=>root.querySelector(s),list=q('#composer-lines'),dialog=q('#rhyme-dialog');
 const ceMode=(()=>{try{const probe=document.createElement('div');probe.contentEditable='plaintext-only';return probe.contentEditable==='plaintext-only'?'plaintext-only':'true';}catch{return 'true';}})();
 const sel=()=>window.getSelection?.();
 // El texto de un verso son sus nodos de texto; los arcos de sinalefa (contenteditable=false) no cuentan.
 const textOf=n=>n.nodeType===3?n.data:n.nodeType===1&&(n.getAttribute('contenteditable')==='false'||n.tagName==='BR')?'':[...n.childNodes].map(textOf).join('');
 const readIsland=el=>textOf(el).replace(/ /g,' ').replace(/[\r\n]+/g,' ').normalize('NFC');
 const island=i=>list.querySelector(`.vtext[data-line="${i}"]`);
 function offsetAt(el,node,offset){if(!el.contains(node))return null;const r=document.createRange();r.selectNodeContents(el);r.setEnd(node,offset);return textOf(r.cloneContents()).length;}
 function selectionOf(el){const s=sel();if(!s||!s.rangeCount)return null;const r=s.getRangeAt(0);const start=offsetAt(el,r.startContainer,r.startOffset),end=offsetAt(el,r.endContainer,r.endOffset);return start===null||end===null?null:{start,end};}
 function setCaret(el,offset,end=offset){
  const s=sel();if(!s||!document.createRange)return;
  const nodes=[];(function walk(n){n.childNodes.forEach(c=>{if(c.nodeType===3)nodes.push(c);else if(c.nodeType===1&&c.getAttribute('contenteditable')!=='false')walk(c);});})(el);
 const r=document.createRange(),place=(at,set)=>{let left=at;for(const n of nodes){if(left<=n.data.length)return set.call(r,n,left);left-=n.data.length;}if(nodes.length)set.call(r,nodes.at(-1),nodes.at(-1).data.length);else set.call(r,el,0);};
  place(offset,r.setStart);place(end,r.setEnd);s.removeAllRanges();s.addRange(r);
 }
 function focusLine(i,offset=Infinity){const el=island(i);if(!el)return;el.focus();setCaret(el,Math.min(offset,readIsland(el).length));}
 const store=options.storage||'';
 let stash=[];
 let lines=[],joins=[],states=[],popupRow=0,returnFocus,metricReturnFocus,showOtherAccents=false,composing=false,restartNumbers=false,history=[],at=-1;
 let popupReplace=false,selected=0,variant=0,chosen={},drafts={},joinDrafts={},tailDrafts={},tails=[];
 try{drafts=JSON.parse(localStorage.getItem('el-silbador-metrica-editor'+store)||'{}')||{};joinDrafts=JSON.parse(localStorage.getItem('el-silbador-metrica-editor-joins'+store)||'{}')||{};tailDrafts=JSON.parse(localStorage.getItem('el-silbador-metrica-editor-tails'+store)||'{}')||{};}catch{}
 // Con la terminación elegida en un verso vacío, el texto del verso es el inicio más esa terminación, que se muestra en las últimas celdas.
 const full=i=>tails[i]?lines[i]+(lines[i]&&!/\s$/.test(lines[i])?' ':'')+tails[i]:lines[i];
 const cur=()=>variantOf(forms[selected],variant),key=()=>variant?`${selected}.${variant}`:selected;
 function persist(){drafts[key()]=lines;tailDrafts[key()]=tails;joinDrafts[key()]=joins.map(set=>[...set]);try{localStorage.setItem('el-silbador-metrica-editor'+store,JSON.stringify(drafts));localStorage.setItem('el-silbador-metrica-editor-joins'+store,JSON.stringify(joinDrafts));localStorage.setItem('el-silbador-metrica-editor-tails'+store,JSON.stringify(tailDrafts));q('#composer-save').textContent='';}catch{q('#composer-save').textContent='No se pudo guardar: copiá tu texto para conservarlo.';}}
 function record(){const snap=JSON.stringify({lines,tails,joins:joins.map(set=>[...set])});if(history[at]===snap)return;history=history.slice(0,at+1);history.push(snap);if(history.length>200)history.shift();at=history.length-1;}
 function sync(){persist();record();paint();options.onChange?.();}
 function restore(step){const next=at+step;if(next<0||next>=history.length)return;at=next;const snap=JSON.parse(history[at]);lines=snap.lines;tails=snap.tails||lines.map(()=>'');joins=snap.joins.map(a=>new Set(a));persist();paint();}
 const familyClass=f=>f==='—'?'fam-free':`fam-${/^[a-z]$/.test(f)?f:'x'}`;
 const slotHtml=(group,n,r,meter,text)=>{
  const w=r.words;let html='';
  group.forEach((g,k)=>{
   const word=w[g.wi],start=word.index+word.syllables.slice(0,g.si).join('').length,piece=text.slice(start,start+g.text.length);
   if(k){const previous=group[k-1],pw=w[previous.wi],end=pw.index+pw.syllables.slice(0,previous.si+1).join('').length,within=previous.wi===g.wi,key=within?`${word.word}#${g.si}`:`${pw.word}|${word.word}`,what=within?'Sinéresis':'Sinalefa',who=within?esc(word.word):`${esc(pw.word)} y ${esc(word.word)}`;html+=`<span class="vtog on" contenteditable="false" role="button" tabindex="0" aria-pressed="true" aria-label="${what} unida: ${who}. Separar" data-tooltip="${what}: cuenta como una sílaba. Tocá para separar." data-join="${esc(key)}"></span>${esc(text.slice(end,start))}`;}
   const cls=g.tonic?(n===meter-2?'metric-accent':showOtherAccents?'other-accent':''):'';
   html+=cls?`<span class="${cls}">${esc(piece)}</span>`:esc(piece);
  });
  return `<span class="slot${group.length>1?' joined':''}${n===meter-2?' expected-stress':''}${group.some(g=>g.wi===w.length-1)?' last-word':''}">${html}</span>`;
 };
 function lineParts(i,s){
  const {reading:r,meter,anchor,family,kind,status}=s,text=full(i),tail=tails[i],prefixWords=tail?r.words.filter(w=>w.index<lines[i].length).length:Infinity;
  const offsetOf=g=>{const word=r.words[g.wi];return word.index+word.syllables.slice(0,g.si).join('').length;};
  const candidates=new Map(r.joins.filter(j=>!j.active).map(j=>[j.id,j])),hiatusOff=new Map(r.hiatus.filter(h=>!h.active).map(h=>[h.id+':'+h.si,h]));
  let html='',tailHtml='',cursor=0,prefixCursor=0,prefixGroups=0;
  r.groups.forEach((group,n)=>{
   const first=group[0],start=offsetOf(first),gap=text.slice(cursor,start),inTail=first.wi>=prefixWords;
   const off=candidates.get(first.wi);
   if(!inTail&&off&&first.si===0&&n>0&&first.wi!==prefixWords){const pw=r.words[first.wi-1];html+=`<span class="vtog" contenteditable="false" role="button" tabindex="0" aria-pressed="false" aria-label="Sinalefa posible: ${esc(pw.word)} y ${esc(r.words[first.wi].word)}. Unir" data-tooltip="Posible sinalefa. Tocá para unir y contarlas como una sílaba." data-join="${esc(pw.word+'|'+r.words[first.wi].word)}"></span>`;}
   const hi=hiatusOff.get(first.wi+':'+first.si);
   if(!inTail&&hi){const word=r.words[first.wi];html+=`<span class="vtog" contenteditable="false" role="button" tabindex="0" aria-pressed="false" aria-label="Sinéresis posible: ${esc(word.word)}. Unir" data-tooltip="Posible sinéresis. Tocá para unir y contarla como una sílaba." data-join="${esc(hi.key)}"></span>`;}
   if(inTail)tailHtml+=slotHtml(group,n,r,meter,text);else html+=esc(gap)+slotHtml(group,n,r,meter,text);
   const lastItem=group.at(-1);cursor=offsetOf(lastItem)+lastItem.text.length;if(!inTail){prefixCursor=cursor;prefixGroups++;}
  });
  html+=esc(tail?lines[i].slice(prefixCursor):text.slice(cursor));
  const needsGuide=!tail&&anchor&&anchor.source!==i&&family!=='—'&&(r.count<meter||!r.last);
  const tailLength=anchor?anchor.last.syllables.length-anchor.last.stress:2;
  const ownLength=tail&&r.last?r.last.syllables.length-r.last.stress:2;
  const displaySlots=tail?meter+ownLength-2:needsGuide?meter+tailLength-2:meter;
  let ghosts='';
  const tailGroups=r.groups.length-prefixGroups,vacantEnd=tail?displaySlots-tailGroups:displaySlots;
  // Un verso sin inicio usa el propio campo editable como primera celda, para que el cursor quede sobre la primera sílaba.
  const asSlot=lab&&lines[i]===''&&vacantEnd>=1;
  for(let n=Math.max(tail?prefixGroups:r.groups.length,asSlot?1:0);n<vacantEnd;n++){
   const guide=needsGuide&&n>=meter-2,offset=n-(meter-2);
   const hint=lab||!anchor?'·':kind==='asonante'?(offset===0?anchor.key[0]:offset===tailLength-1?(anchor.key[1]||'·'):'·'):(anchor.syllables[offset]||'·');
   ghosts+=guide?`<button type="button"${lab?' tabindex="-1"':''} class="slot ghost guide${n===meter-2?' expected-stress':''}" data-suggest="${i}" aria-label="Buscar palabras para el verso ${i+1}, rima ${esc(anchor.key)}"><span>${esc(hint)}</span></button>`:`<span class="slot ghost vacant${n===meter-2?' expected-stress':''}" aria-hidden="true"><span>·</span></span>`;
  }
  if(tail)ghosts+=`<button type="button"${lab?' tabindex="-1"':''} class="tail-word" data-suggest="${i}" aria-label="Verso ${i+1}: terminación «${esc(tail)}». Cambiarla">${tailHtml}</button>`;
  if(needsGuide&&!lab)ghosts+=`<button type="button" class="rhyme-search" data-suggest="${i}">Buscar rima ${esc(anchor.key)} ↗</button>`;
  const rhymeText=status==='empty'?(anchor?`Pendiente · rima ${family}: ${anchor.key}`:family==='—'?'Verso libre':`Rima ${family} · elegí un primer final`):status==='free'?'Verso libre':status==='anchor'?`Referencia ${family} · ${anchor.key}`:status==='match'?`✓ Rima ${family} coincide · ${anchor.key}`:`! Rima ${family} no coincide: se espera ${anchor.key}`;
  const mark=status==='match'?'ok':status==='mismatch'?'bad':'';
  const end=`<button type="button"${lab?' tabindex="-1"':''} class="metric-help" data-metric-help="${i}" aria-haspopup="dialog" aria-label="Verso ${i+1}: ${r.last?r.count+' de ':''}${meter} sílabas métricas. Ver explicación">${r.last?`${r.groups.length}/${meter}`:`0/${meter}`} ${metricIcon(!r.last?'circle-help':r.count===meter?'circle-check':'circle-alert')}</button><span class="rhyme-badge ${familyClass(family)}${mark?` is-${mark}`:''}" role="img" aria-label="${family==='—'?'Verso libre':`Familia de rima ${esc(family)}`}" data-rhyme-family="${esc(family)}">${family==='—'?'—':esc(family)}</span>`;
  const note=`<span class="rhyme-text${mark?` rhyme-${mark}`:''}">${esc(rhymeText)}</span>${r.last&&!lab?` <span class="ending-adjustment">Final ${esc(r.last.type)}</span>`:''}`;
  return {html,ghosts,end,note,asSlot,slots:displaySlots,placeholder:i===0&&!lines.some(l=>l.trim())};
 }
 const setHtml=(el,html)=>{if(el._html!==html){el.innerHTML=html;el._html=html;}};
 // En el laboratorio cada grupo de versos (una copla, una sextilla…) tiene sus propias familias de rima.
 const groupSize=()=>{const f=cur();return lab&&f.title!=='Romance'?f.pattern.length:Math.max(lines.length,1);};
 function allStates(){const f=cur(),size=groupSize(),out=[];for(let a=0;a<lines.length;a+=size)stanzaState(lines.slice(a,a+size).map((_,k)=>full(a+k)),f,joins.slice(a,a+size)).forEach(st=>out.push(st.anchor?{...st,anchor:{...st.anchor,source:st.anchor.source+a}}:st));return out;}
 // Enter parte el verso en el cursor y baja el resto, como en un editor de texto; los versos siguientes se corren un lugar.
 function splitLine(el){const i=+el.dataset.line,range=selectionOf(el)||{start:lines[i].length,end:lines[i].length},before=lines[i].slice(0,range.start),after=lines[i].slice(range.end).replace(/^\s+/,''),tail=tails[i];lines[i]=before;tails[i]='';lines.splice(i+1,0,after);tails.splice(i+1,0,tail);joins.splice(i+1,0,new Set(joins[i]));
  if(lines.length>i+2&&lines.at(-1)===''&&!tails.at(-1)){lines.pop();tails.pop();joins.pop();}
  while(lines.length%groupSize()){lines.push('');tails.push('');joins.push(new Set());}
  sync();focusLine(i+1,0);}
 // Tab recorre las sílabas del verso y luego los versos; los controles laterales quedan fuera del orden de tabulación.
 function tabStep(el,i,range,back){
  const ends=[...el.querySelectorAll('.slot')].map(slot=>{const r=document.createRange();r.selectNodeContents(el);r.setEndAfter(slot);return textOf(r.cloneContents()).length;});
  if(back){const before=[0,...ends].filter(n=>n<range.start);if(before.length){setCaret(el,Math.max(...before));return true;}if(i>0){focusLine(i-1);return true;}return false;}
  const next=ends.filter(n=>n>range.end);
  if(next.length){setCaret(el,Math.min(...next));return true;}
  if(i<lines.length-1){focusLine(i+1,0);return true;}
  return false;
 }
 // Alt+↓ abre las sugerencias de rima de un verso desde el teclado.
 function openFromKeyboard(i,el){const s=states[i];if(!s.anchor||s.family==='—'||s.anchor.source===i)return;const row=el.closest('[data-verse-row]'),last=row.querySelector('.slot.last-word');if(s.status==='mismatch'&&last)openSuggest(i,last,true);else{const target=row.querySelector('.vghosts [data-suggest]');if(target)openSuggest(i,target,false);}}
 function addGroup(){const f=cur(),step=f.title==='Romance'?2:f.pattern.length,first=lines.length;for(let k=0;k<step;k++){lines.push('');tails.push('');joins.push(new Set());}sync();focusLine(first,0);}
 // El primer grupo se vacía; los demás se eliminan.
 function groupTrash(g){const size=groupSize(),from=g*size;if(g===0){for(let k=0;k<Math.min(size,lines.length);k++){lines[k]='';tails[k]='';joins[k]=new Set();}}else{lines.splice(from,size);tails.splice(from,size);joins.splice(from,size);}sync();focusLine(Math.min(from,lines.length-1),0);}
 function paint(){
  const f=cur();states=allStates();let good=0,bad=0;
  states.forEach((s,i)=>{
   let row=list.querySelector(`[data-verse-row="${i}"]`);
   if(!row){row=document.createElement('article');row.className='compose-line vline';row.dataset.verseRow=i;row.innerHTML=`<h4 class="vnum compose-verse-title"${lab?` aria-label="Verso ${i+1}" data-tooltip="Arrastrá para mover el verso"`:''}>${lab?i+1:`Verso ${i+1}`}</h4><div class="vbody"><div class="vtext" contenteditable="${ceMode}" role="textbox" aria-label="Verso ${i+1}"  spellcheck="false" autocapitalize="off" data-line="${i}"></div><span class="vghosts"></span></div><div class="vend"></div><div class="vnote"></div>`;if(lab&&i%groupSize()===0)row.insertAdjacentHTML('afterbegin',`<div class="group-tools">${i===0?`<span class="composer-copied" id="composer-copied" role="status"></span><button class="composer-copy" id="composer-copy" type="button" aria-label="Copiar todo el texto" data-tooltip="Copiar todo el texto">${icons["copy"]}</button>`:''}<button type="button" class="group-trash" data-group="${i/groupSize()}">${icons["trash-2"]}</button></div>`);list.append(row);}
   if(s.status==='match')good++;if(s.status==='mismatch')bad++;
   if(lab){const n=restartNumbers?i%groupSize()+1:i+1,title=row.querySelector('.vnum');if(title.textContent!==String(n)){title.textContent=n;title.setAttribute('aria-label',`Verso ${n}`);}}
   if(lab&&i%groupSize()===0){const g=i/groupSize(),b=row.querySelector('.group-trash'),label=g===0?'Vaciar el grupo de versos':`Eliminar el grupo de versos ${g+1}`;b.setAttribute('aria-label',label);b.dataset.tooltip=label;}
   row.classList.toggle('group-head',lab&&i%groupSize()===0);row.classList.toggle('group-start',lab&&i>0&&i%groupSize()===0);row.dataset.rhymeStatus=s.status;row.dataset.rhymeFamily=s.family;
   const p=lineParts(i,s),text=row.querySelector('.vtext');
   row.classList.toggle('few-slots',p.slots<=9);row.style.setProperty('--slots',p.slots);
   setHtml(text,p.html);text.classList.toggle('as-slot',p.asSlot);
   if(p.placeholder&&!p.asSlot)text.dataset.placeholder='Escribí o pegá tu texto acá…';else delete text.dataset.placeholder;
   setHtml(row.querySelector('.vghosts'),p.ghosts);setHtml(row.querySelector('.vend'),p.end);setHtml(row.querySelector('.vnote'),p.note);
  });
  [...list.children].slice(lines.length).forEach(r=>r.remove());
  q('#composer-summary').textContent=`${good} ${good===1?'rima':'rimas'}${bad?` · ${bad} por revisar`:''}`;
 }
 function select(i,v=chosen[i]||0){selected=i;variant=chosen[i]=v;const f=cur(),k=key();lines=Array.isArray(drafts[k])?drafts[k].map(String):Array(f.pattern.length).fill('');while(lines.length<f.pattern.length&&!options.resizable)lines.push('');joins=lines.map((l,n)=>new Set(joinDrafts[k]?.[n]||[]));tails=lines.map((l,n)=>lab&&tailDrafts[k]?.[n]||'');if(options.resizable){const n=f.pattern.length;if(lines.length>n){stash=[...lines.slice(n).map((l,m)=>({l,t:tails[n+m],j:joins[n+m]})),...stash];lines.length=tails.length=joins.length=n;}while(lines.length<n){const x=stash.shift();lines.push(x?x.l:'');tails.push(x?x.t:'');joins.push(x?x.j:new Set());}persist();}if(!lab)q('#composer-form-name').textContent=`${f.title} · ${f.pattern.join('')}`;if(!lab)q('#composer-more').hidden=f.title!=='Romance';
  const vs=forms[i].variants||[];q('#composer-variants').hidden=!f.intro;q('#composer-variant-label').hidden=q('.variant-menu').hidden=vs.length<2;q('#composer-variant').innerHTML=`${esc(vs[v]?.label.split(' · ')[0]||'')}${icons["chevron-down"]}`;q('#composer-variant-list').innerHTML=vs.map((o,n)=>{const [name,...scheme]=o.label.split(' · ');return `<li role="option" id="composer-variant-${n}" data-v="${n}" aria-selected="${n===v}"><span class="vname">${esc(name)}</span><span class="vscheme">${scheme.join(' · ').split(/\s+/).map(t=>t.replace(/^(\d+)(.)$/,(_,n,l)=>`${n}<b class="${familyClass(l)}">${esc(l)}</b>`)).join(' ')}</span></li>`;}).join('');closeVariants(false);q('#composer-variant-intro').textContent=f.intro||'';
  list.innerHTML='';history=[];at=-1;record();paint();if(options.onSelect)options.onSelect(f,i,v);}
 const basePrefix=()=>popupReplace?lines[popupRow].slice(0,states[popupRow].reading.words.at(-1).index).trimEnd():lines[popupRow];
 // Número gramatical del verso (por su último determinante o plural) o, si no se define, el de la palabra que fijó la rima.
 const NOT_PLURAL=new Set('es más mas jamás jamas después despues además ademas atrás atras tres país pais inglés ingles mes lunes martes miércoles miercoles jueves viernes crisis tesis dios'.split(' '));
 const PLURAL_WORDS=new Set('los las unos unas mis tus sus nuestros nuestras estos estas esos esas muchos muchas todos todas'.split(' '));
 const SINGULAR_WORDS=new Set('el la un una mi tu su este esta ese esa aquel aquella'.split(' '));
 const isPlural=w=>PLURAL_WORDS.has(w)||(w.length>2&&w.endsWith('s')&&!NOT_PLURAL.has(w)&&!/[áéíóú]s$/.test(w)&&!SINGULAR_WORDS.has(w));
 function wantsPlural(prefix,anchorWord){
  let plural=null;
  for(const w of prefix.toLocaleLowerCase('es').match(/[a-záéíóúüñ]+/g)||[]){if(PLURAL_WORDS.has(w)||isPlural(w))plural=true;else if(SINGULAR_WORDS.has(w))plural=false;}
  return plural??isPlural(anchorWord.toLocaleLowerCase('es'));
 }
 // De cada par singular/plural queda una sola forma: la que corresponde al número buscado. Las formas verbales (cantas, cantes) no son pares.
 function oneNumber(words,plural){
  const by=new Map(words.map(w=>[plain(w.word),w])),drop=new Set();
  for(const w of words){
   const x=w.word,singulars=[x.endsWith('s')&&x.slice(0,-1),x.endsWith('es')&&x.slice(0,-2),x.endsWith('ones')&&x.slice(0,-4)+'ón',x.endsWith('ces')&&x.slice(0,-3)+'z'].filter(Boolean);
   const mate=singulars.map(k=>by.get(plain(k))).find(m=>m&&m!==w);
   if(!mate||w.verb||mate.verb)continue;
   drop.add(plural?mate:w);
  }
  return words.filter(w=>!drop.has(w));
 }
 // Palabras del campo semántico (si la página las ofrece): pasan por delante de las demás y también se buscan fuera del vocabulario del taller.
 const priorityWords=()=>[...new Set((options.priority?.()||[]).map(w=>restoreTilde(String(w).toLocaleLowerCase('es'))).filter(w=>/^[a-záéíóúüñ]+$/.test(w)))];
 // Las palabras propias del usuario entran al mismo grupo de candidatas que el vocabulario del taller, a la par de las folklóricas.
 const userCandidates=()=>userVocabulary().flatMap(word=>{const info=wordInfo(restoreTilde(word));return info?[{word:info.word,folk:false,tier:0,tags:null,base:false,exclusive:false,verb:false,info}]:[];});
 const priorityCandidates=()=>priorityWords().flatMap(word=>{const info=wordInfo(word);return info?[{word,folk:false,tier:-2,tags:null,base:false,exclusive:false,verb:false,info,priority:true}]:[];});
 // Diccionario grande de la página (si lo ofrece): sus palabras van después de las del taller y conservan su orden de uso. Se leen una vez por grupo de asonancia.
 const dictCache=new Map();
 const dictionaryCandidates=reference=>{
  const key=rhymeOf(reference,'asonante')?.key,text=key&&options.dictionary?.(key);if(!text)return [];
  if(dictCache.get(key)?.text!==text){const known=new Set(rhymeWords.map(w=>w.word));dictCache.set(key,{text,list:text.split(' ').flatMap((word,rank)=>{const info=!known.has(word)&&wordInfo(word);return info?[{word:info.word,folk:false,tier:3,tags:null,base:false,exclusive:false,verb:false,info,rank,dict:true}]:[];})});}
  return dictCache.get(key).list;
 };
 const filtersOn=()=>!q('#suggest-filters').hidden;
 function suggestions(){
  const s=states[popupRow],prefix=basePrefix(),filter=q('#suggest-type').value,place=regionPrefs();
  const found=suggestRhymes(prefix,s.anchor.last,s.kind,s.meter,joins[popupRow],place,[...priorityCandidates(),...userCandidates().filter(u=>!priorityWords().includes(u.word)),...dictionaryCandidates(s.anchor.last).filter(d=>!priorityWords().includes(d.word)&&!userVocabulary().some(u=>restoreTilde(u)===d.word))]).filter(w=>!filter||w.info.type===filter);
  const words=oneNumber(found,wantsPlural(prefix,s.anchor.word));
  q('#suggest-list').innerHTML=words.length?words.slice(0,60).map(w=>`<button data-pick="${esc(w.word)}"><b>${esc(w.word)}</b><span>${w.info.syllables.map((y,n)=>n===w.info.stress?`<i class="tonic">${esc(y)}</i>`:esc(y)).join('·')}</span></button>`).join('')+(words.length>60?`<p class="suggest-more">Hay ${words.length-60} más${filtersOn()?': elegí una acentuación para afinar la búsqueda':''}. Pero es mejor que las imagines.</p>`:''):`<p>No hay coincidencias en el vocabulario local para este espacio${filtersOn()?' y acentuación. Probá otra acentuación'+(place.region||place.register?', ampliar la región o el registro':'')+' o reformulá el inicio':'. Probá reformular el inicio'}. Podés escribir cualquier palabra por tu cuenta.</p>`;
 }

 // Texto del aviso de la ventana de métrica, un renglón por idea: qué cuenta, qué pide la forma y cómo cerrar la diferencia.
 function explainMetric(i,s){
  const r=s.reading,meter=s.meter,plural=(k,one,many)=>`${k} ${k===1?one:many}`,syl=k=>plural(k,'sílaba','sílabas'),met=k=>plural(k,'sílaba métrica','sílabas métricas'),lines=(...rows)=>rows.filter(Boolean).map(t=>`<p>${t}</p>`).join('');
  if(!r.last)return {tone:'info',html:lines(`Esta forma pide ${met(meter)}.`)};
  const adj=r.adjustment,type=r.last.type,fin=type.replace(/a$/,'o'),word=`«${esc(r.last.word)}»`,groups=r.groups.length,diff=r.count-meter;
  const sum=metricEquality(`${plural(groups,'sílaba pronunciada','sílabas pronunciadas')}${adj===1?' + 1':adj===-1?' − 1':''}`,met(r.count));
  if(!diff)return {tone:'ok',html:lines('<b>La cuenta es correcta.</b>',sum)};
  const ending=adj===1?`La última palabra, ${word}, es ${type}: se cuenta una sílaba más.`:adj===-1?`La última palabra, ${word}, es ${type}: se cuenta una sílaba menos.`:r.last.special?`La última palabra, ${word}, termina en -mente y no lleva ajuste.`:type==='grave'?'':`La última palabra, ${word}, es ${type}, pero el ajuste del final todavía no se aplica porque el último acento cae antes de la sílaba ${meter-1}.`;
  const unjoined=r.joins.filter(j=>!j.active);
  const need=`Con un final ${fin} el verso necesita ${syl(meter-adj)} pronunciadas y tiene ${groups}.`;
  const bulb=icons.lightbulb;
  const unmerged=r.hiatus.filter(h=>!h.active);
  const hiatusNote=diff>0&&unmerged.length?`${bulb}Hay ${unmerged.length===1?'una sinéresis posible sin unir':`${unmerged.length} sinéresis posibles sin unir`} (${unmerged.map(h=>esc(h.label)).join(', ')}): unirla${unmerged.length===1?'':'s'} resta ${unmerged.length===1?'una sílaba':'sílabas'}.`:'';
  const joinsNote=diff>0&&unjoined.length?`${bulb}Hay ${unjoined.length===1?'una sinalefa posible sin unir':`${unjoined.length} sinalefas posibles sin unir`} (${unjoined.map(j=>esc(j.label)).join(', ')}): unirlas resta sílabas.`:'';
  const alternatives=['aguda','grave','esdrújula'].filter(option=>option!==type).join(' o ');
  const fix=diff>0?`También podés cambiar la última palabra por una con otra acentuación (${alternatives}), porque cambia el ajuste.`:`Agregá una palabra o cambiá la última por una con otra acentuación (${alternatives}).`;
  const note=groups===meter?`<span class="metric-note">El contador del verso muestra las sílabas pronunciadas (${groups}); el aviso compara las métricas (${r.count}).</span>`:'';
  return {tone:'warn',html:lines(sum,`La forma pide ${met(meter)}.`,diff>0?`Sobra${diff>1?'n':''} ${syl(diff)}.`:`Falta${-diff>1?'n':''} ${syl(-diff)}.`,ending,need,joinsNote,hiatusNote,fix,note)};
 }
 const metricDialog=q('#metric-dialog');
 function closeMetric(refocus=true){if(metricDialog.close)metricDialog.close();else metricDialog.removeAttribute('open');if(refocus)metricReturnFocus?.focus();}
 listen(document,'pointerdown',e=>{if(metricDialog.hasAttribute('open')&&!metricDialog.contains(e.target)&&!e.target.closest('[data-metric-help]'))closeMetric(false);});
 q('#metric-close').onclick=closeMetric;metricDialog.addEventListener('click',e=>{if(e.target===metricDialog)closeMetric();});
 function toggleJoin(control){const i=+control.closest('[data-verse-row]').dataset.verseRow,key=control.dataset.join,set=joins[i];if(set.has(key))set.delete(key);else set.add(key);sync();}
 list.addEventListener('click',e=>{
  const trash=e.target.closest('.group-trash');if(trash){groupTrash(+trash.dataset.group);return;}
  const toggle=e.target.closest('.vtog');if(toggle){toggleJoin(toggle);return;}
  const help=e.target.closest('[data-metric-help]');if(help){metricReturnFocus=help;const i=+help.dataset.metricHelp,s=states[i],r=s.reading;{const e=explainMetric(i,s);const box=q('#metric-current');q('#metric-title').textContent=`Sílabas métricas - verso ${i+1}`;box.className='metric-report is-'+e.tone;box.innerHTML=`<span class="metric-status-icon">${metricIcon(e.tone==='ok'?'circle-check':e.tone==='warn'?'circle-alert':'info')}</span><div>${e.html}</div>`;}if(metricDialog.showModal)metricDialog.showModal();else metricDialog.setAttribute('open','');return;}
  const lastSlot=lab&&e.target.closest('.vtext .slot.last-word');
  if(lastSlot){const i=+lastSlot.closest('[data-verse-row]').dataset.verseRow;if(states[i].status==='mismatch'&&sel()?.isCollapsed!==false){openSuggest(i,lastSlot,true);return;}}
  const button=e.target.closest('[data-suggest]');
  if(!button){const row=e.target.closest('[data-verse-row]');if(row&&!e.target.closest('.vtext,button,a,input,select,textarea,summary,[role="button"],.rhyme-badge'))focusLine(+row.dataset.verseRow);return;}
  openSuggest(+button.dataset.suggest,button,false);});
 // «replace»: se cambia la última palabra de un verso que no rima; el resto del verso se conserva.
 function openSuggest(row,button,replace){
  popupRow=row;popupReplace=replace;returnFocus=button;const s=states[popupRow];q('#suggest-title').innerHTML=`Verso ${popupRow+1} · rima <span class="rhyme-badge mini ${familyClass(s.family)}">${esc(s.family)}</span>`;q('#suggest-context').textContent=`Buscamos rima ${s.kind} «${s.anchor.key}», como «${s.anchor.word}» (verso ${s.anchor.source+1}). ${replace?`Estas palabras reemplazan «${s.reading.last.word}» y completan la medida.`:lines[popupRow].trim()?'Las palabras completan el espacio libre del verso.':'Elegí una terminación y luego escribí su inicio.'}`;q('#suggest-type').value='';q('#suggest-clear').hidden=!tails[popupRow];suggestions();
  if(lab){place(button);if(dialog.show)dialog.show();else dialog.setAttribute('open','');dialog.querySelector('#suggest-type').focus();}
  else if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 // En el laboratorio el popup se ancla al disparador y no bloquea el resto de la página.
 function place(button){const base=root.getBoundingClientRect(),b=button.getBoundingClientRect(),width=Math.min(380,base.width-24);dialog.style.width=width+'px';dialog.style.left=Math.max(12,Math.min(b.left-base.left,base.width-width-12))+'px';const gap=16,below=(window.innerHeight||1e4)-b.bottom-8-gap,above=b.top-8-gap,up=below<260&&above>below,room=Math.max(160,up?above:below);
  dialog.style.maxHeight=Math.min(520,room)+'px';
  if(up){dialog.style.top='auto';dialog.style.bottom=(base.bottom-b.top+8)+'px';}else{dialog.style.bottom='auto';dialog.style.top=(b.bottom-base.top+8)+'px';}}
 if(lab){listen(document,'pointerdown',e=>{if(dialog.hasAttribute('open')&&!dialog.contains(e.target)&&!e.target.closest('[data-suggest]'))close(false);});dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});}
 function close(refocus=true){if(dialog.close)dialog.close();else dialog.removeAttribute('open');if(refocus)returnFocus?.focus();}
 q('#suggest-close').onclick=close;dialog.addEventListener('click',e=>{if(e.target===dialog)close();});q('#suggest-type').onchange=suggestions;
 // Muestra la región vigente y de dónde salió; sólo describe, la elección es siempre del usuario.
 function showPlace(){
  const place=regionPrefs(),region=regions.find(r=>r.id===place.region);
  q('#suggest-region').value=place.region;q('#suggest-register').value=place.register;
  q('#suggest-region-note').textContent=!region?(place.source?'Se muestran palabras de todas las regiones.':'No pudimos reconocer tu región. Elegí una para ver palabras de tu zona.'):`${place.source==='tu elección'?'Región elegida por vos.':`Región detectada por ${place.source}. Cambiala si no es la tuya.`}${place.region==='espana'?' En España la z y la c suenan distinto de la s: «casa» y «caza» no riman.':''}`;
 }
 q('#suggest-region').onchange=q('#suggest-register').onchange=()=>setRegion({region:q('#suggest-region').value,register:q('#suggest-register').value});
 composerCleanups.push(onRegionChange(()=>{showPlace();paint();if(dialog.hasAttribute('open'))suggestions();}));
 showPlace();
 q('#suggest-list').onclick=e=>{const b=e.target.closest('[data-pick]');if(!b)return;const base=basePrefix();if(lab&&!base.trim()){lines[popupRow]='';tails[popupRow]=b.dataset.pick;}else{lines[popupRow]=[base.trimEnd(),b.dataset.pick].filter(Boolean).join(' ');tails[popupRow]='';}sync();close();focusLine(popupRow,0);};
 q('#suggest-clear').onclick=()=>{tails[popupRow]='';sync();close();focusLine(popupRow);};
 // Cada verso es un campo editable; el texto y las sílabas subrayadas son la misma superficie.
 function edit(el){const i=+el.dataset.line,caret=selectionOf(el);lines[i]=readIsland(el);if(tails[i]){const f=cur();if(readLine(full(i),joins[i]).count>=meterAt(f,i)){lines[i]=full(i);tails[i]='';}}persist();record();paint();options.onChange?.();if(document.activeElement===el&&caret)setCaret(el,caret.end);}
 list.addEventListener('input',e=>{const el=e.target.closest?.('.vtext');if(el&&!composing)edit(el);});
 list.addEventListener('compositionstart',()=>{composing=true;});
 list.addEventListener('compositionend',e=>{composing=false;const el=e.target.closest?.('.vtext');if(el)edit(el);});
 list.addEventListener('beforeinput',e=>{
  if(!e.target.closest?.('.vtext'))return;
  if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){e.preventDefault();restore(e.inputType==='historyUndo'?-1:1);return;}
  if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'){e.preventDefault();if(lab)splitLine(e.target.closest('.vtext'));else focusLine(+e.target.closest('.vtext').dataset.line+1,0);}
 });
 list.addEventListener('paste',e=>{
  const el=e.target.closest?.('.vtext');if(!el)return;
  e.preventDefault();const i=+el.dataset.line,pieces=(e.clipboardData||window.clipboardData).getData('text').replace(/\r/g,'').split('\n');
  const range=selectionOf(el)||{start:lines[i].length,end:lines[i].length},before=lines[i].slice(0,range.start),after=lines[i].slice(range.end);
  pieces.forEach((piece,k)=>{if(i+k>=lines.length){lines.push('');joins.push(new Set());tails.push('');}});
  if(pieces.length===1){lines[i]=before+pieces[0]+after;}
  else{lines[i]=before+pieces[0];pieces.slice(1).forEach((piece,k)=>{lines[i+k+1]=piece;});lines[i+pieces.length-1]+=after;}
  if(lab&&cur().title!=='Romance')while(lines.length%groupSize()){lines.push('');joins.push(new Set());tails.push('');}
  const last=i+pieces.length-1,caret=pieces.length===1?(before+pieces[0]).length:pieces.at(-1).length;
  sync();focusLine(last,caret);
 });
 list.addEventListener('keydown',e=>{
  const toggle=e.target.closest?.('.vtog');
  if(toggle&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggleJoin(toggle);return;}
  const el=e.target.closest?.('.vtext');if(!el||e.isComposing)return;
  const i=+el.dataset.line,range=selectionOf(el),length=readIsland(el).length,collapsed=range&&range.start===range.end;
  if(lab&&e.key==='Tab'&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&range){if(tabStep(el,i,range,e.shiftKey))e.preventDefault();return;}
  if(lab&&e.altKey&&e.key==='ArrowDown'){e.preventDefault();openFromKeyboard(i,el);return;}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(e.shiftKey?1:-1);return;}
  if(e.key==='Enter'){e.preventDefault();if(lab)splitLine(el);else focusLine(i+1,0);return;}
  // Cada sílaba es un bloque en línea: el inicio y el final del verso se resuelven aquí, no con el navegador.
  const toStart=e.key==='Home'||(e.metaKey&&e.key==='ArrowLeft'),toEnd=e.key==='End'||(e.metaKey&&e.key==='ArrowRight');
  if(range&&(toStart||toEnd)){e.preventDefault();if(e.shiftKey)setCaret(el,toStart?0:range.start,toStart?range.end:length);else setCaret(el,toStart?0:length);return;}
  if(range&&e.metaKey&&e.key==='Backspace'){e.preventDefault();lines[i]=lines[i].slice(range.end);sync();setCaret(el,0);return;}
  if(!collapsed||e.shiftKey||e.altKey||e.metaKey||e.ctrlKey)return;
  const wrapped=new Set([...el.querySelectorAll('.slot')].map(s=>s.offsetTop)).size>1;
  if(e.key==='ArrowUp'&&i>0&&!wrapped){e.preventDefault();focusLine(i-1,range.start);}
  else if(e.key==='ArrowDown'&&i<lines.length-1&&!wrapped){e.preventDefault();focusLine(i+1,range.start);}
  else if((e.key==='ArrowLeft'||e.key==='Backspace')&&range.start===0&&i>0){e.preventDefault();focusLine(i-1);}
  else if((e.key==='ArrowRight'||e.key==='Delete')&&range.start===length&&i<lines.length-1){e.preventDefault();focusLine(i+1,0);}
 });
 root.addEventListener('click',e=>{const active=e.target.closest('.composer-info');root.querySelectorAll('.composer-info[open]').forEach(tip=>{if(tip!==active)tip.removeAttribute('open');});});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){root.querySelectorAll('.composer-info[open]').forEach(tip=>{tip.removeAttribute('open');tip.querySelector('summary').focus();});}});
 let copiedTimer;const copyAll=async()=>{const t=lines.map((_,i)=>full(i)).join('\n').replace(/\n+$/,'');const note=q('#composer-copied');clearTimeout(copiedTimer);try{await navigator.clipboard.writeText(t);note.textContent='Texto copiado';}catch{note.textContent='No se pudo copiar';}copiedTimer=setTimeout(()=>{note.textContent='';},2000);};
 root.addEventListener('click',e=>{if(e.target.closest('#composer-copy'))copyAll();});
 if(lab){q('#composer-add-group').onclick=addGroup;root.classList.add('composer-lab');}else q('#composer-example').onclick=()=>{lines=[...cur().lines];tails=lines.map(()=>'');joins=lines.map(()=>new Set());sync();};if(!lab)q('#composer-more').onclick=()=>{lines.push('','');tails.push('','');joins.push(new Set(),new Set());sync();};const vButton=q('#composer-variant'),vList=q('#composer-variant-list');
 let vActive=0;
 function markVariant(n){const items=[...vList.children];vActive=Math.max(0,Math.min(items.length-1,n));items.forEach((li,k)=>li.classList.toggle('active',k===vActive));vList.setAttribute('aria-activedescendant',items[vActive].id);}
 function openVariants(){vList.hidden=false;vButton.setAttribute('aria-expanded','true');markVariant(variant);vList.focus();}
 function closeVariants(refocus=true){vList.hidden=true;vButton.setAttribute('aria-expanded','false');if(refocus)vButton.focus();}
 vButton.onclick=()=>vList.hidden?openVariants():closeVariants();
 vButton.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openVariants();}};
 vList.onclick=e=>{const li=e.target.closest('[data-v]');if(!li)return;select(selected,+li.dataset.v);vButton.focus();};
 vList.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();markVariant(vActive+(e.key==='ArrowDown'?1:-1));}else if(e.key==='Home'||e.key==='End'){e.preventDefault();markVariant(e.key==='Home'?0:vList.children.length);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();select(selected,vActive);vButton.focus();}else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();e.stopPropagation();closeVariants();}};
 // Explicación del indicador de rima: con el cursor aparece al pasar por encima; sin hover (celular), al tocarlo. Muestra el indicador real, con su color.
 let badgeTip=null,badgeOf=null;
 const hideBadgeTip=()=>{badgeTip?.remove();badgeTip=badgeOf=null;};
 function showBadgeTip(badge){
  hideBadgeTip();const family=badge.dataset.rhymeFamily;
  badgeTip=document.createElement('div');badgeTip.className='badge-tip';badgeTip.setAttribute('role','tooltip');badgeOf=badge;
  badgeTip.innerHTML=family==='—'?'Verso libre: no requiere rima':`Requiere rimar con otros <span class="rhyme-badge ${familyClass(family)}" aria-hidden="true">${esc(family)}</span>`;
  root.appendChild(badgeTip);
  const b=badge.getBoundingClientRect(),w=badgeTip.offsetWidth,h=badgeTip.offsetHeight;
  badgeTip.style.left=Math.max(8,Math.min(window.innerWidth-w-8,b.right-w))+'px';
  badgeTip.style.top=(b.top-h-8>8?b.top-h-8:b.bottom+8)+'px';
 }
 list.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const badge=e.target.closest?.('.rhyme-badge');if(badge&&badge!==badgeOf)showBadgeTip(badge);});
 list.addEventListener('pointerout',e=>{if(e.pointerType==='mouse'&&e.target.closest?.('.rhyme-badge'))hideBadgeTip();});
 list.addEventListener('click',e=>{
  if(e.pointerType==='mouse')return;
  const badge=e.target.closest?.('.rhyme-badge');if(!badge)return;
  const again=badgeOf===badge;hideBadgeTip();if(!again)showBadgeTip(badge);
 });
 listen(document,'pointerdown',e=>{if(badgeTip&&!badgeTip.contains(e.target)&&!badgeOf?.contains(e.target))hideBadgeTip();});
 listen(document,'keydown',e=>{if(e.key==='Escape')hideBadgeTip();});
 listen(window,'scroll',hideBadgeTip,{passive:true});listen(window,'resize',hideBadgeTip);
 listen(document,'pointerdown',e=>{if(!vList.hidden&&!e.target.closest('.variant-menu'))closeVariants(false);});
 // Reemplaza el texto de una forma y variante con los renglones dados (por ejemplo, los detectados), completando hasta un múltiplo de la estrofa.
 function load(i,v,text){select(i,v);const n=cur().pattern.length;lines=text.map(String);while(lines.length%n||!lines.length)lines.push('');tails=lines.map(()=>'');joins=lines.map(()=>new Set());history=[];at=-1;sync();}
 // Arrastrar el número de un verso: dentro de su grupo lo reordena (insertando antes de `at`); hacia otro grupo vacía el origen y reemplaza el destino con sus sílabas.
 function moveVerse(from,to,place){
  const size=groupSize();if(from===to&&place==='replace'||from<0||from>=lines.length||to<0||to>=lines.length)return false;
  if(Math.floor(from/size)===Math.floor(to/size)){
   let at=place==='after'?to+1:to;if(at>from)at--;if(at===from)return false;
   for(const a of [lines,tails,joins])a.splice(at,0,a.splice(from,1)[0]);
  }else{
   lines[to]=lines[from];tails[to]=tails[from];joins[to]=new Set(joins[from]);
   lines[from]='';tails[from]='';joins[from]=new Set();
  }
  sync();return true;
 }
 if(lab){
  let drag=null;
  const clear=()=>list.querySelectorAll('.drop-before,.drop-after,.drop-replace,.dragging').forEach(r=>r.classList.remove('drop-before','drop-after','drop-replace','dragging'));
  const targetAt=(x,y)=>{
   const row=document.elementFromPoint(x,y)?.closest?.('[data-verse-row]');if(!row||!list.contains(row))return null;
   const to=+row.dataset.verseRow,size=groupSize(),rect=row.getBoundingClientRect();
   if(Math.floor(to/size)!==Math.floor(drag.from/size))return {row,to,place:'replace'};
   return to===drag.from?null:{row,to,place:y<rect.top+rect.height/2?'before':'after'};
  };
  const end=()=>{drag=null;clear();root.classList.remove('is-dragging');};
  list.addEventListener('pointerdown',e=>{
   const num=e.target.closest?.('.vnum');if(!num||e.button>0||!e.isPrimary)return;
   drag={from:+num.closest('[data-verse-row]').dataset.verseRow,x:e.clientX,y:e.clientY,active:false,target:null,id:e.pointerId,num};
  });
  list.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   if(!drag.active){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;drag.active=true;drag.num.setPointerCapture?.(e.pointerId);root.classList.add('is-dragging');list.querySelector(`[data-verse-row="${drag.from}"]`).classList.add('dragging');}
   e.preventDefault();
   list.querySelectorAll('.drop-before,.drop-after,.drop-replace').forEach(r=>r.classList.remove('drop-before','drop-after','drop-replace'));
   drag.target=targetAt(e.clientX,e.clientY);
   if(drag.target)drag.target.row.classList.add('drop-'+drag.target.place);
  });
  list.addEventListener('pointerup',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const {from,active}=drag,t=active?targetAt(e.clientX,e.clientY)||drag.target:null;end();
   if(active&&t&&moveVerse(from,t.to,t.place))focusLine(t.place==='replace'?t.to:Math.min(lines.length-1,t.place==='after'&&t.to<from?t.to+1:t.to));
  });
  list.addEventListener('pointercancel',end);
  listen(document,'keydown',e=>{if(e.key==='Escape'&&drag)end();});
 }
 // Texto de los versos y reemplazo en todos ellos, para el corrector de la página.
 function mapLines(fn){lines=lines.map(fn);sync();}

 composerCleanups.push(notebookSettings.subscribe(settings=>{
  showOtherAccents=settings['other-accents'];
  restartNumbers=settings.restart;
  root.classList.toggle('hide-notes',!settings.notes);
  root.classList.toggle('hide-nums',!settings.nums);
    paint();
  if(dialog.hasAttribute('open'))suggestions();
 }));
 select(0);return {select,load,current:cur,lines:()=>[...lines],mapLines,moveVerse,dispose};
}

// Cada forma es su primera variante; «variants» lista las demás como cambios sobre ese texto base.
const forms=[
 {title:'Copla',sub:'CUATRO VERSOS · UNA VOZ POPULAR',intro:'Una copla tradicional suele reunir cuatro octosílabos. Es frecuente la rima asonante en los pares: coinciden las vocales desde la última tónica. Hay muchas variantes.',pattern:['—','a','—','a'],lines:['Por el monte va mi canto','con el viento del lugar','lleva tierra del camino','con recuerdos de mamá'],note:'Copla original del taller. «Lugar» y «mamá» comparten la vocal acentuada á, pero sus finales completos son «ar» y «á»: por eso la rima es asonante. Los versos impares quedan libres. Las coplas aparecen en bagualas, vidalas y otros cantos; el género no obliga a una sola estrofa.',variants:[
  {id:'copla',label:'Copla popular · 8— 8a 8— 8a'},
  {id:'redondilla',label:'Redondilla · 8a 8b 8b 8a',kind:'consonante',pattern:['a','b','b','a'],intro:'La redondilla tiene cuatro octosílabos con rima consonante abba: el primer verso rima con el cuarto y el segundo con el tercero. Es una de las estrofas más usadas en el teatro y la poesía en español.',lines:['Llevo la voz en la mano','canto lo que el viento dice','y el eco que lo bendice','lo devuelve más lejano'],note:'Redondilla original del taller. «Mano / lejano» (familia a) y «dice / bendice» (familia b) coinciden desde la vocal tónica, incluidas las consonantes: rima consonante.'},
  {id:'cuarteta',label:'Cuarteta · 8a 8b 8a 8b',kind:'consonante',pattern:['a','b','a','b'],intro:'La cuarteta de arte menor tiene cuatro octosílabos con rima consonante abab, alternada: riman el primero con el tercero y el segundo con el cuarto. Con versos de once sílabas se la llama serventesio.',lines:['Baja la luna al camino','sobre el agua transparente','canta un grillo peregrino','junto al sauce, dulcemente'],note:'Cuarteta original del taller. «Camino / peregrino» y «transparente / dulcemente» son rimas consonantes alternadas.'}
 ]},
 {title:'Décima',sub:'DIEZ VERSOS · EL ARTE DE HILAR UNA IDEA',intro:'La décima espinela tiene diez octosílabos con rima consonante abbaaccddc: coinciden vocales y consonantes desde la tónica. Es central en distintas tradiciones de payada y canto a lo poeta.',pattern:['a','b','b','a','a','c','c','d','d','c'],lines:['Ya despierta la mañana','bajo el cielo del sendero','y conversa el guitarrero','con la luz de su ventana','una copla tan cercana','va buscando su camino','como busca su destino','cada voz de la memoria','para darle nueva historia','a la sombra de aquel pino'],note:'Décima original del taller: mañana / ventana / cercana; sendero / guitarrero; camino / destino / pino; memoria / historia. Tocá una letra para ver su familia de rimas.',violeta:true},
 {title:'Sextilla',sub:'SEIS VERSOS · EL PUENTE GAUCHESCO',intro:'Una sextilla reúne seis versos de arte menor. La hernandiana, característica del Martín Fierro, usa octosílabos y el esquema —aabba: el primero queda suelto. No todas las sextillas comparten esta rima.',pattern:['—','a','a','b','b','a'],lines:['Aquí me pongo a cantar','al compás de la vihuela,','que al hombre que lo desvela','una pena extraordinaria,','como el ave solitaria','con el cantar se consuela.'],note:'José Hernández, Martín Fierro (1872), comienzo del canto I. Obra de dominio público. «Vihuela / desvela / consuela» forman una familia y «extraordinaria / solitaria», otra. No confundir sextilla con sextina, una forma de estructura diferente.',variants:[
  {id:'hernandiana',label:'Sextilla hernandiana · 8— 8a 8a 8b 8b 8a'},
  {id:'aabccb',label:'Sextilla de rima cola · 8a 8a 8b 8c 8c 8b',kind:'consonante',pattern:['a','a','b','c','c','b'],intro:'Otra sextilla frecuente rima aabccb: dos pares seguidos y, entre ellos, un verso que se retoma al final. Todos los versos riman con alguno.',lines:['Se apaga el sol en la loma','vuela lenta la paloma','sobre la gente dormida','se enciende un fuego en la orilla','y la guitarra sencilla','despierta el alma dolida'],note:'Sextilla original del taller. «Loma / paloma», «orilla / sencilla» y «dormida / dolida» son rimas consonantes.'},
  {id:'manriquena',label:'Copla manriqueña · 8a 8b 4c 8a 8b 4c',kind:'consonante',meters:[8,8,4,8,8,4],pattern:['a','b','c','a','b','c'],intro:'La copla manriqueña, o de pie quebrado, alterna dos octosílabos con un verso corto de cuatro sílabas: 8a 8b 4c 8a 8b 4c. Debe su nombre a las Coplas por la muerte de su padre, de Jorge Manrique.',lines:['Sobre el techo del abuelo','canta un gallo en el alero','sin parar','sube el humo al alto cielo','y el mate pasa ligero','sin cesar'],note:'Copla manriqueña original del taller. «Abuelo / cielo» y «alero / ligero» riman en consonante; los versos cortos «parar / cesar» cierran cada mitad con la misma rima.'}
 ]},
 {title:'Seguidilla',sub:'7 + 5 + 7 + 5 · CAMBIO DE PASO',intro:'La seguidilla simple alterna heptasílabos y pentasílabos. Los versos pares suelen rimar. En la cueca chilena se combina con una copla inicial y un remate; al cantarse hay repeticiones y muletillas.',pattern:['—','a','—','a'],lines:['Por el sendero claro','canta la brisa','y se despierta el campo','con su sonrisa'],meters:[7,5,7,5],note:'Seguidilla original del taller. «Brisa / sonrisa» riman. La medida cambia entre versos: no todo el folklore está hecho de octosílabos.',variants:[
  {id:'simple',label:'Seguidilla simple · 7— 5a 7— 5a'},
  {id:'compuesta',label:'Seguidilla compuesta · 7— 5a 7— 5a + 5b 7— 5b',pattern:['—','a','—','a','b','—','b'],meters:[7,5,7,5,5,7,5],intro:'La seguidilla compuesta suma a la seguidilla simple un estribillo o bordón de tres versos: 5b 7— 5b. Los versos primero y último del bordón riman entre sí, en asonancia.',lines:['Por el sendero claro','canta la brisa','y se despierta el campo','con su sonrisa','Vuela la copla','sobre los campos verdes','como una rosa'],note:'Seguidilla compuesta original del taller. «Brisa / sonrisa» riman en la primera parte; «copla / rosa» comparten la asonancia o-a en el bordón.'}
 ]},
 {title:'Romance',sub:'UNA TIRADA · UNA HISTORIA QUE AVANZA',intro:'El romance encadena octosílabos sin un número fijo de versos. Los pares mantienen una misma rima asonante y los impares quedan libres. Sirve para narrar y vive también en romances tradicionales cantados.',pattern:['—','a','—','a','—','a'],lines:['Por el monte va la noche','con un aire de canción','un jinete cruza el valle','sin saber adónde voy','su guitarra va callada','pero canta el corazón'],note:'Fragmento original del taller, no letra tradicional. «Canción / voy / corazón» comparten asonancia ó. Una tirada puede continuar: estos seis versos no definen una estrofa cerrada.',variants:[
  {id:'octosilabo',label:'Romance · octosílabos'},
  {id:'heroico',label:'Romance heroico · endecasílabos',meter:11,intro:'El romance heroico usa versos de once sílabas en lugar de ocho. Conserva la rima asonante en los pares y los impares libres.',lines:['Salió el cantor al filo de la tarde','con la guitarra vieja entre los brazos','buscaba el rumbo que le dio el destino','y el polvo del camino en sus zapatos','la noche le mostraba su lucero','dejando un canto en cada rancho humano'],note:'Fragmento original del taller. «Brazos / zapatos / humano» comparten la asonancia á-o.'},
  {id:'romancillo',label:'Romancillo · hexasílabos',meter:6,intro:'El romancillo es un romance de versos cortos, de seis sílabas o menos. Mantiene la rima asonante en los pares y los impares libres.',lines:['Sale el sol temprano','por el campo verde','y la brisa sube','canta junto al puente','y se va el rocío','canta con la fuente'],note:'Fragmento original del taller. «Verde / puente / fuente» comparten la asonancia é-e en los versos pares.'}
 ]} ,
 {title:'Eneasílabo',sub:'NUEVE SÍLABAS · UN PASO MÁS',intro:'El eneasílabo tiene nueve sílabas métricas. Es un verso menos común que el octosílabo, pero muy cantable. Rubén Darío lo usó en «Canción de otoño en primavera», en estrofas de cuatro versos con rima consonante cruzada ABAB.',pattern:['a','b','a','b'],kind:'consonante',meter:9,lines:['Juventud, divino tesoro,','¡ya te vas para no volver!','Cuando quiero llorar, no lloro...','y a veces lloro sin querer.'],note:'Rubén Darío, «Canción de otoño en primavera» (Cantos de vida y esperanza, 1905), primera estrofa. Obra de dominio público. «Tesoro / lloro» y «volver / querer» riman en consonante; en «¡ya te vas para no volver!» ocho sílabas pronunciadas más una por el final agudo suman nueve.',variants:[
  {id:'cancion',label:'Canción de otoño · 9A 9B 9A 9B'},
  {id:'libre',label:'Cuarteta con rima en los pares · 9— 9a 9— 9a',kind:'asonante',pattern:['—','a','—','a'],intro:'Cuatro eneasílabos con rima asonante en los pares y los impares libres, como en el romance.',lines:['Va la tarde por el camino','cargada de luz y de sol','La guitarra duerme en el patio','y el viento le canta un adiós'],note:'Cuarteta original del taller. «Sol / adiós» comparten la asonancia ó.'}
 ]},
 {title:'Decasílabo',sub:'DIEZ SÍLABAS · DOS MITADES',intro:'El decasílabo tiene diez sílabas métricas y suele sentirse como dos mitades. Fue menos frecuente que el octosílabo o el endecasílabo, aunque Darío lo empleó en menor proporción. Aquí van dos estrofas posibles.',pattern:['a','b','a','b'],kind:'consonante',meter:10,lines:['Por el campo la brisa camina','y levanta su canto de sal','Una flor en el aire se inclina','con su luz de rocío total'],note:'Cuarteta original del taller. «Camina / inclina» y «sal / total» riman en consonante, en esquema alternado ABAB.',variants:[
  {id:'cuarteta',label:'Cuarteta de decasílabos · 10A 10B 10A 10B'},
  {id:'pares',label:'Cuarteta con rima en los pares · 10— 10a 10— 10a',kind:'asonante',pattern:['—','a','—','a'],intro:'Cuatro decasílabos con rima asonante en los pares y los impares libres.',lines:['Cae la tarde sobre el sembrado','y el arroyo susurra su luz','Pasa un tren por la orilla del cielo','y se pierde en la noche del sur'],note:'Cuarteta original del taller. «Luz / sur» comparten la asonancia u.'}
 ]},
 {title:'Dodecasílabo',sub:'DOCE SÍLABAS · SEIS Y SEIS',intro:'El dodecasílabo es el verso de doce sílabas métricas. Suele partirse en dos mitades de seis, con una pausa en el medio, y es frecuente en la canción popular, como en el tango «Malena» (Homero Manzi). No hay una estrofa única: aquí van dos formas posibles.',pattern:['—','a','b','a','b','a','b','a'],meter:12,lines:['Una luz amarilla tiembla en la esquina','y la noche se apoya sobre el farol','Un reloj marca tarde la misma calma','que ya nadie recuerda desde el adiós','Pasa un vuelo de sombra por la ventana','y otra vez me despierta tu voz de sol','La tarde se va yendo con mi esperanza','y el tango me la nombra como un perdón'],note:'Estrofa original del taller, no letra existente. Los versos pares terminan en palabras agudas (farol, adiós, sol, perdón) y comparten la asonancia ó; los impares 3, 5 y 7 (calma, ventana, esperanza) comparten á-a; el primero queda libre. Con un final agudo, once sílabas pronunciadas suman doce métricas. En «Malena», «bandoneón» y «alcohol» exigen leer dos vocales seguidas como una sola sílaba para llegar a doce; con hiato el verso mide trece.',variants:[
  {id:'ocho',label:'Estrofa de ocho · 12— 12a 12b 12a 12b 12a 12b 12a'},
  {id:'cuarteta',label:'Cuarteta de dodecasílabos · 12A 12B 12A 12B',kind:'consonante',pattern:['a','b','a','b'],intro:'Cuatro dodecasílabos con rima consonante alternada ABAB: riman el primero con el tercero y el segundo con el cuarto.',lines:['Una luz amarilla tiembla en la esquina','y la noche se apoya sobre el farol','Un vecino regresa por la colina','silbando un tango triste bajo aquel sol'],note:'Cuarteta original del taller. «Esquina / colina» y «farol / sol» riman en consonante.'}
 ]},
 {title:'Alejandrino',sub:'CATORCE SÍLABAS · SIETE Y SIETE',intro:'El alejandrino tiene catorce sílabas, partidas en dos hemistiquios de siete. Nació en la poesía medieval, la cuaderna vía del mester de clerecía en España, y volvió con fuerza en el modernismo, con Rubén Darío, que lo difundió en toda Hispanoamérica.',pattern:['a','a','b','c','c','b'],kind:'consonante',meter:14,lines:['La princesa está triste... ¿Qué tendrá la princesa?','Los suspiros se escapan de su boca de fresa,','que ha perdido la risa, que ha perdido el color.','La princesa está pálida en su silla de oro,','está mudo el teclado de su clave sonoro,','y en un vaso, olvidada, se desmaya una flor.'],note:'Rubén Darío, «Sonatina» (Prosas profanas, 1896). Obra de dominio público. Seis alejandrinos con rima consonante AABCCB. Algunos versos, como «silla de oro», exigen leer separadas las vocales de «de oro» (dialefa) para llegar a catorce; con sinalefa el motor cuenta trece.',variants:[
  {id:'sonatina',label:'Sonatina · 14A 14A 14B 14C 14C 14B'},
  {id:'cuaderna',label:'Cuaderna vía · 14A 14A 14A 14A',pattern:['a','a','a','a'],intro:'La cuaderna vía agrupa cuatro alejandrinos con una sola rima consonante: AAAA. Es la estrofa del mester de clerecía, con obras como Berceo y el Libro de Alexandre.',lines:['Salió el cantor al filo de aquella tarde fría','llevando en su guitarra la luz del mediodía','y el viento de los campos le daba compañía','mientras la noche entera se hacía melodía'],note:'Cuaderna vía original del taller. Los cuatro versos riman en consonante en -ía.'}
 ]},
 {title:'Quintilla',sub:'CINCO VERSOS · DOS RIMAS EN JUEGO',intro:'La quintilla reúne cinco octosílabos con rima consonante y sólo dos rimas, a y b. Dos reglas la definen: no riman tres versos seguidos y los dos últimos no forman pareado. De ahí salen cinco combinaciones; elegí una en el menú.',pattern:['a','b','a','b','a'],kind:'consonante',lines:['Baja el pastor del sendero','con un cielo sin la luna','lo sigue un perro ligero','la noche abre su laguna','y se duerme el mundo entero'],note:'Quintilla original del taller. «Sendero / ligero / entero» y «luna / laguna» riman en consonante: coinciden vocales y consonantes desde la tónica. Con rimas a y b, el esquema ababa alterna una y otra hasta cerrar con la primera.',variants:[
  {id:'ababa',label:'Quintilla · 8a 8b 8a 8b 8a'},
  {id:'aabab',label:'Quintilla · 8a 8a 8b 8a 8b',pattern:['a','a','b','a','b'],intro:'En la quintilla aabab abren dos versos seguidos con la rima a; después alternan b, a, b. Es la que mejor deja respirar a la segunda rima.',lines:['Canta un gallo en la ventana','y despierta la mañana','con su cantar atrevido','se estira el sol con desgana','el día nace vestido'],note:'Quintilla original del taller. «Ventana / mañana / desgana» y «atrevido / vestido» riman en consonante.'},
  {id:'abaab',label:'Quintilla · 8a 8b 8a 8a 8b',pattern:['a','b','a','a','b'],intro:'En la quintilla abaab la rima a vuelve en el tercero y el cuarto verso, dos seguidos, y la b cierra la estrofa.',lines:['Pasa un tren por la llanura','y se pierde en lontananza','dejando su estela oscura','un silbido que perdura','lleva en su luz la esperanza'],note:'Quintilla original del taller. «Llanura / oscura / perdura» y «lontananza / esperanza» riman en consonante.'},
  {id:'abbab',label:'Quintilla · 8a 8b 8b 8a 8b',pattern:['a','b','b','a','b'],intro:'En la quintilla abbab los versos centrales riman entre sí, como en una redondilla, y la estrofa cierra con otro verso de rima b.',lines:['Se acabó la algarabía','baja la noche al portal','y enfría el viento invernal','calla la gran melodía','la luna sube al nogal'],note:'Quintilla original del taller. «Algarabía / melodía» y «portal / invernal / nogal» riman en consonante.'},
  {id:'aabba',label:'Quintilla · 8a 8a 8b 8b 8a',pattern:['a','a','b','b','a'],intro:'En la quintilla aabba dos pares seguidos, aa y bb, se cierran con un verso que retoma la rima a. Aunque acaba en a, no termina en pareado.',lines:['Vuela el canto con el viento','sube alto mi pensamiento','cruza el cerro, el pajonal','baja al pozo, al manantial','y regresa en un lamento'],note:'Quintilla original del taller. «Viento / pensamiento / lamento» y «pajonal / manantial» riman en consonante.'}
 ]}
];

// Mide cada verso y agrupa los finales que riman; solo informa, no corrige ni exige nada.
function detect(text){
 // Una línea en blanco separa estrofas: cada verso recuerda la suya.
 let stanza=0,gap=false;
 const lines=[];
 for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line){gap=lines.length>0;continue;}if(gap){stanza++;gap=false;}lines.push({line,stanza});}
 const rows=lines.map(({line,stanza})=>{
  const reading=readLine(line),last=reading.last;
  // La tónica se ubica en el texto tal como se escribió: la lectura con tildes restauradas conserva los mismos índices.
  const stress=last&&last.tonic?last.stresses.at(-1):-1,start=stress<0?0:last.index+last.syllables.slice(0,stress).join('').length;
  return {line,stanza,count:reading.words.length?reading.count:0,pronounced:reading.groups.length,cons:last&&rhymeOf(last,'consonante')?.key,ason:last&&rhymeOf(last,'asonante')?.key,letter:'—',consLetter:'—',kind:'',tonic:stress<0?null:[start,start+last.syllables[stress].length]};
 });
 const groups=new Map();
 rows.forEach((r,i)=>{if(r.ason)groups.set(r.ason,[...(groups.get(r.ason)||[]),i]);});
 let next=0;
 for(const i of rows.keys()){
  const members=groups.get(rows[i].ason);
  if(!members||members.length<2||rows[i].letter!=='—')continue;
  const letter=String.fromCharCode(97+next++%26),kind=members.every(j=>rows[j].cons===rows[i].cons)?'consonante':'asonante';
  members.forEach(j=>{rows[j].letter=letter;rows[j].kind=kind;});
 }
 // Solo para reconocer formas: la rima consonante separa familias que la asonancia fusiona.
 const byCons=new Map();
 rows.forEach((r,i)=>{if(r.cons)byCons.set(r.cons,[...(byCons.get(r.cons)||[]),i]);});
 next=0;
 for(const [i,r] of rows.entries()){
  const members=byCons.get(r.cons);
  if(!members||members.length<2||r.consLetter!=='—')continue;
  const letter=String.fromCharCode(97+next++%26);
  members.forEach(j=>{rows[j].consLetter=letter;});
 }
 return rows;
}
// ¿Las letras detectadas responden al esquema? Cada familia del esquema debe ser una letra propia; los versos libres no pueden rimar con ellas.
function fits(rows,pattern,meterOf,tolerance,key){
 const map=new Map(),used=new Set();let approximate=false;
 for(const [i,r] of rows.entries()){
  const family=pattern[i%pattern.length],diff=Math.abs(r.count-meterOf(i));
  if(diff>tolerance)return null;
  if(diff)approximate=true;
  if(family==='—')continue;
  if(r[key]==='—')return null;
  if(map.has(family)){if(map.get(family)!==r[key])return null;}
  else{if(used.has(r[key]))return null;map.set(family,r[key]);used.add(r[key]);}
 }
 for(const [i,r] of rows.entries())if(pattern[i%pattern.length]==='—'&&used.has(r[key]))return null;
 return {approximate};
}
// Devuelve las formas conocidas (con sus variantes) que coinciden con el texto, las exactas primero.
function matchForms(rows,forms){
 if(!rows.length)return [];
 const found=[];
 for(const form of forms)for(let v=0;v<Math.max(form.variants?.length||0,1);v++){
  const f=variantOf(form,v),n=rows.length;
  const romance=f.title==='Romance',pattern=romance?['—','a']:f.pattern,size=pattern.length;
  if(romance?n<4:n%size)continue;
  const chunks=romance?[rows]:Array.from({length:n/size},(_,k)=>rows.slice(k*size,(k+1)*size));
  const attempt=tolerance=>{for(const key of ['letter','consLetter']){const out=chunks.map(c=>fits(c,pattern,i=>meterAt(f,i),tolerance,key));if(out.every(Boolean))return out;}return null;};
  const result=attempt(0)||attempt(1);
  if(!result)continue;
  const name=f.variants?.[v]?.label.split(' · ')[0]||form.variants?.[v]?.label.split(' · ')[0]||f.title;
  if(!found.some(x=>x.name===name))found.push({form:forms.indexOf(form),variant:v,name,stanzas:chunks.length,approximate:result.some(r=>r.approximate),scheme:romance?null:pattern.map((p,i)=>meterAt(f,i)+p).join(' ')});
 }
 return found.sort((a,b)=>a.approximate-b.approximate);
}

// Fichas (pestañas) compartidas por Libre, A medida y Composición: el marcado es `.fichas > .ficha > .ficha-name [+ .ficha-x]` y un `.ficha-add` opcional;
// el cuerpo que cuelga de ellas lleva `.ficha-cuerpo`. Con varias filas, la de la ficha activa queda abajo, pegada al cuerpo.
// Las filas se arman desde el final (la última se llena primero).
// El botón + va siempre al final de la última fila, por eso toda fila le deja lugar. Devuelve la función que hay que llamar tras cambiar la ficha activa o rehacer el marcado.

const $=s=>page.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// La solapa y la variante activas viven en el hash (#seguidilla/compuesta) para que una recarga vuelva al mismo lugar.
const slug=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,'-');
let ready=false,active={form:0},variantNow=0;
function writeHash(){
 if(!ready)return;
 const tab=active.tool?slug(tools.find(([id])=>id===active.tool)[1]):slug(forms[active.form].title),id=!active.tool&&variantNow>0&&forms[active.form].variants?.[variantNow]?.id;
 try{history.replaceState(null,'',`#${tab}${id?`/${id}`:''}`);}catch{}
}
if(mode==='campo'){
 loadRegion();
 mountCampo(page,{icons, regionPrefs, suggestRhymes, forms, variantOf, meterAt, loadRegion, wordInfo, rhymeOf, rhymeWords, restoreTilde, readLine, detect, mountComposer, mountFichas, userVocabulary, addUserVocabulary, onRegionChange, cleanups, controller});
 return ()=>{controller.abort();cleanups.forEach(cleanup=>cleanup());page.replaceChildren();};
}
if(mode==='libre'){
 loadRegion();
 mountLibre(page,{icons,detect,matchForms,forms,readLine,esc,mountFichas,notebookSettings,cleanups,onRegionChange});
 return ()=>{controller.abort();cleanups.forEach(cleanup=>cleanup());page.replaceChildren();};
}
const composer=mountComposer($('#composition-editor'),forms,{lab:true,onSelect:(f,i,v)=>{if(active.tool||i!==active.form)return;variantNow=v;writeHash();}});
const switcher=$('#form-switch'),layoutTabs=mountFichas(switcher);
const tools=[];
// Las solapas van de la medida más corta a la más larga; a igual medida, de la estrofa más breve a la más extensa.
const byLength=forms.map((f,i)=>i).sort((a,b)=>(forms[a].meters?.[0]||forms[a].meter||8)-(forms[b].meters?.[0]||forms[b].meter||8)||forms[a].pattern.length-forms[b].pattern.length);
switcher.innerHTML=byLength.map(i=>`<div class="ficha${i===0?' on':''}"><button class="ficha-name" data-form="${i}" aria-pressed="${i===0}">${forms[i].title}</button></div>`).join('')+tools.map(([id,title])=>`<div class="ficha"><button class="ficha-name" data-tool="${id}" aria-pressed="false">${title}</button></div>`).join('');layoutTabs();
function show(button){
 switcher.querySelectorAll('button').forEach(x=>{const on=x===button;x.parentElement.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});layoutTabs();
 const tool=button.dataset.tool;
 $('#composition-editor').hidden=!!tool;
 tools.forEach(([id])=>{$(`#${id}-panel`).hidden=tool!==id;});
}
function go(button,variant){
 active=button.dataset.tool?{tool:button.dataset.tool}:{form:+button.dataset.form};
 if(!active.tool)composer.select(active.form,variant);
 show(button);writeHash();
}
switcher.onclick=e=>{const b=e.target.closest('button');if(b)go(b);};
try{
 const [tab,variant]=decodeURIComponent(location.hash.slice(1)).split('/');
 const button=[...switcher.querySelectorAll('button')].find(b=>slug(b.textContent)===tab);
 if(button){const i=button.dataset.form===undefined?-1:forms[+button.dataset.form].variants?.findIndex(v=>v.id===variant);go(button,i>0?i:undefined);}
}catch{}
// «Libre» manda el texto detectado a la solapa de su forma: llega por localStorage y se consume una sola vez.
try{
 const sent=JSON.parse(localStorage.getItem('el-silbador-metrica-libre-envio')||'null');
 if(sent){
  localStorage.removeItem('el-silbador-metrica-libre-envio');
  const button=switcher.querySelector(`[data-form="${+sent.form}"]`);
  if(button&&Array.isArray(sent.lines)){go(button,+sent.variant>0?+sent.variant:undefined);composer.load(+sent.form,+sent.variant||0,sent.lines.map(String));}
 }
}catch{}
ready=true;writeHash();

 return ()=>{controller.abort();cleanups.forEach(cleanup=>cleanup());page.replaceChildren();};
}
