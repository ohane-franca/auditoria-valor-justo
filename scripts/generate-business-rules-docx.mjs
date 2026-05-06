import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

function h(text, level) {
  return new Paragraph({ text, heading: level });
}

function p(...runs) {
  return new Paragraph({
    children: runs.map((t) => new TextRun(t)),
  });
}

function pText(text) {
  return new Paragraph(text);
}

function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    children: [new Paragraph({ text })],
  });
}

function headerCell(text, opts = {}) {
  return new TableCell({
    width: opts.width
      ? { size: opts.width, type: WidthType.PERCENTAGE }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true })],
      }),
    ],
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const titulo = "Regras de Negócio — Teste de Mensuração de Valor Justo";
const subtitulo =
  "Documento A (linguagem simples) + Documento C (tabela de decisões) — versão atualizada";

// Conteúdo (atualizado conforme ajustes solicitados)
const docA = [
  h("DOCUMENTO A — Regras de Negócio em Linguagem Simples", HeadingLevel.HEADING_1),
  pText(
    "Este documento descreve, em linguagem de auditoria, as regras implementadas no sistema para mensuração de valor justo de ativos digitais, com base em preço de mercado (Binance) e taxa de câmbio oficial (PTAX venda do BCB)."
  ),
  h("1. O que a ferramenta faz (visão geral)", HeadingLevel.HEADING_2),
  pText(
    "A ferramenta executa um teste de mensuração de valor justo em reais (BRL) para ativos digitais informados em planilha, obtendo preço na Binance (fechamento equivalente a 23:59 BRT da data-base, em USDT) e PTAX venda do BCB (BRL/USD), calculando o valor justo e comparando com o valor declarado para classificar o resultado como APROVADO, ALERTA ou ERRO, além de registrar evidências e observações."
  ),
  h("2. Como ela recebe os dados (regras de entrada)", HeadingLevel.HEADING_2),
  pText(
    "A ferramenta lê a primeira aba do arquivo e exige as colunas: ticker, quantidade, valor_declarado e data_base (AAAA-MM-DD). Linhas completamente vazias são ignoradas. Ticker, quantidade, valor_declarado e data_base não podem estar vazios e quantidade/valor_declarado devem ser numéricos."
  ),
  pText(
    "Regra de data-base: data_base deve ser uma data passada — hoje e datas futuras são bloqueadas."
  ),
  h("3. Como ela busca os preços (metodologia de consulta)", HeadingLevel.HEADING_2),
  pText(
    "Para cada ativo, a ferramenta consulta em paralelo: (i) Binance para o fechamento equivalente a 23:59 BRT da data-base (em USDT), (ii) Binance para um fechamento adicional às 21h UTC (evidência; não entra no cálculo) e (iii) PTAX venda do BCB (BRL/USD)."
  ),
  pText(
    "Se não houver dado na data-base (ex.: fim de semana/feriado/ausência de cotação), a ferramenta tenta dias anteriores, até o limite de 5 dias retroativos, registrando em observação quando a data efetiva utilizada difere da data-base."
  ),
  h("4. Como ela trata cada tipo de ativo (categorias de token)", HeadingLevel.HEADING_2),
  pText(
    "Stablecoins USD (lista interna): preço fixo 1,0000 (USDT), sem consulta à API da Binance. Rebranding: ticker antigo é mapeado para ticker atual antes da consulta, registrando o alias em observação. Ativo não listado/símbolo inválido/indisponibilidade: o preço fica indisponível (N/D) e o valor justo não é calculado."
  ),
  h("5. Como ela calcula o valor justo (fórmulas em linguagem simples)", HeadingLevel.HEADING_2),
  pText(
    "Condição mínima: só calcula quando quantidade ≠ 0, existe preço de fechamento Binance (em USDT) e existe PTAX venda (BRL/USD)."
  ),
  pText(
    "Valor justo (BRL) = Preço de fechamento Binance (USDT) × |Quantidade| × PTAX venda (BRL/USD)."
  ),
  pText(
    "Métrica percentual (com sinal): valor_declarado_x_valor_justo = ((valor_declarado − valor_justo) ÷ valor_justo) × 100."
  ),
  h("6. Quando ela aprova ou alerta (critérios de julgamento)", HeadingLevel.HEADING_2),
  pText(
    "A ferramenta classifica como ALERTA quando o valor absoluto de valor_declarado_x_valor_justo for maior que 1,5%. Caso contrário, classifica como APROVADO."
  ),
  h("7. O que ela faz quando algo dá errado (tratamento de exceções)", HeadingLevel.HEADING_2),
  pText(
    "Quantidade zero: não calcula valor justo; status ERRO; registra observação. Falta de preço Binance ou falta de PTAX: não calcula valor justo; status ERRO; registra observação. Erros de estrutura/validação da planilha impedem o processamento das linhas inválidas."
  ),
  h("8. O que ela registra como evidência (campos da planilha)", HeadingLevel.HEADING_2),
  pText(
    "A ferramenta exporta para cada linha: ticker, quantidade, valor_declarado, data_base, close_USDT_BRT, close_21UTC_USD, ptax_data_base, valor_justo, valor_declarado_x_valor_justo, status e observacao."
  ),
];

const docCtitle = h("DOCUMENTO C — Tabela de Decisões", HeadingLevel.HEADING_1);

const decisionHeader = new TableRow({
  children: [
    headerCell("Cenário", { width: 18 }),
    headerCell("Condição", { width: 27 }),
    headerCell("Ação da ferramenta", { width: 27 }),
    headerCell("Justificativa", { width: 28 }),
  ],
});

const decisionRows = [
  ["Arquivo inválido", "Não consegue ler o arquivo", "Rejeita o arquivo", "Sem integridade mínima do insumo"],
  ["Planilha sem abas", "Não existe primeira aba", "Rejeita o arquivo", "Sem fonte estruturada de dados"],
  ["Colunas obrigatórias ausentes", "Falta ticker/quantidade/valor_declarado/data_base", "Rejeita o arquivo", "Garante completude mínima do teste"],
  ["data_base inválida", "Formato inválido ou data inexistente", "Rejeita a linha", "Evita consulta e cálculo com data inválida"],
  ["data_base hoje/futura", "data_base ≥ hoje (UTC 00:00)", "Rejeita a linha com mensagem padronizada", "Regra operacional: aceitar apenas data passada"],
  ["Stablecoin USD", "Ticker em lista interna", "Preço fixo 1,0000 (USDT) sem consulta à Binance", "Padronização conforme regra implementada [REVISAR]"],
  ["Rebranding", "Ticker mapeado para alias", "Consulta com ticker atual e registra observação do alias", "Evita falha por ticker renomeado"],
  ["Binance sem dado no dia", "Resposta vazia (sem candle)", "Tenta dia anterior até 5 dias; registra data usada", "Fallback retroativo por indisponibilidade na data-base"],
  ["PTAX sem cotação no dia", "value vazio (feriado/fim de semana)", "Tenta dia anterior até 5 dias; registra data usada", "Fallback retroativo por ausência de cotação"],
  ["Quantidade = 0", "quantidade == 0", "Status ERRO; valor justo N/D; registra observação", "Sem base de mensuração pela regra implementada"],
  ["Quantidade negativa", "quantidade < 0", "Calcula com |quantidade|; registra observação", "Mantém magnitude e sinaliza para julgamento [REVISAR]"],
  ["Cálculo possível", "Preço Binance numérico e PTAX numérica e quantidade ≠ 0", "Calcula valor justo e métrica percentual", "Mensuração por preço de mercado e câmbio oficial"],
  ["ALERTA", "|valor_declarado_x_valor_justo| > 1,5%", "Status ALERTA", "Divergência acima do limite fixo"],
  ["APROVADO", "|valor_declarado_x_valor_justo| ≤ 1,5%", "Status APROVADO", "Divergência dentro do limite fixo"],
  ["ERRO por Binance", "Preço Binance N/D", "Status ERRO; registra observação de indisponibilidade", "Sem preço observável na fonte adotada"],
  ["ERRO por PTAX", "PTAX N/D", "Status ERRO; registra observação de indisponibilidade", "Sem taxa de conversão oficial"],
];

const decisionTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    decisionHeader,
    ...decisionRows.map(
      ([cenario, condicao, acao, justificativa]) =>
        new TableRow({
          children: [cell(cenario), cell(condicao), cell(acao), cell(justificativa)],
        })
    ),
  ],
});

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: titulo, bold: true, size: 28 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: subtitulo, italics: true })],
        }),
        new Paragraph({ text: "" }),
        ...docA,
        new Paragraph({ text: "" }),
        docCtitle,
        pText(
          "Tabela de decisões consolidando cenários de entrada, consulta de preços/câmbio, cálculo e classificação."
        ),
        new Paragraph({ text: "" }),
        decisionTable,
      ],
    },
  ],
});

const outDir = path.resolve("docs");
ensureDir(outDir);
const outPath = path.join(outDir, "Regras_de_Negocio_Valor_Justo.docx");

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);

console.log(`DOCX gerado em: ${outPath}`);
