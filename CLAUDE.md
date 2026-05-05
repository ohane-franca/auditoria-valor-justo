# Contexto do Projeto
Ferramenta interna de auditoria financeira de ativos digitais.
CLA Brasil — Teste de Mensuração de Valor Justo (Resolução BCB 5821).

# Stack
- Framework: Next.js 16 (App Router) + TypeScript
- UI: Tailwind CSS + Shadcn + tokens em app/styles/tokens.css
- Excel: ExcelJS
- Hospedagem: Railway

# Estrutura de pastas relevante
- app/api/audit/         → 3 rotas (start, progress, download)
- lib/audit/             → validator, price-calculator, excel-exporter, orchestrator
- lib/exchanges/         → binance, ptax
- store/jobs.ts          → Map em memória de jobs
- components/ui/         → StatusBadge, DataTable, UploadDropzone,
                           AlertCard, MetricCard
- app/style-guides/      → referência visual obrigatória
- app/styles/tokens.css  → fonte da verdade de design

# Modelo de cálculo
- valor_justo = result_binance (close 23h59 BRT) × ptax_data_base
- Preço capturado via candle 1h Binance: 02:00–02:59 UTC D+1 = 23:00–23:59 BRT D
- calcularStatus() para APROVADO/ALERTA (desvio > 1.5%)
- Sem cross-checking entre exchanges

# Colunas do Excel (Resultados)
ticker | quantidade | valor_declarado | data_base |
result_binance | ptax_data_base | valor_justo |
diferenca_percentual | status | observacao

# Componentes disponíveis (usar sempre antes de criar novos)
- StatusBadge    → badge de status (APROVADO/ALERTA/VERIFICAR/ATENÇÃO/ERRO)
- DataTable      → tabela com zebra striping, font-mono e estado vazio
- UploadDropzone → dropzone com feedback de arquivo selecionado
- AlertCard      → card de alerta (uso genérico)
- MetricCard     → card de contador por status

# Regras obrigatórias
- Nunca escreva código sem Spec aprovada
- Toda lógica de API exclusivamente no backend (API Routes)
- Chaves de API sempre via .env — nunca no frontend
- Usar apenas variáveis CSS de tokens.css — nunca valores hardcoded
- Consultar /style-guides antes de criar qualquer componente novo
- Context window: nunca ultrapassar 40-50%

# Estado atual da implementação
- ✅ Passo 1: Estrutura de pastas e setup
- ✅ Passo 2: Upload e validação da planilha
- ✅ Passo 3: Integração Binance (candle 1h, 23h59 BRT)
- ✅ Passo 4: Integração PTAX BCB
- ✅ Passo 5: Cálculos (valor_justo, diferenca_percentual, status)
- ✅ Passo 6: Exportação Excel — ExcelJS (2 abas)
- ✅ Passo 7: Interface completa (4 fases)
- ✅ Passo 8: Ajustes críticos (fonte única, BRT, metadados)
- 🔄 Passo 9: Segurança, pré-lançamento e deploy

# Backlog — não implementar
- Autenticação e controle de acesso
- Hash de integridade e rastreabilidade da evidência
- Tela de confirmação de exportação (nome auditor e cliente)
- Range High-Low por ativo
