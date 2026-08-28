const RevisionService = require('../services/RevisionService');

class RevisionController {
    static async scheduleRevisions(req, res) {
        try {
            const { materia, atividades, dataFormalizacao } = req.body;

            if (!materia || !atividades || !Array.isArray(atividades) || atividades.length === 0 || !dataFormalizacao) {
                return res.status(400).json({ error: "Parâmetros incompletos (materia, atividades array, dataFormalizacao)" });
            }

            const result = await RevisionService.scheduleRevisions(materia, atividades, dataFormalizacao);
            res.json(result);
        } catch (error) {
            console.error("Erro em scheduleRevisions: ", error);
            const status = error.message.includes('404') ? 404 : 500;
            res.status(status).json({ error: error.message || "Erro interno ao cadastrar revisões" });
        }
    }
}

module.exports = RevisionController;
