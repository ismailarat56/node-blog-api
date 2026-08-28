const express = require('express');

const userRouter = require('./routes/user.routes');

const notFoundHandler = require('./middlewares/not-found.middleware');

const errorHandler = require('./middlewares/error.middleware');

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

app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
