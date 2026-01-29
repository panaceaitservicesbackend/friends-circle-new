const cron = require('node-cron');
const FemaleUser = require('../models/femaleUser/FemaleUser');
const { evaluateScoreRules } = require('../services/scoreEvaluationService');

cron.schedule('0 0 * * 1', async () => {
  console.log('📅 Weekly score evaluation');
  const users = await FemaleUser.find();
  for (const user of users) {
    await evaluateScoreRules(user._id, 'WEEKLY_CONSISTENCY');
    user.weeklyScore = 0;
    user.consecutiveActiveDays = 0;
    await user.save();
  }
});
