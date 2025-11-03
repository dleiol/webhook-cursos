const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 1009;
const CURSOS_FILE = path.join(__dirname, 'cursos.json');

app.use(express.json());

// Função auxiliar para ler cursos do arquivo JSON
function lerCursos() {
  try {
    const data = fs.readFileSync(CURSOS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { cursos: [] };
  }
}

// Função auxiliar para salvar cursos no arquivo JSON
function salvarCursos(dados) {
  try {
    fs.writeFileSync(CURSOS_FILE, JSON.stringify(dados, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar cursos:', error);
    return false;
  }
}

// Função para calcular dias entre duas datas
function calcularDiasEntreDatas(dataInicio, dataFim) {
  const umDia = 24 * 60 * 60 * 1000; // horas * minutos * segundos * milissegundos
  const diffTime = dataFim.getTime() - dataInicio.getTime();
  const diffDays = Math.round(diffTime / umDia);
  return diffDays;
}

//Calcular descontos
app.post('/calcular-desconto', (req, res) => {
  let { curso, indicacao, pagamento, trabalhaNaArea } = req.body;

  // Normalizar valores de indicação
  if (indicacao !== undefined && indicacao !== null) {
    const indicacaoStr = String(indicacao).toLowerCase();
    indicacao = indicacaoStr.includes("sim") || indicacaoStr === "true" || indicacao === true;
  } else {
    indicacao = false;
  }

  // Normalizar valores de pagamento
  if (pagamento !== undefined && pagamento !== null) {
    const pagamentoStr = String(pagamento).toLowerCase();
    pagamento = pagamentoStr.includes("sim") || pagamentoStr === "true" || pagamentoStr.includes("recorrente") || pagamento === true;
  } else {
    pagamento = false;
  }

  // Normalizar valores de trabalhaNaArea
  if (trabalhaNaArea !== undefined && trabalhaNaArea !== null) {
    const trabalhaNaAreaStr = String(trabalhaNaArea).toLowerCase();
    trabalhaNaArea = trabalhaNaAreaStr.includes("sim") || trabalhaNaAreaStr === "true" || trabalhaNaArea === true;
  } else {
    trabalhaNaArea = false;
  }

  // Validação dos parâmetros obrigatórios
  if (!curso) {
    return res.status(400).json({
      erro: 'Parâmetro "curso" é obrigatório.'
    });
  }

  // Buscar o curso
  const dados = lerCursos();
  const cursoEncontrado = dados.cursos.find(
    c => c.nome.toLowerCase().trim() === curso.toString().toLowerCase().trim()
  );

  if (!cursoEncontrado) {
    return res.status(404).json({
      erro: 'Curso não encontrado.'
    });
  }

  // Validar preço do curso
  if (!cursoEncontrado.preco_base || isNaN(cursoEncontrado.preco_base)) {
    return res.status(400).json({
      erro: 'Preço do curso inválido.'
    });
  }

  // Calcular descontos cumulativos
  let percentualTotal = 0;
  const descontosAplicados = [];

  // 1. Indicação de amigo: -5%
  if (indicacao === true) {
    percentualTotal += 5;
    descontosAplicados.push({ tipo: 'Indicação de amigo', percentual: 5 });
  }

  // 2. Pagamento recorrente no cartão: -5%
  if (pagamento === true) {
    percentualTotal += 5;
    descontosAplicados.push({ tipo: 'Pagamento recorrente no cartão', percentual: 5 });
  }

  // 3. Trabalha na área (apenas Pós): -10%
  const isPos = cursoEncontrado.nivel === 'pos';
                
  if (isPos && trabalhaNaArea === true) {
    percentualTotal += 10;
    descontosAplicados.push({ tipo: 'Trabalha na área', percentual: 10 });
  }

  // 4. Urgência (lote a ≤7 dias do fechamento): -7%
  // Verificar data de fechamento do curso
  let diasParaFechamento = null;
  let dataFechamentoFormatada = null;
  
  if (cursoEncontrado.dataFechamento) {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zerar horas para comparar apenas datas
      
      const dataFechamento = new Date(cursoEncontrado.dataFechamento);
      dataFechamento.setHours(0, 0, 0, 0);
      
      // Calcular dias até o fechamento
      diasParaFechamento = calcularDiasEntreDatas(hoje, dataFechamento);
      dataFechamentoFormatada = cursoEncontrado.dataFechamento;
      
      // Aplicar desconto se for ≤ 7 dias e ainda não passou a data
      if (diasParaFechamento >= 0 && diasParaFechamento <= 7) {
        percentualTotal += 7;
        descontosAplicados.push({ 
          tipo: 'Urgência (lote a ≤7 dias)', 
          percentual: 7,
          diasParaFechamento: diasParaFechamento 
        });
      }
    } catch (error) {
      console.error('Erro ao processar data de fechamento:', error);
    }
  }

  // 5. Desconto máximo: 20%
  if (percentualTotal > 20) {
    percentualTotal = 20;
  }

  // Calcular valores
  const valorDesconto = (cursoEncontrado.preco_base * percentualTotal) / 100;
  const valorFinal = cursoEncontrado.preco_base - valorDesconto;

  const resposta = {
    curso: {
      id: cursoEncontrado.id,
      nome: cursoEncontrado.nome,
      preco: parseFloat(valorFinal.toFixed(2))
    },
    descontosAplicados: descontosAplicados,
    descontoTotal: {
      percentual: parseFloat(percentualTotal.toFixed(2)),
      valor: parseFloat(valorDesconto.toFixed(2))
    },
    valorOriginal: parseFloat(cursoEncontrado.preco_base.toFixed(2)),
    valorFinal: parseFloat(valorFinal.toFixed(2))
  };

  // Adicionar informações sobre data de fechamento se existir
  if (dataFechamentoFormatada) {
    resposta.curso.dataFechamento = dataFechamentoFormatada;
    resposta.curso.diasParaFechamento = diasParaFechamento;
  }

  res.json(resposta);
});

//Consultar cursos
app.get('/cursos', (req, res) => {
  const dados = lerCursos();
  res.json(dados);
});

// Atualizar dados dos cursos
app.put('/cursos', (req, res) => {
  const { cursos } = req.body;

  if (!cursos || !Array.isArray(cursos)) {
    return res.status(400).json({
      erro: 'Envie um array de cursos no formato: { "cursos": [...] }'
    });
  }

  const dados = { cursos };
  
  if (salvarCursos(dados)) {
    res.json({
      mensagem: 'Cursos atualizados com sucesso!',
      totalCursos: cursos.length,
      cursos: cursos
    });
  } else {
    res.status(500).json({
      erro: 'Erro ao salvar os cursos.'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok'
  });
});

// Exportar app para Vercel
module.exports = app;

// Iniciar servidor apenas se não estiver na Vercel
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

