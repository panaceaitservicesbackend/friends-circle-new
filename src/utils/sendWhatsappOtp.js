const twilio = require('twilio');

const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendWhatsappOtp = async (mobileNumber, otp) => {
  return client.messages.create({
    from: 'whatsapp:+14155238886', // Twilio WhatsApp Sandbox / Approved number
    to: `whatsapp:+91${mobileNumber}`, // change country code if needed
    body: `Your verification OTP is ${otp}. Do not share this OTP with anyone.`
  });
};

module.exports = sendWhatsappOtp;
