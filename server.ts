import "dotenv/config";

// Polyfill for Promise.withResolvers (required for newer pdfjs-dist on older Node versions)
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import mammoth from "mammoth";
import { parsePdf } from "./src/services/pdfParser.ts";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.post("/api/parse-file", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        console.error("No file in request from multer");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`Parsing file: ${req.file.originalname} (${req.file.size} bytes)`);

      let text = "";
      const buffer = req.file.buffer;
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith(".pdf")) {
        console.log("Using PDF parser...");
        const result = await parsePdf(buffer);
        if (result.success) {
          text = result.text;
        } else {
          console.error("PDF Parse failure:", result.error);
          throw new Error(`${result.error}. Please upload a DOCX file or paste text manually.`);
        }
      } else if (filename.endsWith(".docx")) {
        console.log("Using DOCX parser...");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        console.log("Using Plan Text parser...");
        text = buffer.toString("utf8");
      }

      console.log(`Extracted ${text.length} characters`);
      res.json({ text });
    } catch (error: any) {
      console.error("File parsing error:", error);
      res.status(500).json({ 
        error: "Failed to parse file", 
        message: error.message 
      });
    }
  });

  // API 404 handler - must be BEFORE Vite/SPA middleware
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "Not Found", 
      message: `API route not found: ${req.method} ${req.url}`,
      suggestion: "Check if the API path and method are correct"
    });
  });

  // Global error handler for JSON errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error:", err);
    if (req.path.startsWith("/api/")) {
      res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error",
        details: process.env.NODE_ENV !== "production" ? err.stack : undefined
      });
    } else {
      next(err);
    }
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JDify server running at http://localhost:${PORT}`);
  });
}

startServer();
