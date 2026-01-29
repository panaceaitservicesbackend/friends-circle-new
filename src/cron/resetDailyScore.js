const cron = require('node-cron');
const FemaleUser = require('../models/femaleUser/FemaleUser');

cron.schedule('0 0 * * *', async () => {
  console.log('🔁 Resetting dailyScore');
  await FemaleUser.updateMany({}, { $set: { dailyScore: 0 } });
});
