require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection Setup
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI IS MISSING from environment variables!");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1
  }
});

let db;

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    db = client.db('tasks');

    // Make db available to routes
    app.locals.db = db;

    // Routes
    app.use('/api/tasks', taskRoutes);

    // Basic health API
    app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', message: 'Backend is running and accessible!' }));

    // Serve the built frontend (combined single-container deployment).
    // The Docker build copies the Vite output into ./public; in local dev
    // the folder doesn't exist and these handlers are skipped.
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(path.join(publicDir, 'index.html'))) {
      app.use(express.static(publicDir));
      // SPA fallback: any non-API route returns index.html
      app.get(/^\/(?!api\/).*/, (req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
      });
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("CRITICAL: Failed to connect to MongoDB:", error.message);
  }
}

run().catch(console.dir);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});
