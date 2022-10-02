// The Cloud Functions for Firebase SDK to
// create Cloud Functions and set up triggers.
const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info("Hello logs!");
    response.send("Hello from Firebase!");
});

// exports.scheduledFunction =
// functions.pubsub.schedule('every 15 minutes').onRun((context) => {
//  console.log('This will be run every 15 minutes!');
//  return null;
// });

// SQLtoRealTimeChartTables
// Will run every ___ (15?) minutes
// Runs a series of SQL queries [for each account]
// const Knex = require('knex');
const createUnixSocketPool = require('./connect-unix.js');
// const createUnixSocketPool = require('./pool.js');

exports.SQLtoRealTimeChartTables =
    functions.https.onRequest((request, response) => {

        // const pg = require('knex')({ client: 'pg' });
        // response.send(knex.select("*").from("ContactHistory"));
        knex.raw("SELECT 1").then(() => {
            console.log("PostgreSQL connected");
            response.send("posgre conncted");
        }).catch((e) => {
            console.log("PostgreSQL not connected");
            console.error(e);
            response.send(e);
        });
    });
