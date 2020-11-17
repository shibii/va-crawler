# va-crawler

Vacancy ad crawler for the vacancy-aggregator stack.

- uses the [va-database](https://github.com/shibii/va-database) package to interface with the prepared postgres database.
- uses the [puppeteer](https://www.npmjs.com/package/puppeteer) package to crawl and parse the specified job ad sources
- uses the [winston](https://www.npmjs.com/package/winston) package to generate logs

Expects the following self-explanatory environment variables to configure the application and to connect to the postgres database: _DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD, LOG_FILE, PUPPETEER_GLOBAL_TIMEOUT_

**Note** that I have not included the vacancy ad source descriptions. Therefore the application is not usable as is. The application is not meant for public use.
