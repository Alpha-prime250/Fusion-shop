const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    line1: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: 'user',
      index: true,
    },
    // Vendor-specific fields (only relevant when role === 'vendor')
    vendorProfile: {
      storeName: { type: String },
      storeDescription: { type: String },
      approved: { type: Boolean, default: false }, // admin must approve vendor accounts
      phone: { type: String },
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    addresses: { type: [AddressSchema], default: [] },
    isActive: {
      type: Boolean,
      default: true, // admin can deactivate users/vendors
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

UserSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
