const pool = require('./database');

async function testDatabase() {
	try {
		const [rows] = await pool.execute('SELECT 1 AS connection_test');

		console.log(rows);
		console.log('MySQL bağlantısı başarılı.');
	} catch (error) {
		console.error('MySQL bağlantısı kurulamadı.');
	} finally {
		await pool.end();
	}
}

testDatabase();
