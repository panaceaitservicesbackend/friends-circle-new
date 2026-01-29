const mongoose = require('mongoose');

const scoreHistorySchema = new mongoose.Schema({
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser', required: true },
  activityType: {
    type: String,
    enum: ['LOGIN', 'CALL_COMPLETED', 'ONLINE_HOURS', 'ADMIN_BONUS'],
    required: true
  },
  scoreAdded: { type: Number, required: true },
  referenceDate: { type: Date },
  addedBy: { type: String, enum: ['SYSTEM', 'ADMIN'], required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScoreHistory', scoreHistorySchema);
