const NotificationModel = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/emailHelper');

/**
 * Notification Service
 * Sends in-app, email, and SMS notifications to admin/manager users
 */
class NotificationService {

    /**
     * Send notification to specific users
     * @param {Object} params
     */
    static async notify({
        tenant_id,
        recipient_ids = [],
        title,
        message,
        type = 'info',
        category = 'system',
        entity_type,
        entity_id,
        action_url,
        channels = { in_app: true, email: false, sms: false }
    }) {
        try {
            const notifications = [];

            for (const recipientId of recipient_ids) {
                const notification = new NotificationModel({
                    tenant_id,
                    recipient_id: recipientId,
                    title,
                    message,
                    type,
                    category,
                    entity_type,
                    entity_id,
                    action_url,
                    channels
                });

                await notification.save();
                notifications.push(notification);

                // Send email if requested
                if (channels.email) {
                    await this._sendEmailNotification(recipientId, title, message);
                    notification.email_sent = true;
                    await notification.save();
                }
            }

            return notifications;
        } catch (error) {
            console.error('Notification service error:', error.message);
            return [];
        }
    }

    /**
     * Notify all admins and managers of a tenant
     */
    static async notifyAdminsAndManagers({
        tenant_id,
        title,
        message,
        type = 'info',
        category = 'system',
        entity_type,
        entity_id,
        action_url,
        channels = { in_app: true, email: true, sms: false }
    }) {
        try {
            // Find all admin and manager users for this tenant
            const users = await User.find({
                $or: [
                    { tenant_id: tenant_id, role: { $in: ['admin', 'manager'] } },
                    { owned_tenant_id: tenant_id, role: 'admin' }
                ],
                status: 'active'
            }).select('_id');

            const recipient_ids = users.map(u => u._id);

            return this.notify({
                tenant_id,
                recipient_ids,
                title,
                message,
                type,
                category,
                entity_type,
                entity_id,
                action_url,
                channels
            });
        } catch (error) {
            console.error('Notify admins/managers error:', error.message);
            return [];
        }
    }

    /**
     * Send email to a user
     */
    static async _sendEmailNotification(userId, subject, messageBody) {
        try {
            const user = await User.findById(userId).select('email name');
            if (!user || !user.email) return;

            const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a7a3a 0%, #2d9a4f 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">🌾 GrainHero Notification</h2>
          </div>
          <div style="padding: 24px; background: #f8faf8; border: 1px solid #e0e8e0; border-top: none; border-radius: 0 0 12px 12px;">
            <h3 style="color: #1a7a3a; margin-top: 0;">${subject}</h3>
            <p style="color: #333; line-height: 1.6;">${messageBody}</p>
            <hr style="border: none; border-top: 1px solid #e0e8e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated notification from GrainHero. Do not reply to this email.
            </p>
          </div>
        </div>
      `;

            await sendEmail(user.email, `GrainHero: ${subject}`, messageBody, html);
        } catch (error) {
            console.error('Email notification error:', error.message);
        }
    }

    /**
     * Send email to an external email address (for buyer invoices)
     */
    static async sendExternalEmail(email, subject, message, html) {
        try {
            await sendEmail(email, subject, message, html);
            return true;
        } catch (error) {
            console.error('External email error:', error.message);
            return false;
        }
    }

    // ====== Convenience Methods ======

    static async notifySpoilageEvent(tenant_id, batch, spoilageEvent) {
        return this.notifyAdminsAndManagers({
            tenant_id,
            title: `⚠️ Spoilage Alert: ${batch.batch_id}`,
            message: `${spoilageEvent.event_type} spoilage detected on batch ${batch.batch_id} (${spoilageEvent.severity}). Estimated loss: ${spoilageEvent.estimated_loss_kg || 'N/A'}kg. ${spoilageEvent.description || ''}`,
            type: spoilageEvent.severity === 'severe' || spoilageEvent.severity === 'total_loss' ? 'critical' : 'warning',
            category: 'spoilage',
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            action_url: `/grain-batches`,
            channels: { in_app: true, email: true, sms: false }
        });
    }

    static async notifyDispatch(tenant_id, batch, buyerName, quantity) {
        return this.notifyAdminsAndManagers({
            tenant_id,
            title: `🚚 Dispatch: ${batch.batch_id}`,
            message: `${quantity}kg of ${batch.grain_type} from batch ${batch.batch_id} dispatched to ${buyerName}`,
            type: 'success',
            category: 'dispatch',
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            action_url: `/grain-batches`,
            channels: { in_app: true, email: true, sms: false }
        });
    }

    static async notifyPaymentReceived(tenant_id, buyerName, amount, currency) {
        return this.notifyAdminsAndManagers({
            tenant_id,
            title: `💰 Payment Received`,
            message: `Payment of ${currency} ${amount.toLocaleString()} received from ${buyerName}`,
            type: 'success',
            category: 'payment',
            action_url: `/activity-logs`,
            channels: { in_app: true, email: false, sms: false }
        });
    }

    static async notifyInvoiceGenerated(tenant_id, invoiceNumber, buyerName) {
        return this.notifyAdminsAndManagers({
            tenant_id,
            title: `📄 Invoice Generated`,
            message: `Invoice #${invoiceNumber} generated for ${buyerName}`,
            type: 'info',
            category: 'invoice',
            action_url: `/activity-logs`,
            channels: { in_app: true, email: false, sms: false }
        });
    }
}

module.exports = NotificationService;
