class CampaignsClient {
  constructor(api) {
    this.api = api;
  }

  list({ accessToken, params } = {}) {
    return this.api.get("/v1/campaigns", {
      params,
      headers: buildAuthorizationHeader(accessToken)
    });
  }

  create(payload, { accessToken } = {}) {
    return this.api.post("/v1/campaigns", {
      data: payload,
      headers: buildAuthorizationHeader(accessToken)
    });
  }

  get(campaignId, { accessToken } = {}) {
    return this.api.get(`/v1/campaigns/${campaignId}`, {
      headers: buildAuthorizationHeader(accessToken)
    });
  }

  delete(campaignId, { accessToken } = {}) {
    return this.api.delete(`/v1/campaigns/${campaignId}`, {
      headers: buildAuthorizationHeader(accessToken)
    });
  }

  changeStatus(campaignId, payload, { accessToken } = {}) {
    return this.api.patch(`/v1/campaigns/${campaignId}/status`, {
      data: payload,
      headers: buildAuthorizationHeader(accessToken)
    });
  }
}

function buildAuthorizationHeader(accessToken) {
  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`
  };
}

module.exports = {
  CampaignsClient
};
