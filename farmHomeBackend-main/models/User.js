const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { USER_ROLES, USER_STATUSES, GEO_JSON_TYPES } = require("../configs/enum");

const userSchema = new mongoose.Schema({
    // Basic information
    name: { 
        type: String, 
        required: [true, "Name is required"],
        trim: true
    },
    email: { 
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: "Please enter a valid email address"
        }
    },
    password: { 
        type: String, 
        required: [true, "Password is required"],
        select: false
    },
    phone: { 
        type: String,
        trim: true
    },
    
    // Profile information
    avatar: { 
        type: String, 
        default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" 
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    
    // Role and permissions
    role: { 
        type: String, 
        enum: {
            values: Object.values(USER_ROLES),
            message: `Role must be one of: ${Object.values(USER_ROLES).join(", ")}`
        },
        default: USER_ROLES.TECHNICIAN
    },
    
    // Status
    status: {
        type: String,
        enum: Object.values(USER_STATUSES),
        default: USER_STATUSES.ACTIVE
    },
    blocked: { 
        type: Boolean, 
        default: false 
    },
    
    // Tenant association (for multi-tenancy)
    // Admin creates and owns the tenant, Manager and Technician belong to tenant
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: function() { 
            return this.role !== USER_ROLES.SUPER_ADMIN && this.role !== USER_ROLES.ADMIN; 
        }
    },
    
    // For Admin role - they own/manage a tenant instead of belonging to one
    owned_tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: function() {
            return this.role === USER_ROLES.ADMIN;
        }
    },
    
    // Location information
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
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postal_code: String
    },
    
    // Authentication and security
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    
    // Subscription and billing (Stripe integration)
    priceId: { type: String }, // Stripe price ID for subscription
    hasAccess: { 
        type: String, 
        default: 'none',
        enum: ['none', 'basic', 'intermediate', 'pro']
    }, // Subscription access flag
    customerId: { type: String }, // Stripe customer ID
    
    // Preferences and settings
    preferences: {
        language: {
            type: String,
            default: 'en',
            enum: ['en', 'ur', 'fr', 'es', 'ar']
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        },
        dashboard_layout: String
    },
    
    // FCM tokens for push notifications
    fcm_tokens: [{
        device: String,
        token: String,
        created_at: { type: Date, default: Date.now }
    }],
    
    // Audit fields
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Soft delete
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
userSchema.index({ email: 1 });
userSchema.index({ tenant_id: 1, role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ location: '2dsphere' });

// Exclude deleted users by default
userSchema.pre(/^find/, function() {
    this.where({ deleted_at: null });
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.name;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: {
                lockUntil: 1,
            },
            $set: {
                loginAttempts: 1,
            }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
        };
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockUntil: 1
        },
        $set: {
            lastLogin: new Date()
        }
    });
};

// Method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
    const { hasPermission } = require('../configs/role-permissions');
    return hasPermission(this.role, permission);
};

// Method to check if user has role
userSchema.methods.hasRole = function(role) {
    if (Array.isArray(role)) {
        return role.includes(this.role);
    }
    return this.role === role;
};

// Method to soft delete
userSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.status = USER_STATUSES.DELETED;
    return this.save();
};

const User = mongoose.model("User", userSchema);
module.exports = User;