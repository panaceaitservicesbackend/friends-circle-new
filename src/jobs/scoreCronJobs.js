const FemaleUser = require('../models/femaleUser/FemaleUser');
const ScoreHistory = require('../models/femaleUser/ScoreHistory');

// Daily reset of dailyScore, and weekly aggregation
async function dailyScoreResetAndWeeklyAggregation() {
  const today = new Date();
  const isMonday = today.getDay() === 1; // 1 = Monday

  // Reset dailyScore for all users
  await FemaleUser.updateMany({}, { $set: { dailyScore: 0 } });

  // If Monday, reset weeklyScore for all users
  if (isMonday) {
    await FemaleUser.updateMany({}, { $set: { weeklyScore: 0, consecutiveActiveDays: 0 } });
  }
}

module.exports = { dailyScoreResetAndWeeklyAggregation };
