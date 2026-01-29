# Female User Code Overview

This document provides an overview of the main code related to the **female user** domain, including the schema, routes, and controller logic.

---

## 1. Female User Schema (`src/models/femaleUser/FemaleUser.js`)

```js
const mongoose = require('mongoose');

const femaleUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true, unique: true },
  otp: { 
    type: Number,
    required: function() {
      return !this.isVerified;
    }
  },
  name: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['female', 'male'] },
  bio: { type: String },
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleImage' }],
  videoUrl: String,
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
  hobbies: [{ id: { type: String, required: true }, name: { type: String, required: true } }],
  sports: [{ id: { type: String, required: true }, name: { type: String, required: true } }],
  film: [{ id: { type: String, required: true }, name: { type: String, required: true } }],
  music: [{ id: { type: String, required: true }, name: { type: String, required: true } }],
  travel: [{ id: { type: String, required: true }, name: { type: String, required: true } }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  reviewStatus: { type: String, enum: ['completeProfile', 'pending', 'accepted', 'rejected'], default: 'completeProfile' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  profileCompleted: { type: Boolean, default: false },
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser' }],
  kycStatus: { type: String, enum: ['completeKyc', 'pending', 'accepted', 'rejected'], default: 'completeKyc' },
  kycDetails: { 
    bank: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      accountNumber: String,
      ifsc: String,
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
      verifiedAt: Date
    },
    upi: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      upiId: String,
      status: { type: String, enum: ['pending', 'rejected', 'accepted'], default: 'pending' },
      verifiedAt: Date
    }
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleFollowers' }],
  femalefollowing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleFollowing' }],
  earnings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Earnings' }],
  blockList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  beautyFilter: { type: Boolean, default: false },
  hideAge: { type: Boolean, default: false },
  onlineStatus: { type: Boolean, default: false },
  onlineStartTime: { type: Date },
  totalOnlineMinutes: { type: Number, default: 0 },
  missedCalls: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  coinBalance: { type: Number, default: 0 },
  currentLevel: { type: Number, default: 0 },
  audioCoinsPerMinute: { type: Number, default: 0 },
  videoCoinsPerMinute: { type: Number, default: 0 },
  weeklyEarnings: { type: Number, default: 0 },
  lastLevelEvaluatedAt: { type: Date },
  latitude: { type: Number },
  longitude: { type: Number },
  locationUpdatedAt: { type: Date },
  referralCode: { type: String, unique: true, sparse: true },
  referredByFemale: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  referredByAgency: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgencyUser' }],
}, { timestamps: true });

module.exports = mongoose.model('FemaleUser', femaleUserSchema);
```

---

## 2. Female User Routes (`src/routes/femaleUserRoutes/femaleUserRoutes.js`)

```js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted, allowOnlyCompleteProfile } = require('../../middlewares/reviewStatusMiddleware');
const femaleUserController = require('../../controllers/femaleUserControllers/femaleUserController');
// ...other controllers and middlewares...

// Registration and OTP
router.post('/register', femaleUserController.registerFemaleUser);
router.post('/login', femaleUserController.loginFemaleUser);
router.post('/verify-otp', femaleUserController.verifyFemaleOtp);
router.post('/verify-login-otp', femaleUserController.verifyFemaleLoginOtp);

// Profile completion
router.post('/upload-image', auth, parser.array('images', 5), femaleUserController.uploadImage);
router.post('/upload-video', auth, videoParser.single('video'), femaleUserController.uploadVideo);
router.post('/complete-profile', auth, profileParser.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), femaleUserController.completeUserProfile);

// Protected routes
router.get('/me', auth, femaleUserController.getUserProfile);
router.use('/me/balance', require('./balanceRoutes'));
router.get('/me/withdrawals', auth, requireReviewAccepted, femaleUserController.getWithdrawalHistory);
router.get('/me/transactions', auth, requireReviewAccepted, async (req, res) => {
  // ...transaction logic...
});

// Profile update
router.patch('/update-profile', auth, requireReviewAccepted, upload.none(), femaleUserController.updateUserInfo);
router.patch('/profile-details', auth, requireReviewAccepted, upload.none(), femaleUserController.updateProfileDetails);
router.patch('/earning-rate', auth, requireReviewAccepted, upload.none(), femaleUserController.updateEarningRate);
router.post('/add-images', auth, requireReviewAccepted, parser.array('images', 5), femaleUserController.uploadImage);
```

---

## 3. Female User Controller (Partial, `src/controllers/femaleUserControllers/femaleUserController.js`)

```js
// Helper function to award referral bonuses
const awardReferralBonus = async (user, adminConfig) => {
  // ...referral bonus logic...
};

// Update user interests
exports.updateInterests = async (req, res) => {
  try {
    const { interestIds } = req.body;
    const userId = req.user._id;
    if (!interestIds || !Array.isArray(interestIds)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.INTEREST_REQUIRED
      });
    }
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { interests: interestIds },
      { new: true }
    ).populate('interests', 'title');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }
    return res.json({
      success: true,
      message: messages.FEMALE_USER.INTERESTS_UPDATED_SUCCESS,
      data: { interests: user.interests }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Update user languages
exports.updateLanguages = async (req, res) => {
  try {
    const { languageIds } = req.body;
    const userId = req.user._id;
    if (!languageIds || !Array.isArray(languageIds)) {
      return res.status(400).json({
        success: false,
        message: messages.PROFILE.LANGUAGE_REQUIRED
      });
    }
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { languages: languageIds },
      { new: true }
    ).populate('languages', 'title');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }
    return res.json({
      success: true,
      message: messages.FEMALE_USER.LANGUAGES_UPDATED_SUCCESS,
      data: { languages: user.languages }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
```

---

**Note:**
- This document only includes the main schema, selected routes, and controller logic for female users. For full details, refer to the respective files in the codebase.
