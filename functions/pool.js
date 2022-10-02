
// Set up a variable to hold our connection pool. It would be safe to
// initialize this right away, but we defer its instantiation to ease
// testing different configurations.
let pool;

app.use(async (req, res, next) => {
    if (pool) {
        return next();
    }
    try {
        pool = await createPoolAndEnsureSchema();
        next();
    } catch (err) {
        logger.error(err);
        return next(err);
    }
});

// Initialize Knex, a Node.js SQL query builder library with built-in connection pooling.
const createPool = async () => {
    // Configure which instance and what database user to connect with.
    // Remember - storing secrets in plaintext is potentially unsafe. Consider using
    // something like https://cloud.google.com/kms/ to help keep secrets secret.
    const config = { pool: {} };

    // [START cloud_sql_postgres_knex_limit]
    // 'max' limits the total number of concurrent connections this pool will keep. Ideal
    // values for this setting are highly variable on app design, infrastructure, and database.
    config.pool.max = 5;
    // 'min' is the minimum number of idle connections Knex maintains in the pool.
    // Additional connections will be established to meet this value unless the pool is full.
    config.pool.min = 5;
    // [END cloud_sql_postgres_knex_limit]

    // [START cloud_sql_postgres_knex_timeout]
    // 'acquireTimeoutMillis' is the number of milliseconds before a timeout occurs when acquiring a
    // connection from the pool. This is slightly different from connectionTimeout, because acquiring
    // a pool connection does not always involve making a new connection, and may include multiple retries.
    // when making a connection
    config.pool.acquireTimeoutMillis = 60000; // 60 seconds
    // 'createTimeoutMillis` is the maximum number of milliseconds to wait trying to establish an
    // initial connection before retrying.
    // After acquireTimeoutMillis has passed, a timeout exception will be thrown.
    config.pool.createTimeoutMillis = 30000; // 30 seconds
    // 'idleTimeoutMillis' is the number of milliseconds a connection must sit idle in the pool
    // and not be checked out before it is automatically closed.
    config.pool.idleTimeoutMillis = 600000; // 10 minutes
    // [END cloud_sql_postgres_knex_timeout]

    // [START cloud_sql_postgres_knex_backoff]
    // 'knex' uses a built-in retry strategy which does not implement backoff.
    // 'createRetryIntervalMillis' is how long to idle after failed connection creation before trying again
    config.pool.createRetryIntervalMillis = 200; // 0.2 seconds
    // [END cloud_sql_postgres_knex_backoff]

    // Check if a Secret Manager secret version is defined
    // If a version is defined, retrieve the secret from Secret Manager and set as the DB_PASS
    const { CLOUD_SQL_CREDENTIALS_SECRET } = process.env;
    if (CLOUD_SQL_CREDENTIALS_SECRET) {
        const secrets = await accessSecretVersion(CLOUD_SQL_CREDENTIALS_SECRET);
        try {
            process.env.DB_PASS = secrets.toString();
        } catch (err) {
            err.message = `Unable to parse secret from Secret Manager. Make sure that the secret is JSON formatted: \n ${err.message} `;
            throw err;
        }
    }

    if (process.env.INSTANCE_HOST) {
        // Use a TCP socket when INSTANCE_HOST (e.g., 127.0.0.1) is defined
        return createTcpPool(config);
    } else if (process.env.INSTANCE_UNIX_SOCKET) {
        // Use a Unix socket when INSTANCE_UNIX_SOCKET (e.g., /cloudsql/proj:region:instance) is defined.
        return createUnixSocketPool(config);
    } else {
        throw 'One of INSTANCE_HOST or INSTANCE_UNIX_SOCKET` is required.';
    }
};

const ensureSchema = async pool => {
    const hasTable = await pool.schema.hasTable('votes');
    if (!hasTable) {
        return pool.schema.createTable('votes', table => {
            table.increments('vote_id').primary();
            table.timestamp('time_cast', 30).notNullable();
            table.specificType('candidate', 'CHAR(6)').notNullable();
        });
    }
    logger.info("Ensured that table 'votes' exists");
};

const createPoolAndEnsureSchema = async () =>
    await createPool()
        .then(async pool => {
            await ensureSchema(pool);
            return pool;
        })
        .catch(err => {
            logger.error(err);
            throw err;
        });