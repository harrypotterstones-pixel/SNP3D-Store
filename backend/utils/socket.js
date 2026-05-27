let io = null;

const init = (socketServer) => {
  io = socketServer;
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('subscribePrinter', () => {
      socket.join('printer-status');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });
};

const getIO = () => io;

const emitPrinterStatus = (status) => {
  if (io) {
    io.to('printer-status').emit('printer:status', status);
  }
};

const emitOrderCreated = (order) => {
  if (io) {
    io.emit('order:created', order);
  }
};

module.exports = {
  init,
  getIO,
  emitPrinterStatus,
  emitOrderCreated
};
