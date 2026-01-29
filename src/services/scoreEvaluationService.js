const FemaleUser = require('../models/femaleUser/FemaleUser');
const ScoreHistory = require('../models/femaleUser/ScoreHistory');
const AdminScoreRule = require('../models/admin/AdminScoreRule');

// Duplicate protection
const isDuplicate = async (userId, rule) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const exists = await ScoreHistory.findOne({
    femaleUserId: userId,
    ruleId: rule._id,
    createdAt: { $gte: startOfDay }
  });
  return !!exists;
};

// Rule eligibility
const isRuleEligible = async (user, rule, meta = {}) => {
  switch (rule.activityType) {
    case 'LOGIN':
      return true;
    case 'ONLINE_HOURS':
      return (meta.onlineMinutes || 0) >= (rule.minMinutes || 0);
    case 'CALL_COMPLETED':
      return (meta.callsCompleted || 0) >= (rule.minCalls || 0);
    case 'WEEKLY_CONSISTENCY':
      return (user.consecutiveActiveDays || 0) >= 7;
    default:
      return false;
  }
};

// Apply score to all 3 fields
const applyScore = async (user, rule) => {
  user.score += rule.scoreValue;
  user.dailyScore += rule.scoreValue;
  user.weeklyScore += rule.scoreValue;
  user.lastActiveDate = new Date();
  await user.save();
};

// Log score
const logScore = async (user, rule) => {
  await ScoreHistory.create({
    femaleUserId: user._id,
    ruleId: rule._id,
    activityType: rule.activityType,
    scoreAdded: rule.scoreValue,
    addedBy: 'SYSTEM'
  });
};

// Main service
exports.evaluateScoreRules = async (userId, eventType, meta = {}) => {
  const user = await FemaleUser.findById(userId);
  if (!user) return;
  const rules = await AdminScoreRule.find({ activityType: eventType, isActive: true });
  for (const rule of rules) {
    const eligible = await isRuleEligible(user, rule, meta);
    if (!eligible) continue;
    const alreadyGiven = await isDuplicate(user._id, rule);
    if (alreadyGiven) continue;
    await applyScore(user, rule);
    await logScore(user, rule);
  }
};
