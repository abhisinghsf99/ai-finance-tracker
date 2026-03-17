// ============================================================
// MCP Server — Streamable HTTP Transport (for remote access)
// Runs on port 3001, authless (HTTPS provides transport security).
// ============================================================

import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./tools.js";

const PORT = process.env.MCP_PORT || 3001;

// ============================================================
// Express app
// ============================================================

const app = express();
app.use(express.json());

// ============================================================
// MCP Streamable HTTP routes
// ============================================================

const transports = {};

// POST /mcp — handle JSON-RPC requests
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  try {
    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
          console.log(`[mcp] Session initialized: ${sid}`);
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
          console.log(`[mcp] Session closed: ${sid}`);
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: no valid session ID" },
        id: null,
      });
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[mcp] Error handling request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// GET /mcp — SSE stream for server-initiated messages
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    return res.status(400).send("Invalid or missing session ID");
  }
  await transports[sessionId].handleRequest(req, res);
});

// DELETE /mcp — session termination
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    return res.status(400).send("Invalid or missing session ID");
  }
  await transports[sessionId].handleRequest(req, res);
});

// --- Health check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mcp-server", uptime: process.uptime() });
});

// ============================================================
// Start
// ============================================================

app.listen(PORT, "0.0.0.0", (error) => {
  if (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
  console.log(`MCP HTTP server listening on port ${PORT}`);
  console.log("Auth: none (authless)");
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  for (const sid in transports) {
    await transports[sid].close().catch(() => {});
    delete transports[sid];
  }
  process.exit(0);
});
