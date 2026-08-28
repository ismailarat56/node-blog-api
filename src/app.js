const express = require('express');

const userRouter = require('./routes/user.routes');

const app = express();

app.use(
	express.json({
		limit: '20kb',
	})
);

app.get('/health', (request, response) => {
	return response.status(200).json({
		success: true,
		message: 'Uygulama çalışıyor.',
	});
});

app.use('/api/v1/users', userRouter);

module.exports = app;
