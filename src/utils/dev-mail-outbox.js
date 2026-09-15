const MAX_MESSAGES = 50;
const messages = [];

function rememberMail(message) {
	messages.push({
		to: String(message.to).trim().toLowerCase(),
		subject: message.subject,
		text: message.text,
		created_at: new Date().toISOString(),
	});

	if (messages.length > MAX_MESSAGES) {
		messages.shift();
	}
}

function findLatestMailTo(address) {
	const target = String(address).trim().toLowerCase();

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index].to === target) {
			return messages[index];
		}
	}

	return null;
}

module.exports = {
	rememberMail,
	findLatestMailTo,
};
