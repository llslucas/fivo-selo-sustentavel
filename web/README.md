# web

Frontend do projeto Selo Sustentável (Next.js 16 · React 19 · MUI 9 · TypeScript 5).

## Scripts

| Script          | Comando        | Descrição                                   |
| --------------- | -------------- | ------------------------------------------- |
| `npm run dev`   | `next dev`     | Servidor de desenvolvimento (porta 3001).   |
| `npm run build` | `next build`   | Build de produção.                          |
| `npm run start` | `next start`   | Servidor de produção.                       |
| `npm run lint`  | `eslint`       | Análise estática do código.                 |
| `npm test`      | `vitest run`   | Executa a suíte de testes (ver abaixo).     |

## Testes

A suíte de testes do frontend é executada com um único comando documentado,
a partir do diretório `web/`:

```bash
npm test
```

O script `test` do `package.json` invoca `vitest run`.

### Execução não interativa

- `vitest run` roda a suíte em **modo de execução única**: executa todos os
  arquivos de teste uma vez e encerra. Não entra em modo de observação (watch)
  e não aguarda entrada do usuário.
- O código de saída é `0` quando todos os testes passam e diferente de `0`
  quando algum teste falha ou quando nenhum arquivo de teste é encontrado,
  tornando o comando apropriado para automação (CI/CD).

### Ambiente limpo (sem API, banco ou rede)

- A suíte roda de forma determinística em **ambiente limpo**: não depende de
  uma API em execução, de banco de dados nem de configuração de serviços
  externos.
- Todo o tráfego HTTP é **interceptado por mocks** — o cliente HTTP
  (`fetch`/`request`) é substituído por um Mock_API que devolve respostas
  pré-definidas no próprio teste. Nenhuma conexão real a API, banco ou rede
  é estabelecida.
- Requisições de rede não interceptadas são bloqueadas antes de qualquer
  transmissão externa e fazem o teste correspondente falhar, indicando o
  destino não interceptado.
