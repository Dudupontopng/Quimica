// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Inicia o banco de dados SQLite local
const db = new sqlite3.Database('./quimica.db', (err) => {
    if (err) console.error(err.message);
    console.log('Conectado ao banco de dados SQLite.');
});

// Criação das tabelas e inserção de dados iniciais
// Criação das tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS elementos (
        id INTEGER PRIMARY KEY,
        simbolo TEXT,
        nome TEXT,
        familia TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS compostos (
        id INTEGER PRIMARY KEY,
        elemento1 TEXT,
        elemento2 TEXT,
        resultado TEXT,
        descricao TEXT
    )`);

    // Limpa as tabelas para atualizar com a nova lista
    db.run(`DELETE FROM elementos`);
    db.run(`DELETE FROM compostos`);

    // ==========================================
    // 1. INSERINDO ELEMENTOS
    // ==========================================
    const stmtElem = db.prepare(`INSERT INTO elementos (simbolo, nome, familia) VALUES (?, ?, ?)`);
    
    const listaElementos = [
        // Não-metais
        ['H', 'Hidrogênio', 'Não-metal'],
        ['C', 'Carbono', 'Não-metal'],
        ['N', 'Nitrogênio', 'Não-metal'],
        ['O', 'Oxigênio', 'Calcogênio'],
        ['P', 'Fósforo', 'Não-metal'],
        ['S', 'Enxofre', 'Calcogênio'],
        
        // Halogênios
        ['F', 'Flúor', 'Halogênio'],
        ['Cl', 'Cloro', 'Halogênio'],
        ['Br', 'Bromo', 'Halogênio'],
        ['I', 'Iodo', 'Halogênio'],
        
        // Metais Alcalinos e Alcalino-Terrosos
        ['Li', 'Lítio', 'Metal Alcalino'],
        ['Na', 'Sódio', 'Metal Alcalino'],
        ['K', 'Potássio', 'Metal Alcalino'],
        ['Mg', 'Magnésio', 'Metal Alcalino-Terroso'],
        ['Ca', 'Cálcio', 'Metal Alcalino-Terroso'],

        // Gases Nobres (Pegadinhas para o jogador, pois não reagem facilmente)
        ['He', 'Hélio', 'Gás Nobre'],
        ['Ne', 'Neônio', 'Gás Nobre']
    ];

    listaElementos.forEach(el => stmtElem.run(el[0], el[1], el[2]));
    stmtElem.finalize();

    // ==========================================
    // 2. INSERINDO COMPOSTOS (REAÇÕES)
    // ==========================================
    const stmtComp = db.prepare(`INSERT INTO compostos (elemento1, elemento2, resultado, descricao) VALUES (?, ?, ?, ?)`);
    
    const listaCompostos = [
        // Compostos com Oxigênio (Óxidos e água)
        ['H', 'O', 'H₂O', 'Água: Essencial para a vida! Solvente universal.'],
        ['C', 'O', 'CO₂', 'Dióxido de Carbono: Gás expelido na nossa respiração e usado pelas plantas.'],
        ['S', 'O', 'SO₂', 'Dióxido de Enxofre: Gás tóxico com cheiro de fósforo queimado.'],
        ['Mg', 'O', 'MgO', 'Óxido de Magnésio: Usado em antiácidos estomacais.'],
        ['Ca', 'O', 'CaO', 'Óxido de Cálcio: Conhecido como "Cal virgem", usado em construções.'],

        // Compostos com Hidrogênio (Ácidos, hidretos e gases comuns)
        ['C', 'H', 'CH₄', 'Metano: Gás natural, inflamável e um forte gás de efeito estufa.'],
        ['N', 'H', 'NH₃', 'Amônia: Gás de cheiro forte, muito usado em produtos de limpeza e fertilizantes.'],
        ['S', 'H', 'H₂S', 'Ácido Sulfídrico: Famoso pelo terrível cheiro de ovo podre!'],
        
        // Ácidos Halogenídricos
        ['H', 'F', 'HF', 'Ácido Fluorídrico: Extremamente corrosivo, capaz de dissolver vidro!'],
        ['H', 'Cl', 'HCl', 'Ácido Clorídrico: Presente no nosso suco gástrico para digestão.'],
        ['H', 'Br', 'HBr', 'Ácido Bromídrico: Um ácido forte usado na síntese de produtos químicos.'],
        ['H', 'I', 'HI', 'Ácido Iodídrico: Um dos ácidos mais fortes conhecidos.'],

        // Sais Halogenetos (Ligações Iônicas Clássicas)
        ['Na', 'Cl', 'NaCl', 'Cloreto de Sódio: O indispensável sal de cozinha.'],
        ['Na', 'F', 'NaF', 'Fluoreto de Sódio: Adicionado aos cremes dentais para prevenir cáries.'],
        ['K', 'Cl', 'KCl', 'Cloreto de Potássio: Usado como suplemento e em fertilizantes.'],
        ['K', 'I', 'KI', 'Iodeto de Potássio: Usado para tratar deficiências de iodo na tireoide.'],
        ['Mg', 'Cl', 'MgCl₂', 'Cloreto de Magnésio: Usado como suplemento mineral.'],
        ['Ca', 'Cl', 'CaCl₂', 'Cloreto de Cálcio: Usado para derreter gelo em estradas em países frios.'],
        ['Li', 'Br', 'LiBr', 'Brometo de Lítio: Usado em sistemas de ar condicionado industriais.']
    ];

    listaCompostos.forEach(comp => stmtComp.run(comp[0], comp[1], comp[2], comp[3]));
    stmtComp.finalize();
});

// Rota para buscar todos os elementos
app.get('/api/elementos', (req, res) => {
    db.all(`SELECT * FROM elementos`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// Rota para testar uma combinação
app.post('/api/combinar', (req, res) => {
    const { el1, el2 } = req.body;
    
    // Procura a combinação independente da ordem (ex: H+O ou O+H)
    const query = `SELECT * FROM compostos WHERE 
                   (elemento1 = ? AND elemento2 = ?) OR 
                   (elemento1 = ? AND elemento2 = ?)`;
                   
    db.get(query, [el1, el2, el2, el1], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
            res.json({ sucesso: true, resultado: row.resultado, descricao: row.descricao });
        } else {
            res.json({ sucesso: false, mensagem: "Esses elementos não formam um composto conhecido no nosso banco de dados ainda!" });
        }
    });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000 (http://localhost:3000)');
});
