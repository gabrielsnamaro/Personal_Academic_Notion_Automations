const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const ReviewController = require('../controllers/ReviewController');

const router = Router();

router.use(authMiddleware);
router.post('/', ReviewController.scheduleReviews);

module.exports = router;
