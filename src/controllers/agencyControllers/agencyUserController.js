const AgencyUser = require('../../models/agency/AgencyUser');
const AgencyImage = require('../../models/agency/Image');
const generateToken = require('../../utils/generateToken');
const sendOtp = require('../../utils/sendOtp');
const { isValidEmail, isValidMobile } = require('../../validations/validations');
const messages = require('../../validations/messages');
const { checkAndMarkAgencyProfileCompleted } = require('../../utils/agencyProfileChecker');

// Agency Registration (Email and Mobile Number) - ONLY ONCE PER USER
exports.agencyRegister = async (req, res) => {
  const { email, mobileNumber, referralCode } = req.body;

  try {
    // ---------- VALIDATION ----------
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    if (!isValidMobile(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: messages.VALIDATION.INVALID_MOBILE
      });
    }

    // ---------- CHECK EXISTING ----------
    const existingAgency = await AgencyUser.findOne({
      $or: [{ email }, { mobileNumber }]
    });

    if (existingAgency) {
      return res.status(400).json({
        success: false,
        message: 'Agency already exists, please login',
        redirectTo: 'LOGIN'
      });
    }

    // ---------- GENERATE OTP ----------
    const otp = Math.floor(1000 + Math.random() * 9000);

    // ---------- REFERRAL ----------
    let referredByAgency = null;
    if (referralCode) {
      referredByAgency = await AgencyUser.findOne({ referralCode });
    }

    // ---------- CREATE USER ----------
    const newAgency = new AgencyUser({
      email,
      mobileNumber,
      otp,
      isVerified: false,
      isActive: false,
      profileCompleted: false,
      reviewStatus: 'completeProfile',
      referredByAgency: referredByAgency ? [referredByAgency._id] : []
    });

    await newAgency.save();

    // ---------- SEND OTP ----------
    const sendWhatsappOtp = require('../../utils/sendWhatsappOtp');

    await Promise.all([
      sendOtp(email, otp),
      sendWhatsappOtp(mobileNumber, otp)
    ]);

    res.status(201).json({
      success: true,
      message: 'OTP sent to Email and WhatsApp',
      otp // ⚠️ remove in production
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};



// Login Agency User (Send OTP) - ALWAYS ALLOWED AFTER OTP VERIFICATION
exports.agencyLogin = async (req, res) => {
  const { email, mobileNumber } = req.body;

  try {
    // ---------- VALIDATION ----------
    if (!email && !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile number is required'
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_EMAIL
      });
    }

    if (mobileNumber && !isValidMobile(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: messages.VALIDATION.INVALID_MOBILE
      });
    }

    // ---------- FIND USER ----------
    const agency = await AgencyUser.findOne({
      $or: [
        email ? { email } : null,
        mobileNumber ? { mobileNumber } : null
      ].filter(Boolean)
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    if (!agency.isVerified) {
      return res.status(400).json({
        success: false,
        message: messages.AUTH.ACCOUNT_NOT_VERIFIED
      });
    }

    // ---------- GENERATE OTP ----------
    const otp = Math.floor(1000 + Math.random() * 9000);
    agency.otp = otp;
    await agency.save();

    const sendWhatsappOtp = require('../../utils/sendWhatsappOtp');

    let otpChannels = [];

    // ---------- SEND EMAIL OTP ----------
    if (agency.email && email) {
      await sendOtp(agency.email, otp);
      otpChannels.push('email');
    }

    // ---------- SEND WHATSAPP OTP ----------
    if (agency.mobileNumber && mobileNumber) {
      try {
        await sendWhatsappOtp(agency.mobileNumber, otp);
        otpChannels.push('mobile');
      } catch (err) {
        console.error('WhatsApp OTP failed:', err.message);
      }
    }

    // ---------- DYNAMIC MESSAGE ----------
    let message = messages.AUTH.OTP_SENT_LOGIN;

    if (otpChannels.length === 1 && otpChannels[0] === 'mobile') {
      message = 'OTP sent to your Mobile number on WhatsApp for login verification.';
    } else if (otpChannels.length === 1 && otpChannels[0] === 'email') {
      message = 'OTP sent to your email for login verification.';
    } else if (otpChannels.length === 2) {
      message = 'OTP sent to your email and mobile number for login verification.';
    }

    // ---------- RESPONSE ----------
    res.json({
      success: true,
      message,
      ...(process.env.NODE_ENV !== 'production' && { otp })
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Verify Login OTP - Returns reviewStatus-based response
exports.agencyVerifyLoginOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const agency = await AgencyUser.findOne({
      otp,
      isVerified: true
    });

    if (!agency) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_OTP
      });
    }

    agency.otp = undefined;
    await agency.save();

    const token = generateToken(agency._id, 'agency');

    let redirectTo = 'COMPLETE_PROFILE';

    if (agency.reviewStatus === 'pending') redirectTo = 'UNDER_REVIEW';
    if (agency.reviewStatus === 'accepted') redirectTo = 'DASHBOARD';
    if (agency.reviewStatus === 'rejected') redirectTo = 'REJECTED';

    res.json({
      success: true,
      message: messages.AUTH.LOGIN_SUCCESS,
      token,
      data: {
        agency: {
          id: agency._id,
          email: agency.email,
          mobileNumber: agency.mobileNumber,
          profileCompleted: agency.profileCompleted,
          reviewStatus: agency.reviewStatus
        },
        redirectTo
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// OTP Verification for Registration
exports.agencyVerifyOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    const agency = await AgencyUser.findOne({
      otp,
      isVerified: false
    });

    if (!agency) {
      return res.status(400).json({
        success: false,
        message: messages.COMMON.INVALID_OTP
      });
    }

    agency.isVerified = true;
    agency.isActive = true;
    agency.otp = undefined;
    agency.reviewStatus = 'completeProfile';

    await agency.save();

    const token = generateToken(agency._id, 'agency');

    res.json({
      success: true,
      message: messages.AUTH.OTP_VERIFIED,
      token,
      data: {
        profileCompleted: false,
        reviewStatus: 'completeProfile',
        redirectTo: 'COMPLETE_PROFILE'
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Complete agency profile - accepts form-data with details and optional image
exports.completeAgencyProfile = async (req, res) => {
  try {
    const { firstName, lastName, aadharOrPanNum } = req.body;
    
    // Helper function to clean form-data values that might be JSON-encoded strings
    const cleanValue = (value) => {
      if (typeof value === 'string') {
        // Remove surrounding quotes if present
        const trimmed = value.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        // Try to parse as JSON in case it's a JSON-encoded string
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            return value;
          }
        }
        return value;
      }
      return value;
    };
    
    const agency = await AgencyUser.findById(req.user.id);
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Check if profile is already completed
    if (agency.profileCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile already completed' 
      });
    }

    // Clean and validate required fields
    const cleanedFirstName = cleanValue(firstName);
    const cleanedLastName = cleanValue(lastName);
    const cleanedAadharOrPanNum = cleanValue(aadharOrPanNum);
    
    if (!cleanedFirstName || !cleanedLastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'First name and last name are required' 
      });
    }

    // Validate that aadharOrPanNum is provided
    if (!cleanedAadharOrPanNum) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aadhar or PAN number is required' 
      });
    }

    // Update agency details
    agency.firstName = cleanedFirstName;
    agency.lastName = cleanedLastName;
    agency.aadharOrPanNum = cleanedAadharOrPanNum;
    
    // Handle image upload if provided
    if (req.file) {
      const imageUrl = req.file.path;
      
      // Create image record
      const imageRecord = new AgencyImage({ agencyUserId: req.user.id, imageUrl });
      await imageRecord.save();
      
      agency.image = imageUrl;
    }

    await agency.save();

    // Check if both details and image are provided to mark profile as completed
    const profileCompleted = await checkAndMarkAgencyProfileCompleted(agency._id);
    
    // Reload agency to get updated values after profile completion check
    const updatedAgency = await AgencyUser.findById(req.user.id);

    res.json({ 
      success: true, 
      message: profileCompleted ? 'Profile completed and submitted for review' : 'Agency details saved successfully',
      data: {
        firstName: updatedAgency.firstName,
        lastName: updatedAgency.lastName,
        aadharOrPanNum: updatedAgency.aadharOrPanNum,
        image: updatedAgency.image,
        profileCompleted: updatedAgency.profileCompleted,
        reviewStatus: updatedAgency.reviewStatus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update agency profile details
exports.updateAgencyProfile = async (req, res) => {
  try {
    const { firstName, lastName, aadharOrPanNum } = req.body;
    
    // Helper function to clean form-data values that might be JSON-encoded strings
    const cleanValue = (value) => {
      if (typeof value === 'string') {
        // Remove surrounding quotes if present
        const trimmed = value.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        // Try to parse as JSON in case it's a JSON-encoded string
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            return value;
          }
        }
        return value;
      }
      return value;
    };
    
    const agency = await AgencyUser.findById(req.user.id);
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Clean the input values
    const cleanedFirstName = cleanValue(firstName);
    const cleanedLastName = cleanValue(lastName);
    const cleanedAadharOrPanNum = cleanValue(aadharOrPanNum);
    
    // Update agency details if provided
    if (cleanedFirstName) agency.firstName = cleanedFirstName;
    if (cleanedLastName) agency.lastName = cleanedLastName;
    if (cleanedAadharOrPanNum) agency.aadharOrPanNum = cleanedAadharOrPanNum;
    
    // Handle image upload if provided
    if (req.file) {
      const imageUrl = req.file.path;
      
      // Create image record
      const imageRecord = new AgencyImage({ agencyUserId: req.user.id, imageUrl });
      await imageRecord.save();
      
      agency.image = imageUrl;
    }

    await agency.save();

    // Check if both details and image are provided to mark profile as completed
    const profileCompleted = await checkAndMarkAgencyProfileCompleted(agency._id);
    
    // Reload agency to get updated values after profile completion check
    const updatedAgency = await AgencyUser.findById(req.user.id);

    res.json({ 
      success: true, 
      message: profileCompleted ? 'Profile completed and submitted for review' : 'Agency details updated successfully',
      data: {
        firstName: updatedAgency.firstName,
        lastName: updatedAgency.lastName,
        aadharOrPanNum: updatedAgency.aadharOrPanNum,
        image: updatedAgency.image,
        profileCompleted: updatedAgency.profileCompleted,
        reviewStatus: updatedAgency.reviewStatus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get agency profile
exports.agencyMe = async (req, res) => {
  try {
    const agency = await AgencyUser.findById(req.user.id)
      .select('-otp')
      .populate({
        path: 'referredByAgency',
        select: 'firstName lastName email'
      });
    if (!agency) return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    
    res.json({ success: true, data: agency });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update review status and award referral bonus if applicable
exports.updateReviewStatus = async (req, res) => {
  try {
    const { userId, reviewStatus } = req.body;
    
    const agency = await AgencyUser.findById(userId);
    if (!agency) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }
    
    const oldReviewStatus = agency.reviewStatus;
    agency.reviewStatus = reviewStatus;
    await agency.save();
    
    // Note: Referral bonus is handled only in admin approval, not in user-side review status update
    
    return res.json({
      success: true,
      message: 'Review status updated successfully',
      data: {
        userId: agency._id,
        reviewStatus: agency.reviewStatus
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
