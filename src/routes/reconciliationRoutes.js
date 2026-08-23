const express = require('express');
const { getReconciliations, getReconciliation, triggerReconciliation } = require('../controllers/reconciliationController');

const router = express.Router();

router.get('/', getReconciliations);
router.get('/:eventId', getReconciliation);
router.post('/reconcile/:eventId', triggerReconciliation);

module.exports = router;
