const nodemailer = require('nodemailer'); //a library that creates mail tranport
const pug = require('pug'); // a library that converts pug files
const juice = require('juice'); // a library that converts form at into one liner 
const htmlToText = require('html-to-text'); // a library that convert html to text
const promisify = require('es6-promisify');

// creating a mailing function thats send valid email to MailTrap.io
const transport = nodemailer.createTransport({
	host: process.env.MAIL_HOST,
	port: process.env.MAIL_PORT,
	auth: {
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_PASS
	}
});

//trying the email below 
// transport.sendMail({
// 	from: 'Owa Aquino <owa@test.com>',
// 	to: 'sample@example.com',
// 	subject: 'Just trying things out!',
// 	html: 'Hey hey are you okay!',
// 	text: 'Hey hey are you okay!'
// });

//const because we don't need to use it outside.. this function render or convert pug files into html for proper email styling
const generateHTML = (filename, options = {}) => {
	const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
	const inlined = juice(html);
	return inlined;
}

exports.send = async (options) => {
	const html = generateHTML(options.filename, options);
	const text = htmlToText.fromString(html);

	const mailOptions = {
		from: 'Owa Aquino <noreply@owaaquino.com>',
		to: options.user.email,
		subject: options.subject,
		html: html,
		text: text
	};
	const sendMail = promisify(transport.sendMail, transport);
	return sendMail(mailOptions);
};
