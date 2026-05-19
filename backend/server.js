// Guest House Server Startup File - Central SSO Integrated
const app = require('./src/app');

app.listen(process.env.PORT || 5000);