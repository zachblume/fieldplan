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

function HomePageChartCompose() {
  Chart.register(ChartDataLabels);
  const chart_options = {
    type: 'bar',
    data: {
      labels: [0, 0],

      datasets: [
        {
          label: 'Contact Attempts',
          borderColor: '#3e95cd',
          backgroundColor: '#0d6efd', //black //?

          data: [0, 0],
          datalabels: {
            align: 'start',
            anchor: 'end',
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
      plugins: {
        legend: false,
        datalabels: {
          color: 'white',
          /* display: function (context) {
                return context.dataset.data[context.dataIndex] > 15;
              },*/
          font: {
            weight: 'normal',
            size: 9,
          },
          /*   borderColor: "white",
              borderRadius: 32,
              borderWidth: 2,*/
          /*formatter: nFormatter,*/
        },
      },
      elements: {
        line: {
          tension: 0,
        },
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
          tics: { autoSkip: true, maxTicksLimit: 3 },
        },
      },
    },
  };

  function cloneChartOptions(x) {
    y = structuredClone(x);
    y.options.plugins.datalabels.formatter = nFormatter;
    return y;
  }

  charts[1] = new Chart(document.getElementById('myChart2'), cloneChartOptions(chart_options));
  charts[2] = new Chart(document.getElementById('myChart'), cloneChartOptions(chart_options));
  charts[3] = new Chart(document.getElementById('myChart3'), cloneChartOptions(chart_options));
  charts[4] = new Chart(document.getElementById('myChart4'), cloneChartOptions(chart_options));
}

async function loadAllGraphDataDirectlyFromIDB() {
  //console.clear();
  console.log('idb function start');
  //console.log(Date.now() - StartTimeLogged);
  console.timeLog();
  console.time('idb');

  //var data = {};
  var choices = {
    weeklycontacthistory: 1,
    weeklysurveys: 2,
    weeklysignups: 3,
    vanityvolunteers: 4,
  };
  let idb;

  try {
    let DBOpenRequest = window.indexedDB.open('firestore/[DEFAULT]/campaign-data-project/main', 10);
    console.timeLog('idb');

    DBOpenRequest.onsuccess = () => {
      console.log('<li>Database initialized.</li>');
      console.timeLog('idb');
      idb = DBOpenRequest.result;
      const transaction = idb.transaction(['remoteDocuments'], 'readwrite');
      transaction.oncomplete = () => {
        console.log('<li>Transaction completed.</li>');
        console.timeLog('idb');
      };
      transaction.onerror = () => {
        console.log(`<li>Transaction not opened due to error: ${transaction.error}</li>`);
      };
      const objectStore = transaction.objectStore('remoteDocuments');
      var allRecords = objectStore.getAll();

      allRecords.onsuccess = function () {
        allRecords.result.forEach((doc) => {
          if (doc.parentPath.includes('data')) {
            docName = doc.document.name.split('/').pop();
            resultStringValue = doc.document.fields.resultstring.stringValue;
            updateGraph(JSON.parse(resultStringValue), charts[choices[docName]]);
            console.timeLog('idb');
          }
        });
        console.log('idb finish');
        console.timeLog();
      };
      //close idb

      // now let's close the database again!
      idb.close();
    };
  } catch (error) {
    console.error(error);
    // expected output: ReferenceError: nonExistentFunction is not defined
    // Note - error messages will vary depending on browser
  }
}

function updateGraph(graphdata, chartobject) {
  //console.log(graphdata[0]);
  //console.log(chartobject);
  chartobject.data.labels = graphdata.map((x) => {
    try {
      return new Date(x.period.value).toLocaleDateString('en-us', {
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error(error);
      return x.period == null ? '' : x.period;
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
    }
  });

  chartobject.data.datasets[0].data = graphdata.map((x) => x.metric);
  chartobject.update();
  console.log('updated');
}

HomePageChartCompose();
loadAllGraphDataDirectlyFromIDB();

console.log('app.js begins running, time logged as StartTimeLogged');
const StartTimeLogged = Date.now();
console.timeLog();

const STRIPE_PUBLISHABLE_KEY =
  'pk_live_51KdRMYBJeGJY0XUpxLC0ATkmSCI39HdNSTBW7r7dGD1wNTx8lVMQfmxMPMFf0NRIvMiJOGfnu6arDbb4F5Ajdj7N00jYyxsOtO';

const prices = {};

//global variables
let currentUser;
let myChartMetricsPage;

// Replace with your Firebase project config.
// Your web app's Firebase configuration
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

// Replace with your cloud functions location
// const functionLocation = "us-central1";

// Initialize Firebase

const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebaseApp.firestore();

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
      //function (authResult, redirectUrl) {
      // User successfully signed in.
      // Return type determines whether we continue the redirect automatically
      // or whether we leave that to developer to handle.
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
    }, //firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
  ],

  credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
  // Your terms of service url.
  //tosUrl: "https://example.com/terms",
  // Your privacy policy url.
  //privacyPolicyUrl: "https://example.com/privacy",
};

console.log('queue firebase.auth().onAuthStateChanged((firebaseUser) after ');
console.log(Date.now() - StartTimeLogged);
console.timeLog();
$(LoggedInHomePageDisplay);

firebase.auth().onAuthStateChanged((firebaseUser) => {
  if (firebaseUser) {
    console.log('firebase.auth().onAuthStateChanged((firebaseUser) after ');
    console.log(Date.now() - StartTimeLogged);
    console.timeLog();
    // document.querySelector('#loader').style.display = 'none';
    // document.querySelector('main').style.display = 'block';
    document.querySelector('body').classList.add('logged-in');
    document.querySelector('body').classList.remove('not-logged-in');
    currentUser = firebaseUser.uid;
    startDataListeners();
    //console.log(firebaseUser)
  } else {
    document.querySelector('body').classList.remove('logged-in');
    document.querySelector('body').classList.add('not-logged-in');
    firebaseUI.start('#firebaseui-auth-container', firebaseUiConfig);
    firebaseUI.disableAutoSignIn();
  }
});
/**
 * Data listeners
 */
function startDataListeners() {
  // Get all our products and render them to the page
  const products = document.querySelector('.products');
  const template = document.querySelector('#product');

  db.collection('products')
    .where('active', '==', true)
    .get()
    .then(function (querySnapshot) {
      querySnapshot.forEach(async function (doc) {
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
      });
    });
  // Get all subscriptions for the customer
  db.collection('customers')
    .doc(currentUser)
    .collection('subscriptions')
    .where('status', 'in', ['trialing', 'active'])
    .onSnapshot(async (snapshot) => {
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
      document.querySelector(
        '#my-subscription p'
      ).textContent = `Hi ${username}, you are paying ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: priceData.currency,
      }).format((priceData.unit_amount / 100).toFixed(2))} per ${
        priceData.interval
      }, giving you the role: ${await getCustomClaimRole()}.`;

      const element = document.querySelector('body');

      element.classList.add('logged-in');
    });
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

function LoggedInHomePageDisplay() {
  //document.querySelector("#LoggedInUser").style.display = "block";

  // Data handler (onSnapshot)
  //db.disableNetwork().then((a) => {
  console.log('firestore gets called after');
  console.log(Date.now() - StartTimeLogged);
  console.timeLog();
  db.collection('data').onSnapshot(loadAllGraphData);
  /*    .get({ source: 'cache' })
    .then(loadAllGraphData)
    .then((a) => {
      db.collection('data').onSnapshot(loadAllGraphData);
    });*/
  //});
  // End data snapshot handler
}

async function loadAllGraphData(querySnapshot) {
  console.log('first firestore response after');
  console.log(Date.now() - StartTimeLogged);
  console.timeLog();

  var data = {};
  var choices = {
    weeklycontacthistory: 1,
    weeklysurveys: 2,
    weeklysignups: 3,
    vanityvolunteers: 4,
  };
  querySnapshot.forEach((doc) => {
    data = doc.data();
    if (doc.id in choices) updateGraph(JSON.parse(data.resultstring), charts[choices[doc.id]]);
  });

  populateQuickLookup(querySnapshot);
}

//test

/*
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
window.addEventListener('DOMContentLoaded', start_up_scripts);
function start_up_scripts() {
  /**volunteers page version**/
  /*
  let myChartVolunteersPage;
  $(function () {
    const chartOptions = {
      type: 'bar',
      data: {
        labels: [
          'Apr 11',
          'Apr 18',
          'May 10',
          'May 17',
          'May 24',
          'June 5',
          'Apr 11',
          'Apr 18',
          'May 10',
          'May 17',
          'May 24',
          'June 5',
        ],
        datasets: [
          {
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              '#0d6efd', //black //?
            ],
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
          },
        },
        animation: {
          duration: 0,
        },

        plugins: {
          legend: false,
        },
        title: {
          display: false,
          text: 'Contact attempts by week',
        },
        scales: {
          xAxes: [
            {
              gridLines: {
                display: false,
              },
            },
          ],
        },
      },
    };

    myChartVolunteersPage = new Chart(document.getElementById('myChartVolunteersPage'), chartOptions);

    myChartVolunteersPage.data.datasets[0].data = [
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
    ];
    myChartVolunteersPage.update();
  });
  */

  $(function () {
    var start = moment().subtract(29, 'days');
    var end = moment();

    function cb(start, end) {
      $('#reportrange span').html(start.format('MMM D, YYYY') + ' - ' + end.format('MMM D, YYYY'));
    }

    $('#reportrange').daterangepicker(
      {
        startDate: start,
        endDate: end,
        ranges: {
          'Last 30 Days': [moment().subtract(29, 'days'), moment()],
          'This Month': [moment().startOf('month'), moment().endOf('month')],
          'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
          'Last 3 Months': [moment().startOf('month'), moment().endOf('month')],
          'Last 6 Months': [
            moment().subtract(1, 'month').startOf('month'),
            moment().subtract(1, 'month').endOf('month'),
          ],

          'This Year': [moment(), moment()],
          'Last Year': [moment(), moment()],
          'All Time': [moment(), moment()],
        },
      },
      cb
    );

    cb(start, end);
  });
  $(function () {
    var start = moment().subtract(29, 'days');
    var end = moment();

    function cb(start, end) {
      $('#reportrange span').html(start.format('MMM D, YYYY') + ' - ' + end.format('MMM D, YYYY'));
    }

    $('#reportrange').daterangepicker(
      {
        startDate: start,
        endDate: end,
        ranges: {
          'Last 30 Days': [moment().subtract(29, 'days'), moment()],
          'This Month': [moment().startOf('month'), moment().endOf('month')],
          'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
          'Last 3 Months': [moment().startOf('month'), moment().endOf('month')],
          'Last 6 Months': [
            moment().subtract(1, 'month').startOf('month'),
            moment().subtract(1, 'month').endOf('month'),
          ],

          'This Year': [moment(), moment()],
          'Last Year': [moment(), moment()],
          'All Time': [moment(), moment()],
        },
      },
      cb
    );

    cb(start, end);
  });

  $(document).ready(function () {
    cbox = document.querySelectorAll('#volunteers-navbar .btn-toggle-nav a');
    cbox.forEach((box) => {
      box.addEventListener('mousedown', (a) => setMetric(a.target.innerText));
    });

    document
      .querySelectorAll('input[type="range"]')
      .forEach((a) => a.addEventListener('input', (b) => (b.target.previousElementSibling.value = b.target.value)));
    //  document.querySelectorAll('input[type="range"]').forEach((a) => (a.previousElementSibling.value = a.value));
  });

  $(function () {
    document.addEventListener('input', function (e) {
      if (e.target.type == 'range') {
        updateForecastSettingsInFirestore(getRampConfigFromInputs());
        processRangesToFormTable(getRampConfigFromInputs());
      }
    });
    //processRangesToFormTable(getRampConfigFromInputs());
    db.collection('ramp-settings')
      .doc('user1')
      .get({ source: 'cache' })
      .then(async (snapshot) => {
        //On settings change, update table
        processRangesToFormTable(snapshot.data());
        setRanges(snapshot.data());
      });
  });

  $(document).ready(function () {
    cbox = document.querySelectorAll('#metrics-navbar .btn-toggle-nav a');
    cbox.forEach((box) => {
      box.addEventListener('mousedown', (event) => {
        setMetric(event.target.innerText);
        event.preventDefault();
        document.querySelectorAll('#metrics-navbar .btn-toggle-nav a').forEach((element) => {
          $(element).removeClass('bg-dark').removeClass('text-white');
        });
        $(event.target).addClass('bg-dark').addClass('text-white');
      });
    });
  });
  function setMetric(metricName) {
    document.getElementById('metric-page-title').innerHTML = metricName;
    myChartMetricsPage.data.datasets[0].data = [
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
      Math.floor(Math.random() * 20) + 5,
    ];
    myChartMetricsPage.update();
  }

  $(function () {
    var start = moment().subtract(29, 'days');
    var end = moment();

    function cb(start, end) {
      $('#reportrange span').html(start.format('MMM D, YYYY') + ' - ' + end.format('MMM D, YYYY'));
    }

    $('#reportrange').daterangepicker(
      {
        startDate: start,
        endDate: end,
        ranges: {
          'Last 30 Days': [moment().subtract(29, 'days'), moment()],
          'This Month': [moment().startOf('month'), moment().endOf('month')],
          'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
          'Last 3 Months': [moment().startOf('month'), moment().endOf('month')],
          'Last 6 Months': [
            moment().subtract(1, 'month').startOf('month'),
            moment().subtract(1, 'month').endOf('month'),
          ],

          'This Year': [moment(), moment()],
          'Last Year': [moment(), moment()],
          'All Time': [moment(), moment()],
        },
      },
      cb
    );

    cb(start, end);

    $(function () {
      /*Chart.defaults.set('plugins.datalabels', {
    color: '#FE777B'
  });*/
      const chartOptions = {
        type: 'bar',
        data: {
          labels: [
            'Apr 11',
            'Apr 18',
            'May 10',
            'May 17',
            'May 24',
            'June 5',
            'Apr 11',
            'Apr 18',
            'May 10',
            'May 17',
            'May 24',
            'June 5',
          ],
          datasets: [
            {
              label: '# of Votes',
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: [
                '#0d6efd', //black //?
              ],
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
            },
          },
          animation: {
            duration: 0,
          },

          plugins: {
            legend: false,
          },
          title: {
            display: false,
            text: 'Contact attempts by week',
          },
          scales: {
            xAxes: [
              {
                gridLines: {
                  display: false,
                },
              },
            ],
          },
        },
      };

      myChartMetricsPage = new Chart(document.getElementById('myChartMetricsPage'), chartOptions);

      myChartMetricsPage.data.datasets[0].data = [
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
        Math.floor(Math.random() * 20) + 5,
      ];
      myChartMetricsPage.update();
    });
  });

  /*//old table form fucntion loader
  $(function () {
    formTable([{}], '#tableContainer');
  });*/
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
 *  +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *  +      input by: Brett Zamir (http://brett-zamir.me)
 *  +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *  +   improved by: jd
 *  +   improved by: Brett Zamir (http://brett-zamir.me)
 *  +   input by: P
 *  +   bugfixed by: Brett Zamir (http://brett-zamir.me)
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
  console.log(rampConfig);

  const WEEKSAVAILABLE = rampConfig.weeksAvailable || 16;
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
  const loop = (times, callback) => {
    [...Array(times)].forEach((item, i) => callback(i));
  };

  loop(WEEKSAVAILABLE - 1, (i) => {
    //console.log(`Iteration is #${i}`);

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
  });
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
  //console.clear();

  console.log('tbobj', tableObject);
  console.log('transposeTable(tableObject)', transposeTable(tableObject));
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
    return this.reduce((total, num) => total + num);
  };
}

//populate QLup
let metrics = {};
function populateQuickLookup(querySnapshot) {
  metrics = {
    alltime: {},
    today: {},
    yesterday: {},
  };
  querySnapshot.forEach((doc) => {
    var data = doc.data();
    //alltime
    metrics.alltime[doc.id] = JSON.parse(data.resultstring)
      .map((a) => a.metric)
      .sum();
  });
  console.log(metrics.alltime);
  //var metrics = getMetric('all-time').positiveIds;
  $('#ql-display li:contains("Pos") b').html(metrics.alltime.positiveids);
  $('#ql-display li:contains("Shifts") b').html(metrics.alltime.shifts);
  $('#ql-display li:contains("Doors") b').html(metrics.alltime.doors);
  $('#ql-display li:contains("Calls") b').html(metrics.alltime.calls);
  $('#ql-display li:contains("Texts") b').html(metrics.alltime.texts);
}
