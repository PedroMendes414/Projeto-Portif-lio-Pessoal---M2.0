class UsersClient {
  constructor(api) {
    this.api = api;
  }

  register(payload) {
    return this.api.post("/v1/users/register", {
      data: payload
    });
  }

  listMyCampaigns({ accessToken, params } = {}) {
    return this.api.get("/v1/users/me/campaigns", {
      params,
      headers: buildAuthorizationHeader(accessToken)
    });
  }

  deleteMyCampaign(campaignId, { accessToken } = {}) {
    return this.api.delete(`/v1/users/me/campaigns/${campaignId}`, {
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
  UsersClient
};
