import sql from "mssql";
import {
  DefaultAzureCredential
} from "@azure/identity";
import dotenv from "dotenv";

dotenv.config();

const credential = new DefaultAzureCredential();

let poolPromise = null;

async function createPool() {
  const server =
    process.env.AZURE_SQL_SERVER;

  const database =
    process.env.AZURE_SQL_DATABASE;

  if (!server) {
    throw new Error(
      "AZURE_SQL_SERVER environment variable is missing."
    );
  }

  if (!database) {
    throw new Error(
      "AZURE_SQL_DATABASE environment variable is missing."
    );
  }

  console.log(
    `Connecting to Azure SQL server ${server}, database ${database}`
  );

  const accessToken =
    await credential.getToken(
      "https://database.windows.net/.default"
    );

  if (!accessToken) {
    throw new Error(
      "Unable to acquire an Azure SQL access token."
    );
  }

  const config = {
    server,
    database,

    options: {
      encrypt: true,
      trustServerCertificate: false
    },

    authentication: {
      type: "azure-active-directory-access-token",
      options: {
        token: accessToken.token
      }
    },

    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },

    connectionTimeout: 30000,
    requestTimeout: 30000
  };

  const pool = new sql.ConnectionPool(config);

  pool.on("error", (error) => {
    console.error(
      "Azure SQL pool error:",
      error
    );
  });

  await pool.connect();

  console.log(
    "Connected to Azure SQL successfully."
  );

  return pool;
}

export function getPool() {
  if (!poolPromise) {
    poolPromise = createPool().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

export { sql };
