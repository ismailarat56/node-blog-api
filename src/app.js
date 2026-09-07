const express = require('express');

const authRouter = require('./routes/auth.routes');

const userRouter = require('./routes/user.routes');

const categoryRouter = require('./routes/category.routes');

const postRouter = require('./routes/post.routes');

const requestLogger = require('./middlewares/request-logger.middleware');

const notFoundHandler = require('./middlewares/not-found.middleware');

const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(
	express.json({
		limit: '20kb',
	})
);

app.use(requestLogger);

app.get('/health', (request, response) => {
	return response.status(200).json({
		success: true,
		message: 'Uygulama çalışıyor.',
	});
});

app.use('/api/v1/auth', authRouter);

app.use('/api/v1/users', userRouter);

app.use('/api/v1/categories', categoryRouter);

app.use('/api/v1/posts', postRouter);

app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
