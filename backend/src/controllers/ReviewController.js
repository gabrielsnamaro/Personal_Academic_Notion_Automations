const ReviewService = require('../services/ReviewService');

class ReviewController {
    static async scheduleReviews(req, res) {
        try {
            const { subject, activities, batches, formalizationDate } = req.body;
            
            // Suporte retrocompatível para requisição única (caso mande avulso)
            const studyBatches = batches || [{ subject, activities }];
            
            console.log('[ReviewController] 📥 Recebida requisição POST /notion/reviews/schedule:', {
                totalBatches: studyBatches?.length,
                formalizationDate,
                batches: studyBatches
            });

            if (!studyBatches || studyBatches.length === 0 || !formalizationDate) {
                console.warn('[ReviewController] ⚠️ Parâmetros incompletos na requisição.');
                return res.status(400).json({ error: "Parâmetros incompletos. Forneça os blocos de estudo e a data de formalização." });
            }

            const result = await ReviewService.scheduleReviews(studyBatches, formalizationDate);
            console.log('[ReviewController] 📤 Agendamento processado com sucesso:', result);
            return res.json(result);
        } catch (error) {
            console.error("[ReviewController] ❌ Erro no agendamento:", error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    static async getScheduledReviews(req, res) {
        try {
            console.log('[ReviewController] 📥 Recebida requisição GET /notion/reviews');
            const reviews = await ReviewService.getScheduledReviews();
            console.log(`[ReviewController] 📤 Retornando ${reviews.length} revisões agendadas com sucesso.`);
            return res.json({ reviews });
        } catch (error) {
            console.error("[ReviewController] ❌ Erro ao buscar revisões agendadas:", error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReviewController;
