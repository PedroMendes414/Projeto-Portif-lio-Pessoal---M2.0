# Cashback Marketplace API
API REST em JavaScript com Express e banco de dados em memoria para implementar o contrato OpenAPI definido em `docs/swagger.yaml`.

## Como executar

```bash
npm install
npm start
```

A API sobe por padrao em `http://localhost:3000`.

## Testes

```bash
npm test
```

Os testes de API sobem a aplicacao em uma porta livre durante a execucao e geram um relatorio Mochawesome em `reports/api`.

## Performance

Os testes de performance usam k6 e cobrem os principais endpoints do Swagger: healthcheck, login administrativo, login de usuario comum, listagem/criacao/detalhe de campanhas, listagem de campanhas do usuario autenticado e simulacao de cashback.

Pre-requisito:

```bash
k6 version
```

Execucao:

```bash
npm run test:performance
```

O comando sobe a API localmente, executa um cenario smoke com rampa ate 5 VUs e gera os relatorios em:

- `reports/performance/summary.html`
- `reports/performance/summary.json`

Thresholds atuais:

- `http_req_failed < 5%`
- `http_req_duration p95 < 750ms`
- `business_success_rate > 95%`
- `created_campaign_duration p95 < 900ms`

## Integracao continua

O workflow `.github/workflows/ci.yml` executa em pushes e pull requests para a branch `main`, alem de permitir execucao manual pela aba Actions do GitHub.

Etapas principais:

- instala dependencias com `npm ci`, respeitando o `package-lock.json`;
- roda a suite de API com `npm run test:ci`;
- valida o projeto em Node.js 20.x e 22.x;
- publica o relatorio `reports/api` como artifact por 7 dias, inclusive quando os testes falham;
- quando a branch `main` passa nos testes, publica o relatorio Mochawesome no GitHub Pages:
  `https://pedromendes414.github.io/Projeto-Portif-lio-Pessoal---M2.0/`.

Para o deploy visual funcionar, o GitHub Pages precisa estar habilitado em `Settings > Pages > Build and deployment > Source > GitHub Actions`. Enquanto isso nao estiver ativo, a CI continua passando e mantem o relatorio disponivel como artifact.

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
