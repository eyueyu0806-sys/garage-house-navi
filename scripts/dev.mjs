import {spawn} from 'node:child_process';
// Accept the managed preview's Vite-style flags while running genuine Next.js.
const args=process.argv.slice(2).filter(x=>x!=='--strictPort').map(x=>x==='--host'?'--hostname':x);
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack',...args],{stdio:'inherit',env:process.env});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
