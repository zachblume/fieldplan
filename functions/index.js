// The Cloud Functions for Firebase SDK to create Cloud Functions and set up
// triggers.
const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// [START bigquery_query]
// [START bigquery_client_default_credentials]
// Import the Google Cloud client library using default credentials
const { BigQuery } = require("@google-cloud/bigquery");
const bigquery = new BigQuery();
// [END bigquery_client_default_credentials]

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!");
  response.send("Hello world");
});

exports.GetWeeklyContactAttempts = functions.https.onRequest(
  async (request, response) => {
    /* // GOODBYE KNEX! :)
    const knex = require('knex');
    const pool = knex({
      client: 'pg',
      connection: {
        user: 'postgres',
        password: 'easypassword',
        database: 'development',
        host: '/cloudsql/campaign-data-project:us-east1:fieldplan',
      },
    });


    pool.raw('select DATE_TRUNC(\'week\',"DateCanvassed") as week,count(*) as contactattempts from contacthistory group by week order by week ASC').then((result) => {
      const resultstring = JSON.stringify(result);
      db.collection('data').doc('weeklycontacthistory').set({
        resultstring,
      })
        .then(() => {
          response.send('Document successfully written!');
        })
        .catch((error) => {
          response.send('Error writing document: ', error);
        });
    });
    */

    const [rows] = await briefquery(`
      SELECT
        DATE_TRUNC(DateCanvassed,ISOWEEK) AS week,
        COUNT(*) AS contactattempts
      FROM
        development.contacthistory
      GROUP BY
        week
      ORDER BY
        week ASC
  `);
    console.log(rows);
    const resultstring = JSON.stringify(rows);
    db.collection("data")
      .doc("weeklycontacthistory")
      .set({
        resultstring,
      })
      .then(() => {
        response.send("Document successfully written!");
      })
      .catch((error) => {
        response.send("Error writing document: ", error);
      });
  }
);

exports.NGPVANAPItoSQL = functions.https.onRequest((request, response) => {
  const fetch = require("node-fetch");

  const url = "https://api.securevan.com/v4/changedEntityExportJobs";
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization:
        "Basic TlkuMDAxLjE1MDo4ZmI1M2JmYS00ZjJhLTJiOTMtYmY1MC00MTczYTQ5MWM2NWF8MQ==",
    },
    body: JSON.stringify({
      dateChangedFrom: "2022-02-08T01:02:03+04:00",
      dateChangedTo: "2022-05-08T01:09:03+04:00",
      resourceType: "ContactHistory",
      requestedFields: ["DateCreated"],
      fileSizeKbLimit: 100000,
      includeInactive: false,
    }),
  };

  fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      // response.send(json)
      db.collection("apicalls")
        .add({
          originalRequestURL: url,
          originalRequestOptions: options,
          apiResponse: json,
          timestampLogged: Date.now(),
        })
        .then(() => {
          response.send("Logged api call!");
        })
        .catch((error) => {
          response.send("Error logged api call: ", error);
        });
    })
    .catch((err) => response.send("error:" + err));
});

exports.PollNGPVANForResponse = functions.https.onRequest(
  async (request, response) => {
    /* const changedEntityID = await db.collection('apicalls')
        .orderBy('timestampLogged', 'desc')
        // Order documents by added_at field in descending order
        .limit(1).get();
    response.send(changedEntityID.data);*/

    const docpath = db.collection("apicalls").doc("NzyFhfuU0fialQS0VizE");
    const doc = await docpath.get();
    const changedEntityID = doc.data().apiResponse.exportJobId.toString();

    const fetch = require("node-fetch");

    const url =
      "https://api.securevan.com/v4/changedEntityExportJobs/" + changedEntityID;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization:
          "Basic TlkuMDAxLjE1MDo4ZmI1M2JmYS00ZjJhLTJiOTMtYmY1MC00MTczYTQ5MWM2NWF8MQ==",
      },
    };

    await fetch(url, options)
      .then((res) => res.json())
      .then((json) => {
        // response.send(json)
        db.collection("apicalls")
          .add({
            originalRequestURL: url,
            originalRequestOptions: options,
            apiResponse: json,
            timestampLogged: Date.now(),
          })
          .then(async () => {
            const url = json.files[0].downloadUrl;
            // const response_getcsv = getCSV(url, options);
            const fetch = require("node-fetch");
            await fetch(url)
              .then((res) => res.buffer())
              .then(async (data) => {
                const storageRef = admin.storage();
                const myBucket = storageRef.bucket(
                  "gs://campaign-data-project.appspot.com"
                );
                const getLastItem = (thePath) =>
                  thePath.substring(thePath.lastIndexOf("/") + 1);
                const saveAs = getLastItem(url);
                const file = myBucket.file(saveAs);
                await file.save(data).then((varvar) => {
                  db.collection("api-response-csvs").add({
                    changedEntityID: changedEntityID,
                    url: url,
                    savedAs: saveAs,
                    savedAtTimestamp: Date.now(),
                  });
                  response.send("Saved csv to firestore as " + saveAs);
                  loadCSVtoSQL(saveAs);
                });
              })
              .catch((err) => response.send("error:" + err));
          })
          .catch((error) => {
            response.send("Error logged api call: " + error);
          });
      })
      .catch((err) => response.send("error:" + err));
  }
);

// BEFORE RUNNING:
// ---------------
// 1. If not already done, enable the Cloud SQL Admin API
//    and check the quota for your project at
//    https://console.developers.google.com/apis/api/sqladmin
// 2. This sample uses Application Default Credentials for authentication.
//    If not already done, install the gcloud CLI from
//    https://cloud.google.com/sdk and run
//    `gcloud beta auth application-default login`.
//    For more information, see
//    https://developers.google.com/identity/protocols/application-default-credentials
// 3. Install the Node.js client library by running
//    `npm install googleapis --save`

const { google } = require("googleapis");
const sqlAdmin = google.sqladmin("v1beta4");
function authorize(callback) {
  google.auth
    .getClient({
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/sqlservice.admin",
      ],
    })
    .then((client) => {
      callback(client);
    })
    .catch((err) => {
      console.error("authentication failed: ", err);
    });
}
async function loadCSVtoSQL(filepath) {
  authorize(function (authClient) {
    const request = {
      project: "campaign-data-project", // TODO: Update placeholder value.
      instance: "fieldplan", // TODO: Update placeholder value.
      resource: {
        importContext: {
          uri: "gs://campaign-data-project.appspot.com/testexport.csv",
          database: "development",
          // 'kind': string,
          fileType: "CSV",
          csvImportOptions: {
            table: "ContactHistory", // ,
            // 'columns': [
            //   string
            // ],
            // 'escapeCharacter': string,
            // 'quoteCharacter': string,
            // 'fieldsTerminatedBy': string,
            // 'linesTerminatedBy': string
          },
          importUser: "postgres",
        },
      },
      auth: authClient,
    };
    sqlAdmin.instances.import(request, function (err, response) {
      if (err) {
        console.error(err);
        return;
      }
      // TODO: Change code below to process the `response` object:
      console.log(JSON.stringify(response, null, 2));
    });
  });
}

exports.bigquerytest = functions.https.onRequest(async (request, response) => {
  // Queries the U.S. given names dataset for the state of Texas.
  // Wait for the query to finish
  const [rows] = await briefquery(`SELECT name
    FROM \`bigquery-public-data.usa_names.usa_1910_2013\`
    WHERE state = 'TX'
    LIMIT 100`);

  // Print the results
  console.log("Rows:");
  rows.forEach((row) => console.log(row));
  response.send("finished");
});

async function briefquery(query) {
  // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: "US",
  };

  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);
  console.log(`Job ${job.id} started.`);
  // Print the status and statistics
  console.log("Status:");
  console.log(job.metadata.status);
  console.log("\nJob Statistics:");
  console.log(job.metadata.statistics);
  console.log("\nProcess Time:");
  console.log(
    job.metadata.statistics.endTime - job.metadata.statistics.creationTime
  );

  const queryresults = await job.getQueryResults();
  // Wait for the query to finish
  // Returns rows of query
  return queryresults;
}

exports.mobilizefetch = functions.https.onRequest(async (request, response) => {
  await fetchloader();

  response.send(Date.now().toString());
});

async function fetchloader(
  url = "https://events.mobilizeamerica.io/api/v1/organizations?per_page=10000"
) {
  const fetch = require("node-fetch");

  // const url = '';
  const options = {
    method: "GET",
    headers: {},
    // body: {},
  };

  fetch(url, options)
    .then((res) => res.json())
    .then((data) => {
      const resultstring = JSON.stringify(data.data);
      db.collection("mobilize-all-projects").add({
        resultstring: resultstring,
      });
      if (data.next) fetchloader(data.next);
    });
}
