const RevisionService = require('../services/RevisionService');

class RevisionController {
    static async scheduleRevisions(req, res) {
        try {
            const { materia, atividade, dataFormalizacao } = req.body;

            if (!materia || !atividade || !dataFormalizacao) {
                return res.status(400).json({ error: "Parâmetros incompletos (materia, atividade, dataFormalizacao)" });
            }

            const result = await RevisionService.scheduleRevisions(materia, atividade, dataFormalizacao);
            res.json(result);
        } catch (error) {
            console.error("Erro em scheduleRevisions: ", error);
            res.status(500).json({ error: "Erro interno ao cadastrar revisões" });
        }
    }
}

module.exports = RevisionController;
