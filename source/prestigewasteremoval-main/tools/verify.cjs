const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['tools','node_modules','.git'].includes(e.name)?[]:walk(path.join(dir,e.name))):[path.join(dir,e.name)])}
const all=walk(root),pages=all.filter(f=>f.endsWith('.html')),missing=new Map();let references=0;
function check(u,source){u=u.replaceAll('&amp;','&');if(!u||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(u))return;let pathname=u.split(/[?#]/)[0];if(!pathname)return;let target=pathname.startsWith('/')?path.join(root,decodeURI(pathname)):path.resolve(path.dirname(source),decodeURI(pathname));references++;if(!fs.existsSync(target))missing.set(u,path.relative(root,source));}
for(const f of pages){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/\b(?:href|src|action)=["']([^"']+)["']/g))check(m[1],f);for(const m of s.matchAll(/srcset="([^"]+)"/g))for(const item of m[1].split(','))check(item.trim().split(/\s+/)[0],f);for(const m of s.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g))check(m[1],f)}
const report={pages:pages.length,references,missing:[...missing]};console.log(JSON.stringify(report,null,2));if(missing.size)process.exitCode=1;
