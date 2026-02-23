const ActivityLog = require('../models/ActivityLog');

/**
 * Centralized Activity Logging Service
 * Every important action in the system goes through here
 */
class LoggingService {
    /**
     * Create an activity log entry
     * @param {Object} params
     * @param {string} params.action - Action enum value
     * @param {string} params.category - Category enum value
     * @param {string} params.description - Human-readable description
     * @param {Object} params.user - req.user object
     * @param {string} params.entity_type - Model name
     * @param {string} params.entity_id - MongoDB ObjectId
     * @param {string} params.entity_ref - Human-readable reference (e.g. batch_id)
     * @param {Object} params.metadata - Additional data
     * @param {string} params.severity - 'info' | 'warning' | 'critical'
     * @param {string} params.ip_address - Request IP
     */
    static async log({
        action,
        category,
        description,
        user,
        entity_type,
        entity_id,
        entity_ref,
        metadata = {},
        severity = 'info',
        ip_address
    }) {
        try {
            const logEntry = new ActivityLog({
                tenant_id: user.tenant_id || user.owned_tenant_id,
                user_id: user._id,
                user_name: user.name || user.email,
                user_role: user.role,
                action,
                category,
                description,
                entity_type,
                entity_id,
                entity_ref,
                metadata,
                severity,
                ip_address
            });

            await logEntry.save();
            return logEntry;
        } catch (error) {
            // Don't let logging failures crash the main operation
            console.error('ActivityLog save error:', error.message);
            return null;
        }
    }

    // ====== Batch Logging Helpers ======
    static async logBatchCreated(user, batch, ip) {
        return this.log({
            action: 'batch_created',
            category: 'batch',
            description: `Batch ${batch.batch_id} created - ${batch.grain_type}, ${batch.quantity_kg}kg`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: {
                grain_type: batch.grain_type,
                quantity_kg: batch.quantity_kg,
                silo_id: batch.silo_id,
                farmer_name: batch.farmer_name
            },
            ip_address: ip
        });
    }

    static async logBatchUpdated(user, batch, changes, ip) {
        return this.log({
            action: 'batch_updated',
            category: 'batch',
            description: `Batch ${batch.batch_id} updated - fields: ${Object.keys(changes).join(', ')}`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: { changes },
            ip_address: ip
        });
    }

    static async logBatchDispatched(user, batch, dispatchDetails, ip) {
        return this.log({
            action: 'batch_dispatched',
            category: 'dispatch',
            description: `Batch ${batch.batch_id} dispatched - ${dispatchDetails.quantity_kg || batch.quantity_kg}kg to buyer`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: dispatchDetails,
            ip_address: ip
        });
    }

    static async logBatchDeleted(user, batch, ip) {
        return this.log({
            action: 'batch_deleted',
            category: 'batch',
            description: `Batch ${batch.batch_id} deleted`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            severity: 'warning',
            ip_address: ip
        });
    }

    // ====== Spoilage Logging Helpers ======
    static async logSpoilageEvent(user, batch, spoilageEvent, ip) {
        return this.log({
            action: 'spoilage_event_logged',
            category: 'spoilage',
            description: `Spoilage event on batch ${batch.batch_id} - ${spoilageEvent.event_type} (${spoilageEvent.severity})`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: {
                event_type: spoilageEvent.event_type,
                severity: spoilageEvent.severity,
                estimated_loss_kg: spoilageEvent.estimated_loss_kg,
                estimated_value_loss: spoilageEvent.estimated_value_loss
            },
            severity: spoilageEvent.severity === 'severe' || spoilageEvent.severity === 'total_loss' ? 'critical' : 'warning',
            ip_address: ip
        });
    }

    // ====== Buyer Logging Helpers ======
    static async logBuyerCreated(user, buyer, ip) {
        return this.log({
            action: 'buyer_created',
            category: 'buyer',
            description: `Buyer "${buyer.name}" created`,
            user,
            entity_type: 'Buyer',
            entity_id: buyer._id,
            entity_ref: buyer.name,
            ip_address: ip
        });
    }

    static async logBuyerUpdated(user, buyer, ip) {
        return this.log({
            action: 'buyer_updated',
            category: 'buyer',
            description: `Buyer "${buyer.name}" updated`,
            user,
            entity_type: 'Buyer',
            entity_id: buyer._id,
            entity_ref: buyer.name,
            ip_address: ip
        });
    }

    // ====== Payment Logging Helpers ======
    static async logBuyerPayment(user, payment, buyerName, ip) {
        return this.log({
            action: 'buyer_payment_logged',
            category: 'payment',
            description: `Payment of ${payment.currency} ${payment.amount} recorded from ${buyerName} via ${payment.payment_method}`,
            user,
            entity_type: 'BuyerPayment',
            entity_id: payment._id,
            entity_ref: buyerName,
            metadata: {
                amount: payment.amount,
                payment_method: payment.payment_method,
                buyer_id: payment.buyer_id
            },
            ip_address: ip
        });
    }

    // ====== Invoice Logging Helpers ======
    static async logInvoiceGenerated(user, invoice, ip) {
        return this.log({
            action: 'invoice_generated',
            category: 'invoice',
            description: `Invoice #${invoice.invoice_number} generated for ${invoice.buyer_name} - ${invoice.currency} ${invoice.total_amount}`,
            user,
            entity_type: 'BuyerInvoice',
            entity_id: invoice._id,
            entity_ref: invoice.invoice_number,
            metadata: {
                total_amount: invoice.total_amount,
                buyer_id: invoice.buyer_id
            },
            ip_address: ip
        });
    }

    static async logInvoiceEmailed(user, invoice, recipientEmail, ip) {
        return this.log({
            action: 'invoice_emailed',
            category: 'invoice',
            description: `Invoice #${invoice.invoice_number} emailed to ${recipientEmail}`,
            user,
            entity_type: 'BuyerInvoice',
            entity_id: invoice._id,
            entity_ref: invoice.invoice_number,
            ip_address: ip
        });
    }

    // ====== Insurance Logging Helpers ======
    static async logInsuranceClaimFiled(user, claim, ip) {
        return this.log({
            action: 'insurance_claim_filed',
            category: 'insurance',
            description: `Insurance claim ${claim.claim_number} filed - ${claim.claim_type}`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            severity: 'warning',
            ip_address: ip
        });
    }

    // ====== Report Logging Helpers ======
    static async logReportGenerated(user, reportType, entityRef, ip) {
        return this.log({
            action: 'batch_report_generated',
            category: 'report',
            description: `${reportType} report generated for ${entityRef}`,
            user,
            entity_type: 'GrainBatch',
            entity_ref: entityRef,
            ip_address: ip
        });
    }
}

module.exports = LoggingService;
