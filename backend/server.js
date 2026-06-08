const app = require('./src/app');
const { initCronJobs } = require('./src/utils/cron');

initCronJobs();

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server listening on port ${process.env.PORT || 5000}`);
});