const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validateRecord } = require('../middleware/validate');
const {
  createRecord, getRecords, getRecordById, updateRecord, deleteRecord, restoreRecord
} = require('../controllers/recordController');

// everyone who's logged in can read records
router.get('/', authenticate, authorize('admin', 'analyst', 'viewer'), getRecords);
router.get('/:id', authenticate, authorize('admin', 'analyst', 'viewer'), getRecordById);

// only admin can create/update/delete/restore
router.post('/', authenticate, authorize('admin'), validateRecord, createRecord);
router.put('/:id', authenticate, authorize('admin'), updateRecord);
router.delete('/:id', authenticate, authorize('admin'), deleteRecord);
router.patch('/:id/restore', authenticate, authorize('admin'), restoreRecord);

module.exports = router;
