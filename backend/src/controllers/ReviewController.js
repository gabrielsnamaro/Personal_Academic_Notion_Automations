const ReviewService = require('../services/ReviewService');

class ReviewController {
    static async scheduleReviews(req, res) {
        try {
            const { materia, atividades, dataFormalizacao } = req.body;
            
            if (!materia || !atividades || !dataFormalizacao) {
                return res.status(400).json({ error: "Parâmetros incompletos (materia, atividades, dataFormalizacao)." });
            }

            const result = await ReviewService.scheduleReviews(materia, atividades, dataFormalizacao);
            return res.json(result);
        } catch (error) {
            console.error("Erro no agendamento:", error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReviewController;
