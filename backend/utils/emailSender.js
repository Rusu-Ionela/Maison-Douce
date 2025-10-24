// 📁 backend/utils/emailSender.js

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'emailultau@gmail.com', // ✅ înlocuiește cu adresa ta
        pass: 'parola-aplicatiei'      // ✅ generează "App Password" în Gmail
    }
});

const trimiteEmail = async ({ to, subject, text, html }) => {
    try {
        await transporter.sendMail({
            from: '"TortApp" <emailultau@gmail.com>',
            to,
            subject,
            text,
            html
        });
        console.log('📩 Email trimis cu succes!');
    } catch (err) {
        console.error('❌ Eroare trimitere email:', err);
    }
};

module.exports = trimiteEmail;
