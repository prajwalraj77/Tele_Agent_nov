require("dotenv").config();

// Express HTTP server and WebSocket support.
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

// API routes.
const callRoutes = require("./routes/callRoutes");
const customerRoutes = require("./routes/customerRoutes");
const exotelRoutes = require("./routes/exotelRoutes");

// Database and scheduled callback services.
const { connectDatabase } = require("./database/connection");
const { startCallbackScheduler } = require("./services/callbackScheduler");

// Browser WebSocket transport.
const { handleBrowserConnection } = require("./transports/browser");

// Exotel WebSocket transport.
const {
  handleExotelConnection,
} = require("./transports/exotel/exotelStream");

// ============================================================
// SERVER
// ============================================================

const app = express();

const server = http.createServer(app);

const PORT = 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());

// ============================================================
// CORS
// ============================================================

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "http://localhost:5173",
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ============================================================
// HTTP ROUTES
// ============================================================

// Basic server health check.
app.get("/", (req, res) => {
  res.send("AI Voice Platform Backend is running!");
});

// Call API routes.
app.use("/api/call", callRoutes);

// Customer API routes.
app.use("/api/customers", customerRoutes);

// Exotel API routes.
app.use("/api/exotel", exotelRoutes);

// ============================================================
// WEBSOCKET SERVERS
// ============================================================

// WebSocket server for browser audio.
const mediaWss = new WebSocketServer({
  noServer: true,
});

// WebSocket server for Exotel audio.
const exotelWss = new WebSocketServer({
  noServer: true,
});

// ============================================================
// WEBSOCKET ROUTING
// ============================================================

// Routes incoming WebSocket upgrade requests.
server.on("upgrade", (request, socket, head) => {
  const url = new URL(
    request.url,
    `http://${request.headers.host}`,
  );

  console.log(
    "WebSocket upgrade request:",
    url.pathname,
  );

  // Routes browser audio connections.
  if (url.pathname === "/media-stream") {
    mediaWss.handleUpgrade(
      request,
      socket,
      head,
      (ws) => {
        mediaWss.emit(
          "connection",
          ws,
          request,
        );
      },
    );

    return;
  }

  // Routes Exotel audio connections.
  if (url.pathname === "/exotel-stream") {
    exotelWss.handleUpgrade(
      request,
      socket,
      head,
      (ws) => {
        exotelWss.emit(
          "connection",
          ws,
          request,
        );
      },
    );

    return;
  }

  // Closes unknown WebSocket connections.
  console.log(
    "Unknown WebSocket path:",
    url.pathname,
  );

  socket.destroy();
});

// ============================================================
// BROWSER TRANSPORT
// ============================================================

// Handles browser WebSocket connections.
mediaWss.on(
  "connection",
  async (ws, request) => {
    try {
      await handleBrowserConnection(
        ws,
        request,
      );
    } catch (error) {
      console.error(
        "Browser connection handler failed:",
        error,
      );

      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    }
  },
);

// ============================================================
// EXOTEL TRANSPORT
// ============================================================

// Handles Exotel WebSocket connections.
exotelWss.on(
  "connection",
  async (ws, request) => {
    try {
      await handleExotelConnection(
        ws,
        request,
      );
    } catch (error) {
      console.error(
        "Exotel connection handler failed:",
        error,
      );

      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    }
  },
);

// ============================================================
// START SERVER
// ============================================================

// Connects services and starts the HTTP/WebSocket server.
async function startServer() {
  try {
    await connectDatabase();

    startCallbackScheduler();

    server.listen(
      PORT,
      () => {
        console.log(
          `Server running on http://localhost:${PORT}`,
        );

        console.log(
          "Exotel WebSocket endpoint: /exotel-stream",
        );

        console.log(
          "Browser WebSocket endpoint: /media-stream",
        );
      },
    );
  } catch (error) {
    console.error(
      "Failed to start server:",
      error,
    );

    process.exit(1);
  }
}

startServer();