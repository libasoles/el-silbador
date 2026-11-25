export function mountRhymeTips(root,list,{esc,familyClass,listen,message}) {
 // Explicación del indicador de rima: con el cursor aparece al pasar por encima; sin hover (celular), al tocarlo. Muestra el indicador real, con su color.
 let badgeTip=null,badgeOf=null;
 const hideBadgeTip=()=>{badgeTip?.remove();badgeTip=badgeOf=null;};
 function showBadgeTip(badge){
  hideBadgeTip();const family=badge.dataset.rhymeFamily;
  badgeTip=document.createElement('div');badgeTip.className='badge-tip';badgeTip.setAttribute('role','tooltip');badgeOf=badge;
  badgeTip.innerHTML=message?message(badge):family==='—'?'Verso libre: no requiere rima':`Requiere rimar con otros <span class="rhyme-badge ${familyClass(family)}" aria-hidden="true">${esc(family)}</span>`;
  root.appendChild(badgeTip);
  const b=badge.getBoundingClientRect(),w=badgeTip.offsetWidth,h=badgeTip.offsetHeight;
  badgeTip.style.left=Math.max(8,Math.min(window.innerWidth-w-8,b.right-w))+'px';
  badgeTip.style.top=(b.top-h-8>8?b.top-h-8:b.bottom+8)+'px';
 }
 list.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const badge=e.target.closest?.('.rhyme-badge');if(badge&&badge!==badgeOf)showBadgeTip(badge);});
 list.addEventListener('pointerout',e=>{if(e.pointerType==='mouse'&&e.target.closest?.('.rhyme-badge'))hideBadgeTip();});
 list.addEventListener('click',e=>{
  const badge=e.target.closest?.('.rhyme-badge');if(!badge)return;
  const again=badgeOf===badge;hideBadgeTip();if(!again)showBadgeTip(badge);
 });
 list.addEventListener('focusout',hideBadgeTip);
 listen(document,'pointerdown',e=>{if(badgeTip&&!badgeTip.contains(e.target)&&!badgeOf?.contains(e.target))hideBadgeTip();});
 listen(document,'keydown',e=>{if(e.key==='Escape')hideBadgeTip();});
 listen(window,'scroll',hideBadgeTip,{passive:true});listen(window,'resize',hideBadgeTip);

 return hideBadgeTip;
}
