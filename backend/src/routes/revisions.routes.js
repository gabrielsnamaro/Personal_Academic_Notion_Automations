const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const RevisionController = require('../controllers/RevisionController');

const router = Router();

router.use(authMiddleware);
router.post('/', RevisionController.scheduleRevisions);

module.exports = router;
