# Spec.md — Teste de Mensuração de Valor Justo de Ativos Digitais

> **Status:** Aguardando aprovação. Nenhum código será escrito antes da aprovação desta Spec.

---

## 1. Overview da Solução

Ferramenta web de uso interno por auditores contábeis para testar a mensuração de valor justo de ativos digitais, conforme NBC TA 540 e Resolução BCB 5821.

**Fluxo resumido:**

```
Auditor faz upload de .xlsx
        ↓
Backend valida estrutura da planilha
        ↓
Para cada linha: consulta Binance + Coinbase + Bybit em paralelo (candle close diário, UTC)
        ↓
Calcula preco_referencia (mediana das fontes disponíveis)
        ↓
Consulta PTAX venda (BCB) para a data_base em UTC-3
        ↓
Calcula valor_justo, diferenca_percentual e status
        ↓
Exporta Teste_ValorJusto_[DATA_EXECUCAO].xlsx com 2 abas
```

**Premissas e limitações:**
- A ferramenta gera **evidências** — o julgamento contábil é sempre do auditor.
- Preços em USD (USDT), convertidos para BRL via PTAX venda do BCB.
- Datas de preço interpretadas em UTC; PTAX interpretada em UTC-3 (Brasília).
- Chaves de API nunca expostas ao frontend; toda lógica de chamada às exchanges roda exclusivamente em API Routes do Next.js.

---

## 2. Stack Tecnológico com Justificativa

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 15 (App Router) | Já presente no projeto; suporte nativo a API Routes mantém lógica sensível no servidor |
| Linguagem | TypeScript 5 | Tipagem estrita reduz erros em cálculos financeiros |
| UI | Tailwind CSS v4 + shadcn/ui | Tailwind já configurado; shadcn entrega componentes acessíveis sem runtime CSS extra |
| Parse de Excel (entrada) | SheetJS (xlsx) | Leitura de .xlsx no servidor sem dependências nativas |
| Geração de Excel (saída) | SheetJS (xlsx) | Mesma lib; evita dependência adicional |
| HTTP cliente (APIs externas) | fetch nativo (Node 18+) | Sem dependência extra; suporte a AbortController para timeouts |
| Variáveis de ambiente | .env (Next.js built-in) | Chaves nunca expostas ao bundle do cliente |
| Hospedagem | Railway | Deploy zero-config para Next.js; serverless functions para as API Routes |

**Dependências novas a instalar:**
```bash
npm install xlsx shadcn-ui
npx shadcn@latest init
```

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
│  Alertas de consistência:                           │
│  • BTC (2024-12-31): VERIFICAR — desvio de 2,1%...  │
│  • XRP (2024-12-31): ATENÇÃO — fonte única…         │
│                                                     │
│  [⬇ Baixar Teste_ValorJusto_20250501_143022.xlsx]   │
│                                                     │
│  [Nova auditoria]                                   │
└─────────────────────────────────────────────────────┘
```

Componentes:
- Contadores por status
- Lista de alertas (apenas linhas com `alerta_consistencia` não vazio)
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
4. `data_base` em formato `YYYY-MM-DD` e data válida (não futura)
5. `quantidade` e `valor_declarado` são números positivos

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
  alerts: AlertItem[]   // linhas com alerta_consistencia não vazio
}

type AlertItem = {
  ticker: string
  data_base: string
  alerta_consistencia: string
}
```

---

### 4.3 `GET /api/audit/download/[jobId]`

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

### 4.4 Endpoints internos (não expostos ao cliente)

Estes módulos são funções TypeScript chamadas internamente pelo job de processamento, não rotas HTTP expostas.

#### `fetchBinanceClose(symbol: string, date: string): Promise<number | null>`
#### `fetchCoinbaseClose(symbol: string, date: string): Promise<number | null>`
#### `fetchBybitClose(symbol: string, date: string): Promise<number | null>`
#### `fetchPtax(date: string): Promise<number | null>`

Retornam `null` quando o dado não está disponível (ticker não encontrado, timeout após 3 tentativas, resposta vazia).

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
│   │   ├── ticker-mapper.ts          # Mapeia ticker → símbolo de cada exchange
│   │   ├── price-calculator.ts      # Mediana, alertas de consistência, status
│   │   └── excel-exporter.ts        # Monta e serializa o xlsx de saída
│   └── exchanges/
│       ├── binance.ts                # fetchBinanceClose
│       ├── coinbase.ts               # fetchCoinbaseClose
│       ├── bybit.ts                  # fetchBybitClose
│       └── ptax.ts                   # fetchPtax
├── store/
│   └── jobs.ts                       # Map em memória: jobId → JobState
├── components/
│   └── ui/
│       ├── StatusBadge.tsx       # Badge de status (5 variantes)
│       ├── DataTable.tsx         # Tabela com zebra striping e estado vazio
│       ├── UploadDropzone.tsx    # Dropzone com feedback de arquivo
│       ├── AlertCard.tsx         # Card de alerta de consistência
│       └── MetricCard.tsx        # Card de contador por status
├── public/
│   └── modelo.xlsx                   # Planilha modelo para download
├── .env                              # Chaves de API (nunca commitado)
├── CLAUDE.md
├── Spec.md
└── package.json
```

**Nota sobre persistência de jobs:** Em Railway Serverless, o `Map` em memória (`store/jobs.ts`) persiste apenas dentro de uma mesma instância. Para esta versão, o arquivo xlsx gerado é mantido em memória como `Buffer` no `JobState` e servido imediatamente após a conclusão. O fluxo SSE + download deve ser completado na mesma sessão do browser. Não é necessário storage externo nesta versão.

---

## 6. Mapeamento dos Endpoints Externos

### 6.1 Binance — `GET /api/v3/klines`

**Base URL:** `https://api.binance.com`

**Objetivo:** obter o preço de fechamento (close) do candle diário na `data_base`.

**Request:**
```
GET /api/v3/klines
  ?symbol=BTCUSDT
  &interval=1d
  &startTime={unix_ms_início_do_dia_UTC}
  &endTime={unix_ms_fim_do_dia_UTC}
  &limit=1
```

**Exemplo para 2024-12-31:**
```
startTime = 1735603200000   (2024-12-31T00:00:00Z em ms)
endTime   = 1735689599999   (2024-12-31T23:59:59.999Z em ms)
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

**Resposta vazia** (array `[]`): data indisponível → retorna `null`.

**Mapeamento de ticker:** `{ticker}USDT` — ex: `BTC` → `BTCUSDT`

**Rate limit:** 1.200 request weight/min. Cada klines = weight 2. Delay mínimo: 100 ms entre requisições.

**Retry:** backoff exponencial — 500 ms, 1.000 ms, 2.000 ms (máx 3 tentativas). HTTP 429 ou 5xx disparam retry.

---

### 6.2 Coinbase Advanced Trade — `GET /api/v3/brokerage/market/candles`

**Base URL:** `https://api.coinbase.com`

**Autenticação:** API Key + Secret via header `CB-ACCESS-KEY` / `CB-ACCESS-SIGN` / `CB-ACCESS-TIMESTAMP`. Assinatura HMAC-SHA256.

**Request:**
```
GET /api/v3/brokerage/market/candles
  ?product_id=BTC-USD
  &start={unix_seg_início_do_dia_UTC}
  &end={unix_seg_fim_do_dia_UTC}
  &granularity=ONE_DAY

Headers:
  CB-ACCESS-KEY:       {COINBASE_API_KEY}
  CB-ACCESS-SIGN:      {hmac_sha256(timestamp + "GET" + path + body)}
  CB-ACCESS-TIMESTAMP: {unix_seg_atual}
```

**Exemplo para 2024-12-31:**
```
start = 1735603200   (2024-12-31T00:00:00Z)
end   = 1735689600   (2025-01-01T00:00:00Z)
```

**Response:**
```json
{
  "candles": [
    {
      "start":  "1735603200",
      "low":    "96100.00",
      "high":   "96600.00",
      "open":   "96200.00",
      "close":  "96250.00",   // ← valor usado
      "volume": "8765.43"
    }
  ]
}
```

**Campo extraído:** `candles[0].close` → `parseFloat("96250.00")`.

**Array vazio** (`candles: []`): retorna `null`.

**Mapeamento de ticker:** `{ticker}-USD` — ex: `BTC` → `BTC-USD`

**Rate limit:** 30 req/s por IP. Delay mínimo: 50 ms.

**Retry:** mesmo padrão — 500 ms, 1.000 ms, 2.000 ms. HTTP 429 ou 5xx disparam retry.

---

### 6.3 Bybit — `GET /v5/market/kline`

**Base URL:** `https://api.bybit.com`

**Autenticação:** Não requerida para endpoints públicos de mercado.

**Request:**
```
GET /v5/market/kline
  ?category=spot
  &symbol=BTCUSDT
  &interval=D
  &start={unix_ms_início_do_dia_UTC}
  &end={unix_ms_fim_do_dia_UTC}
```

**Exemplo para 2024-12-31:**
```
start = 1735603200000
end   = 1735689599999
```

**Response:**
```json
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "symbol": "BTCUSDT",
    "category": "spot",
    "list": [
      [
        "1735603200000",  // [0] Open time (ms)
        "96200.00",       // [1] Open
        "96600.00",       // [2] High
        "96100.00",       // [3] Low
        "96500.00",       // [4] Close  ← valor usado
        "1100.50",        // [5] Volume
        "106090000.00"    // [6] Turnover
      ]
    ]
  }
}
```

**Campo extraído:** `result.list[0][4]` → `parseFloat("96500.00")`.

**`retCode !== 0`** ou `list` vazio: retorna `null`.

**Mapeamento de ticker:** `{ticker}USDT` — ex: `BTC` → `BTCUSDT`

**Rate limit:** 120 req/min por IP. Delay mínimo: 100 ms.

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

### 7.1 Lógica de `preco_referencia` e `alerta_consistencia`

```typescript
// Valores disponíveis = aqueles que não são null
// Mediana de 3 valores: o valor central após ordenação
// Mediana de 2 valores: média simples

function calcularPrecoReferencia(
  binance: number | null,
  coinbase: number | null,
  bybit: number | null
): { preco: number; alerta: string } {

  const disponiveis = [binance, coinbase, bybit].filter(v => v !== null)

  if (disponiveis.length === 0)
    throw new Error("Nenhuma fonte disponível")   // status = ERRO

  if (disponiveis.length === 1)
    return { preco: disponiveis[0], alerta: "ATENÇÃO — fonte única, revisão obrigatória" }

  const mediana = calcMediana(disponiveis)

  // Verifica desvio > 1,5% em qualquer fonte
  const alertas = []
  const fontes = [
    { nome: "Binance",  valor: binance },
    { nome: "Coinbase", valor: coinbase },
    { nome: "Bybit",    valor: bybit },
  ]
  for (const f of fontes) {
    if (f.valor === null) continue
    const desvio = Math.abs((f.valor - mediana) / mediana) * 100
    if (desvio > 1.5)
      alertas.push(`VERIFICAR — desvio de ${desvio.toFixed(1)}% na ${f.nome}`)
  }

  let alerta = ""
  if (disponiveis.length === 2)
    alerta = "ATENÇÃO — apenas 2 fontes disponíveis"
  if (alertas.length > 0)
    alerta = alertas.join("; ")    // desvio tem precedência se ambos ocorrerem

  return { preco: mediana, alerta }
}
```

### 7.2 Status final

```typescript
// valor_declarado já em BRL (total, não por unidade)
const valorPorUnidade  = valor_declarado / quantidade         // BRL/unidade
const valorJusto       = preco_referencia * ptax_data_base    // BRL/unidade
const diferencaPerc    = Math.abs((valorPorUnidade - valorJusto) / valorJusto) * 100

const status = diferencaPerc > 1.5 ? "ALERTA" : "APROVADO"
```

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
| result_binance | number \| "N/D" | Preço de fechamento em USD |
| result_coinbase | number \| "N/D" | Preço de fechamento em USD |
| result_bybit | number \| "N/D" | Preço de fechamento em USD |
| preco_referencia | number \| "ERRO" | Mediana em USD |
| ptax_data_base | number \| "N/D" | Taxa PTAX venda (BRL/USD) |
| valor_justo | number \| "ERRO" | Em BRL/unidade |
| diferenca_percentual | number \| "ERRO" | Em % (ex: 1.52) |
| status | "APROVADO" \| "ALERTA" \| "ERRO" | |
| alerta_consistencia | string | Vazio se sem alerta |
| observacao | string | Vazio se sem observação |

### Aba 2 — Metadados

| Campo | Valor |
|---|---|
| Data e hora da execução | DD/MM/YYYY HH:MM:SS (UTC-3) |
| Versão da ferramenta | 1.0.0 |
| APIs consultadas | Binance, Coinbase Advanced Trade, Bybit, PTAX BCB |
| Nota metodológica | "preco_referencia = mediana dos valores disponíveis por exchange. Taxa de câmbio: PTAX venda (BCB)." |
| Fuso horário — preços | UTC |
| Fuso horário — PTAX | UTC-3 (Brasília) |

---

## 9. Segurança e Variáveis de Ambiente

Variáveis requeridas no `.env`:

```
BINANCE_API_KEY=
BINANCE_API_SECRET=

COINBASE_API_KEY=
COINBASE_API_SECRET=

BYBIT_API_KEY=
BYBIT_API_SECRET=
```

> Binance e Bybit usam endpoints públicos de klines — as chaves estão previstas para expansões futuras (ex: consulta de saldo). Nesta versão apenas Coinbase requer autenticação nas chamadas de candle.

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
