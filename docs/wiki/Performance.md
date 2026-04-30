# Performance

Esta pagina descreve os testes automatizados de performance da Cashback Marketplace API.

## Ferramenta

Os testes usam k6 e fazem chamadas HTTP reais contra a API Express.

## Endpoints cobertos

- `GET /health`
- `POST /v1/auth/admin/login`
- `POST /v1/auth/user/login`
- `GET /v1/campaigns`
- `POST /v1/campaigns`
- `GET /v1/campaigns/{campaignId}`
- `GET /v1/users/me/campaigns`
- `POST /v1/simulations/cashback`

## Como executar

```bash
npm run test:performance
```

O comando sobe a API localmente e executa o script `tests/performance/cashback-api.k6.js`.

## Cenario atual

- Executor: `ramping-vus`
- Rampa: ate 5 usuarios virtuais
- Duracao total: aproximadamente 40 segundos
- Relatorio HTML: `reports/performance/summary.html`
- Relatorio JSON: `reports/performance/summary.json`

## Thresholds

- `http_req_failed < 5%`
- `http_req_duration p95 < 750ms`
- `business_success_rate > 95%`
- `created_campaign_duration p95 < 900ms`

## Ultima execucao local

- Resultado: sucesso
- Checks: 1495 aprovados, 0 falhas
- `http_req_failed`: 0%
- `http_req_duration p95`: aproximadamente 4.51 ms
