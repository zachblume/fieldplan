// Firebase functions
const functions = require('firebase-functions');

// Firebase Admin SDK
const admin = require('firebase-admin');
admin.initializeApp();

// Firestore
const db = admin.firestore();
const storageRef = admin.storage();

// BQ with default credentials
const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

// Node Fetch
const fetch = require('node-fetch');

/**
 *
 * Query SQL database and move transformed data to Firestore
 *
 */
exports.GetData = functions.https.onRequest(async (request, response) => {
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

/**
 *
 * Make a request to NGPVAN for a resource
 *
 */
exports.ExportFromNGPVAN = functions.https.onRequest((request, response) => {
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

/**
 *
 * Followup and get the response from NGPVAN and store it in Google Cloud Storage
 *
 */
exports.PollNGPVANForResponse = functions.https.onRequest(async (request, response) => {
  // Settings
  const doc = await db.collection('apicalls').doc('iYiYP13lLLKoPUMc8EEh').get();
  const changedEntityID = doc.data().apiResponse.exportJobId.toString();
  const bucketTitle = 'gs://campaign-data-project.appspot.com';
  const url = 'https://api.securevan.com/v4/changedEntityExportJobs/' + changedEntityID;

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Basic TlkuMDAxLjE1MDo4ZmI1M2JmYS00ZjJhLTJiOTMtYmY1MC00MTczYTQ5MWM2NWF8MQ==',
    },
  };

  // Make API request
  const res = await fetch(url, options);
  const json = await res.json();

  // Log API request
  await db.collection('apicalls').add({
    originalRequestURL: url,
    originalRequestOptions: options,
    apiResponse: json,
    timestampLogged: Date.now(),
  });

  // If a URL for a response CSV exists, fetch it to store in GCS
  if (json.files[0].downloadUrl) {
    // Fetch the downloadable file and load it into byte buffer
    const fufilledRes = await fetch(json.files[0].downloadUrl);
    const data = await fufilledRes.buffer();

    // Define filename to 'to save as'
    const getLastItem = (thePath) => thePath.substring(thePath.lastIndexOf('/') + 1);
    const saveAs = getLastItem(url);

    // Open storage connection
    const myBucket = storageRef.bucket(bucketTitle);
    const file = myBucket.file(saveAs);

    // Save the file to GCS
    const fileSaveRes = await file.save(data);
    console.log('fileSaveRes', fileSaveRes);

    // Log API response
    db.collection('api-response-csvs').add({
      changedEntityID: changedEntityID,
      url: url,
      savedAs: saveAs,
      savedAtTimestamp: Date.now(),
    });

    // Send it off to be loaded from GCS-CSV to SQL server
    loadCSVtoSQL(bucketTitle, saveAs, 'contacthistory');

    // Report success
    response.send('Saved csv to firestore as ' + saveAs);
  }
});

/**
 *
 * Load CSV from GCS to SQL server
 * @param {string} bucketName GCS Bucket name
 * @param {string} filepath g:// GCS URI where CSV we want to load is stored
 * @param {tableId} tableId Table we're inserting into
 */
async function loadCSVtoSQL(bucketName = 'campaign-data-project.appspot.com', filepath, tableId = 'contacthistory') {
  // Override tableid for development purposes
  tableId = 'temptable';

  // In dev, everything is in this dataset.
  const datasetId = 'development';

  // Load job options at https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
  const metadata = {
    sourceFormat: 'CSV',
    skipLeadingRows: 1,
    location: 'US', // autodetect: true,
  };

  // Load data from a Google Cloud Storage file into a temp table and await finish
  const [job] = await bigquery
    .dataset(datasetId)
    .table(tableId)
    .load(storageRef.bucket(bucketName).file(filepath), metadata);

  // Check the job's status for errors
  const errors = job.status.errors;
  if (errors && errors.length > 0) throw errors;
}

/**
 *
 * Returns query results, compactly
 * @param {string} query SQL query to run
 */
async function briefquery(query) {
  // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
  const options = {
    query: query,
    location: 'US',
  };

  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);

  // Print the status and statistics
  console.log('Query:', query);
  console.log('Job Status:', job.metadata.status);
  console.log('\nJob Statistics:', job.metadata.statistics);
  console.log('\nProcess Time:', job.metadata.statistics.endTime - job.statistics.creationTime);

  const queryresults = await job.getQueryResults();
  return queryresults;
}

/**
 *
 * Test function that stores every public Mobilize event ever in Firestore
 *
 */
exports.LoadEveryMobilizeEventEver = functions.https.onRequest(async (request, response) => {
  response.send(await pingMobilizeAPI());
});

async function pingMobilizeAPI(url = 'https://events.mobilizeamerica.io/api/v1/organizations?per_page=10000') {
  const options = {
    method: 'GET',
    headers: {}, // body: {},
  };

  // Make request
  const res = await fetch(url, options);
  const data = await res.json();

  // Get result
  const resultstring = JSON.stringify(data.data);

  // Put it in Firestore
  db.collection('mobilize-all-projects').add({
    resultstring: resultstring,
  });

  // Recurse
  if (data.next) await pingMobilizeAPI(data.next);
  else return Date.now().toString();
}
