const ReviewService = require('../services/ReviewService');

class ReviewController {
    static async scheduleReviews(req, res) {
        // SSE Setup
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        try {
            const { materia, atividades, batches, dataFormalizacao } = req.body;
            
            // Suporte retrocompatível para requisição única
            const studyBatches = batches || [{ materia, atividades }];
            
            if (!studyBatches || studyBatches.length === 0 || !dataFormalizacao) {
                res.write(`data: ${JSON.stringify({ error: "Parâmetros incompletos. Forneça os blocos de estudo e a data de formalização." })}\n\n`);
                return res.end();
            }

            const onProgress = (msg, percent) => {
                res.write(`data: ${JSON.stringify({ message: msg, progress: percent })}\n\n`);
            };

            const result = await ReviewService.scheduleReviews(studyBatches, dataFormalizacao, onProgress);
            
            res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
            return res.end();
        } catch (error) {
            console.error("Erro no agendamento:", error);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            return res.end();
        }
    }
}

module.exports = ReviewController;
