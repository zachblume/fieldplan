// A list of available chart types
const available_metrics = [
  'calls',
  'completeshifts',
  'contacthistory',
  'doors',
  'percent_complete',
  'percent_complete_alltime',
  'positive_id_per_completed_shift',
  'positiveids',
  'signups',
  'surveys',
  'texts',
  'vanityvolunteers',
];

// This variable maps firestore doc names to home page graph numbers
const choices = {
  weeklycontacthistory: 1,
  positiveids: '',
  weeklysignups: 3,
  vanityvolunteers: 4,
  percent_complete: 5,
  positive_id_per_completed_shift: 6,
};

console.log('app.js begins running, time logged as StartTimeLogged');
const StartTimeLogged = Date.now();
console.timeLog();

// Begin with IDB direct chart compose if it exists to save miliseconds
const charts = [];

function nFormatter(num, ...params) {
  const digits = params.digits || 1;
  //console.log(digits);
  const lookup = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol : '0';
}

// Quickly put togehter the charts across the homepage (without data) to speed later render
function HomePageChartCompose() {
  // Init plugin for chart.js
  Chart.register(ChartDataLabels);

  // The global default chart settings...this should prob be global var
  const chart_options = {
    type: 'bar',
    data: {
      labels: [0, 0],
      datasets: [
        {
          //label: 'Metric label',
          backgroundColor: '#0d6efd', //black //?
          pointStyle: 'circle',
          pointSize: 0,
          borderColor: '#0d6efd',
          data: [0, 0],
          datalabels: {
            display: true,
            align: 'end',
            anchor: 'end',
            rotation: 0,
            padding: 0,
          },
        },
      ],
    },
    options: {
      responsive: true,
      layout: {
        padding: {}, // This is global chart padding
      },
      interaction: {
        intersect: false,
        mode: 'nearest',
        axis: 'x',
      },
      plugins: {
        legend: false,
        datalabels: {
          //display: false,
          color: '#bbb',
          /*display: function (context) {
            return context.dataset.data[context.dataIndex] > 15;
          },*/
          font: {
            weight: 'normal',
            size: 10,
          },
          /*formatter: nFormatter,*/
        },
      },
      elements: {
        line: {
          tension: 0,
          borderWidth: 4,
        },
        point: { radius: 0 },
      },
      animation: {
        duration: 0,
      },
      legend: { display: false },
      title: {
        display: true,
        text: 'Contact attempts by week',
      },
      scales: {
        x: {
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: false,
            drawTicks: true,
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
            font: {
              size: 11,
            },
          },
        },
        y: {
          //display: false,
          grid: { drawOnChartArea: true },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 5,
            font: {
              size: 11,
            },
          },
        },
      },
    },
  };

  // Deep clone (iteratively copy and disconnect)
  // to prevent weird connections between chart objects,
  // but recompose some of the functions inside the js object.
  function cloneChartOptions(x) {
    y = structuredClone(x);
    y.options.plugins.datalabels.formatter = nFormatter;

    y.data.datasets[0].datalabels.display = function (context) {
      return !((context.dataset.data.length - context.dataIndex - 2) % 4) ? 'auto' : false; // display labels with an odd index
    };
    //y.data.datasets[0].datalabels.display = 'auto';
    return y;
  }

  // For each of the available metrics
  available_metrics.forEach((v, i) => {
    var selector = '#' + 'homepage-chart-' + v;
    var element = $(selector);

    // If a corresponding chart element exists...
    if (element.length > 0)
      // Assign to the global chart variable [by the doc title],
      // a new blank chart element's Constructor
      // with deep cloned option variable
      charts[v] = new Chart(element, cloneChartOptions(chart_options));
  });
}

async function loadAllGraphDataDirectlyFromIDB() {
  console.log('idb function start');
  //console.log(Date.now() - StartTimeLogged);
  console.timeLog();
  console.time('idb');

  //var data = {};

  let idb;

  try {
    let DBOpenRequest = window.indexedDB.open('firestore/[DEFAULT]/campaign-data-project/main', 10);
    console.timeLog('idb');

    DBOpenRequest.onsuccess = () => {
      console.log('IDB initialized.');
      console.timeLog('idb');
      idb = DBOpenRequest.result;

      if (idb.objectStoreNames.contains('remoteDocuments')) {
        const transaction = idb.transaction(['remoteDocuments'], 'readwrite');
        transaction.oncomplete = () => {
          console.log('IDB transaction completed.');
          console.timeLog('idb');
        };
        transaction.onerror = () => {
          console.log(`IDB transaction not opened due to error: ${transaction.error}`);
        };
        const objectStore = transaction.objectStore('remoteDocuments');
        var allRecords = objectStore.getAll();

        allRecords.onsuccess = function () {
          allRecords.result.forEach((doc) => {
            if (doc.parentPath.includes('data')) {
              docName = doc.document.name.split('/').pop();
              resultStringValue = doc.document.fields.resultstring.stringValue;
              //updateSingleChart(resultStringValue, charts[choices[docName]]);
              //^NEEDS UPDATING
              console.timeLog('idb');
            }
          });
          console.log('idb finish');
          console.timeLog();
        };
      }

      // Close IDB
      idb.close();
    };
  } catch (error) {
    console.error(error);
    // expected output: ReferenceError: nonExistentFunction is not defined
    // Note - error messages will vary depending on browser
  }
}

function updateSingleChart(data, chartobject) {
  // Pluck data depending on day/week/month in global view settings
  // do it as a structured clone in order to not screw with things later
  var chartdata = structuredClone(data[global_period_settings.dayweekmonth]);

  // We'll store good data here as we trasnform it.
  // b.c. transforming arrays inp-lace using loops means you'll
  // iterate over gaps you created if you delete keys :(
  // so we're not doing that
  var newdata = [];

  // Narrow data to the view settings' time period (start+end)
  // i.e., copy it if it !ISNT before the .start OR|| after the .end
  // Confused?! :P lol
  // p.s. the weird date handling is because one half of data is
  // flowing from BigQuery TimeStamp and the other
  // is a Moment() object
  var sum_of_previous_metrics = 0;
  Object.entries(chartdata).forEach(([i, entry]) => {
    if (
      !(
        new Date(entry.period.value) < global_period_settings.start.valueOf() ||
        new Date(entry.period.value) > global_period_settings.end.valueOf()
      )
    ) {
      // Are we talking cumulative bro????
      if (global_period_settings.cumulative) {
        // If so, use running sum as the metric to pass.
        sum_of_previous_metrics += entry.metric;
        entry.metric = sum_of_previous_metrics;

        // If cumulative, draw lines instead of bars
        chartobject.config.type = 'line';
      } else chartobject.config.type = 'bar';

      // It's in the window! Push it!
      newdata.push(entry);
    }
  });

  graphdata = newdata;

  // Format the bigquery period field correctly
  // and extract column to chartobject's labels
  chartobject.data.labels = graphdata.map((x) =>
    new Date(x.period.value).toLocaleDateString('en-us', {
      month: 'short',
      day: 'numeric',
    })
  );

  // Copy metric copy into a chart dataset
  chartobject.data.datasets[0].data = graphdata.map((x) => x.metric);

  // Push data to charts
  chartobject.update('none');
}

HomePageChartCompose();
//loadAllGraphDataDirectlyFromIDB();// This is a speedy func but I'm refactoring for error handling
// END IDB DIRECT ACCESS time saving thing

//global variables
let currentUser;
const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51KdRMYBJeGJY0XUpxLC0ATkmSCI39HdNSTBW7r7dGD1wNTx8lVMQfmxMPMFf0NRIvMiJOGfnu6arDbb4F5Ajdj7N00jYyxsOtO';
const prices = {};

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAYGt2ch3s2T3JpZjPT8oKsCnXy26GSkzg',
  authDomain: 'campaign-data-project.firebaseapp.com',
  projectId: 'campaign-data-project',
  storageBucket: 'campaign-data-project.appspot.com',
  messagingSenderId: '640113081213',
  appId: '1:640113081213:web:393c23321699d3e8dcea14',
  measurementId: 'G-RW17X0TYNJ',
};

// Replace with your cloud functions location // const functionLocation = "us-central1";

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebaseApp.firestore();

// Enable persistence
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled
    // in one tab at a a time.
    // ...
  } else if (err.code == 'unimplemented') {
    // The current browser does not support all of the
    // features required to enable persistence
    // ...
  }
});
// Subsequent queries will use persistence, if it was enabled successfully

/**
 * Firebase Authentication configuration
 */
const firebaseUI = new firebaseui.auth.AuthUI(firebase.auth());
const firebaseUiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function () {
      //function (authResult, redirectUrl) { - User successfully signed in.
      // True= continue the redirect automatically
      return true;
    },
    uiShown: () => {
      document.querySelector('#loader').style.display = 'none';
    },
  },
  signInFlow: 'redirect',
  signInSuccessUrl: '/',
  signInOptions: [
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      clientId: '640113081213-cgb821si2sshi87hdurs7doo7a7flo0c.apps.googleusercontent.com',
    },
    //firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
  ],

  //credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
};

$(LoggedInHomePageDisplay);

console.log('queue firebase.auth().onAuthStateChanged((firebaseUser) after ', Date.now() - StartTimeLogged);
console.timeLog();

firebase.auth().onAuthStateChanged((firebaseUser) => {
  if (firebaseUser) {
    // Show page as user is logged in
    console.log('firebase.auth().onAuthStateChanged((firebaseUser) after ', Date.now() - StartTimeLogged);
    console.timeLog();

    document.querySelector('body').classList.add('logged-in');
    document.querySelector('body').classList.remove('not-logged-in');

    currentUser = firebaseUser.uid;

    startDataListeners();
  } else {
    // Show login page
    document.querySelector('body').classList.remove('logged-in');
    document.querySelector('body').classList.add('not-logged-in');
    firebaseUI.start('#firebaseui-auth-container', firebaseUiConfig);
    //firebaseUI.disableAutoSignIn();
  }
});

/**
 * Data listeners
 */
function startDataListeners() {
  db.collection('products')
    .where('active', '==', true)
    .get()
    .then(function (querySnapshot) {
      querySnapshot.forEach(handleProductSnapshot);
    });

  // Get all subscriptions for the customer
  db.collection('customers')
    .doc(currentUser)
    .collection('subscriptions')
    .where('status', 'in', ['trialing', 'active'])
    .onSnapshot(handleCustomerSnapshot);
}

async function handleCustomerSnapshot(snapshot) {
  if (snapshot.empty) {
    // Show products
    //document.querySelector('#subscribe').style.display = 'block';
    return;
  }
  //document.querySelector('#subscribe').style.display = 'none';
  //document.querySelector('#my-subscription').style.display = 'block';
  // In this implementation we only expect one Subscription to exist
  const subscription = snapshot.docs[0].data();
  const priceData = (await subscription.price.get()).data();
  //console.log(firebase.auth().currentUser)
  var username = firebase.auth().currentUser.displayName;
  document.querySelector('#my-subscription p').textContent = `Hi ${username}, you are paying ${new Intl.NumberFormat(
    'en-US',
    {
      style: 'currency',
      currency: priceData.currency,
    }
  ).format((priceData.unit_amount / 100).toFixed(2))} per ${
    priceData.interval
  }, giving you the role: ${await getCustomClaimRole()}.`;

  const element = document.querySelector('body');

  element.classList.add('logged-in');
}

async function handleProductSnapshot(doc) {
  // Get all our products and render them to the page
  const products = document.querySelector('.products');
  const template = document.querySelector('#product');

  const priceSnap = await doc.ref.collection('prices').where('active', '==', true).orderBy('unit_amount').get();

  /*if (!"content" in document.createElement("template")) {
    console.error("Your browser doesn’t support HTML template elements.");
    return;
  }*/

  const product = doc.data();
  const container = template.content.cloneNode(true);

  container.querySelector('h2').innerText = product.name.toUpperCase();
  container.querySelector('.description').innerText = product.description?.toUpperCase() || '';
  // Prices dropdown
  priceSnap.docs.forEach((doc) => {
    const priceId = doc.id;
    const priceData = doc.data();
    prices[priceId] = priceData;
    const content = document.createTextNode(
      `${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: priceData.currency,
      }).format((priceData.unit_amount / 100).toFixed(2))} per ${priceData.interval ?? 'once'}`
    );
    const option = document.createElement('option');
    option.value = priceId;
    option.appendChild(content);
    container.querySelector('#price').appendChild(option);
  });

  if (product.images.length) {
    const img = container.querySelector('img');
    img.src = product.images[0];
    img.alt = product.name;
  }

  const form = container.querySelector('form');
  form.addEventListener('submit', subscribe);

  products.appendChild(container);
}

// Checkout handler
async function subscribe(event) {
  event.preventDefault();
  document.querySelectorAll('button').forEach((b) => (b.disabled = true));
  const formData = new FormData(event.target);
  const selectedPrice = {
    price: formData.get('price'),
  };
  // For prices with metered billing we need to omit the quantity parameter.
  // For all other prices we set quantity to 1.
  if (prices[selectedPrice.price]?.recurring?.usage_type !== 'metered') selectedPrice.quantity = 1;
  const checkoutSession = {
    automatic_tax: false, //automatic_tax: true,
    tax_id_collection: true,
    collect_shipping_address: true,
    allow_promotion_codes: true,
    line_items: [selectedPrice],
    success_url: window.location.origin,
    cancel_url: window.location.origin,
    metadata: {
      key: 'value',
    },
  };
  // For one time payments set mode to payment.
  if (prices[selectedPrice.price]?.type === 'one_time') {
    checkoutSession.mode = 'payment';
    checkoutSession.payment_method_types = ['card', 'sepa_debit', 'sofort'];
  }

  const docRef = await db.collection('customers').doc(currentUser).collection('checkout_sessions').add(checkoutSession);
  // Wait for the CheckoutSession to get attached by the extension
  docRef.onSnapshot((snap) => {
    const { error, url } = snap.data();
    if (error) {
      // Show an error to your customer and then inspect your function logs.
      alert(`An error occured: ${error.message}`);
      document.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
    if (url) {
      window.location.assign(url);
    }
  });
}

// Get custom claim role helper
async function getCustomClaimRole() {
  await firebase.auth().currentUser.getIdToken(true);
  const decodedToken = await firebase.auth().currentUser.getIdTokenResult();
  return decodedToken.claims.stripeRole;
}

// Isn't the init function anymore, but loads the actual data
// for display, repaints charts, and setup snapshot handler going foward
function LoggedInHomePageDisplay() {
  //db.disableNetwork().then((a) => { // Some cache stuff I need to refactor

  // DEBUG: timekeeping firestore
  console.log('firestore gets called after', Date.now() - StartTimeLogged);
  console.timeLog();

  // Make call to Firestore to load all chart data simultaneously
  db.collection('data').onSnapshot(loadFirestoreDataToGlobalVariable);
  /* // Some performance stuff re: the cache that I've turned off in favor of direct IDB, above? Still thinking this through.
     .get({ source: 'cache' })
    .then(loadAllGraphData)
    .then((a) => {
      db.collection('data').onSnapshot(loadAllGraphData);
    });*/
  //});
}

// Storage variable for entire chart data Firestore collection
var global_data_snapshot = {};

// .then() of db.collection('data') leads here, loads to global variable
function loadFirestoreDataToGlobalVariable(snapshot) {
  // DEBUG: timekeeping firestore
  console.log('first firestore response after');
  console.log(Date.now() - StartTimeLogged);
  console.timeLog();

  // Load the snapshot response to a global variable
  snapshot.docs.forEach((doc) => {
    global_data_snapshot[doc.id] = doc.data();
  });

  // Trigger the chart repaint
  repaintCharts();
}

// Repaints all charts (on the home page, for now)
async function repaintCharts() {
  // Stop if the snapshot hasn't been populated
  if (!Object.entries(global_data_snapshot).length) return;

  Object.entries(global_data_snapshot).forEach(([id, data]) => {
    // Assign the chart object to pass to the updater function
    var chartobject = charts[id];

    var selector = '#' + 'homepage-chart-' + id;
    var element = $(selector);

    // If a corresponding chart element exists...
    var corresponding_chart_exists = element.length > 0;

    if (available_metrics.includes(id) && corresponding_chart_exists) {
      // Update the home page chart corresponding to the chart[] entry/object
      // no jquery passed here because we're passing a chart[] Constructor that's linked.
      updateSingleChart(data, chartobject);
    }
  });

  // Populate QL table
  populateQuickLookup();

  // Repaint metrics page chart
  setMetric(global_metric_page_settings.metric, global_metric_page_settings.title);
}

/* This moves the google one tap picker to a new location
// However its not working so i have it disabled
function waitForElm(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      //(mutations) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
$(function () {
  waitForElm("#credential_picker_container").then((elm) => {
    $("#credential_picker_container").appendTo($("#firebaseui-auth-container"));
    console.log("Element is ready");
    console.log(elm.textContent);
  });
});

*/

///
/// CLEAN THIS UP LATER
///
///
let global_metric_page_settings = {
  metric: 'positiveids',
  title: 'Positive IDs',
  chartObject: {},
};
function setMetric(metric, title) {
  // No way around providing these.
  if (metric === undefined || !available_metrics.includes(metric))
    console.error('setMetric() metric not among available_metrics', metric, available_metrics);
  if (title === undefined) console.error('setMetric() undefined title');

  global_metric_page_settings.title = title;
  global_metric_page_settings.metric = metric;

  // Set title
  $('#metric-page-title').text(title);

  // Go fetch correct Firestore document of dayweekmonth data
  // (all together) for right metric
  var data_to_load = global_data_snapshot[metric];

  // Pass the full Firestore document and chartobject to updateSingleChart()
  updateSingleChart(data_to_load, global_metric_page_settings.chartObject);
}

window.addEventListener('DOMContentLoaded', start_up_scripts);
function start_up_scripts() {
  //Setup the header daterangepicker, and bind a callback
  $(function () {
    var start = moment(0);
    var end = moment();

    function reportrange_cb(start, end) {
      $('#reportrange span').html(start.format('MMM D, YYYY') + ' - ' + end.format('MMM D, YYYY'));
      eventCallbackChartSettings('reportrangechange', start, end);
    }

    $('#reportrange').daterangepicker(
      {
        startDate: start,
        opens: 'left',
        endDate: end,
        ranges: {
          'Last 30 Days': [moment().subtract(29, 'days'), moment()],
          'This Month': [moment().startOf('month'), moment().endOf('month')],
          'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
          'Last 3 Months': [moment().startOf('month').subtract(3, 'month'), moment()],
          'Last 6 Months': [moment().startOf('month').subtract(6, 'month'), moment()],
          'This Year': [moment().startOf('year'), moment().endOf('year')],
          'Last Year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
          'All Time': [moment(0), moment()],
        },
      },
      reportrange_cb
    );

    reportrange_cb(start, end);
    global_period_settings.start = start;
    global_period_settings.end = end;
  });

  //Setup the setting page daterangepicker, and bind a callback
  $(function () {
    var start = moment().subtract(29, 'days');

    function campaignstart_cb(start) {
      $('#campaignstartdate span').html(start.format('MMM D, YYYY'));
      $('#_campaignstartdate').val(start.format('MMM D, YYYY'));
      $('#_campaignstartdate').trigger('input');
    }

    $('#campaignstartdate').daterangepicker(
      {
        singleDatePicker: true,
        startDate: start,
        //opens: 'left',
        //endDate: end,
      },
      campaignstart_cb
    );

    $('#campaignstartdate span').html(start.format('MMM D, YYYY'));
  });

  //Setup the 2nd setting page daterangepicker, and bind a callback
  $(function () {
    var start = moment().subtract(29, 'days');

    function campaignstart2_cb(start) {
      $('#electionday span').html(start.format('MMM D, YYYY'));
      $('#_electionday').val(start.format('MMM D, YYYY'));
      $('#_electionday').trigger('input');
    }

    $('#electionday').daterangepicker(
      {
        singleDatePicker: true,
        startDate: start,
        //opens: 'left',
        //endDate: end,
      },
      campaignstart2_cb
    );

    $('#electionday span').html(start.format('MMM D, YYYY'));
  });

  $(function () {
    document.addEventListener('input', function (e) {
      if (e.target.type == 'range') {
        e.target.previousElementSibling.value = e.target.value;
        updateForecastSettingsInFirestore(getRampConfigFromInputs());
        processRangesToFormTable(getRampConfigFromInputs());
      }
    });
    //processRangesToFormTable(getRampConfigFromInputs());
    db.collection('ramp-settings')
      .doc('user1')
      .get() //{ source: 'cache' })
      .then(async (snapshot) => {
        //Setup ramp page
        //On settings change, update table
        processRangesToFormTable(snapshot.data());
        setRanges(snapshot.data());

        //Setup progress page
        progressRampFormTable(snapshot.data());
      });
  });

  $(function () {
    $('#metrics-navbar .btn-toggle-nav a').on('mousedown', (event) => {
      setMetric(event.target.dataset.chart, event.target.innerText);
      event.preventDefault();
      $('#metrics-navbar .btn-toggle-nav a').removeClass('bg-dark').removeClass('text-white');
      $(event.target).addClass('bg-dark').addClass('text-white');
    });
  });

  $(function () {
    const chartOptions = {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            //label: 'Metric label',
            backgroundColor: '#0d6efd', //black //?
            pointStyle: 'circle',
            pointRadius: 0,
            borderColor: '#0d6efd',
            data: [0, 0],
            datalabels: {
              display: true,
              align: 'top',
              anchor: 'end',
              rotation: 0,
              padding: 0,
              color: 'black',
            },
          },
        ],
      },
      options: {
        interaction: {
          intersect: false,
          mode: 'nearest',
          axis: 'x',
        },
        elements: {
          line: {
            tension: 0,
            borderWidth: 5,
          },
          point: { radius: 0 },
        },
        animation: {
          duration: 0,
        },

        plugins: {
          legend: false,
          datalabels: { color: 'white' },
        },
        title: {
          display: false,
          text: 'Contact attempts by week',
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    };

    global_metric_page_settings.chartObject = new Chart($('#metrics-page-container canvas'), chartOptions);
  });
}

function updateForecastSettingsInFirestore(rampConfig) {
  return db
    .collection('ramp-settings')
    .doc('user1')
    .set(rampConfig)
    .then(() => {
      console.log('Document successfully updated!');
    })
    .catch((error) => {
      // The document probably doesn't exist.
      console.error('Error updating document: ', error);
    });
}

function collapsetds() {
  document.querySelectorAll('td:not(:last-of-type):not(:first-of-type)').forEach((a) => $(a).toggle());
  document.querySelectorAll('th:not(:last-of-type):not(:first-of-type)').forEach((a) => $(a).toggle());
  $('#collapseTableDiv').toggleClass('col-3');
  $('#righthandtoggle').toggleClass('col-9');
  return false;
}

/**
 * Convert a Javascript Oject array or String array to an HTML table
 * JSON parsing has to be made before function call
 * It allows use of other JSON parsing methods like jQuery.parseJSON
 * http(s)://, ftp://, file:// and javascript:; links are automatically computed
 *
 * JSON data samples that should be parsed and then can be converted to an HTML table
 *     var objectArray = '[{"Total":"34","Version":"1.0.4","Office":"New York"},{"Total":"67","Version":"1.1.0","Office":"Paris"}]';
 *     var stringArray = '["New York","Berlin","Paris","Marrakech","Moscow"]';
 *     var nestedTable = '[{ key1: "val1", key2: "val2", key3: { tableId: "tblIdNested1", tableClassName: "clsNested", linkText: "Download", data: [{ subkey1: "subval1", subkey2: "subval2", subkey3: "subval3" }] } }]';
 *
 * Code sample to create a HTML table Javascript String
 *     var jsonHtmlTable = ConvertJsonToTable(eval(dataString), 'jsonTable', null, 'Download');
 *
 * Code sample explaned
 *  - eval is used to parse a JSON dataString
 *  - table HTML id attribute will be 'jsonTable'
 *  - table HTML class attribute will not be added
 *  - 'Download' text will be displayed instead of the link itself
 *
 * @author Afshin Mehrabani <afshin dot meh at gmail dot com>
 *
 * @class ConvertJsonToTable
 *
 * @method ConvertJsonToTable
 *
 * @param parsedJson object Parsed JSON data
 * @param tableId string Optional table id
 * @param tableClassName string Optional table css class name
 * @param linkText string Optional text replacement for link pattern
 *
 * @return string Converted JSON to HTML table
 */
function ConvertJsonToTable(parsedJson, tableId, tableClassName, linkText) {
  //Patterns for links and NULL value
  var italic = '<i>{0}</i>';
  var link = linkText ? '<a href="{0}">' + linkText + '</a>' : '<a href="{0}">{0}</a>';

  //Pattern for table
  var idMarkup = tableId ? ' id="' + tableId + '"' : '';

  var classMarkup = tableClassName ? ' class="' + tableClassName + '"' : '';

  var tbl = '<table border="1" cellpadding="1" cellspacing="1"' + idMarkup + classMarkup + '>{0}{1}</table>';

  //Patterns for table content
  var th = '<thead>{0}</thead>';
  var tb = '<tbody>{0}</tbody>';
  var tr = '<tr>{0}</tr>';
  var thRow = '<th>{0}</th>';
  var tdRow = '<td>{0}</td>';
  var thCon = '';
  var tbCon = '';
  var trCon = '';

  if (parsedJson) {
    var isStringArray = typeof parsedJson[0] == 'string';
    var headers;

    // Create table headers from JSON data
    // If JSON data is a simple string array we create a single table header
    if (isStringArray) thCon += thRow.format('value');
    else {
      // If JSON data is an object array, headers are automatically computed
      if (typeof parsedJson[0] == 'object') {
        headers = array_keys(parsedJson[0]);
        for (var i = 0; i < headers.length; i++) thCon += thRow.format(headers[i]);
      }
    }
    th = th.format(tr.format(thCon));

    // Create table rows from Json data
    if (isStringArray) {
      for (i = 0; i < parsedJson.length; i++) {
        tbCon += tdRow.format(parsedJson[i]);
        trCon += tr.format(tbCon);
        tbCon = '';
      }
    } else {
      if (headers) {
        var urlRegExp = new RegExp(/(\b(https?|ftp|file):[/]{2}[-A-Z0-9+&@#[/]%?=~_|!:,.;]*[-A-Z0-9+&@#[/]%=~_|])/gi);
        var javascriptRegExp = new RegExp(/(^javascript:[\s\S]*;$)/gi);

        for (i = 0; i < parsedJson.length; i++) {
          for (var j = 0; j < headers.length; j++) {
            var value = parsedJson[i][headers[j]];
            var isUrl = urlRegExp.test(value) || javascriptRegExp.test(value);

            if (isUrl)
              // If value is URL we auto-create a link
              tbCon += tdRow.format(link.format(value));
            else {
              if (value) {
                if (typeof value == 'object') {
                  //for supporting nested tables
                  tbCon += tdRow.format(
                    ConvertJsonToTable(eval(value.data), value.tableId, value.tableClassName, value.linkText)
                  );
                } else {
                  tbCon += tdRow.format(value);
                }
              } else {
                // If value == null we format it like PhpMyAdmin NULL values
                tbCon += tdRow.format(italic.format(value).toUpperCase());
              }
            }
          }
          trCon += tr.format(tbCon);
          tbCon = '';
        }
      }
    }
    tb = tb.format(trCon);
    tbl = tbl.format(th, tb);

    return tbl;
  }
  return null;
}
/**
 * Return just the keys from the input array, optionally only for the specified search_value
 * version: 1109.2015
 *  discuss at: http://phpjs.org/functions/array_keys
 *  *     example 1: array_keys( {firstname: 'Kevin', surname: 'van Zonneveld'} );
 *  *     returns 1: {0: 'firstname', 1: 'surname'}
 */
function array_keys(input, search_value, argStrict) {
  var search = typeof search_value !== 'undefined',
    tmp_arr = [],
    strict = !!argStrict,
    include = true,
    key = '';

  if (input && typeof input === 'object' && input.change_key_case) {
    // Duck-type check for our own array()-created PHPJS_Array
    return input.keys(search_value, argStrict);
  }

  for (key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      include = true;
      if (search) {
        if (strict && input[key] !== search_value) include = false;
        else if (input[key] != search_value) include = false;
      }
      if (include) tmp_arr[tmp_arr.length] = key;
    }
  }
  return tmp_arr;
}

/**
 * JavaScript format string function
 *
 */
String.prototype.format = function () {
  var args = arguments;

  return this.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != 'undefined' ? args[number] : '{' + number + '}';
  });
};

function getRampConfigFromInputs() {
  var rampConfig = {};
  var listOfRanges = document.querySelectorAll('input[type=range]');
  listOfRanges.forEach((a) => (rampConfig[a.id] = a.value));
  return rampConfig;
}

function setRanges(rampConfig) {
  Object.keys(rampConfig).forEach((key) => (document.getElementById(key).value = rampConfig[key]));

  document.querySelectorAll('input[type="range"]').forEach((a) => (a.previousElementSibling.value = a.value));
}

function processRangesToFormTable(rampConfig) {
  // Setting that controls how many rows to iterate over
  const WEEKSAVAILABLE = rampConfig.weeksAvailable || 16;

  //Clear a row
  var newItem = {};

  thisWeekShiftCount = rampConfig.startingShifts;
  newItem = {
    'Week Number': 'Wk 1',
    'Total Weekly Shifts': Math.floor(thisWeekShiftCount),
    //----
    'Petitioning Attempts': 0,
    'Calls Made': Math.floor(thisWeekShiftCount * (1 - rampConfig.doorsVsPhones / 100) * rampConfig.callsPerShift),
    'Doors Knocked': Math.floor(thisWeekShiftCount * (0 + rampConfig.doorsVsPhones / 100) * rampConfig.doorsPerShift),
    'SMS Sent': Math.floor(rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE),
    //----
    'Petitioning +IDs': 0,
    'Calls +IDs': Math.floor(
      (((thisWeekShiftCount *
        (1 - rampConfig.doorsVsPhones / 100) *
        rampConfig.callsPerShift *
        rampConfig.responseRatePhones) /
        100) *
        rampConfig.posRatePhones) /
        100
    ),
    'Doors +IDs': Math.floor(
      (((thisWeekShiftCount *
        (rampConfig.doorsVsPhones / 100) *
        rampConfig.doorsPerShift *
        rampConfig.responseRateDoors) /
        100) *
        rampConfig.posRateDoors) /
        100
    ),
    'Text +IDs': Math.floor(
      ((((rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE) * rampConfig.responseRateTexts) / 100) *
        rampConfig.posRateTexts) /
        100
    ),
    'Relational +IDs': 0,
    'Total Pos IDs': 0,
  };
  newItem['Total Pos IDs'] = Math.floor(
    newItem['Petitioning +IDs'] +
      newItem['Calls +IDs'] +
      newItem['Doors +IDs'] +
      newItem['Text +IDs'] +
      newItem['Relational +IDs']
  );
  var tableObject = [newItem];

  var totals = Object.assign({}, newItem);

  //console.log(tableObject);
  var thisWeekShiftCount = 0;

  for (let i = 0; i < WEEKSAVAILABLE; i++) {
    thisWeekShiftCount =
      tableObject[tableObject.length - 1]['Total Weekly Shifts'] * (1 + rampConfig.shiftGrowth / 100);
    newItem = {
      'Week Number': 'Wk ' + (i + 1 + 1).toString(),
      'Total Weekly Shifts': Math.floor(thisWeekShiftCount),
      //----
      'Petitioning Attempts': 0,
      'Calls Made': Math.floor(thisWeekShiftCount * (1 - rampConfig.doorsVsPhones / 100) * rampConfig.callsPerShift),
      'Doors Knocked': Math.floor(thisWeekShiftCount * (0 + rampConfig.doorsVsPhones / 100) * rampConfig.doorsPerShift),
      'SMS Sent': Math.floor(rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE),
      //----
      'Petitioning +IDs': 0,
      'Calls +IDs': Math.floor(
        (((thisWeekShiftCount *
          (1 - rampConfig.doorsVsPhones / 100) *
          rampConfig.callsPerShift *
          rampConfig.responseRatePhones) /
          100) *
          rampConfig.posRatePhones) /
          100
      ),
      'Doors +IDs': Math.floor(
        (((thisWeekShiftCount *
          (rampConfig.doorsVsPhones / 100) *
          rampConfig.doorsPerShift *
          rampConfig.responseRateDoors) /
          100) *
          rampConfig.posRateDoors) /
          100
      ),
      'Text +IDs': Math.floor(
        ((((rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE) * rampConfig.responseRateTexts) / 100) *
          rampConfig.posRateTexts) /
          100
      ),
      'Relational +IDs': 0,
      'Total Pos IDs': 0,
    };
    newItem['Total Pos IDs'] = Math.floor(
      newItem['Petitioning +IDs'] +
        newItem['Calls +IDs'] +
        newItem['Doors +IDs'] +
        newItem['Text +IDs'] +
        newItem['Relational +IDs']
    );
    //newItem.map(a => console.log(a));
    Object.keys(newItem).forEach(function (key) {
      totals[key] += newItem[key];
    });
    tableObject.push(newItem);
    //  console.log(totals);
  }
  totals['Week Number'] = 'Total';
  tableObject.push(totals);
  // $('#tableContainer').html("<pre>" + JSON.stringify(tableObject, null, '\t') + "</pre>")

  //format thousdnads/ks!
  tableObject.forEach((row) => {
    //row
    Object.keys(newItem).forEach(function (key) {
      //totals[key] += row[key];
      row[key] = isNaN(row[key]) ? row[key] : nFormatter(row[key], 1);
    });
  });

  $('#tableContainer').html(ConvertJsonToTable(transposeTable(tableObject), '', null, 'Download'));
  if ($('#flexSwitchCheckChecked').is(':checked')) {
    collapsetds();
    $('#collapseTableDiv').toggleClass('col-3');
    $('#righthandtoggle').toggleClass('col-9');
  }
}

function transposeTable(table) {
  var answer = table.map((el) => Object.values(el));
  var matrix = answer;
  answer = matrix[0].map((col, c) => matrix.map((row, r) => matrix[r][c]));
  newanswer = Array();
  answer.forEach((el, i) => {
    newanswer[i] = {};
    newanswer[i][Object.keys(table[0])[0]] = Object.keys(table[0])[i];
  });

  answer.forEach((el, i) => {
    answer[i].forEach((el2, j) => {
      newanswer[i][answer[0][j] + ' '] = el2;
    });
  });

  newanswer.shift();

  return newanswer;
}

$(function () {
  /**
   * Event listeners
   */

  //collapse tds button
  document.getElementById('flexSwitchCheckChecked').addEventListener('input', collapsetds);

  // Signout button
  document.getElementById('signout').addEventListener('click', () => firebase.auth().signOut());
  // Billing portal handler
  document.querySelector('#billing-portal-button').addEventListener('click', async () => {
    //async (event) => {
    document.querySelectorAll('button').forEach((b) => (b.disabled = true));

    // Call billing portal function
    const functionRef = firebase
      .app()
      .functions('us-central1')
      .httpsCallable('ext-firestore-stripe-payments-createPortalLink');
    const { data } = await functionRef({
      returnUrl: window.location.origin,
      locale: 'auto', // Optional, defaults to "auto"
      //configuration: "bpc_1JSEAKHYgolSBA358VNoc2Hs", // Optional ID of a portal configuration: https://stripe.com/docs/api/customer_portal/configuration
    });
    window.location.assign(data.url);
  });
});

// Want to create a sum polyfill for an array
// ex [1, 2, 3].sum()
// that returns 6

if (!Array.sum) {
  // Check if sum method exists in Array.prototype
  Array.prototype.sum = function () {
    return this.length > 0 ? this.reduce((total, num) => total + num) : 0;
  };
}

//populate QLup
let metrics = {};
function populateQuickLookup() {
  metrics = {
    alltime: {},
    today: {},
    yesterday: {},
  };

  if (!Object.entries(global_data_snapshot).length) return;
  Object.entries(global_data_snapshot).forEach(([id, data]) => {
    //alltime
    metrics.alltime[id] = data.weekly.map((a) => a.metric).sum();
  });
  //console.log('metrics.alltime', metrics.alltime);
  $('#ql-display li:contains("Positive") b').html(metrics.alltime.positiveids.toLocaleString());
  $('#ql-display li:contains("Shifts Complete") b').html(metrics.alltime.completeshifts.toLocaleString());
  $('#ql-display li:contains("Doors") b').html(metrics.alltime.doors.toLocaleString());
  $('#ql-display li:contains("Calls") b').html(metrics.alltime.calls.toLocaleString());
  $('#ql-display li:contains("Texts") b').html(metrics.alltime.texts.toLocaleString());
  $('#ql-display li:contains("% Shift Completion") b').html(metrics.alltime.percent_complete_alltime * 100 + '%');
  $('#ql-display li:contains("Scheduled") b').html(metrics.alltime.signups.toLocaleString());
}

async function progressRampFormTable(snapshot) {
  console.log(snapshot);
}

$(document).on('mousedown', 'nav .nav-link, .navigate-home', function (e) {
  var targetPage = $(e.target).hasClass('navigate-home')
    ? 'Home'
    : $(e.target.parentNode).hasClass('nav-link')
    ? e.target.parentNode.innerText.trim()
    : e.target.innerText.trim();
  navigatePage(targetPage.length > 0 ? targetPage : 'Home');
});

function navigatePage(page) {
  console.log('navigate', page);
  $('#title').html(page.toLowerCase() == 'home' ? 'Obama for Congress' : page);

  // Switch nav marker
  $('.nav .nav-link').removeClass('active');
  $('.nav .nav-link:contains("' + page + '")').addClass('active');

  // Switch tabs
  $('.tab-pane').removeClass('active').removeClass('show');
  document.querySelectorAll('.nav-link').forEach((el) => {
    $('body').removeClass(el.innerText.trim().toLowerCase() + '-page');
  });
  $('body').addClass(page.toLowerCase() + '-page');

  // Get rid of targeting bar except on home/metrics
  if (!['home', 'metrics', 'goals'].includes(page.toLowerCase())) $('header>div *:not(h1)').hide();
  else $('header>div *:not(h1)').show();
}

function specificJumpToMetricsPage(metric) {
  console.log('specificJumpToMetricsPage', metric);
  // Self explanatory:
  navigatePage('Metrics');
  setMetric(undefined, metric);
}

$(document).on('click', '.metrics-card-container-clickable .card', function () {
  // Get the name of the metric from the title of the card that was clicked on
  var cardMetricTitleContent = $(this).find('.card-title').get()[0].textContent;

  // Navigate to the metrics page and set the chart view to that
  specificJumpToMetricsPage(cardMetricTitleContent);
});

// Setting page code
$(document).on('input', '#settings-page-container *', updateSettingsInFirestore);

function getSettingForms() {
  var settingForms = {};
  var listOfOnputs = document.querySelectorAll('#settings-page-container input');
  console.log('listOfOnputs', listOfOnputs);
  listOfOnputs.forEach((a) => (settingForms[a.id] = a.value));
  console.log('settingForms', settingForms);
  return settingForms;
}

function updateSettingsInFirestore() {
  return db
    .collection('app-settings')
    .doc('user1')
    .set(getSettingForms())
    .then(() => {
      console.log('Settings document successfully updated!');
    })
    .catch((error) => {
      // The document probably doesn't exist.
      console.error('Error updating settings document: ', error);
    });
}

//Navigate to correct page onload
var location_hash = location.hash.substring(1, 2).toUpperCase() + location.hash.substring(2);
console.log('location_hash', location_hash);
if (location_hash && location_hash != '') navigatePage(location_hash);

//serialize form obj jquery plugin
$.fn.serializeObject = function () {
  var o = {};
  var a = this.serializeArray();
  $.each(a, function () {
    if (o[this.name]) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || '');
    } else {
      o[this.name] = this.value || '';
    }
  });
  return o;
};

//invite user toast
const toastTrigger = document.getElementById('button-invite-user');
const inviteUserToast = document.getElementById('toast-invite-user');
if (toastTrigger) {
  toastTrigger.addEventListener('click', () => {
    var serializedInviteUserFormData = $('#invite-user-form').serializeObject();

    //placeholder for our userid
    serializedInviteUserFormData.invitedBy = currentUser;

    //Add invite to firestore, which triggers a cloud function sending email invite
    db.collection('user-invites')
      .add(serializedInviteUserFormData)
      .then(() => {
        //Success!
        const toast = new bootstrap.Toast(inviteUserToast);
        toast.show();
        console.log('Document successfully written!');
      })
      .catch((error) => {
        //error!
        const toast = new bootstrap.Toast(inviteUserToast);
        $(inviteUserToast)
          .find('.toast-body')
          .html('Could not invite user because of ERROR: ' + error);
        toast.show();
        console.error('Error writing document: ', error);
      });
  });
}
$(function () {
  db.collection('user-invites').onSnapshot(updateUsersTable);
});

function updateUsersTable(querySnapshot) {
  $('#usersTable tbody').empty();

  var data = {};

  querySnapshot.forEach((doc) => {
    data = doc.data();
    $('#usersTable tbody').append(`<tr></tr>`);
    var returned = $('#usersTable tbody tr:last-child').append(
      `
        <td>${data.firstName}</td>
        <td>${data.lastName}</td>
        <td>${data.email}</td>
      `
    );
    var button = $(returned).append(
      `
        <td><button class="btn btn-outline-danger btn-sm" type="button">Remove</button></td>
      `
    );
    var button = $(button).find('button');
    button.bind('click', { id: doc.id }, (e) => {
      db.collection('user-invites').doc(e.data.id).delete();
    });
    //doc.is
    //doc.whatever
  });
}

let global_period_settings = {
  cumulative: false,
  dayweekmonth: 'weekly',
  start: Date.now(),
  end: Date.now(),
};

// Place event handlers for header config bar
$(setupChartSettingEventHandlers);
function setupChartSettingEventHandlers() {
  // Place a inputchange binding on the cumulative and dayweekmonth switch/radio inputs
  $('header input').bind('input', eventCallbackChartSettings);
  // The daterangepicker is not a input, but its own callback calls eventCallbackChartSettings
}

// Handles view setting changes by publishing them to global var and repainting
function eventCallbackChartSettings(event = {}, start = false, end = false) {
  //console.log('eventCallbackChartPeriodSettings');
  //console.log('event', event);

  global_period_settings.cumulative = $('#flexSwitchCheckDefault').is(':checked');
  var dayweekmonth = $('#dayweekmonth input[type="radio"]:checked').prop('id').toLowerCase();
  global_period_settings.dayweekmonth =
    dayweekmonth == 'day' ? 'daily' : dayweekmonth == 'month' ? 'monthly' : 'weekly';
  $('#dayweekmonth input[type="radio"]:checked').prop('id');
  if (start) global_period_settings.start = start;
  if (end) global_period_settings.end = end;
  console.log(global_period_settings);

  // Now that the settings are updated, repaint the charts
  repaintCharts();
}

//sortable
$(function () {
  var el = document.getElementById('draggable-cards');
  new Sortable(el, { swapThreshold: 1, group: 'shared', animation: 200 });
});
