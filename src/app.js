const path = require("path");
const fs = require("fs");
const express = require("express");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const simulationRoutes = require("./routes/simulationRoutes");
const { errorHandler, notFoundHandler } = require("./middlewares/errorMiddleware");

const app = express();
const swaggerFilePath = [
  path.join(__dirname, "..", "docs", "swagger.yaml"),
  path.join(__dirname, "..", "docs", "cashback-marketplace-api.yaml")
].find((filePath) => fs.existsSync(filePath));
const swaggerDocument = YAML.load(swaggerFilePath);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    name: "Cashback Marketplace API",
    status: "running",
    documentation: "/docs/swagger.yaml",
    swaggerUi: "/docs",
    healthcheck: "/health",
    basePath: "/v1",
    endpoints: [
      "POST /v1/auth/admin/login",
      "POST /v1/auth/user/login",
      "POST /v1/users/register",
      "GET /v1/users/me/campaigns",
      "DELETE /v1/users/me/campaigns/:campaignId",
      "GET /v1/campaigns",
      "POST /v1/campaigns",
      "GET /v1/campaigns/:campaignId",
      "DELETE /v1/campaigns/:campaignId",
      "PUT /v1/campaigns/:campaignId",
      "PATCH /v1/campaigns/:campaignId/status",
      "POST /v1/simulations/cashback"
    ],
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/docs/swagger.yaml", (req, res) => {
  res.sendFile(swaggerFilePath);
});
app.get("/docs/openapi.json", (req, res) => {
  res.status(200).json({
    ...swaggerDocument,
    servers: [
      {
        url: `${req.protocol}://${req.get("host")}/v1`,
        description: "Servidor local"
      }
    ]
  });
});
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: "/docs/openapi.json"
    },
    customSiteTitle: "Cashback Marketplace API Docs"
  })
);

app.use("/v1/auth", authRoutes);
app.use("/v1/users", userRoutes);
app.use("/v1/campaigns", campaignRoutes);
app.use("/v1/simulations", simulationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
