const adminCredentials = {
  valid: {
    email: "gestor@marketplace.com",
    password: "<SECRET>"
  },
  invalidPassword: {
    email: "gestor@marketplace.com",
    password: "senha-invalida"
  },
  invalidEmail: {
    email: "invalido@marketplace.com",
    password: "<SECRET>"
  },
  invalidPayload: {
    email: "email-invalido",
    password: "123"
  }
};

const userCredentials = {
  valid: {
    email: "cliente@marketplace.com",
    password: "cliente123"
  },
  invalidPassword: {
    email: "cliente@marketplace.com",
    password: "senha-incorreta"
  }
};

module.exports = {
  adminCredentials,
  userCredentials
};
