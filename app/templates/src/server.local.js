/* eslint no-console: 0 */
const app = require('./app');

const port = 3133;
app.listen(port);
console.log(`listening on http://localhost:${port}`);
