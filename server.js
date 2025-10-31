const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// keep a short recent history so new clients see what's drawn
const history = [];

function randomColor() {
  // generate pastel-ish color
  const h = Math.floor(Math.random() * 360);
  const s = 70 + Math.floor(Math.random() * 20);
  const l = 50 + Math.floor(Math.random() * 10);
  return `hsl(${h} ${s}% ${l}%)`;
}

io.on('connection', (socket) => {
  const color = randomColor();
  socket.data.color = color;
  console.log('client connected', socket.id, 'color', color);

  // send assigned color and history
  socket.emit('init', { color, history });

  socket.on('draw', (data) => {
    // data should include points/line info; attach color from server to prevent spoofing
    const item = Object.assign({}, data, { color: socket.data.color });
    history.push(item);
    // cap history size
    if (history.length > 1000) history.shift();
    socket.broadcast.emit('draw', item);
  });

  socket.on('clear', () => {
    history.length = 0;
    io.emit('clear');
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Shareboard server running on http://localhost:${PORT}`);
});
