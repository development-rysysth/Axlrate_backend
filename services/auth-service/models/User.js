const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    businessEmail: {
      type: String,
      required: [true, 'Business email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    
    // Hotel Information
    hotelName: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
    },
    
    // Contact
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    
    // Property Management System
    currentPMS: {
      type: String,
      required: [true, 'Current Property Management System is required'],
      trim: true,
    },
    
    // Business Type
    businessType: {
      type: String,
      required: [true, 'Business type is required'],
      enum: {
        values: ['Independent Hotel', 'Chain Hotel', 'Hotel Management Company', "OTA's"],
        message: 'Business type must be one of: Independent Hotel, Chain Hotel, Hotel Management Company, OTA\'s',
      },
    },
    
    // Inventory
    numberOfRooms: {
      type: Number,
      required: [true, 'Number of rooms is required'],
      min: [1, 'Number of rooms must be at least 1'],
    },
    
    // Authentication
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    
    // Refresh Tokens (array to support multiple devices)
    refreshTokens: [{
      type: String,
    }],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshTokens;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

