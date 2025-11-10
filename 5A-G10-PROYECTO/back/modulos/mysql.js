const mySql = require("mysql2/promise");

const SQL_CONFIGURATION_DATA = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: 3306,
  charset: 'utf8mb4_general_ci', // CORREGIDO
};

/**
 * Realiza una query a la base de datos MySQL indicada en el archivo "mysql.js".
 * @param {String} queryString Query con placeholders "?".
 * @param {Array} params Valores para los placeholders
 * @returns {Array} Respuesta de la base de datos.
 */
exports.realizarQuery = async function (queryString, params = []) {
  let connection;
  try {
    connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);
    const [rows] = await connection.execute(queryString, params); // USAR execute con params
    return rows;
  } catch (err) {
    console.error("Error en realizarQuery:", err);
    throw err;
  } finally {
    if (connection && connection.end) await connection.end();
  }
};
