// Shared paper tabs for metric forms, free texts and semantic compositions.
export function mountNotebookTabs(box, { signal, onCleanup }) {
 let previousWidth=0;
 function layout(){
  try{
   const gap=4,avail=box.clientWidth;if(!avail)return;
   if(avail!==previousWidth){delete box._rows;previousWidth=avail;}
   const plus=box.querySelector(':scope>.ficha-add'),room=avail-(plus?plus.getBoundingClientRect().width+gap:0);
   const items=[...box.querySelectorAll(':scope>.ficha')];
   items.forEach((el,i)=>{if(el.dataset.i===undefined)el.dataset.i=i;});
   items.sort((a,b)=>a.dataset.i-b.dataset.i);
   const widthOf=el=>el.getBoundingClientRect().width,fits=r=>r.reduce((n,el)=>n+widthOf(el),0)+gap*(r.length-1)<=room||r.length===1;
   // Si la ficha activa ya está en la última fila, la distribución no cambia: sólo se la selecciona.
   let lines;
   if(box._rows?.flat().length===items.length){
    const cand=box._rows.map(r=>r.map(i=>items.find(el=>el.dataset.i===i)));
    if(cand.every(r=>r.every(Boolean)&&fits(r))&&cand.at(-1).some(el=>el.classList.contains('on')))lines=cand;
   }
   if(!lines){
    // La ficha activa va al final de la secuencia: queda en la última fila y las que no caben junto a ella suben.
    const seq=[...items.filter(el=>!el.classList.contains('on')),...items.filter(el=>el.classList.contains('on'))];
    let row=[],used=0;lines=[];
    for(const el of seq.toReversed()){
     const width=widthOf(el);
     if(row.length&&used+gap+width>room){lines.push(row);row=[];used=0;}
     used+=(row.length?gap:0)+width;row.unshift(el);
    }
    lines.push(row);lines.reverse();
   }
   box._rows=lines.map(r=>r.map(el=>el.dataset.i));
   const signature=box._rows.map(r=>r.join(',')).join('|');
   if(box.dataset.layout===signature)return;
   box.dataset.layout=signature;
   const focused=document.activeElement;
   box.querySelectorAll('.ficha-break').forEach(b=>b.remove());
   lines.forEach((r,n)=>{if(n){const br=document.createElement('span');br.className='ficha-break';br.setAttribute('aria-hidden','true');box.appendChild(br);}r.forEach(el=>{el.dataset.row=n;box.appendChild(el);});});
   if(plus){plus.dataset.row=lines.length-1;box.appendChild(plus);}
   // Cada cuerpo se dibuja con dos cajas: la que queda bajo las fichas de su fila (sin borde) y la que sobra hacia la derecha (con borde y sombra de papel).
   const left=box.getBoundingClientRect().left;
   box.querySelectorAll('.ficha-break').forEach((br,n)=>{const last=[...lines[n+1],...(plus&&n+1===lines.length-1?[plus]:[])].at(-1);br.style.setProperty('--a',Math.round(last.getBoundingClientRect().right-left)+'px');});
   if(focused&&document.activeElement!==focused&&box.contains(focused))focused.focus({preventScroll:true});
  }catch{}
 }
 const relayout=()=>{delete box.dataset.layout;layout();};
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(layout);observer.observe(box);onCleanup(()=>observer.disconnect());}
 document.fonts?.ready.then(()=>{if(!signal.aborted)relayout();});
 return relayout;
}

