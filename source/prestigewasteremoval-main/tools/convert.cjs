const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
function pages(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['wp-content','wp-includes','node_modules','tools','.git','static'].includes(e.name)?[]:pages(path.join(dir,e.name))):e.name==='index.html'?[path.join(dir,e.name)]:[])}
const files=pages(root), originals=path.join(__dirname,'original');
for(const f of files){const b=path.join(originals,path.relative(root,f));fs.mkdirSync(path.dirname(b),{recursive:true});if(!fs.existsSync(b))fs.copyFileSync(f,b)}
const ids={};for(const f of files){const s=fs.readFileSync(path.join(originals,path.relative(root,f)),'utf8');const id=s.match(/(?:page-id-|postid-)(\d+)/)?.[1];if(id)ids[id]='/'+path.relative(root,f).replaceAll('\\','/').replace(/index.html$/,'')}
function local(url,file){if(!url.startsWith('/')||url.startsWith('//'))return url;let [pathname,tail='']=url.split(/(?=[?#])/s);if(pathname==='/service/portable-toilets/')pathname='/services/';else if(pathname.startsWith('/service/'))pathname='/blog'+pathname;let target=path.join(root,pathname);if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');return (path.relative(path.dirname(file),target).replaceAll('\\','/')||'index.html')+tail}
for(const f of files){let s=fs.readFileSync(path.join(originals,path.relative(root,f)),'utf8');
 s=s.replace(/<link\b[^>]*(?:type="application\/(?:rss\+xml|rsd\+xml)"|rel="(?:pingback|shortlink)"|rel="https:\/\/api\.w\.org\/")[^>]*>/g,'');
 s=s.replace(/<script\b[^>]*id="breeze-prefetch-js"[^>]*>.*?<\/script>/gs,'');
 s=s.replace(/https?:\/\/wordpress-1285337-4670981\.cloudwaysapps\.com/g,'');
 s=s.replace(/href="\/\?p=(\d+)"/g,(m,id)=>`href="${ids[id]||'/blog/'}"`);
 s=s.replace(/href="\/blog\/2025\/04\/"/g,'href="/blog/category/blog/"');
 s=s.replace(/<a\b([^>]*?)href="#"([^>]*)>([\s\S]*?)<\/a>/g,(m,a,b,body)=>{const text=body.replace(/<[^>]+>/g,' ').trim();const target=/discover|learn|read more/i.test(text)?'/about-us/':'/contact-us/#contact-form';return `<a${a}href="${target}"${b}>${body}</a>`});
 s=s.replace(/(<a\b[^>]*href="[^"]+)#respond"/g,'$1"');
 let formIndex=0;
 s=s.replace(/<form\b[^>]*class="elementor-form"[\s\S]*?<\/form>/g,form=>{const n=++formIndex;const newsletter=!form.includes('<textarea');form=form.replace(/<input\b[^>]*type="hidden"[^>]*>/g,'').replace(/\b(id|for)="(form-field-[^"]+)"/g,(_,attr,id)=>`${attr}="${id}-${n}"`).replace(/ pattern="[^"]*"/g,'');form=form.replace('<form ',`<form data-static-form="${newsletter?'newsletter':'contact'}" `).replace('method="post"','method="post" action="#"').replace('aria-label="New Form"',`aria-label="${newsletter?'Newsletter signup':'Contact request'}"`);return form.replace('</form>',`<p class="static-form-note">${newsletter?'Request a newsletter subscription':'Send your message'} using your email app.</p><p class="static-form-status" role="status" aria-live="polite"></p></form>`)});
 if(f.includes('contact-us'))s=s.replace('<form data-static-form="contact"','<form id="contact-form" data-static-form="contact"');
 s=s.replace(/(<span class="elementor-icon-list-text">)(contactus@prestigewasteremoval\.com)(<\/span>)/g,'$1<a href="mailto:$2">$2</a>$3');
 s=s.replace(/(<span class="elementor-icon-list-text">)(\+1-\(246\) 333-0089)(<\/span>)/g,'$1<a href="tel:+12463330089">$2</a>$3');
 s=s.replace(/((?:href|src|action)=(["']))(\/[^"']*)\2/g,(m,start,q,url)=>start+local(url,f)+q);
 s=s.replace(/(srcset=")([^"]+)(")/g,(m,a,v,b)=>a+v.replace(/\/wp-content\/[^\s,]+/g,u=>local(u,f))+b);
 s=s.replace(/url\((["']?)(\/[^)'"\s]+)\1\)/g,(m,q,u)=>`url(${q}${local(u,f)}${q})`);
 const prefix=path.relative(path.dirname(f),root).replaceAll('\\','/');const base=prefix?prefix+'/':'./';
 s=s.replaceAll('\\/wp-content\\/',base+'wp-content/').replaceAll('\\/wp-includes\\/',base+'wp-includes/');
 s=s.replace('</head>',`<link rel="stylesheet" href="${base}static/site.css"><script src="${base}static/config.js"></script><script defer src="${base}static/search-index.js"></script><script defer src="${base}static/site.js"></script></head>`);
 fs.writeFileSync(f,s);
}
const index=files.filter(f=>!/[\\/]author[\\/]|[\\/]home-v2[\\/]|[\\/]category[\\/]/.test(f)).map(f=>{const s=fs.readFileSync(f,'utf8');const body=(s.match(/<main\b[\s\S]*?<\/main>/)?.[0]||s.match(/<div[^>]*data-elementor-type="wp-page"[\s\S]*?(?=data-elementor-type="footer")/)?.[0]||s);return {url:path.relative(root,f).replaceAll('\\','/'),title:s.match(/<title>(.*?)<\/title>/s)?.[1]||'',text:body.replace(/<(script|style)\b[\s\S]*?<\/\1>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,40000)}});
fs.mkdirSync(path.join(root,'static'),{recursive:true});fs.writeFileSync(path.join(root,'static/search-index.js'),'window.STATIC_SEARCH_INDEX='+JSON.stringify(index)+';\n');
console.log(`Converted ${files.length} pages; originals retained in tools/original.`);
