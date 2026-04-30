import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const baseUrl = __ENV.K6_BASE_URL || "http://127.0.0.1:3000";
const apiBaseUrl = `${baseUrl}/v1`;
const createdCampaignTrend = new Trend("created_campaign_duration");
const businessSuccessRate = new Rate("business_success_rate");

export const options = {
  scenarios: {
    smoke_performance: {
      executor: "ramping-vus",
      stages: [
        { duration: "10s", target: 3 },
        { duration: "20s", target: 5 },
        { duration: "10s", target: 0 }
      ],
      gracefulRampDown: "5s"
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<750"],
    business_success_rate: ["rate>0.95"],
    created_campaign_duration: ["p(95)<900"]
  }
};

export function setup() {
  const adminToken = login("/auth/admin/login", {
    email: "gestor@marketplace.com",
    password: "<SECRET>"
  });
  const userToken = login("/auth/user/login", {
    email: "cliente@marketplace.com",
    password: "cliente123"
  });
  const campaign = createCampaign(adminToken, buildCampaignPayload("setup"));

  return {
    adminToken,
    userToken,
    campaignId: campaign.id,
    sellerId: campaign.sellerId
  };
}

export default function (data) {
  group("public health and authentication", () => {
    const healthResponse = http.get(`${baseUrl}/health`, { tags: { endpoint: "GET /health" } });
    recordCheck(healthResponse, {
      "health returns 200": (response) => response.status === 200
    });

    const adminLoginResponse = postJson("/auth/admin/login", {
      email: "gestor@marketplace.com",
      password: "<SECRET>"
    }, { endpoint: "POST /auth/admin/login" });
    recordCheck(adminLoginResponse, {
      "admin login returns token": (response) => response.status === 200 && Boolean(response.json("accessToken"))
    });

    const userLoginResponse = postJson("/auth/user/login", {
      email: "cliente@marketplace.com",
      password: "cliente123"
    }, { endpoint: "POST /auth/user/login" });
    recordCheck(userLoginResponse, {
      "user login returns token": (response) => response.status === 200 && Boolean(response.json("accessToken"))
    });
  });

  group("campaign administrative endpoints", () => {
    const listCampaignsResponse = http.get(`${apiBaseUrl}/campaigns?status=ACTIVE`, {
      headers: authHeaders(data.adminToken),
      tags: { endpoint: "GET /campaigns" }
    });
    recordCheck(listCampaignsResponse, {
      "admin campaign list returns 200": (response) => response.status === 200,
      "admin campaign list has content": (response) => Array.isArray(response.json("content"))
    });

    const detailResponse = http.get(`${apiBaseUrl}/campaigns/${data.campaignId}`, {
      headers: authHeaders(data.adminToken),
      tags: { endpoint: "GET /campaigns/{campaignId}" }
    });
    recordCheck(detailResponse, {
      "campaign detail returns 200": (response) => response.status === 200,
      "campaign detail matches setup campaign": (response) => response.json("id") === data.campaignId
    });

    const createResponse = postJson(
      "/campaigns",
      buildCampaignPayload(`vu-${__VU}-iter-${__ITER}`),
      {
        endpoint: "POST /campaigns",
        headers: authHeaders(data.adminToken)
      }
    );
    createdCampaignTrend.add(createResponse.timings.duration);
    recordCheck(createResponse, {
      "campaign creation returns 201": (response) => response.status === 201,
      "campaign creation returns id": (response) => Boolean(response.json("id"))
    });
  });

  group("customer campaign and simulation endpoints", () => {
    const userCampaignsResponse = http.get(`${apiBaseUrl}/users/me/campaigns`, {
      headers: authHeaders(data.userToken),
      tags: { endpoint: "GET /users/me/campaigns" }
    });
    recordCheck(userCampaignsResponse, {
      "user campaign list returns 200": (response) => response.status === 200,
      "user campaign list has content": (response) => Array.isArray(response.json("content"))
    });

    const simulationResponse = postJson("/simulations/cashback", {
      customerId: "11111111-1111-4111-8111-111111111111",
      sellerId: data.sellerId,
      purchaseAmount: 200,
      purchaseDate: new Date().toISOString(),
      paymentMethod: "PIX",
      state: "SP"
    }, { endpoint: "POST /simulations/cashback" });
    recordCheck(simulationResponse, {
      "cashback simulation returns 200": (response) => response.status === 200,
      "cashback simulation is eligible": (response) => response.json("eligible") === true
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const sanitizedData = sanitizeSummary(data);
  return {
    "reports/performance/summary.json": JSON.stringify(sanitizedData, null, 2),
    "reports/performance/summary.html": buildHtmlReport(sanitizedData),
    stdout: buildTextSummary(sanitizedData)
  };
}

function login(path, payload) {
  const response = postJson(path, payload, { endpoint: `POST ${path}` });
  if (response.status !== 200 || !response.json("accessToken")) {
    throw new Error(`Login failed for ${path}: status ${response.status}`);
  }
  return response.json("accessToken");
}

function createCampaign(adminToken, payload) {
  const response = postJson("/campaigns", payload, {
    endpoint: "POST /campaigns setup",
    headers: authHeaders(adminToken)
  });
  if (response.status !== 201) {
    throw new Error(`Campaign setup failed: status ${response.status} body ${response.body}`);
  }
  return response.json();
}

function postJson(path, payload, options = {}) {
  return http.post(`${apiBaseUrl}${path}`, JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {})
    },
    tags: {
      endpoint: options.endpoint || `POST ${path}`
    }
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

function recordCheck(response, checks) {
  const passed = check(response, checks);
  businessSuccessRate.add(passed);
}

function buildCampaignPayload(label) {
  const now = Date.now();
  return {
    name: `Performance Cashback ${label} ${now}`.slice(0, 120),
    description: `Campanha criada pelo teste de performance ${label}`,
    sellerId: `seller-perf-${label}-${now}`,
    validity: {
      startAt: new Date(Date.now() - 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    },
    cashbackRule: {
      type: "PERCENTAGE",
      value: 10,
      currency: "BRL",
      minPurchaseAmount: 50,
      allowedPaymentMethods: ["PIX"]
    },
    audience: {
      segment: "ALL",
      states: ["SP"]
    },
    priority: 100
  };
}

function buildTextSummary(data) {
  const duration = metricValue(data, "http_req_duration", "p(95)");
  const failedRate = metricValue(data, "http_req_failed", "rate");
  const checks = data.metrics?.checks?.values || {};
  return `\nPerformance summary\n- http_req_duration p95: ${formatNumber(duration)} ms\n- http_req_failed rate: ${formatNumber(failedRate)}\n- checks passed: ${checks.passes || 0}\n- checks failed: ${checks.fails || 0}\n`;
}

function buildHtmlReport(data) {
  const metrics = [
    ["HTTP duration p95", `${formatNumber(metricValue(data, "http_req_duration", "p(95)"))} ms`],
    ["HTTP duration avg", `${formatNumber(metricValue(data, "http_req_duration", "avg"))} ms`],
    ["HTTP failed rate", formatNumber(metricValue(data, "http_req_failed", "rate"))],
    ["Requests", formatNumber(metricValue(data, "http_reqs", "count"))],
    ["Iterations", formatNumber(metricValue(data, "iterations", "count"))],
    ["Business success rate", formatNumber(metricValue(data, "business_success_rate", "rate"))],
    ["Campaign creation p95", `${formatNumber(metricValue(data, "created_campaign_duration", "p(95)"))} ms`]
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatorio de performance k6</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
    h1 { margin-bottom: 4px; }
    .muted { color: #6b7280; }
    table { border-collapse: collapse; width: 100%; margin-top: 24px; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background: #f3f4f6; }
    .pass { color: #047857; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Relatorio de performance k6</h1>
  <p class="muted">Cashback Marketplace API - principais endpoints do Swagger.</p>
  <p>Status geral: <span class="pass">executado</span></p>
  <table>
    <thead><tr><th>Metrica</th><th>Valor</th></tr></thead>
    <tbody>
      ${metrics.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(String(value))}</td></tr>`).join("\n")}
    </tbody>
  </table>
  <h2>Thresholds</h2>
  <pre>${escapeHtml(JSON.stringify(data.metrics, null, 2))}</pre>
</body>
</html>`;
}

function metricValue(data, metricName, key) {
  return data.metrics?.[metricName]?.values?.[key] ?? 0;
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeSummary(data) {
  return {
    ...data,
    setup_data: {
      campaignId: data.setup_data?.campaignId,
      sellerId: data.setup_data?.sellerId,
      adminToken: "[redacted]",
      userToken: "[redacted]"
    }
  };
}
