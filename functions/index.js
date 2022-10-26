// The Cloud Functions for Firebase SDK to create Cloud Functions and set up
// triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const storageRef = admin.storage();

// [START bigquery_query]
// [START bigquery_client_default_credentials]
// Import the Google Cloud client library using default credentials
const { BigQuery } = require('@google-cloud/bigquery');
// const { firebase } = require("googleapis/build/src/apis/firebase");
const bigquery = new BigQuery();
// [END bigquery_client_default_credentials]

exports.helloWorld = functions.https.onRequest((request, response) => {
  console.log('request');
  console.log(request.query);
  // console.log("response");
  // console.log(response);
  functions.logger.info('Hello logs!');
  response.send('Hello world');
});

exports.helloWorldOnCall = functions.https.onCall((data, context) => {
  return data;
});

exports.GetData = functions.https.onRequest(async (request, response) => {
  // console.log(request.query);
  const definitions = {
    total_contact_attempts: {
      metric: 'count(*)',
      table: 'contacthistory_with_joins',
      doctitle: 'weeklycontacthistory',
      datecolumn: 'DateCanvassed',
    },
    doors: {
      metric: 'count(*)',
      table: 'contacthistory_with_joins WHERE contactType LIKE "%Walk%"',
      doctitle: 'weeklydoors',
      datecolumn: 'DateCanvassed',
    },
    calls: {
      metric: 'count(*)',
      table: 'contacthistory_with_joins WHERE contactType LIKE "%Phone%"',
      doctitle: 'weeklycalls',
      datecolumn: 'DateCanvassed',
    },
    texts: {
      metric: 'count(*)',
      table: 'contacthistory_with_joins WHERE contactType LIKE "%SMS%"',
      doctitle: 'weeklytexts',
      datecolumn: 'DateCanvassed',
    },
    total_survey_attempts: {
      metric: 'count(DISTINCT VanID)',
      table: 'ContactsSurveyResponses WHERE surveyQuestionID=469152',
      doctitle: 'weeklysurveys',
      datecolumn: 'DateCanvassed',
    },
    positiveids: {
      metric: 'count(DISTINCT VanID)',
      table: 'ContactsSurveyResponses WHERE surveyResponseID=1911988 OR surveyResponseID=1911989',
      doctitle: 'weeklypositiveids',
      datecolumn: 'DateCanvassed',
    },
    total_shifts: {
      metric: 'count(*)',
      table: 'signups_joined_events',
      doctitle: 'weeklysignups',
      datecolumn: 'startDate',
    },
    vanityvolunteers: {
      doctitle: 'vanityvolunteers',
      query: `WITH
      first_signup_table AS (
      SELECT
        personvanid,
        MIN(DATE_TRUNC(startDate,DAY)) AS first_signup_date
      FROM
        development.signups_joined_events
      WHERE
        eventTypeName!="Meeting"
      GROUP BY
        personvanid
      ORDER BY
        first_signup_date ),
      first_signup_aggregated_by_day AS (
      SELECT
        COUNT(personvanid) AS signups,
        first_signup_date
      FROM
        first_signup_table
      GROUP BY
        first_signup_date
      ORDER BY
        first_signup_date )
    /* -- Comment: The following lines are a cumulative graph
    SELECT
      SUM(signups) OVER (ORDER BY first_signup_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS metric,
      first_signup_date AS period
    FROM
      first_signup_aggregated_by_day
      */
      
      SELECT count(*) as metric, 
      DATE_TRUNC(first_signup_date,ISOWEEK) as period
       FROM first_signup_table
       group by period
      
      `,
    },
  };

  for (const _key in definitions) {
    if (_key) {
      const metric = _key || 'total_contact_attempts';
      const period = request.query.period || 'ISOWEEK';
      const metricDefinition = definitions[metric].metric;
      const table = definitions[metric].table;
      const doctitle = definitions[metric].doctitle;
      const datecolumn = definitions[metric].datecolumn;
      const query =
        'query' in definitions[metric]
          ? definitions[metric].query
          : `
      SELECT
        DATE_TRUNC(` +
            datecolumn +
            `,` +
            period +
            `) AS period,
        ` +
            metricDefinition +
            ` AS metric
      FROM
        development.` +
            table +
            `
      GROUP BY
        period
      ORDER BY
        period ASC
  `;
      briefquery(query).then(([rows]) => {
        console.log(rows);
        const resultstring = JSON.stringify(rows);
        db.collection('data')
          .doc(doctitle)
          .set({
            resultstring,
          })
          .then(() => {
            console.log('Document successfully written!');
          })
          .catch((error) => {
            response.send('Error writing document: ', error);
          });
      });
    }
  }

  response.send('Cloud function finished');
});

exports.NGPVANAPItoSQL = functions.https.onRequest((request, response) => {
  const fetch = require('node-fetch');

  const url = 'https://api.securevan.com/v4/changedEntityExportJobs';
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: 'Basic TlkuMDAxLjE1MDo4ZmI1M2JmYS00ZjJhLTJiOTMtYmY1MC00MTczYTQ5MWM2NWF8MQ==',
    },
    body: JSON.stringify({
      dateChangedFrom: '2022-02-08T01:02:03+04:00',
      dateChangedTo: '2022-05-08T01:09:03+04:00',
      resourceType: 'ContactHistory',
      requestedFields: [], // "DateCreated"
      fileSizeKbLimit: 100000,
      includeInactive: false,
    }),
  };

  fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      // response.send(json)
      console.log(json);
      db.collection('apicalls')
        .add({
          originalRequestURL: url,
          originalRequestOptions: options,
          apiResponse: json,
          timestampLogged: Date.now(),
        })
        .then((a) => {
          console.log(a);
          response.send('Logged api call!');
        })
        .catch((error) => {
          response.send('Error logged api call: ', error);
        });
    })
    .catch((err) => response.send('error:' + err));
});

exports.PollNGPVANForResponse = functions.https.onRequest(async (request, response) => {
  /* // Get last API call
     const changedEntityID = await db.collection('apicalls')
        .orderBy('timestampLogged', 'desc')
        // Order documents by added_at field in descending order
        .limit(1).get();
    response.send(changedEntityID.data);*/

  const docpath = db.collection('apicalls').doc('iYiYP13lLLKoPUMc8EEh');
  const doc = await docpath.get();
  const changedEntityID = doc.data().apiResponse.exportJobId.toString();

  const bucketTitle = 'gs://campaign-data-project.appspot.com';

  const fetch = require('node-fetch');

  const url = 'https://api.securevan.com/v4/changedEntityExportJobs/' + changedEntityID;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Basic TlkuMDAxLjE1MDo4ZmI1M2JmYS00ZjJhLTJiOTMtYmY1MC00MTczYTQ5MWM2NWF8MQ==',
    },
  };

  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      // response.send(json)
      // response.send(json);
      console.log(json);
      db.collection('apicalls')
        .add({
          originalRequestURL: url,
          originalRequestOptions: options,
          apiResponse: json,
          timestampLogged: Date.now(),
        })
        .then(async () => {
          const url = json.files[0].downloadUrl;
          console.log(json.files[0].downloadUrl);
          // const response_getcsv = getCSV(url, options);
          const fetch = require('node-fetch');
          await fetch(url)
            .then((res) => res.buffer())
            .then(async (data) => {
              const myBucket = storageRef.bucket(bucketTitle);
              const getLastItem = (thePath) => thePath.substring(thePath.lastIndexOf('/') + 1);
              const saveAs = getLastItem(url);
              const file = myBucket.file(saveAs);
              await file.save(data).then((varvar) => {
                db.collection('api-response-csvs').add({
                  changedEntityID: changedEntityID,
                  url: url,
                  savedAs: saveAs,
                  savedAtTimestamp: Date.now(),
                });
                response.send('Saved csv to firestore as ' + saveAs);
                loadCSVtoSQL(bucketTitle, saveAs, 'contacthistory');
              });
            })
            .catch((err) => response.send('error:' + err));
        })
        .catch((error) => {
          response.send('Error logged api call: ' + error);
        });
    })
    .catch((err) => response.send('error:' + err));
});

async function loadCSVtoSQL(bucketName, filepath, tableId) {
  // Imports a GCS file into a table with manually defined schema.

  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  const datasetId = 'development';
  // filepath = "testfixtitle.csv"; // that didnt fix it! ok.
  // const tableId = "contacthistory";
  // const bucketName = "campaign-data-project.appspot.com";
  // const filename = "testexport_0101522_000000000000.csv";

  // Configure the load job. For full list of options, see:
  // https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
  const metadata = {
    sourceFormat: 'CSV',
    skipLeadingRows: 1,
    // autodetect: true,
    location: 'US',
  };

  // Load data from a Google Cloud Storage file into the table
  const [job] = await bigquery
    .dataset(datasetId)
    .table('newtemptable')
    .load(storageRef.bucket(bucketName).file(filepath), metadata);

  // load() waits for the job to finish
  console.log(`Job ${job.id} completed.`);

  // Print the status and statistics
  console.log('Status:');
  console.log(job.status);
  console.log('\nJob Statistics:');
  console.log(job.statistics);
  console.log('\nProcess Time:');
  console.log(job.statistics.endTime - job.statistics.creationTime);

  // Check the job's status for errors
  const errors = job.status.errors;
  if (errors && errors.length > 0) {
    throw errors;
  }
}

exports.bigquerytest = functions.https.onRequest(async (request, response) => {
  // Queries the U.S. given names dataset for the state of Texas.
  // Wait for the query to finish
  const [rows] = await briefquery(`SELECT name
    FROM \`bigquery-public-data.usa_names.usa_1910_2013\`
    WHERE state = 'TX'
    LIMIT 100`);

  // Print the results
  console.log('Rows:');
  rows.forEach((row) => console.log(row));
  response.send('finished');
});

async function briefquery(query) {
  console.log('Query:', query);
  // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: 'US',
  };

  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);
  console.log(`Job ${job.id} started.`);
  // Print the status and statistics
  console.log('Status:');
  console.log(job.metadata.status);
  console.log('\nJob Statistics:');
  console.log(job.metadata.statistics);
  console.log('\nProcess Time:');
  console.log(job.metadata.statistics.endTime - job.metadata.statistics.creationTime);

  const queryresults = await job.getQueryResults();
  // Wait for the query to finish
  // Returns rows of query
  return queryresults;
}

exports.mobilizefetch = functions.https.onRequest(async (request, response) => {
  await fetchloader();

  response.send(Date.now().toString());
});

async function fetchloader(url = 'https://events.mobilizeamerica.io/api/v1/organizations?per_page=10000') {
  const fetch = require('node-fetch');

  // const url = '';
  const options = {
    method: 'GET',
    headers: {},
    // body: {},
  };

  fetch(url, options)
    .then((res) => res.json())
    .then((data) => {
      const resultstring = JSON.stringify(data.data);
      db.collection('mobilize-all-projects').add({
        resultstring: resultstring,
      });
      if (data.next) fetchloader(data.next);
    });
}
