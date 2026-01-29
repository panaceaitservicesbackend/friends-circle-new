const axios = require("axios");

const sendSmsOtp = async (mobile, otp) => {
  try {
    await axios.get("https://api.msg91.com/api/v5/otp", {
      headers: {
          authkey: process.env.MSG91_AUTH_KEY
      },
      params: {
        mobile: mobile, // format: 919876543210
        template_id: process.env.MSG91_TEMPLATE_ID,
        otp: otp
      }
    });
  } catch (err) {
    console.error("MSG91 SMS Error:", err.response?.data || err.message);
    throw new Error("Failed to send SMS OTP");
  }
};

module.exports = sendSmsOtp;
