const AgencyUser = require('../../models/agency/AgencyUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const CallHistory = require('../../models/common/CallHistory');

// Agency earnings by referred females
exports.getAgencyEarnings = async (req, res) => {
  try {
    const agencyId = req.user._id;
    
    // Get query parameters for date filtering
    const { filter, startDate, endDate } = req.query;
    
    // Resolve date range based on filter using rolling 7-day windows
    let start, end;
    const now = new Date();
    
    // Helper functions for date normalization
    const startOfDay = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    
    const endOfDay = (date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };
    
    if (filter === 'thisWeek') {
      // Last 7 days INCLUDING today
      end = endOfDay(now);
      start = startOfDay(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
    } else if (filter === 'lastWeek') {
      // 7 days BEFORE thisWeek (7 days before today, not including today)
      const thisWeekStart = startOfDay(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
      
      end = endOfDay(
        new Date(thisWeekStart.getTime() - 1)
      );
      
      start = startOfDay(
        new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
    } else if (filter === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      start = startOfDay(start);
      end = endOfDay(end);
    } else {
      // Default to this week (last 7 days including today)
      end = endOfDay(now);
      start = startOfDay(
        new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      );
    }
    
    // Get agency-referred females with populated images
    const females = await FemaleUser.find({
      referredByAgency: agencyId,
      status: 'active',
      reviewStatus: 'accepted'
    })
    .select('_id name images score')
    .populate('images', 'imageUrl');
    
    if (females.length === 0) {
      return res.json({
        success: true,
        data: {
          range: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
          results: []
        }
      });
    }
    
    const femaleIds = females.map(f => f._id);
    
    // Aggregate earnings and time per female
    const earnings = await CallHistory.aggregate([
      {
        $match: {
          receiverId: { $in: femaleIds },
          createdAt: { $gte: start, $lte: end },
          status: 'completed' // Only completed calls count
        }
      },
      {
        $group: {
          _id: "$receiverId",
          totalCoins: { $sum: "$femaleEarning" },
          totalSeconds: { $sum: "$duration" }
        }
      }
    ]);
    
    // Format response
    const results = females.map(female => {
      const stat = earnings.find(e => e._id.toString() === female._id.toString());
      
      // Get first image as thumbnail
      const thumbnail = female.images && female.images.length > 0 
        ? female.images[0].imageUrl 
        : null;
      
      return {
        femaleId: female._id,
        name: female.name || 'Unknown',
        thumbnail: thumbnail,
        score: typeof female.score === 'number' ? female.score : 0,
        earningCoins: stat ? Math.round(stat.totalCoins * 100) / 100 : 0, // Round to 2 decimals
        timeHours: stat ? Number((stat.totalSeconds / 3600).toFixed(1)) : 0
      };
    });
    
    // Format date range for response
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    return res.json({
      success: true,
      data: {
        range: `${formatDate(start)} to ${formatDate(end)}`,
        results: results
      }
    });
    
  } catch (err) {
    console.error('Error getting agency earnings:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};