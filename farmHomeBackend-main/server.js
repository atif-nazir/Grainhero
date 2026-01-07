const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
const { Server } = require("socket.io");

const authRoute = require("./routes/auth");
const maintenanceRoute = require("./routes/maintenance");
const incidentsRoute = require("./routes/incidents");
const productsRoute = require("./routes/products");
const ordersRoute = require("./routes/orders");
const alertsRoute = require("./routes/alerts");
const dashboardRouter = require("./routes/dashboard");
const quotesRoute = require("./routes/quotes");
const webhookRoute = require("./routes/webhooks");
const contactRoute = require("./routes/contact");
const paymentVerificationRoute = require("./routes/payment-verification");

// GrainHero integrated routes
const grainBatchesRoute = require("./routes/grainBatches");
const sensorsRoute = require("./routes/sensors");
const aiRoute = require("./routes/ai");
const aiSpoilageRoute = require("./routes/aiSpoilage");
const actuatorsRoute = require("./routes/actuators");
const dualProbeRoute = require("./routes/dualProbeMonitoring");
const deviceHealthRoute = require("./routes/deviceHealth");
const iotRoute = require("./routes/iot");
const dataVisualizationRoute = require("./routes/dataVisualization");
const silosRoute = require("./routes/silos");
const insuranceRoute = require("./routes/insurance");
const buyersRoute = require("./routes/buyers");
const environmentalRoute = require("./routes/environmental");

// Super Admin routes
const tenantManagementRoute = require("./routes/tenantManagement");
const planManagementRoute = require("./routes/planManagement");

// User Management routes
const userManagementRoute = require("./routes/userManagement");

const Alert = require("./models/Alert");
const environmentalDataService = require("./services/environmentalDataService");
const firebaseRealtimeService = require("./services/firebaseRealtimeService");

const cors = require("cors");
require("dotenv").config();

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use("/uploads", express.static("uploads"));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// Try different connection formats
const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

console.log("Attempting to connect to MongoDB...");
console.log(
  "Connection string:",
  connectionString.replace(process.env.MONGO_PASS, "***")
);

mongoose.connect(connectionString, {
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error: "));
db.once("open", () => {
  console.log("MongoDB Connection Successfull");

  // Start environmental data collection service
  try {
    environmentalDataService.start();
    console.log("Environmental data service started");
  } catch (error) {
    console.error("Failed to start environmental data service:", error);
  }
  
  try {
    firebaseRealtimeService.start(io);
    console.log("Firebase realtime service started");
  } catch (error) {
    console.error("Failed to start Firebase realtime service:", error.message);
  }
  
  // Start data aggregation service (30s raw → 5min averages)
  try {
    const {
      startLimitWarningScheduler,
    } = require("./services/limitWarningService");
    startLimitWarningScheduler();
  } catch (error) {
    console.error("Failed to start limit warning scheduler:", error);
  }
});

// Stripe webhook endpoint must use express.raw before express.json
app.use("/webhook", express.raw({ type: "application/json" }), webhookRoute);

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);
// ✅ Use this instead
app.use("/auth", authRoute);
app.use("/maintenance", maintenanceRoute);
app.use("/incidents", incidentsRoute);
app.use("/products", productsRoute);
app.use("/orders", ordersRoute);
app.use("/alerts", alertsRoute);
app.use("/quotes", quotesRoute);

// GrainHero integrated routes
app.use("/api/grain-batches", grainBatchesRoute);
app.use("/api/sensors", sensorsRoute);
app.use("/api/ai", aiRoute);
app.use("/api/ai-spoilage", aiSpoilageRoute);
app.use("/api/actuators", actuatorsRoute);
app.use("/api/dual-probe", dualProbeRoute);
app.use("/api/device-health", deviceHealthRoute);
app.use("/api/iot", iotRoute);
app.use("/api/data-viz", dataVisualizationRoute);
app.use("/api/silos", silosRoute);
app.use("/api/insurance", insuranceRoute);
app.use("/api/buyers", buyersRoute);

// Super Admin routes
app.use("/api/tenant-management", tenantManagementRoute);
app.use("/api/plan-management", planManagementRoute);

// Subscription Analytics routes
const subscriptionAnalyticsRoute = require("./routes/subscriptionAnalytics");
app.use("/api/subscription-analytics", subscriptionAnalyticsRoute);

// User Management routes
app.use("/api/user-management", userManagementRoute);

// Warehouse Management routes
const warehousesRoute = require("./routes/warehouses");
app.use("/api/warehouses", warehousesRoute);

// Contact routes
app.use("/api/contact", contactRoute);

// Payment verification routes
app.use("/api/payment-verification", paymentVerificationRoute);

// Stripe checkout session routes
const createCheckoutSessionRoute = require("./routes/create-checkout-session");
app.use("/api/create-checkout-session", createCheckoutSessionRoute);

app.use("/", dashboardRouter);

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "GrainHero Backend API",
      version: "1.0.0",
      description: "API documentation for GrainHero Backend",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "Up",
    frontend: process.env.FRONT_END_URL,
  });
});

// Helper: get filtered alerts for a user by role
async function getFilteredAlerts(role, userId) {
  // For grain management, return all alerts for now
  // TODO: Implement tenant-based filtering for grain alerts
  const alerts = await Alert.find();
  return alerts;
}

const wss = new WebSocket.Server({ server });

wss.on("connection", async function connection(ws, req) {
  // Parse the URL to get role and userId
  const url = req.url;
  const match = url.match(/^\/alerts\/(admin|manager|assistant)\/(\w+)$/);
  if (!match) {
    ws.close();
    return;
  }
  const role = match[1];
  const userId = match[2];

  // Send initial alerts
  const sendAlerts = async () => {
    const filteredAlerts = await getFilteredAlerts(role, userId);
    ws.send(JSON.stringify(filteredAlerts));
  };
  await sendAlerts();

  // Listen for new alerts (using Mongoose change streams)
  const alertChangeStream = Alert.watch();
  alertChangeStream.on("change", async (change) => {
    if (
      change.operationType === "insert" ||
      change.operationType === "update" ||
      change.operationType === "replace" ||
      change.operationType === "delete"
    ) {
      await sendAlerts();
    }
  });

  ws.on("close", () => {
    alertChangeStream.close();
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`WebSocket Server: ws://localhost:${PORT}`);
});
