const mongoose = require('mongoose');

const adminScoreRuleSchema = new mongoose.Schema({
  ruleName: { type: String, required: true },
  activityType: { type: String, required: true }, // e.g., LOGIN, CALL_COMPLETED, ONLINE_HOURS, WEEKLY_CONSISTENCY
  condition: { type: mongoose.Schema.Types.Mixed }, // e.g., { minCalls: 5 }, { minMinutes: 60 }
  scoreValue: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminScoreRule', adminScoreRuleSchema);
