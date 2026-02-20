const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Who receives this
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        index: true
    },
    recipient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Notification content
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },

    // Type and category
    type: {
        type: String,
        enum: ['info', 'warning', 'critical', 'success'],
        default: 'info'
    },
    category: {
        type: String,
        enum: ['batch', 'spoilage', 'dispatch', 'payment', 'insurance', 'invoice', 'system'],
        default: 'system'
    },

    // Link to related entity
    entity_type: String,
    entity_id: mongoose.Schema.Types.ObjectId,
    action_url: String, // frontend route to navigate to

    // Delivery channels
    channels: {
        in_app: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false }
    },

    // Status tracking
    read: { type: Boolean, default: false },
    read_at: Date,

    // Email/SMS delivery status
    email_sent: { type: Boolean, default: false },
    sms_sent: { type: Boolean, default: false }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

// Indexes
notificationSchema.index({ recipient_id: 1, read: 1, created_at: -1 });
notificationSchema.index({ tenant_id: 1, category: 1 });

// TTL: auto-delete after 90 days
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
