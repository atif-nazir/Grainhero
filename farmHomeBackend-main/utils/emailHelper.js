const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendEmail(to, subject, text, html) {
    let transporter = nodemailer.createTransport({
        service: 'gmail', // Change if using another provider
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    };
    if (html) {
        mailOptions.html = html;
    }

    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail; 