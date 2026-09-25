// Tiny static server for local testing:  node serve.js  →  http://localhost:5190
const http=require('http'),fs=require('fs'),path=require('path');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';
  const f=path.join(__dirname,path.normalize(p).replace(/^(\.\.[\/\\])+/,''));
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(d)});
}).listen(5190,()=>console.log('Serving on http://localhost:5190'));
