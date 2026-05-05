# Teste de Mensuração de Valor Justo — Ativos Digitais
**CLA Brasil · Uso interno · v1.0.0**

Ferramenta de auditoria para mensuração de valor justo de ativos 
digitais conforme NBC TA 540 e Resolução BCB 5821.

## Pré-requisitos
- Node.js 18+
- npm 9+
 

## Instalação
```bash
git clone [url-do-repositorio]
cd auditoria-valor-justo
npm install
cp .env.example .env
# Preencha as variáveis no .env
```

## Rodando localmente
```bash
npm run dev
# Acesse: http://localhost:3000
```

## Como usar
1. Acesse a ferramenta pelo navegador
2. Faça o download da planilha modelo (botão na tela inicial)
3. Preencha com os dados: ticker, quantidade, valor_declarado, data_base
4. Faça o upload da planilha preenchida
5. Clique em "Processar"
6. Aguarde o processamento (pode levar alguns minutos)
7. Faça o download do resultado

## Formato da planilha de entrada
| Coluna | Formato | Exemplo |
|---|---|---|
| ticker | Texto (ex: BTC, ETH) | BTC |
| quantidade | Número positivo | 2.5 |
| valor_declarado | Número positivo (BRL total) | 750000 |
| data_base | YYYY-MM-DD | 2024-12-31 |

## Planilha de saída
Arquivo Excel com 2 abas:
- **Resultados**: dados originais + evidências de consulta + status
- **Metadados**: informações da execução e nota metodológica

## Referência de design
Acesse `/style-guides` para visualizar o design system completo.

## Backlog (próximas versões)
- Autenticação e controle de acesso
- Hash de integridade das evidências
