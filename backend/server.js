const http = require('http');  
const WebSocket = require('ws'); // ✅ ADD THIS  
const port = process.env.PORT || 3000; // ✅ ADD THIS  
const server = http.createServer((req, res) => {  
  if (req.url === '/health') {  
    res.writeHead(200);  
    res.end('OK');  
  } else {  
    res.writeHead(404);  
    res.end();  
  }  
});  
const wss = new WebSocket.Server({ server });  
server.listen(port, () => {  
  console.log(`Server is listening on port ${port}`);  
});  
// ... rest of the code remains the same  
