module.exports = function formatMobile(mobileNumber) {
  if (!mobileNumber) return null;

  let mobile = mobileNumber.toString().trim();

  // remove spaces, +, dashes
  mobile = mobile.replace(/\D/g, '');

  // If user entered 10 digits -> assume India
  if (mobile.length === 10) {
    return '91' + mobile;
  }

  // If already has country code
  return mobile;
};
