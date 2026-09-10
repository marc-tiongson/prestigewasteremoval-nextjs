(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const config = window.STATIC_SITE_CONFIG || {};
  const toUrl = path => new URL(path, root).href;
  let openPanel = null, opener = null;
  function closePanel() {
    if (!openPanel) return;
    openPanel.setAttribute('aria-hidden', 'true'); openPanel.inert = true;
    document.body.classList.remove('e-off-canvas__no-scroll');
    openPanel = null; opener?.focus();
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('a[href*="elementor-action"]');
    if (action) {
      const hash = decodeURIComponent(action.hash);
      if (hash.includes('off_canvas:')) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (hash.includes('off_canvas:close')) { closePanel(); return; }
        const encoded = hash.split('settings=')[1];
        let id; try { id = JSON.parse(atob(encoded)).id; } catch { return; }
        const panel = document.getElementById('off-canvas-' + id);
        if (panel) { opener = action; openPanel = panel; panel.inert = false; panel.setAttribute('aria-hidden','false'); document.body.classList.add('e-off-canvas__no-scroll'); panel.querySelector('a,button,input')?.focus(); }
      }
    } else if (event.target.closest('.e-off-canvas__overlay')) { event.preventDefault(); event.stopImmediatePropagation(); closePanel(); }
    const toggle = event.target.closest('.elementor-menu-toggle');
    if (toggle) {
      event.preventDefault(); event.stopImmediatePropagation();
      const isOpen = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(isOpen)); toggle.classList.toggle('elementor-active', isOpen);
      const menu = toggle.parentElement.querySelector('nav.elementor-nav-menu--dropdown');
      if (menu) { menu.classList.toggle('static-menu-open', isOpen); menu.setAttribute('aria-hidden', String(!isOpen)); menu.inert = !isOpen; menu.querySelectorAll('a').forEach(a=>a.tabIndex=isOpen?0:-1); }
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closePanel(); document.querySelectorAll('.elementor-menu-toggle[aria-expanded="true"]').forEach(t=>t.click()); }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.elementor-menu-toggle')) { event.preventDefault(); event.target.click(); }
    if (event.key === 'Tab' && openPanel) {
      const items = [...openPanel.querySelectorAll('a[href],button,input,textarea,select,[tabindex="0"]')].filter(e=>e.getClientRects().length);
      const first=items[0], last=items.at(-1);
      if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
    }
  }, true);
  document.addEventListener('submit', async event => {
    const form=event.target;
    if (form.matches('[role="search"],.search-form,.wp-block-search')) {
      event.preventDefault(); event.stopImmediatePropagation();
      const query = new FormData(form).get('s') || '';
      location.href=toUrl('index.html?s='+encodeURIComponent(query)); return;
    }
    if (!form.matches('[data-static-form]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    const newsletter=form.dataset.staticForm==='newsletter';
    const endpoint=newsletter?config.newsletterEndpoint:config.contactEndpoint;
    const status=form.querySelector('.static-form-status');
    if (form.dataset.sending) return;
    if (!endpoint) {
      const fields=[...form.elements].filter(e=>e.name&&e.type!=='hidden'&&e.type!=='submit');
      const body=fields.map(e=>(e.labels?.[0]?.textContent.trim()||e.placeholder||e.name)+': '+e.value).join('\n');
      const href='mailto:'+config.contactEmail+'?subject='+encodeURIComponent(newsletter?'Newsletter subscription request':'Website contact request')+'&body='+encodeURIComponent(body);
      status.textContent='Your email draft is ready. Send it from your email app to complete your request. ';
      const link=document.createElement('a'); link.href=href; link.textContent='Open email draft';status.append(link); link.click(); return;
    }
    const button=form.querySelector('[type="submit"]'); form.dataset.sending='true'; button.disabled=true; status.textContent='Sending…';
    try {
      const data=new FormData(form); data.set('form_type',form.dataset.staticForm);
      const response=await fetch(endpoint,{method:'POST',body:data,headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Delivery failed');
      status.textContent=newsletter?'Your subscription request was sent.':'Your message was sent. Thank you.';form.reset();
    } catch { status.textContent='Your request could not be sent. Please try again or email '+config.contactEmail+'.'; }
    finally { delete form.dataset.sending; button.disabled=false; }
  }, true);
  function init() {
    document.querySelectorAll('[data-static-form]').forEach(form=>{
      const endpoint=form.dataset.staticForm==='newsletter'?config.newsletterEndpoint:config.contactEndpoint;
      if(endpoint)form.querySelector('.static-form-note').textContent='';
    });
    const params=new URLSearchParams(location.search);
    if (!params.has('s')) return;
    const query=params.get('s').trim();
    const section=document.createElement('section');section.className='static-search-results';section.id='search-results';
    const heading=document.createElement('h1');heading.textContent=query?'Search results for “'+query+'”':'Search this website';section.append(heading);
    const form=document.createElement('form');form.setAttribute('role','search');
    const input=document.createElement('input');input.type='search';input.name='s';input.value=query;input.setAttribute('aria-label','Search website');
    const button=document.createElement('button');button.textContent='Search';form.append(input,button);section.append(form);
    const words=query.toLowerCase().split(/\s+/).filter(Boolean);
    const results=words.length?(window.STATIC_SEARCH_INDEX||[]).filter(p=>words.every(w=>(p.title+' '+p.text).toLowerCase().includes(w))):[];
    const summary=document.createElement('p');summary.textContent=query?(results.length?results.length+' results':'No results found. Try another search.'):'Enter a word or phrase.';section.append(summary);
    results.forEach(p=>{const article=document.createElement('article'),h=document.createElement('h2'),a=document.createElement('a');a.href=toUrl(p.url);a.textContent=p.title;h.append(a);article.append(h);section.append(article)});
    const content=document.querySelector('#content')||document.querySelector('main');if(content){content.replaceChildren(section)}else document.body.append(section);
    document.title='Search | Prestige Waste Removal';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
