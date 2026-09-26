const express = require('express');

const publicRouter = require('./routes/public.routes');
const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const categoryRouter = require('./routes/category.routes');
const postRouter = require('./routes/post.routes');
const commentRouter = require('./routes/comment.routes');
const devRoutes = require('./routes/dev.routes');

const { getMailConfig } = require('./config/mail.config');
const { getUploadConfig } = require('./config/upload.config');

const requestLogger = require('./middlewares/request-logger.middleware');
const notFoundHandler = require('./middlewares/not-found.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

const hops = Number(process.env.TRUST_PROXY_HOPS ?? '0');

if (!Number.isInteger(hops) || hops < 0 || hops > 5) {
	throw new Error('TRUST_PROXY_HOPS 0 ile 5 arasinda bir tam sayi olmalidir.');
}

if (hops > 0) {
	app.set('trust proxy', hops);
}

app.use(
	express.json({
		limit: '20kb',
	})
);

app.use(requestLogger);

const uploadConfig = getUploadConfig();

if (uploadConfig.serveUploads) {
	app.use(
		'/uploads',
		express.static(uploadConfig.directory, {
			index: false,
			dotfiles: 'ignore',
			maxAge: '7d',
		})
	);
}

app.get('/health', (request, response) => {
	return response.status(200).json({
		success: true,
		message: 'Uygulama çalışıyor.',
	});
});

app.use('/api/v1/public', publicRouter);

app.use('/api/v1/auth', authRouter);

app.use('/api/v1/users', userRouter);

app.use('/api/v1/categories', categoryRouter);

app.use('/api/v1/posts', postRouter);

app.use('/api/v1/comments', commentRouter);

if (getMailConfig().devOutbox) {
	app.use('/api/v1/dev', devRoutes);
}

app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
