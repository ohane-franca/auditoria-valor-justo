# Contexto do Projeto

Ferramenta interna de auditoria financeira de ativos digitais.

Teste de Mensuração de Valor Justo (**Resolução CMN nº 5.281/2026 / CPC 46**, conforme `lib/audit/constants.ts`).

# Stack

- Framework: Next.js 16 (App Router) + TypeScript
- UI: Tailwind CSS + Shadcn + tokens em `app/styles/tokens.css`
- Excel: ExcelJS (saída); SheetJS `xlsx` (entrada)
- Hospedagem alvo: Railway (ver **Problema atual** abaixo)

# Estrutura de pastas relevante

- `app/api/audit/` → **4 rotas**: `start`, `progress/[jobId]`, `status/[jobId]`, `download/[jobId]`
- `lib/audit/` → `validator`, `price-calculator`, `excel-exporter`, `orchestrator`, `constants`
- `lib/exchanges/` → `binance`, `ptax`, `token-config.ts` (stablecoins, aliases, retry, retroativos)
- `store/jobs.ts` → Map em memória de jobs
- `components/ui/` → StatusBadge, DataTable, UploadDropzone, AlertCard, MetricCard
- `app/style-guides/` → referência visual obrigatória
- `app/styles/tokens.css` → fonte da verdade de design
- `public/modelo.xlsx` → planilha modelo para download (**pendente de alinhar às colunas atuais**)

**Rotas de debug:** não há `app/api/debug/` no repositório (ex.: `app/api/debug/binance/route.ts` **não existe** — removida / nunca versionada neste estado).

# Modelo de cálculo

- `valor_justo` = `close_USDT_BRT` × ABS(`quantidade`) × `ptax_data_base` quando `quantidade` ≠ 0 (total em BRL); `quantidade` zero → ERRO / N/D
- `valor_declarado_x_valor_justo` = ((`valor_declarado` − `valor_justo`) / `valor_justo`) × 100
- Preço principal: candle 1h Binance **02:00–02:59 UTC do dia D+1** = **23:00–23:59 BRT** do dia `data_base` (par `{ticker}USDT`)
- Evidência adicional (não entra no cálculo): `close_21UTC_USD` — candle 1h **21:00–21:59 UTC** do próprio `data_base` (via `fetchBinanceClose21`; campo exportado com esse nome)
- `calcularStatus()` → APROVADO / ALERTA (|desvio| > 1,5%)
- Sem cross-checking entre exchanges

# Validação de entrada (`validator`)

- Colunas obrigatórias: `ticker`, `quantidade`, `valor_declarado`, `data_base` (AAAA-MM-DD)
- `data_base` deve ser **data passada** (bloqueia **hoje** e **futuro**), comparação em UTC meia-noite

# Colunas do Excel (Resultados)

`ticker` | `quantidade` | `valor_declarado` | `data_base` |
`close_USDT_BRT` | `close_21UTC_USD` | `ptax_data_base` | `valor_justo` |
`valor_declarado_x_valor_justo` | `status` | `observacao`

**Rename concluído:** `close_crypto21` → **`close_21UTC_USD`** (interface Excel, orchestrator, constantes, Spec, este arquivo).

# Componentes disponíveis (usar sempre antes de criar novos)

- StatusBadge → badge de status (APROVADO/ALERTA/VERIFICAR/ATENÇÃO/ERRO)
- DataTable → tabela com zebra striping, font-mono e estado vazio
- UploadDropzone → dropzone com feedback de arquivo selecionado
- AlertCard → card de alerta (uso genérico)
- MetricCard → card de contador por status

# Regras obrigatórias

- Nunca escreva código sem Spec aprovada
- Toda lógica de API exclusivamente no backend (API Routes)
- Chaves de API sempre via `.env` — nunca no frontend
- Usar apenas variáveis CSS de `tokens.css` — nunca valores hardcoded
- Nunca hardcodar textos de `observacao` fora de `constants.ts`
- Nunca hardcodar configurações de token fora de `token-config.ts`
- Para novo rebranding: apenas `TICKER_ALIASES` em `token-config.ts`
- Para nova stablecoin: apenas `USD_STABLECOINS` em `token-config.ts`
- Consultar `/style-guides` antes de criar qualquer componente novo
- Context window: nunca ultrapassar 40–50%

# Estado atual da implementação (sprints / passos)

- ✅ Passo 1: Estrutura de pastas e setup
- ✅ Passo 2: Upload e validação da planilha
- ✅ Passo 3: Integração Binance (candle 1h, 23h59 BRT em USDT)
- ✅ Passo 4: Integração PTAX BCB
- ✅ Passo 5: Cálculos (`valor_justo`, `valor_declarado_x_valor_justo`, status)
- ✅ Passo 6: Exportação Excel — ExcelJS (2 abas)
- ✅ Passo 7: Interface completa (4 fases)
- ✅ Passo 8: Ajustes críticos (fonte única, BRT, metadados; colunas e nomenclatura alinhadas)
- 🔄 **Passo 9:** Segurança, pré-lançamento e deploy (**em andamento** — ver problema Railway/Binance)

# Problema atual (operacional)

- **Binance bloqueando ou restrinja o IP da infraestrutura Railway**, impedindo ou degradando `fetch` à API pública em produção.
- **Em backlog operacional:** avaliar **alternativa de cloud / egress** (outro provedor, proxy/IP fixo permitido, ou caminho arquitetural compatível com as políticas da Binance), sem comprometer a regra de secrets só no backend.

# Próximos passos pendentes

1. Atualizar **`public/modelo.xlsx`** para refletir colunas e regras atuais (incl. `close_USDT_BRT`, `close_21UTC_USD`, `valor_declarado_x_valor_justo`, validação de `data_base`).
2. Atualizar **`Spec.md`** até ficar 100% alinhada ao código e ao modelo de Excel (remover trechos obsoletos se houver).
3. **Teste com data recente** (pós-deploy ou ambiente com Binance acessível) para validar fluxo completo e evidências.
4. **Commit** das últimas alterações (mensagem clara: renomes, validador, doc).

# Backlog — não implementar (produto)

- Autenticação e controle de acesso
- Hash de integridade e rastreabilidade da evidência
- Tela de confirmação de exportação (nome auditor e cliente)
- Range High-Low por ativo
