const express = require('express');
const { getAlerts, resolveAlert } = require('../controllers/alertController');

const router = express.Router();

router.get('/', getAlerts);
router.post('/:id/resolve', resolveAlert);

module.exports = router;
