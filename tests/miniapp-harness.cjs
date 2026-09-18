// Local-only Farcaster bridge fixture. No wallet or transaction is used.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const bridge = path.join(path.dirname(require.resolve('comlink')), 'comlink.js');
const html = `<!doctype html><html><head><title>Legacy miniapp regression</title></head><body>
<h1>Farcaster recovery test</h1><p id="status">Waiting for app</p>
<iframe id="app" title="Legacy mining app" src="http://localhost:3108/mine" style="width:390px;height:844px;border:1px solid #ddd"></iframe>
<script src="/comlink.js"></script><script>
const frame = document.querySelector('#app');
let attempts = 0;
const host = {
  context: { user: { fid: 123, username: 'test-user' }, client: { clientFid: 9152, added: true, safeAreaInsets: { top:0,bottom:0,left:0,right:0 } } },
  ready() { document.querySelector('#status').textContent = 'SDK ready'; },
  eip6963RequestProvider() {},
  getCapabilities() { return ['wallet.getEthereumProvider']; },
  ethProviderRequestV2(request) {
    let result;
    if (request.method === 'eth_accounts') result = [];
    else if (request.method === 'eth_requestAccounts') {
      attempts++;
      if (attempts === 1) {
        document.querySelector('#status').textContent = 'Automatic connection rejected: click Connect Wallet to retry';
        return {jsonrpc:'2.0',id:request.id,error:{code:4001,message:'Test rejection'}};
      }
      result = ['0x0000000000000000000000000000000000000001'];
      document.querySelector('#status').textContent = 'Native Farcaster retry connected. Requests: ' + attempts;
    } else if (request.method === 'eth_chainId') result = '0x2105';
    else return {jsonrpc:'2.0',id:request.id,error:{code:4200,message:'Test fixture disallows this operation'}};
    return {jsonrpc:'2.0',id:request.id,result};
  }
};
Comlink.expose(host, Comlink.windowEndpoint(frame.contentWindow, window, 'http://localhost:3108'));
</script></body></html>`;
http.createServer((req,res) => {
  res.setHeader('Content-Type', req.url === '/comlink.js' ? 'text/javascript' : 'text/html');
  res.end(req.url === '/comlink.js' ? fs.readFileSync(bridge) : html);
}).listen(3109, '127.0.0.1', () => console.log('Miniapp fixture: http://127.0.0.1:3109'));
