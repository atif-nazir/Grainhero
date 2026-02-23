const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Tenant scoping
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        index: true
    },

    // Who performed the action
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user_name: String,
    user_role: {
        type: String,
        enum: ['super_admin', 'admin', 'manager', 'technician']
    },

    // What happened
    action: {
        type: String,
        required: true,
        enum: [
            // Batch lifecycle
            'batch_created', 'batch_updated', 'batch_dispatched', 'batch_deleted',
            // Spoilage
            'spoilage_event_logged', 'spoilage_photo_uploaded',
            // Buyer
            'buyer_created', 'buyer_updated', 'buyer_deleted',
            // Dispatch & payments
            'dispatch_completed', 'buyer_payment_logged', 'buyer_payment_updated',
            // Insurance
            'insurance_policy_created', 'insurance_policy_updated',
            'insurance_claim_filed', 'insurance_claim_updated',
            // Invoice
            'invoice_generated', 'invoice_emailed',
            // Reports
            'batch_report_generated', 'traceability_report_generated',
            // System
            'user_login', 'user_logout', 'settings_updated',
            // Generic
            'other'
        ],
        index: true
    },

    // Category for filtering
    category: {
        type: String,
        enum: ['batch', 'spoilage', 'buyer', 'dispatch', 'payment', 'insurance', 'invoice', 'report', 'system'],
        index: true
    },

    // What entity was affected
    entity_type: {
        type: String,
        enum: ['GrainBatch', 'Buyer', 'InsurancePolicy', 'InsuranceClaim', 'BuyerInvoice', 'BuyerPayment', 'User', 'Silo', 'System']
    },
    entity_id: {
        type: mongoose.Schema.Types.ObjectId
    },
    entity_ref: String, // human-readable ref like batch_id "WB-001-2026"

    // Description
    description: {
        type: String,
        required: true
    },

    // Additional metadata (flexible, keep it light)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Severity for importance
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },

    // IP address for security auditing
    ip_address: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

// Indexes for fast querying
activityLogSchema.index({ tenant_id: 1, created_at: -1 });
activityLogSchema.index({ user_id: 1, created_at: -1 });
activityLogSchema.index({ entity_type: 1, entity_id: 1 });
activityLogSchema.index({ category: 1, created_at: -1 });

// TTL index: auto-delete logs after 1 year (365 days)
activityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
