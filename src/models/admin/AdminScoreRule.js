const mongoose = require('mongoose');

const AdminScoreRuleSchema = new mongoose.Schema({
  ruleName: String,
  activityType: {
    type: String,
    enum: ['LOGIN', 'ONLINE_HOURS', 'CALL_COMPLETED', 'WEEKLY_CONSISTENCY']
  },
  scoreValue: Number,
  minMinutes: Number,
  minCalls: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AdminScoreRule', AdminScoreRuleSchema);
