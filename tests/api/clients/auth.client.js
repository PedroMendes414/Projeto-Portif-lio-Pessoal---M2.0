class AuthClient {
  constructor(api) {
    this.api = api;
  }

  adminLogin(credentials) {
    return this.api.post("/v1/auth/admin/login", {
      data: credentials
    });
  }

  userLogin(credentials) {
    return this.api.post("/v1/auth/user/login", {
      data: credentials
    });
  }
}

module.exports = {
  AuthClient
};
