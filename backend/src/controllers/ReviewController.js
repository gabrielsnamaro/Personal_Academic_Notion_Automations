const ReviewService = require('../services/ReviewService');

class ReviewController {
    static async scheduleReviews(req, res) {
        try {
            const { materia, atividades, batches, dataFormalizacao } = req.body;
            
            // Suporte retrocompatível para requisição única
            const studyBatches = batches || [{ materia, atividades }];
            
            if (!studyBatches || studyBatches.length === 0 || !dataFormalizacao) {
                return res.status(400).json({ error: "Parâmetros incompletos. Forneça os blocos de estudo e a data de formalização." });
            }

            const result = await ReviewService.scheduleReviews(studyBatches, dataFormalizacao);
            return res.json(result);
        } catch (error) {
            console.error("Erro no agendamento:", error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReviewController;
