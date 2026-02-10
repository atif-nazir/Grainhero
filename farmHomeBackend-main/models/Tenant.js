const mongoose = require('mongoose');
const { GEO_JSON_TYPES } = require('../configs/enum');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tenant name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: "Please enter a valid email address"
    }
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postal_code: String
  },
  location: {
    type: {
      type: String,
      enum: Object.values(GEO_JSON_TYPES),
      default: GEO_JSON_TYPES.POINT
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  // Business details
  business_type: {
    type: String,
    enum: ['farm', 'warehouse', 'mill', 'distributor', 'cooperative'],
    default: 'farm'
  },
  registration_number: String,
  tax_id: String,

  // Subscription and billing
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  billing_email: String,

  // Settings
  timezone: {
    type: String,
    default: 'UTC'
  },
  locale: {
    type: String,
    default: 'en',
    enum: ['en', 'ur', 'fr', 'es', 'ar']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'PKR', 'EUR', 'GBP', 'INR']
  },

  // Status and metadata
  is_active: {
    type: Boolean,
    default: true
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  verification_date: Date,

  // Limits and quotas
  user_limit: {
    type: Number,
    default: 5
  },
  device_limit: {
    type: Number,
    default: 10
  },
  storage_limit_gb: {
    type: Number,
    default: 1
  },

  // Metadata
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: [500, "Notes cannot exceed 500 characters"]
  },

  deleted_at: {
    type: Date,
    default: null,
    select: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes
tenantSchema.index({ is_active: 1 });
tenantSchema.index({ location: '2dsphere' });
tenantSchema.index({ created_at: -1 });

// Exclude deleted tenants by default
tenantSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for full address
tenantSchema.virtual('full_address').get(function () {
  const addr = this.address;
  if (!addr) return '';
  return [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ');
});

// Method to soft delete
tenantSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  this.is_active = false;
  return this.save();
};

module.exports = mongoose.model('Tenant', tenantSchema);
