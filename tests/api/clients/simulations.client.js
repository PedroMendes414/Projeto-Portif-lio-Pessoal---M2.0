class SimulationsClient {
  constructor(api) {
    this.api = api;
  }

  simulateCashback(payload) {
    return this.api.post("/v1/simulations/cashback", {
      data: payload
    });
  }
}

module.exports = {
  SimulationsClient
};
