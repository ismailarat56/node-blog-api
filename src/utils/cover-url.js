function buildCoverUrl(coverPath) {
	if (!coverPath) {
		return null;
	}

	return `/uploads/${coverPath}`;
}

function withCoverUrl(row) {
	if (!row) {
		return row;
	}

	const { cover_path: coverPath, ...rest } = row;

	return {
		...rest,
		cover_url: buildCoverUrl(coverPath),
	};
}

module.exports = {
	buildCoverUrl,
	withCoverUrl,
};
