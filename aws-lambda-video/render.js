const { chromium } = require('playwright');
// usage: node render.js <port> <outdir> <fps> <startFrame> <endFrame> [step]  | node render.js <port> <outdir> times t1,t2,...
(async()=>{
  const [port,out,a,b,c,step]=process.argv.slice(2);
  const fs=require('fs');fs.mkdirSync(out,{recursive:true});
  const br=await chromium.launch({args:['--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p=await br.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  p.on('pageerror',e=>console.error('PAGEERR',e.message));
  p.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text())});
  await p.goto(`http://localhost:${port}/index.html`);
  await p.waitForFunction('window.READY===true',{timeout:60000});
  if(a==='times'){
    for(const t of b.split(',')){await p.evaluate(t=>window.renderAt(t),parseFloat(t));
      await p.screenshot({path:`${out}/t_${t}.jpg`,type:'jpeg',quality:88})}
  } else {
    const fps=+a,s=+b,e=+c,st=+(step||1);
    for(let f=s;f<e;f+=st){
      await p.evaluate(t=>window.renderAt(t),f/fps);
      await p.screenshot({path:`${out}/f_${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:92});
    }
  }
  await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
