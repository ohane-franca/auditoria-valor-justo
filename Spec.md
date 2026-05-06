# Spec.md — Teste de Mensuração de Valor Justo de Ativos Digitais

> **Status:** Atualizada para implementação Binance + PTAX (fonte única).

---

## 1. Overview da Solução

Ferramenta web de uso interno por auditores contábeis para testar a mensuração de valor justo de ativos digitais, conforme NBC TA 540 e Resolução BCB 5821.

**Fluxo resumido:**

```
Auditor faz upload de .xlsx
        ↓
Backend valida estrutura da planilha
        ↓
Para cada linha: consulta Binance (close 23h59 BRT via candle 1h) em paralelo com PTAX venda (BCB)
        ↓
Calcula valor_justo, valor_declarado_x_valor_justo e status
        ↓
Exporta Teste_ValorJusto_[DATA_EXECUCAO].xlsx com 2 abas
```

**Premissas e limitações:**
- A ferramenta gera **evidências** — o julgamento contábil é sempre do auditor.
- Preços em USD (USDT), convertidos para BRL via PTAX venda do BCB.
- `data_base` é interpretada como **dia calendário no Brasil (UTC-3)**.
- Para preço de cripto, capturamos o **close às 23h59 BRT** usando o candle **1h** da Binance correspondente a **02:00–02:59 UTC do dia D+1**.
- Chaves de API nunca expostas ao frontend; toda lógica de chamada às exchanges roda exclusivamente em API Routes do Next.js.

---

## 2. Stack Tecnológico com Justificativa

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 16 (App Router) | Já presente no projeto; suporte nativo a API Routes mantém lógica sensível no servidor |
| Linguagem | TypeScript 5 | Tipagem estrita reduz erros em cálculos financeiros |
| UI | Tailwind CSS v4 + shadcn/ui | Tailwind já configurado; shadcn entrega componentes acessíveis sem runtime CSS extra |
| Parse de Excel (entrada) | SheetJS (xlsx) | Leitura de .xlsx no servidor sem dependências nativas |
| Geração de Excel (saída) | ExcelJS | Melhor controle de formatação/abas (Resultados + Metadados) |
| HTTP cliente (APIs externas) | fetch nativo (Node 18+) | Sem dependência extra; suporte a AbortController para timeouts |
| Variáveis de ambiente | .env (Next.js built-in) | Chaves nunca expostas ao bundle do cliente |
| Hospedagem | Railway | Deploy zero-config para Next.js; serverless functions para as API Routes |

**Dependências principais:**
- `xlsx` (entrada)
- `exceljs` (saída)

---

## 3. Telas da Interface

### 3.1 Tela Única — Upload e Resultado

A aplicação tem uma única página (`app/page.tsx`). O estado da tela evolui em 4 fases:

---

#### Fase 1 — Idle (estado inicial)

```
┌─────────────────────────────────────────────────────┐
│  Teste de Mensuração de Valor Justo — Ativos Digitais│
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │   📄  Arraste o arquivo .xlsx aqui          │   │
│  │       ou clique para selecionar             │   │
│  │                                             │   │
│  │   Layout esperado:                          │   │
│  │   ticker | quantidade | valor_declarado |   │   │
│  │   data_base (YYYY-MM-DD)                    │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Baixar planilha modelo]                           │
└─────────────────────────────────────────────────────┘
```

Componentes:
- `DropzoneArea` — drag-and-drop com fallback de `<input type="file" accept=".xlsx">`
- Link para download de planilha modelo estática em `/public/modelo.xlsx`

---

#### Fase 2 — Processando

```
┌─────────────────────────────────────────────────────┐
│  Processando…                                       │
│                                                     │
│  [████████████░░░░░░░░]  8 de 12 linhas             │
│                                                     │
│  Consultando exchanges e PTAX BCB.                  │
│  Não feche esta janela.                             │
└─────────────────────────────────────────────────────┘
```

Componentes:
- `Progress` (shadcn) alimentado por Server-Sent Events (SSE) do endpoint `/api/audit/progress/[jobId]`
- Mensagem de status textual

---

#### Fase 3 — Resultado com Sucesso

```
┌─────────────────────────────────────────────────────┐
│  Processamento concluído                            │
│                                                     │
│  12 linhas processadas                              │
│   ✓  9  APROVADO                                    │
│   ⚠  3  ALERTA                                      │
│                                                     │
│  [⬇ Baixar Teste_ValorJusto_20250501_143022.xlsx]   │
│                                                     │
│  [Nova auditoria]                                   │
└─────────────────────────────────────────────────────┘
```

Componentes:
- Contadores por status
- Botão de download que aciona `/api/audit/download/[jobId]`
- Botão "Nova auditoria" que reseta para Fase 1

---

#### Fase 4 — Erro de Validação

```
┌─────────────────────────────────────────────────────┐
│  ✗  Planilha inválida                               │
│                                                     │
│  Colunas obrigatórias ausentes: valor_declarado     │
│  Linha 4: data_base fora do formato YYYY-MM-DD      │
│                                                     │
│  [Tentar novamente]                                 │
└─────────────────────────────────────────────────────┘
```

Componentes:
- Lista de erros de validação retornados pelo backend
- Botão de reset

---

## 4. Endpoints do Backend

Todas as rotas ficam em `app/api/`.

---

### 4.1 `POST /api/audit/start`

Recebe o arquivo, valida, inicia o processamento em background e retorna um `jobId`.

**Request:**
```
Content-Type: multipart/form-data
Body:
  file: File  (.xlsx)
```

**Response 200:**
```typescript
{
  jobId: string          // UUID v4
  total: number           // linhas válidas a processar (para UI de progresso)
}
```

**Response 400 — Validação:**
```typescript
{
  error: "VALIDATION_ERROR",
  details: string[]      // lista de mensagens de erro
}
```

**Validações realizadas:**
1. Arquivo é .xlsx e tamanho ≤ 5 MB
2. Aba 1 contém exatamente as colunas: `ticker`, `quantidade`, `valor_declarado`, `data_base`
3. Nenhuma célula obrigatória vazia
4. `data_base` em formato `YYYY-MM-DD` e data válida (deve ser uma data passada — não pode ser hoje ou futura)
5. `quantidade` e `valor_declarado` são numéricos (podem ser zero ou negativos). Valores vazios ou não numéricos são rejeitados; cenários especiais de quantidade zero/negativa são tratados no processamento (ver regras do orchestrator).

---

### 4.2 `GET /api/audit/progress/[jobId]`

Stream SSE do progresso do job.

**Response:** `text/event-stream`

Eventos emitidos:
```typescript
// Progresso
data: { type: "progress", processed: number, total: number }

// Conclusão
data: { type: "done", summary: AuditSummary }

// Erro fatal
data: { type: "error", message: string }
```

```typescript
type AuditSummary = {
  total: number
  aprovado: number
  alerta: number
  erro: number
}
```

---

### 4.3 `GET /api/audit/status/[jobId]`

Snapshot JSON do job (polling pela UI e ferramentas de diagnóstico).

**Response 200:**
```typescript
{
  status: "pending" | "processing" | "done" | "error"
  processed: number
  total: number
  summary: AuditSummary | null
  error: string | null
}
```

**Response 404:** `{ error: "JOB_NOT_FOUND" }` quando o `jobId` não existe **nesta instância** (ID inválido ou Map sem afínidade entre réplicas).

---

### 4.4 `GET /api/audit/download/[jobId]`

Retorna o arquivo .xlsx gerado.

**Response 200:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="Teste_ValorJusto_20250501_143022.xlsx"
Body: Buffer (arquivo xlsx)
```

**Response 404:**
```typescript
{ error: "JOB_NOT_FOUND" }
```

**Response 425 (Too Early):**
```typescript
{ error: "JOB_NOT_READY" }
```

---

### 4.5 Endpoints internos (não expostos ao cliente)

Estes módulos são funções TypeScript chamadas internamente pelo job de processamento, não rotas HTTP expostas.

#### `fetchBinanceClose(ticker: string, date: string): Promise<{ price: number; dateUsed: string } | null>`
#### `fetchPtax(date: string): Promise<{ rate: number; dateUsed: string } | null>`

Retornam `null` quando o dado não está disponível (ticker não encontrado, timeout após retentativas, resposta vazia).

---

## 5. Estrutura de Pastas do Projeto

```
auditoria-valor-justo/
├── app/
│   ├── api/
│   │   └── audit/
│   │       ├── start/
│   │       │   └── route.ts          # POST — upload e início do job
│   │       ├── progress/
│   │       │   └── [jobId]/
│   │       │       └── route.ts      # GET — SSE de progresso
│   │       ├── status/
│   │       │   └── [jobId]/
│   │       │       └── route.ts      # GET — snapshot JSON (polling)
│   │       └── download/
│   │           └── [jobId]/
│   │               └── route.ts      # GET — download do xlsx
│   ├── page.tsx                      # Tela única (upload → resultado)
│   ├── layout.tsx
│   ├── globals.css
│   ├── style-guides/
│   │   └── page.tsx              # Referência visual do design system
│   └── styles/
│       └── tokens.css            # Tokens de design (fonte da verdade)
├── lib/
│   ├── audit/
│   │   ├── orchestrator.ts           # Coordena o fluxo dos 8 passos
│   │   ├── validator.ts              # Valida estrutura da planilha
│   │   ├── price-calculator.ts      # Status (APROVADO/ALERTA) por desvio percentual
│   │   └── excel-exporter.ts        # Monta e serializa o xlsx de saída (2 abas)
│   │   └── constants.ts             # Fonte da verdade: textos fixos, thresholds e metadados
│   └── exchanges/
│       ├── binance.ts                # fetchBinanceClose
│       └── ptax.ts                   # fetchPtax
│       └── token-config.ts           # Configurações de tokens (stablecoins, aliases, retry)
├── store/
│   └── jobs.ts                       # Map em memória: jobId → JobState
├── components/
│   └── ui/
│       ├── StatusBadge.tsx       # Badge de status (5 variantes)
│       ├── DataTable.tsx         # Tabela com zebra striping e estado vazio
│       ├── UploadDropzone.tsx    # Dropzone com feedback de arquivo
│       ├── AlertCard.tsx         # Card de alerta de consistência
│       └── MetricCard.tsx        # Card de contador por status
├── scripts/
│   └── diagnostic-audit-flow.mjs     # POST + poll status (sem SSE)
├── public/
│   └── modelo.xlsx                   # Planilha modelo para download
├── .env                              # Chaves de API (nunca commitado)
├── CLAUDE.md
├── Spec.md
└── package.json
```

**Nota sobre persistência de jobs:** O estado dos jobs fica em um `Map` em memória (`store/jobs.ts`). Ele só existe **dentro do mesmo processo Node**. Em hospedagem com **várias réplicas/workers** ou balanceamento sem afínidade de sessão, um `POST /api/audit/start` pode criar o job na **instância A** enquanto `GET /api/audit/status/...`, SSE ou download podem cair na **instância B**, resultando em **`404`**, progresso parado ou “conexão interrompida” sem falha de Binance/PTAX.

**Verificação operacional:** confirmar no painel (ex.: Railway) que há **apenas uma réplica** para esta versão, ou aplicar **sticky sessions** ao mesmo worker, ou migrar para **armazenamento compartilhado** (Redis, banco, objeto storage para o xlsx + metadados).

**Diagnóstico sem SSE/UI:** com o app rodando, execute `npm run diagnostic:audit -- ./public/modelo.xlsx http://localhost:3000` (ajuste URL e caminho). O script faz apenas `POST` + polling em `/api/audit/status/[jobId]` e imprime HTTP + JSON a cada segundo — útil para separar problema de EventSource/proxy de problema de instância ou job.

**Escopo atual:** O xlsx gerado permanece em memória no `JobState` até o download; completar upload → resultado na mesma janela continua sendo o fluxo esperado.

---

## 6. Mapeamento dos Endpoints Externos

### 6.1 Binance — `GET /api/v3/klines`

**Base URL:** `https://api.binance.com`

**Objetivo:** obter o preço de fechamento (close) **às 23h59 BRT** do dia `data_base`.

**Request:**
```
GET /api/v3/klines
  ?symbol=BTCUSDT
  &interval=1h
  &startTime={unix_ms_02:00Z_do_dia_D+1}
  &endTime={unix_ms_02:59:59.999Z_do_dia_D+1}
  &limit=1
```

**Exemplo para 2024-12-31 (D):**
```
startTime = 1735696800000   (2025-01-01T02:00:00Z em ms)
endTime   = 1735700399999   (2025-01-01T02:59:59.999Z em ms)
```

**Response (array de arrays):**
```json
[
  [
    1735603200000,  // [0] Open time (ms)
    "96200.00",     // [1] Open
    "96600.00",     // [2] High
    "96100.00",     // [3] Low
    "96400.00",     // [4] Close  ← valor usado
    "1234.567",     // [5] Volume
    1735689599999,  // [6] Close time (ms)
    "...",          // [7..11] ignorados
  ]
]
```

**Campo extraído:** índice `[4]` do primeiro elemento → `parseFloat("96400.00")`.

**Resposta vazia** (array `[]`): data indisponível (feriado/fim de semana/sem candle) → tenta dia anterior (retroativo) até 5 dias; se esgotar, retorna `null`.

**Mapeamento de ticker:** `{ticker}USDT` — ex: `BTC` → `BTCUSDT`

**Rate limit:** 1.200 request weight/min. Cada klines = weight 2. Delay mínimo: 100 ms entre requisições.

**Retry:** backoff exponencial — 500 ms, 1.000 ms, 2.000 ms (máx 3 retentativas). HTTP 429 ou 5xx disparam retry.

---

> Nesta versão, a ferramenta consulta **apenas Binance + PTAX (BCB)**.

**Retry:** mesmo padrão — 500 ms, 1.000 ms, 2.000 ms.

---

### 6.4 PTAX BCB — `GET CotacaoDolarDia`

**Base URL:** `https://olinda.bcb.gov.br`

**Autenticação:** Nenhuma.

**Request:**
```
GET /olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)
  ?@dataCotacao='{MM-DD-YYYY}'
  &$top=1
  &$format=json
  &$select=cotacaoVenda,dataHoraCotacao
```

**Exemplo para 2024-12-31:**
```
@dataCotacao='12-31-2024'
```

**Response:**
```json
{
  "value": [
    {
      "cotacaoVenda":      6.1803,
      "dataHoraCotacao":  "2024-12-31 13:08:46.223"
    }
  ]
}
```

**Campo extraído:** `value[0].cotacaoVenda` → `6.1803`.

**`value` vazio** (fim de semana, feriado ou dado não disponível): buscar o dia útil anterior iterando até encontrar (máx 5 tentativas retroativas). Registrar em `observacao`: `"PTAX utilizada: YYYY-MM-DD (data_base sem cotação)"`.

**Fuso:** A API retorna dados em horário de Brasília (UTC-3). A `data_base` passada à API deve ser a data em UTC-3 — na prática idêntica à `data_base` fornecida na planilha, que já representa o dia calendário no Brasil.

**Retry:** mesmo padrão exponencial para falhas HTTP.

---

## 7. Regras de Cálculo — Referência

### 7.1 Preço e câmbio utilizados

- `close_USDT_BRT`: close às **23h59 BRT** da `data_base` (via candle 1h 02:00–02:59 UTC do dia D+1), em **USDT**.
- `close_21UTC_USD`: close às **21:59 UTC** da `data_base` (via candle 1h 21:00–21:59 UTC do próprio dia). Campo de evidência; não usado em cálculos.
- `ptax_data_base`: **PTAX venda** (BCB) para a `data_base` (UTC-3). Em caso de ausência de cotação (feriado/fim de semana), usar o dia útil anterior (máx 5 dias retroativos) e registrar em `observacao`.

### 7.1.1 Resolução de tokens (pré-consulta)

Antes de consultar a Binance, o ticker passa por uma etapa de resolução, com quatro categorias:

1. **Stablecoins USD** — preço fixo $1,0000, sem consulta à API.
2. **Rebranding** — ticker antigo mapeado para ticker atual antes da consulta; alias registrado em `observacao`.
3. **Par alternativo** — previsto para próxima iteração.
4. **Não listado** — status `ERRO`, sem preço de mercado observável, requer critério alternativo de mensuração pelo auditor.

### 7.2 Fluxo de Cálculo

| Variável | Fórmula |
|---|---|
| valor_justo | close_USDT_BRT × ABS(quantidade) × ptax_data_base quando quantidade ≠ 0 (BRL total); ver quantidade zero abaixo |
| valor_declarado_x_valor_justo | ((valor_declarado − valor_justo) ÷ valor_justo) × 100 |
| status | APROVADO se ABS(valor_declarado_x_valor_justo) ≤ 1,5% \| ALERTA se ABS(valor_declarado_x_valor_justo) > 1,5% |
| observacao | Registra datas retroativas quando diferentes da data_base |

**Ajustes de quantidade no processamento (`orchestrator`):**

- `quantidade < 0`: usa **ABS(quantidade)** no cálculo de `valor_justo`; `observacao` inclui: `Quantidade negativa — verificar natureza da posição`.
- `quantidade === 0`: não calcula `valor_justo`; `valor_justo` e `valor_declarado_x_valor_justo` como `N/D`; `status = ERRO`; `observacao` inclui: `Quantidade zero — valor justo não calculado`.
- `valor_declarado === 0`: processamento normal da métrica (tende a `valor_declarado_x_valor_justo` negativo e `ALERTA` se acima do threshold em valor absoluto).

### 7.3 Tratamento de fim de semana / feriado nos preços de exchange

Ao consultar um candle e receber resposta vazia:
1. Subtrair 1 dia e repetir (máx 5 dias retroativos).
2. Se encontrar dado: usar o `close` e registrar em `observacao`: `"Fechamento utilizado: YYYY-MM-DD (data_base indisponível)"`.
3. Se não encontrar em 5 dias: registrar `"N/D"`.

---

## 8. Estrutura da Planilha Exportada

### Aba 1 — Resultados

| Coluna | Tipo | Descrição |
|---|---|---|
| ticker | string | Conforme informado |
| quantidade | number | Conforme informado |
| valor_declarado | number | Conforme informado (BRL total) |
| data_base | string | YYYY-MM-DD |
| close_USDT_BRT | number \| "N/D" | Preço de fechamento em USDT (23h59 BRT) |
| close_21UTC_USD | number \| "N/D" | Preço de fechamento em USD (21:59 UTC) — evidência |
| ptax_data_base | number \| "N/D" | Taxa PTAX venda (BRL/USD) |
| valor_justo | number \| "ERRO" | Em BRL total |
| valor_declarado_x_valor_justo | number \| "ERRO" | Em % com sinal (ex: -1.52) |
| status | "APROVADO" \| "ALERTA" \| "ERRO" | |
| observacao | string | Vazio se sem observação |

### Aba 2 — Metadados

| Campo | Valor |
|---|---|
| Data e hora da execução | DD/MM/YYYY HH:MM:SS (UTC-3) |
| Versão da ferramenta | 1.0.0 |
| APIs consultadas | Binance, PTAX BCB |
| Nota metodológica | "valor_justo = preco_binance (close 23h59 BRT) × PTAX venda (BCB)." |
| Fuso horário — preços | BRT (UTC-3) |
| Fuso horário — PTAX | UTC-3 (Brasília) |

---

## 9. Segurança e Variáveis de Ambiente

Variáveis requeridas no `.env`:

```
BINANCE_API_KEY=
BINANCE_API_SECRET=
```

Regras:
- Nenhuma variável `NEXT_PUBLIC_` para secrets.
- As API Routes nunca retornam as chaves em suas respostas.
- `.env` listado no `.gitignore` (já confirmado).

---

## 10. Design System

### Tokens

Todos os tokens de design estão definidos em `app/styles/tokens.css`.
Nenhum componente pode usar valores hardcoded — apenas variáveis CSS.

### Cores

| Token | Valor |
|---|---|
| `--color-primary` | `#1B2A4A` |
| `--color-secondary` | `#2D6DB4` |
| `--color-background` | `#F8F9FA` |
| `--color-surface` | `#FFFFFF` |
| `--color-text` | `#1A1A2E` |
| `--color-text-muted` | `#6C757D` |

### Estados de Status

| Token (bg / text) | Fundo | Texto |
|---|---|---|
| `--status-aprovado-bg/text` | `#D4EDDA` | `#155724` |
| `--status-alerta-bg/text` | `#F8D7DA` | `#721C24` |
| `--status-verificar-bg/text` | `#FFF3CD` | `#856404` |
| `--status-atencao-bg/text` | `#FFE5CC` | `#7D3C00` |
| `--status-erro-bg/text` | `#E2E3E5` | `#383D41` |

### Tipografia

- Fonte: Inter (Google Fonts, carregada via `next/font/google`)
- Títulos: `font-weight 600`
- Corpo: `font-weight 400`
- Tamanhos: `xs` 12px · `sm` 14px · `md` 16px · `lg` 20px · `xl` 24px · `2xl` 32px
- Números financeiros: `font-family: monospace`, alinhamento à direita

### Espaçamento

Escala de 8 pontos: `4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px`

### Bordas

- Raio: `sm` 4px · `md` 8px · `lg` 12px · `pill` 9999px
- Espessura padrão: `1px` · Cor padrão: `#DEE2E6`

### Sombras

| Token | Valor |
|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.10)` |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.12)` |

### Componentes implementados

Todos os componentes estão em `components/ui/` e usam exclusivamente variáveis de `tokens.css`:

| Componente | Arquivo | Descrição |
|---|---|---|
| `StatusBadge` | `StatusBadge.tsx` | Badge pill com 5 variantes de status |
| `DataTable` | `DataTable.tsx` | Tabela com zebra striping, font-mono numérico e estado vazio |
| `UploadDropzone` | `UploadDropzone.tsx` | Dropzone com feedback de arquivo selecionado |
| `AlertCard` | `AlertCard.tsx` | Card de alerta de consistência com 3 variantes (ATENÇÃO, VERIFICAR, ERRO) |
| `MetricCard` | `MetricCard.tsx` | Card de contador por status com borda superior colorida |

### Referência visual

A página `app/style-guides/page.tsx` é a referência visual obrigatória durante toda a implementação. Qualquer novo componente deve ser adicionado a essa página antes de ser usado na aplicação.

---

## 11. Backlog — Não implementar nesta versão

Os seguintes itens foram conscientemente excluídos desta versão e **não devem ser implementados**:

### 1. Autenticação e controle de acesso
- Login de usuários
- Perfis e permissões
- Controle de quem pode executar testes

### 2. Hash de integridade e rastreabilidade
- Hash do arquivo exportado para garantir imutabilidade
- Registro de IP e usuário por execução
- URL exata das chamadas de API como evidência auditável

---

*Fim da Spec. Aguardando aprovação para início da implementação.*
