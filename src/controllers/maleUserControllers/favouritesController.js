const MaleFavourites = require('../../models/maleUser/Favourites');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');

// Add a Female User to MaleFavourites
exports.addToMaleFavourites = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    const maleUser = await MaleUser.findById(req.user.id);

    if (!maleUser) {
      return res.status(404).json({ success: false, message: 'Male user not found' });
    }

    if (maleUser.favourites.includes(femaleUserId)) {
      return res.status(400).json({ success: false, message: 'Already in favourites' });
    }

    maleUser.favourites.push(femaleUserId);
    await maleUser.save();

    res.json({ success: true, message: 'Added to favourites' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// Remove a Female User from MaleFavourites
exports.removeFromMaleFavourites = async (req, res) => {
  const { femaleUserId } = req.body;

  try {
    const maleUser = await MaleUser.findById(req.user.id);

    // Remove from male user's MaleFavourites list
    await MaleFavourites.findOneAndDelete({ maleUserId: maleUser._id, femaleUserId });

    res.json({ success: true, message: 'Female user removed from MaleFavourites.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Male User's MaleFavourites List
exports.getMaleFavouritesList = async (req, res) => {
  try {
    const maleUser = await MaleUser.findById(req.user.id);

    const MaleFavouritesList = await MaleFavourites.find({ maleUserId: maleUser._id }).populate('femaleUserId', 'name email');
    res.json({ success: true, data: MaleFavouritesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
