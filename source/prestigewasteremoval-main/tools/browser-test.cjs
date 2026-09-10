const fs=require('fs'),path=require('path');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const tabs=await (await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let seq=0;const pending=new Map(),errors=[],failed=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)failed.push({url:m.params.response.url,status:m.params.response.status})};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const run=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:8080/'});await delay(3500);
fs.mkdirSync(path.join(__dirname,'test-results'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'test-results/desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
console.log('Desktop',await run(`JSON.stringify({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),forms:document.querySelectorAll('[data-static-form]').length})`));
await run(`document.querySelector('a[href*="off_canvas%3Aopen"]').click()`);await delay(200);
console.log('Panel open',await run(`document.querySelector('.e-off-canvas').getAttribute('aria-hidden')==='false'&&!document.querySelector('.e-off-canvas').inert`));
await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
console.log('Panel closed',await run(`document.querySelector('.e-off-canvas').getAttribute('aria-hidden')==='true'`));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(600);
await run(`[...document.querySelectorAll('a[href*="off_canvas%3Aopen"]')].find(e=>e.getBoundingClientRect().width>0).click()`);
console.log('Mobile',await run(`JSON.stringify({open:document.querySelector('.e-off-canvas').getAttribute('aria-hidden')==='false',visible:document.querySelector('.e-off-canvas__content')?.getBoundingClientRect().height,scrollWidth:document.documentElement.scrollWidth})`));
fs.writeFileSync(path.join(__dirname,'test-results/mobile-menu.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
await send('Page.navigate',{url:'http://127.0.0.1:8080/index.html?s=dumpster'});await delay(1000);
console.log('Search',await run(`JSON.stringify({heading:document.querySelector('#search-results h1')?.textContent,count:document.querySelectorAll('#search-results article').length})`));
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
const root=path.resolve(__dirname,'..');
function pages(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['tools','node_modules','wp-content','wp-includes','.git'].includes(e.name)?[]:pages(path.join(dir,e.name))):e.name==='index.html'?[path.join(dir,e.name)]:[])}
for(const f of pages(root)){
 await send('Page.navigate',{url:'http://127.0.0.1:8080/'+path.relative(root,f).replaceAll('\\','/')});await delay(500);
 console.log('Page',path.relative(root,f),await run(`JSON.stringify({title:!!document.title,content:!!document.querySelector('#content'),overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src'))})`));
}
await send('Page.navigate',{url:'http://127.0.0.1:8080/tools/original/index.html'});await delay(1500);
fs.writeFileSync(path.join(__dirname,'test-results/original-desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
console.log('Errors',JSON.stringify(errors));console.log('Failed requests',JSON.stringify(failed));
fs.writeFileSync(path.join(__dirname,'test-results/browser.json'),JSON.stringify({errors,failed},null,2));ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
