// The Cloud Functions for Firebase SDK.
const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info("Hello logs!");
    response.send("Hello world");
});

// exports.scheduledFunction =
// functions.pubsub.schedule('every 15 minutes').onRun((context) => {
//  console.log('This will be run every 15 minutes!');
//  return null;
// });

exports.GetWeeklyContactAttempts =
    functions.https.onRequest((request, response) => {

        const Knex = require("knex");
        const pool = Knex({
            client: "pg",
            connection: {
                user: "postgres",
                password: "easypassword",
                database: "development",
                host: "/cloudsql/campaign-data-project:us-east1:fieldplan",
            }
        });

        pool.raw("select DATE_TRUNC('week',\"DateCanvassed\") as week,count(*) as contactattempts from contacthistory group by week order by week ASC").then(result => {
            const resultstring = JSON.stringify(result);
            db.collection("data").doc("weeklycontacthistory").set({
                resultstring
            })
                .then(() => {
                    response.send("Document successfully written!");
                })
                .catch((error) => {
                    response.send("Error writing document: ", error);
                });

        });

    });
