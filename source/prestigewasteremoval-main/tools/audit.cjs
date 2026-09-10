const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['wp-content','wp-includes','node_modules','.git','tools'].includes(e.name)?[]:walk(path.join(dir,e.name))):e.name.endsWith('.html')?[path.join(dir,e.name)]:[])}
const pages=walk(root),missing=new Map(),links=new Set(),widgets=new Set();
for(const p of pages){const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/(?:href|src|action)=["']([^"']+)["']/g)){const u=m[1];if(u.startsWith('/')&&!u.startsWith('//')){let f=path.join(root,decodeURI(u.split(/[?#]/)[0]));if(!fs.existsSync(f))missing.set(u,(missing.get(u)||0)+1)}if(!u.startsWith('/wp-'))links.add(u)}for(const m of s.matchAll(/data-widget_type="([^"]+)"/g))widgets.add(m[1]);}
console.log(JSON.stringify({pages:pages.length,missing:[...missing],widgets:[...widgets]},null,2));
