const mongoose = require('mongoose');

const adminRewardRuleSchema = new mongoose.Schema({
  ruleName: { type: String, required: true },
  activityType: { type: String, required: true },
  condition: { type: mongoose.Schema.Types.Mixed }, // Flexible for different rule types
  scoreValue: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminRewardRule', adminRewardRuleSchema);
