const { randomUUID } = require("crypto");

const now = new Date();
const plusDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const minusDays = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const admins = [
  {
    id: randomUUID(),
    name: "Gestor Marketplace",
    email: "gestor@marketplace.com",
    password: "<SECRET>",
    role: "ADMIN"
  }
];

const users = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "Cliente Exemplo",
    email: "cliente@marketplace.com",
    document: "12345678900",
    password: "cliente123",
    phone: "11999999999",
    birthDate: "1995-05-10",
    status: "ACTIVE",
    state: "SP",
    hiddenCampaignIds: [],
    createdAt: minusDays(10)
  }
];

const campaigns = [
  {
    id: randomUUID(),
    name: "Cashback PIX Abril",
    description: "Campanha ativa para pagamentos via PIX com prioridade alta.",
    sellerId: "seller-123",
    status: "ACTIVE",
    validity: {
      startAt: minusDays(5),
      endAt: plusDays(10)
    },
    cashbackRule: {
      type: "PERCENTAGE",
      value: 10,
      currency: "BRL",
      minPurchaseAmount: 50,
      maxCashbackAmount: 100,
      firstPurchaseOnly: false,
      allowedPaymentMethods: ["PIX"]
    },
    audience: {
      segment: "ALL",
      states: ["SP", "RJ"],
      customerIds: []
    },
    stackable: false,
    priority: 10,
    createdBy: {
      id: admins[0].id,
      name: admins[0].name,
      email: admins[0].email,
      role: admins[0].role
    },
    createdAt: minusDays(7),
    updatedAt: minusDays(2)
  }
];

module.exports = {
  admins,
  users,
  campaigns
};
