const express = require('express');
const app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
const bodyParser = require('body-parser');

const PORT = 4000; // default port to listen

app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log('Got body:', req.body);
  if (io) io.emit('ESP', req.body);
  res.sendStatus(200);
});

io.on('connection', (socket) => {
  console.log('client connected');
  let channel = 'ESP';

  socket.on('disconnect', function () {
    console.log('User disconnected: ' + socket.id);
  });

  socket.on(channel, (msg) => {
    console.log('message:' + JSON.stringify(msg));
    //socket.emit("ESP", { "SW3" : 'state:on' });
    // Reply
    io.emit(channel, msg);
  });

  socket.on('command', (payload) => {
    console.log('command:', [payload]);
    io.emit('ESP', payload);
  });
});

http.listen(PORT, () => {
  console.log(`Server start on http://127.0.0.1:${PORT}`);
});
