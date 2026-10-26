import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const html='offline/index.html';
writeFileSync(html,readFileSync(html,'utf8').replace('type="module" crossorigin','defer').replace('rel="stylesheet" crossorigin','rel="stylesheet"').replace(/<link href="\/(apple-touch-icon|favicon)[^>]+>/g,''));
for(const name of readdirSync('offline/assets'))if(name.endsWith('.css')){
 const path='offline/assets/'+name;
 writeFileSync(path,readFileSync(path,'utf8').replace(/(url\(["']?)\/brand\//g,'$1../brand/'));
}
