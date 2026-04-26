# Cashback Marketplace API
API REST em JavaScript com Express e banco de dados em memoria para implementar o contrato OpenAPI definido em `docs/swagger.yaml`.

## Como executar

```bash
npm install
npm start
```

A API sobe por padrao em `http://localhost:3000`.

## Rotas implementadas

- `POST /v1/auth/admin/login`
- `POST /v1/auth/user/login`
- `POST /v1/users/register`
- `GET /v1/users/me/campaigns`
- `DELETE /v1/users/me/campaigns/:campaignId`
- `GET /v1/campaigns`
- `POST /v1/campaigns`
- `GET /v1/campaigns/:campaignId`
- `DELETE /v1/campaigns/:campaignId`
- `PUT /v1/campaigns/:campaignId`
- `PATCH /v1/campaigns/:campaignId/status`
- `POST /v1/simulations/cashback`
- `GET /health`

## Dados seed em memoria

Login administrativo:

```json
{
  "email": "gestor@marketplace.com",
  "password": "<SECRET>"
}
```

Cliente seed para simulacao:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "email": "cliente@marketplace.com",
  "password": "cliente123",
  "sellerId": "seller-123"
}
```

## Observacoes

- Os dados sao mantidos apenas em memoria e reiniciam ao parar o processo.
- As rotas administrativas exigem token Bearer retornado no login.
- As rotas `GET /v1/users/me/campaigns` exigem token Bearer de usuario comum.
- `DELETE /v1/campaigns/:campaignId` remove a campanha globalmente e e exclusivo para admin.
- `DELETE /v1/users/me/campaigns/:campaignId` remove a campanha apenas da visao do usuario autenticado.
- A aplicacao aplica validacoes de payload, conflitos de campanha por escopo e regras de simulacao de cashback.
