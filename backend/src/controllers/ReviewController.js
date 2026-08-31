const ReviewService = require('../services/ReviewService');

class ReviewController {
    static async scheduleReviews(req, res) {
        try {
            const { subject, activities, batches, formalizationDate } = req.body;
            
            // Suporte retrocompatível para requisição única (caso mande avulso)
            const studyBatches = batches || [{ subject, activities }];
            
            if (!studyBatches || studyBatches.length === 0 || !formalizationDate) {
                return res.status(400).json({ error: "Parâmetros incompletos. Forneça os blocos de estudo e a data de formalização." });
            }

            const result = await ReviewService.scheduleReviews(studyBatches, formalizationDate);
            return res.json(result);
        } catch (error) {
            console.error("Erro no agendamento:", error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReviewController;
