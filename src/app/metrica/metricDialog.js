// Shared explanation and examples for the metric and free verse notebooks.
export function metricDialogMarkup(scan, icons) {
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const metricEquality=(left,right)=>`<span class="metric-equality"><code>${left}</code><span>son iguales a</span><code>${right}</code></span>`;
 return `<dialog id="metric-dialog" aria-labelledby="metric-title"><div class="suggest-head"><h3 id="metric-title">Sílabas métricas</h3><button class="close-x" id="metric-close" type="button" aria-label="Cerrar explicación de métrica">${icons["x"]}</button></div><div id="metric-current" class="metric-report" role="status"></div><h4 class="metric-subtitle">¿Qué es una sílaba métrica?</h4><p>Es la unidad del conteo de sílabas en los versos.</p><p>No todas las sílabas cuentan igual. La última sílaba de un verso, si va acentuada, vale por dos.</p><div class="metric-examples">${[
 ['agudo','Por el valle va mi voz',`La última sílaba lleva el acento:<br>${metricEquality('7 pronunciadas + 1','8 métricas.')} Ese +1 es una convención: no hay una sílaba extra para decir.`],
 ['grave','Por el valle va mi canto',`Queda una sílaba después del último acento:<br>${metricEquality('8 pronunciadas','8 métricas.')} Es la referencia; no se ajusta.`],
 ['esdrújulo','Por el valle van los pájaros',`Quedan dos sílabas después del último acento:<br>${metricEquality('9 pronunciadas − 1','8 métricas.')} Se dicen todas las sílabas, aunque el cómputo reste una.`]
 ].map(([type,verse,why])=>`<article><h4>Final ${type}</h4><p class="metric-example-syllables">${(()=>{const groups=scan(verse).groups,stress=groups.flat().findLastIndex(g=>g.tonic);let k=0;return groups.map((group,n)=>`<span class="metric-syl"><span>${group.map(g=>k++===stress?`<b>${esc(g.text)}</b>`:esc(g.text)).join('‿')}</span><small>${n+1}</small></span>`).join('');})()}</p>${why.split(/(?<=\.) |(?<=<\/span>) /).map(t=>`<p>${t}</p>`).join('')}</article>`).join('')}</div><p>Los tres ejemplos tienen el último acento en el lugar 7 y cuentan 8 sílabas métricas.</p></dialog>`;
}

export function mountMetricDialog(root, listen) {
 const dialog=root.querySelector('#metric-dialog');
 let trigger;
 const close=(refocus=true)=>{if(dialog.close)dialog.close();else dialog.removeAttribute('open');if(refocus)trigger?.focus();};
 listen(dialog.querySelector('#metric-close'),'click',close);
 listen(document,'pointerdown',event=>{if(dialog.hasAttribute('open')&&!dialog.contains(event.target)&&!event.target.closest('[data-metric-help],.detect-count'))close(false);});
 listen(dialog,'click',event=>{if(event.target===dialog)close();});
 listen(dialog,'cancel',event=>{event.preventDefault();close();});
 listen(document,'keydown',event=>{if(event.key==='Escape'&&dialog.hasAttribute('open')){event.preventDefault();close();}});
 return {open(button){trigger=button;if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}};
}
