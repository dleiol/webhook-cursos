# Webhook de Cursos

Webhook para gerenciar cursos e calcular descontos cumulativos baseados em regras de negócio.

## Instalação

```bash
npm install
```

## Execução

```bash
npm start
```

O servidor estará rodando em `http://localhost:1009`

## Estrutura de Dados

### Estrutura do Curso

Cada curso no arquivo `cursos.json` possui a seguinte estrutura:

```json
{
  "id": "g-ti-ads",
  "nivel": "graduacao",
  "area": "TI",
  "nome": "Análise e Desenvolvimento de Sistemas",
  "preco_base": 1151.33,
  "dataFechamento": "2025-11-05"
}
```

**Campos:**
- `id`: Identificador único do curso (string)
- `nivel`: Nível do curso - `"graduacao"` ou `"pos"`
- `area`: Área do curso (ex: "TI", "Saúde", "Administração")
- `nome`: Nome completo do curso (string)
- `preco_base`: Preço base do curso (number)
- `dataFechamento`: Data de fechamento do lote no formato `YYYY-MM-DD` (opcional)

## Regras de Desconto

O sistema aplica os seguintes descontos cumulativos, com **máximo de 20% no total**:

1. **Indicação de amigo**: -5%
2. **Pagamento recorrente no cartão**: -5%
3. **Trabalha na área**: -10% (aplicado apenas para cursos de nível `"pos"`)
4. **Urgência**: -7% (aplicado automaticamente se o lote estiver com ≤7 dias para fechamento)
5. **Desconto máximo**: 20% (limite cumulativo)

O desconto de urgência é calculado automaticamente com base na `dataFechamento` do curso comparada com a data atual.

## Rotas

### 1. Calcular Desconto

**POST** `/calcular-desconto`

Calcula o desconto aplicável baseado nas regras configuradas e retorna o valor final com todos os descontos aplicados.

**Parâmetros:**

- `curso` (obrigatório): Nome completo do curso (string). A busca é feita por correspondência exata (case-insensitive, sem espaços extras).
- `indicacao` (opcional): Aceita `true`, `"true"`, ou qualquer string contendo `"sim"` (case-insensitive). Representa se o aluno foi indicado por um amigo.
- `pagamento` (opcional): Aceita `true`, `"true"`, string contendo `"sim"` (case-insensitive). Representa se o pagamento será recorrente no cartão.
- `trabalhaNaArea` (opcional): Aceita `true`, `"true"`, ou qualquer string contendo `"sim"` (case-insensitive). Aplicado apenas para cursos de Pós-graduação.

**Exemplo de Requisição:**

```json
{
  "curso": "Análise e Desenvolvimento de Sistemas",
  "indicacao": "sim",
  "pagamento": "sim",
  "trabalhaNaArea": ""
}
```

**Exemplo de Resposta de Sucesso:**

```json
{
  "curso": {
    "id": "g-ti-ads",
    "nome": "Análise e Desenvolvimento de Sistemas",
    "preco": 941.09,
    "dataFechamento": "2025-11-05",
    "diasParaFechamento": 5
  },
  "descontosAplicados": [
    {
      "tipo": "Indicação de amigo",
      "percentual": 5
    },
    {
      "tipo": "Pagamento recorrente no cartão",
      "percentual": 5
    },
    {
      "tipo": "Urgência (lote a ≤7 dias)",
      "percentual": 7,
      "diasParaFechamento": 5
    }
  ],
  "descontoTotal": {
    "percentual": 17.00,
    "valor": 195.73
  },
  "valorOriginal": 1151.33,
  "valorFinal": 955.60
}
```

**Códigos de Erro:**

- `400`: Parâmetro "curso" é obrigatório
- `404`: Curso não encontrado
- `400`: Preço do curso inválido

### 2. Consultar Cursos

**GET** `/cursos`

Retorna todos os cursos armazenados no arquivo `cursos.json`.

**Resposta:**

```json
{
  "cursos": [
    {
      "id": "g-ti-ads",
      "nivel": "graduacao",
      "area": "TI",
      "nome": "Análise e Desenvolvimento de Sistemas",
      "preco_base": 1151.33,
      "dataFechamento": "2025-11-05"
    }
  ]
}
```

### 3. Atualizar Cursos

**PUT** `/cursos`

Atualiza os dados dos cursos no arquivo `cursos.json`.

**Body:**

```json
{
  "cursos": [
    {
      "id": "g-ti-ads",
      "nivel": "graduacao",
      "area": "TI",
      "nome": "Análise e Desenvolvimento de Sistemas",
      "preco_base": 1151.33,
      "dataFechamento": "2025-11-05"
    }
  ]
}
```

**Resposta de Sucesso:**

```json
{
  "mensagem": "Cursos atualizados com sucesso!",
  "totalCursos": 1,
  "cursos": [...]
}
```

**Códigos de Erro:**

- `400`: Envie um array de cursos no formato: { "cursos": [...] }
- `500`: Erro ao salvar os cursos

### 4. Health Check

**GET** `/health`

Verifica se o servidor está respondendo.

**Resposta:**

```json
{
  "status": "ok"
}
```

## Exemplos de Uso

### Calcular desconto (com indicação e pagamento recorrente)

```bash
curl -X POST http://localhost:1009/calcular-desconto \
  -H "Content-Type: application/json" \
  -d '{"curso": "Análise e Desenvolvimento de Sistemas", "indicacao": "sim", "pagamento": "recorrente"}'
```

### Calcular desconto para curso Pós com todos os descontos

```bash
curl -X POST http://localhost:1009/calcular-desconto \
  -H "Content-Type: application/json" \
  -d '{"curso": "Pós em Data Science", "indicacao": "sim", "pagamento": "recorrente", "trabalhaNaArea": "sim"}'
```

### Consultar todos os cursos

```bash
curl http://localhost:1009/cursos
```

### Atualizar cursos

```bash
curl -X PUT http://localhost:1009/cursos \
  -H "Content-Type: application/json" \
  -d '{"cursos": [{"id": "g-ti-ads", "nivel": "graduacao", "area": "TI", "nome": "Análise e Desenvolvimento de Sistemas", "preco_base": 1151.33, "dataFechamento": "2025-11-05"}]}'
```

### Verificar saúde do servidor

```bash
curl http://localhost:1009/health
```

## Observações Importantes

1. **Busca por nome**: O campo `curso` deve conter o nome exato do curso (case-insensitive, sem espaços extras no início/fim).

2. **Normalização de valores**: Os campos `indicacao`, `pagamento` e `trabalhaNaArea` aceitam diferentes formatos e são normalizados internamente:
   - `true`, `"true"`, ou strings contendo `"sim"` são considerados `true`
   - Para `pagamento`, também aceita strings contendo `"recorrente"`

3. **Desconto de urgência**: É calculado automaticamente comparando a `dataFechamento` do curso com a data atual. Apenas aplicado se:
   - O curso possui `dataFechamento`
   - A data ainda não passou (diasParaFechamento ≥ 0)
   - Faltam 7 dias ou menos para o fechamento (diasParaFechamento ≤ 7)

4. **Desconto "Trabalha na área"**: Apenas aplicado para cursos onde `nivel === "pos"`.

5. **Limite de desconto**: O desconto total nunca ultrapassa 20%, mesmo que a soma dos percentuais seja maior.
