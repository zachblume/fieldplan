console.log("app.js begins running, time logged as StartTimeLogged");
const StartTimeLogged = Date.now();
console.timeLog();

const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51KdRMYBJeGJY0XUpxLC0ATkmSCI39HdNSTBW7r7dGD1wNTx8lVMQfmxMPMFf0NRIvMiJOGfnu6arDbb4F5Ajdj7N00jYyxsOtO";

const prices = {};

//global
let currentUser;

// Replace with your Firebase project config.
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYGt2ch3s2T3JpZjPT8oKsCnXy26GSkzg",
  authDomain: "campaign-data-project.firebaseapp.com",
  projectId: "campaign-data-project",
  storageBucket: "campaign-data-project.appspot.com",
  messagingSenderId: "640113081213",
  appId: "1:640113081213:web:393c23321699d3e8dcea14",
  measurementId: "G-RW17X0TYNJ",
};

// Replace with your cloud functions location
// const functionLocation = "us-central1";

// Initialize Firebase

const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebaseApp.firestore();

db.enablePersistence().catch((err) => {
  if (err.code == "failed-precondition") {
    // Multiple tabs open, persistence can only be enabled
    // in one tab at a a time.
    // ...
  } else if (err.code == "unimplemented") {
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
      document.querySelector("#loader").style.display = "none";
    },
  },
  signInFlow: "redirect",
  signInSuccessUrl: "/",
  signInOptions: [
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      clientId:
        "640113081213-cgb821si2sshi87hdurs7doo7a7flo0c.apps.googleusercontent.com",
    }, //firebase.auth.EmailAuthProvider.PROVIDER_ID,
  ],

  credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
  // Your terms of service url.
  //tosUrl: "https://example.com/terms",
  // Your privacy policy url.
  //privacyPolicyUrl: "https://example.com/privacy",
};

console.log("queue firebase.auth().onAuthStateChanged((firebaseUser) after ");
console.log(Date.now() - StartTimeLogged);
console.timeLog();
$(LoggedInHomePageDisplay);
firebase.auth().onAuthStateChanged((firebaseUser) => {
  if (firebaseUser) {
    console.log("firebase.auth().onAuthStateChanged((firebaseUser) after ");
    console.log(Date.now() - StartTimeLogged);
    console.timeLog();
    // document.querySelector('#loader').style.display = 'none';
    // document.querySelector('main').style.display = 'block';
    document.querySelector("body").classList.add("logged-in");
    document.querySelector("body").classList.remove("not-logged-in");
    currentUser = firebaseUser.uid;
    startDataListeners();
    //console.log(firebaseUser)
  } else {
    document.querySelector("body").classList.remove("logged-in");
    document.querySelector("body").classList.add("not-logged-in");
    firebaseUI.start("#firebaseui-auth-container", firebaseUiConfig);
    firebaseUI.disableAutoSignIn();
  }
});
/**
 * Data listeners
 */
function startDataListeners() {
  // Get all our products and render them to the page
  const products = document.querySelector(".products");
  const template = document.querySelector("#product");

  db.collection("products")
    .where("active", "==", true)
    .get()
    .then(function (querySnapshot) {
      querySnapshot.forEach(async function (doc) {
        const priceSnap = await doc.ref
          .collection("prices")
          .where("active", "==", true)
          .orderBy("unit_amount")
          .get();

        /*if (!"content" in document.createElement("template")) {
          console.error("Your browser doesn’t support HTML template elements.");
          return;
        }*/

        const product = doc.data();
        const container = template.content.cloneNode(true);

        container.querySelector("h2").innerText = product.name.toUpperCase();
        container.querySelector(".description").innerText =
          product.description?.toUpperCase() || "";
        // Prices dropdown
        priceSnap.docs.forEach((doc) => {
          const priceId = doc.id;
          const priceData = doc.data();
          prices[priceId] = priceData;
          const content = document.createTextNode(
            `${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: priceData.currency,
            }).format((priceData.unit_amount / 100).toFixed(2))} per ${
              priceData.interval ?? "once"
            }`
          );
          const option = document.createElement("option");
          option.value = priceId;
          option.appendChild(content);
          container.querySelector("#price").appendChild(option);
        });

        if (product.images.length) {
          const img = container.querySelector("img");
          img.src = product.images[0];
          img.alt = product.name;
        }

        const form = container.querySelector("form");
        form.addEventListener("submit", subscribe);

        products.appendChild(container);
      });
    });
  // Get all subscriptions for the customer
  db.collection("customers")
    .doc(currentUser)
    .collection("subscriptions")
    .where("status", "in", ["trialing", "active"])
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
        "#my-subscription p"
      ).textContent = `Hi ${username}, you are paying ${new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: priceData.currency,
        }
      ).format((priceData.unit_amount / 100).toFixed(2))} per ${
        priceData.interval
      }, giving you the role: ${await getCustomClaimRole()}.`;

      const element = document.querySelector("body");

      element.classList.add("logged-in");
    });
}

/**
 * Event listeners
 */

// Signout button
document
  .getElementById("signout")
  .addEventListener("click", () => firebase.auth().signOut());

// Checkout handler
async function subscribe(event) {
  event.preventDefault();
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  const formData = new FormData(event.target);
  const selectedPrice = {
    price: formData.get("price"),
  };
  // For prices with metered billing we need to omit the quantity parameter.
  // For all other prices we set quantity to 1.
  if (prices[selectedPrice.price]?.recurring?.usage_type !== "metered")
    selectedPrice.quantity = 1;
  const checkoutSession = {
    automatic_tax: false, //automatic_tax: true,
    tax_id_collection: true,
    collect_shipping_address: true,
    allow_promotion_codes: true,
    line_items: [selectedPrice],
    success_url: window.location.origin,
    cancel_url: window.location.origin,
    metadata: {
      key: "value",
    },
  };
  // For one time payments set mode to payment.
  if (prices[selectedPrice.price]?.type === "one_time") {
    checkoutSession.mode = "payment";
    checkoutSession.payment_method_types = ["card", "sepa_debit", "sofort"];
  }

  const docRef = await db
    .collection("customers")
    .doc(currentUser)
    .collection("checkout_sessions")
    .add(checkoutSession);
  // Wait for the CheckoutSession to get attached by the extension
  docRef.onSnapshot((snap) => {
    const { error, url } = snap.data();
    if (error) {
      // Show an error to your customer and then inspect your function logs.
      alert(`An error occured: ${error.message}`);
      document.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
    if (url) {
      window.location.assign(url);
    }
  });
}

// Billing portal handler
document
  .querySelector("#billing-portal-button")
  .addEventListener("click", async () => {
    //async (event) => {
    document.querySelectorAll("button").forEach((b) => (b.disabled = true));

    // Call billing portal function
    const functionRef = firebase
      .app()
      .functions("us-central1")
      .httpsCallable("ext-firestore-stripe-payments-createPortalLink");
    const { data } = await functionRef({
      returnUrl: window.location.origin,
      locale: "auto", // Optional, defaults to "auto"
      //configuration: "bpc_1JSEAKHYgolSBA358VNoc2Hs", // Optional ID of a portal configuration: https://stripe.com/docs/api/customer_portal/configuration
    });
    window.location.assign(data.url);
  });

// Get custom claim role helper
async function getCustomClaimRole() {
  await firebase.auth().currentUser.getIdToken(true);
  const decodedToken = await firebase.auth().currentUser.getIdTokenResult();
  return decodedToken.claims.stripeRole;
}

function LoggedInHomePageDisplay() {
  //document.querySelector("#LoggedInUser").style.display = "block";
  Chart.register(ChartDataLabels);
  const chart_options = {
    type: "bar",
    data: {
      labels: [0, 0],

      datasets: [
        {
          label: "Contact Attempts",
          borderColor: "#3e95cd",
          backgroundColor: "#0d6efd", //black //?

          data: [0, 0],
          datalabels: {
            align: "start",
            anchor: "end",
          },
        },
      ],
    },
    options: {
      interaction: {
        intersect: false,
        mode: "nearest",
        axis: "x",
      },
      plugins: {
        legend: false,
        datalabels: {
          color: "white",
          /* display: function (context) {
            return context.dataset.data[context.dataIndex] > 15;
          },*/
          font: {
            weight: "normal",
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
        text: "Contact attempts by week",
      },
      scales: {
        x: {
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: false,
            drawTicks: true,
          },
        },
      },
    },
  };
  const charts = [];
  function cloneChartOptions(x) {
    y = structuredClone(x);
    y.options.plugins.datalabels.formatter = nFormatter;
    return y;
  }
  charts[1] = new Chart(
    document.getElementById("myChart2"),
    cloneChartOptions(chart_options)
  );
  charts[2] = new Chart(
    document.getElementById("myChart"),
    cloneChartOptions(chart_options)
  );
  charts[3] = new Chart(
    document.getElementById("myChart3"),
    cloneChartOptions(chart_options)
  );

  console.log("firestore gets called after");
  console.log(Date.now() - StartTimeLogged);
  console.timeLog();

  db.collection("data").onSnapshot((querySnapshot) => {
    console.log("first firestore response after");
    console.log(Date.now() - StartTimeLogged);
    console.timeLog();

    var data = {};
    querySnapshot.forEach((doc) => {
      data = doc.data();
      choices = {
        weeklycontacthistory: 1,
        weeklysurveys: 2,
        weeklysignups: 3,
      };
      updateGraph(JSON.parse(data.resultstring), charts[choices[doc.id]]);
    });
  });
}

function updateGraph(graphdata, chartobject) {
  //console.log(graphdata[0]);
  //console.log(chartobject);
  chartobject.data.labels = graphdata.map((x) => {
    try {
      return new Date(x.period.value).toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error(error);
      return x.period == null ? "" : x.period;
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
    }
  });

  chartobject.data.datasets[0].data = graphdata.map((x) => x.metric);
  chartobject.update();
  console.log("updated");
}

function nFormatter(num, ...params) {
  const digits = params.digits || 1;
  //console.log(digits);
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
    : "0";
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
window.addEventListener("DOMContentLoaded", start_up_scripts);
function start_up_scripts() {
  let myChartVolunteersPage;
  $(function () {
    const chartOptions = {
      type: "bar",
      data: {
        labels: [
          "Apr 11",
          "Apr 18",
          "May 10",
          "May 17",
          "May 24",
          "June 5",
          "Apr 11",
          "Apr 18",
          "May 10",
          "May 17",
          "May 24",
          "June 5",
        ],
        datasets: [
          {
            label: "# of Votes",
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              "#0d6efd", //black //?
            ],
          },
        ],
      },
      options: {
        interaction: {
          intersect: false,
          mode: "nearest",
          axis: "x",
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
          text: "Contact attempts by week",
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

    myChartVolunteersPage = new Chart(
      document.getElementById("myChartVolunteersPage"),
      chartOptions
    );

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

  $(function () {
    var start = moment().subtract(29, "days");
    var end = moment();

    function cb(start, end) {
      $("#reportrange span").html(
        start.format("MMM D, YYYY") + " - " + end.format("MMM D, YYYY")
      );
    }

    $("#reportrange").daterangepicker(
      {
        startDate: start,
        endDate: end,
        ranges: {
          "Last 30 Days": [moment().subtract(29, "days"), moment()],
          "This Month": [moment().startOf("month"), moment().endOf("month")],
          "Last Month": [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],
          "Last 3 Months": [moment().startOf("month"), moment().endOf("month")],
          "Last 6 Months": [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],

          "This Year": [moment(), moment()],
          "Last Year": [moment(), moment()],
          "All Time": [moment(), moment()],
        },
      },
      cb
    );

    cb(start, end);
  });
  $(function () {
    var start = moment().subtract(29, "days");
    var end = moment();

    function cb(start, end) {
      $("#reportrange span").html(
        start.format("MMM D, YYYY") + " - " + end.format("MMM D, YYYY")
      );
    }

    $("#reportrange").daterangepicker(
      {
        startDate: start,
        endDate: end,
        ranges: {
          "Last 30 Days": [moment().subtract(29, "days"), moment()],
          "This Month": [moment().startOf("month"), moment().endOf("month")],
          "Last Month": [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],
          "Last 3 Months": [moment().startOf("month"), moment().endOf("month")],
          "Last 6 Months": [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],

          "This Year": [moment(), moment()],
          "Last Year": [moment(), moment()],
          "All Time": [moment(), moment()],
        },
      },
      cb
    );

    cb(start, end);
  });

  $(document).ready(function () {
    cbox = document.querySelectorAll("#volunteers-navbar .btn-toggle-nav a");
    cbox.forEach((box) => {
      box.addEventListener("mousedown", (a) => setMetric(a.target.innerText));
    });
  });
  $(function () {
    /*
//tooltips init
const tooltipTriggerList = document.querySelectorAll(
'[data-bs-toggle="tooltip"]'
);
const tooltipList = [...tooltipTriggerList].map(
(tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
);*/
    document
      .querySelectorAll('input[type="range"]')
      .forEach((a) =>
        a.addEventListener(
          "input",
          (b) => (b.target.previousElementSibling.value = b.target.value)
        )
      );
    document
      .querySelectorAll('input[type="range"]')
      .forEach((a) => (a.previousElementSibling.value = a.value));
  });

  $(function () {
    document.addEventListener("input", function (e) {
      if (e.target.type == "range") {
        processRangesToFormTable();
      }
    });
    processRangesToFormTable();
  });

  $(document).ready(function () {
    cbox = document.querySelectorAll("#metrics-navbar .btn-toggle-nav a");
    cbox.forEach((box) => {
      box.addEventListener("mousedown", (a) => setMetric(a.target.innerText));
    });
  });
  function setMetric(metricName) {
    document.getElementById("metric-page-title").innerHTML = metricName;
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
    var start = moment().subtract(29, "days");
    var end = moment();

    function cb(start, end) {
      $("#reportrange span").html(
        start.format("MMM D, YYYY") + " - " + end.format("MMM D, YYYY")
      );
    }

    $("#reportrange").daterangepicker(
      {
        startDate: start,
        endDate: end,
        ranges: {
          "Last 30 Days": [moment().subtract(29, "days"), moment()],
          "This Month": [moment().startOf("month"), moment().endOf("month")],
          "Last Month": [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],
          "Last 3 Months": [moment().startOf("month"), moment().endOf("month")],
          "Last 6 Months": [
            moment().subtract(1, "month").startOf("month"),
            moment().subtract(1, "month").endOf("month"),
          ],

          "This Year": [moment(), moment()],
          "Last Year": [moment(), moment()],
          "All Time": [moment(), moment()],
        },
      },
      cb
    );

    cb(start, end);

    let myChartMetricsPage;
    $(function () {
      /*Chart.defaults.set('plugins.datalabels', {
    color: '#FE777B'
  });*/
      const chartOptions = {
        type: "bar",
        data: {
          labels: [
            "Apr 11",
            "Apr 18",
            "May 10",
            "May 17",
            "May 24",
            "June 5",
            "Apr 11",
            "Apr 18",
            "May 10",
            "May 17",
            "May 24",
            "June 5",
          ],
          datasets: [
            {
              label: "# of Votes",
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: [
                "#0d6efd", //black //?
              ],
            },
          ],
        },
        options: {
          interaction: {
            intersect: false,
            mode: "nearest",
            axis: "x",
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
            text: "Contact attempts by week",
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

      myChartMetricsPage = new Chart(
        document.getElementById("myChartMetricsPage"),
        chartOptions
      );

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

  $(function () {
    formTable([{}], "#tableContainer");
  });
}

function collapsetds() {
  document
    .querySelectorAll("td:not(:last-of-type)")
    .forEach(
      (a) => (a.style.display = a.style.display == "none" ? "" : "none")
    );
  $("#collapseTableDiv").toggleClass("col-3");
  $("#righthandtoggle").toggleClass("col-9");
  return false;
}

function formTable(tableobject, querySelect) {
  var table = document.querySelector(querySelect);
  $(table).empty();
  var jsonStr = tableobject; //JSON.parse(json);
  var setHeaders = true;
  for (i in jsonStr) {
    var item = JSON.stringify(jsonStr[i]);
    if (setHeaders) {
      createEntry(table, item, true);
      setHeaders = false;
    }
    createEntry(table, item, false);
  }
}

function createEntry(table, item, isHeader) {
  var thead = document.createElement("thead");
  var tbody = document.createElement("tbody");
  var tr = document.createElement("tr");
  var json = JSON.parse(item);
  for (i in json) {
    //console.log(i);
    var td = isHeader
      ? document.createElement("th")
      : document.createElement("td");
    var textnode = isHeader
      ? document.createTextNode(i)
      : document.createTextNode(
          isNaN(json[i]) ? json[i] : json[i].toLocaleString()
        );
    td.appendChild(textnode);
    tr.appendChild(td);
  }
  if (isHeader) {
    thead.appendChild(tr);
    table.appendChild(thead);
  } else {
    if (table.querySelector("tbody")) {
      table.querySelector("tbody").appendChild(tr);
    } else {
      tbody.appendChild(tr);
      table.appendChild(tbody);
    }
  }
}

function ConvertJsonToTable(parsedJson, tableId, tableClassName, linkText) {
  var idMarkup,
    classMarkup,
    italic = "<i>{0}</i>",
    link = linkText
      ? '<a href="{0}">' + linkText + "</a>"
      : '<a href="{0}">{0}</a>',
    tbl =
      '<table border="1" cellpadding="1" cellspacing="1"' +
      (tableId ? ' id="' + tableId + '"' : "") +
      (tableClassName ? ' class="' + tableClassName + '"' : "") +
      ">{0}{1}</table>",
    th = "<thead>{0}</thead>",
    tb = "<tbody>{0}</tbody>",
    tr = "<tr>{0}</tr>",
    thRow = "<th>{0}</th>",
    tdRow = "<td>{0}</td>",
    thCon = "",
    tbCon = "",
    trCon = "";
  if (parsedJson) {
    var headers,
      isStringArray = "string" == typeof parsedJson[0];
    if (isStringArray) thCon += thRow.format("value");
    else if ("object" == typeof parsedJson[0]) {
      headers = array_keys(parsedJson[0]);
      for (var i = 0; i < headers.length; i++)
        thCon += thRow.format(headers[i]);
    }
    if (((th = th.format(tr.format(thCon))), isStringArray))
      for (var i = 0; i < parsedJson.length; i++)
        (tbCon += tdRow.format(parsedJson[i])),
          (trCon += tr.format(tbCon)),
          (tbCon = "");
    else if (headers)
      for (
        var urlRegExp = RegExp(
            /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi
          ),
          javascriptRegExp = RegExp(/(^javascript:[\s\S]*;$)/gi),
          i = 0;
        i < parsedJson.length;
        i++
      ) {
        for (var j = 0; j < headers.length; j++) {
          var isUrl,
            value = parsedJson[i][headers[j]];
          urlRegExp.test(value) || javascriptRegExp.test(value)
            ? (tbCon += tdRow.format(link.format(value)))
            : value
            ? "object" == typeof value
              ? (tbCon += tdRow.format(
                  ConvertJsonToTable(
                    eval(value.data),
                    value.tableId,
                    value.tableClassName,
                    value.linkText
                  )
                ))
              : (tbCon += tdRow.format(value))
            : (tbCon += tdRow.format(italic.format(value).toUpperCase()));
        }
        (trCon += tr.format(tbCon)), (tbCon = "");
      }
    return (tb = tb.format(trCon)), (tbl = tbl.format(th, tb));
  }
  return null;
}
function array_keys(t, r, a) {
  var e = void 0 !== r,
    o = [],
    f = !!a,
    n = !0,
    i = "";
  if (t && "object" == typeof t && t.change_key_case) return t.keys(r, a);
  for (i in t)
    t.hasOwnProperty(i) &&
      ((n = !0),
      e && (f && t[i] !== r ? (n = !1) : t[i] != r && (n = !1)),
      n && (o[o.length] = i));
  return o;
}
String.prototype.format = function () {
  var t = arguments;
  return this.replace(/{(\d+)}/g, function (r, a) {
    return void 0 !== t[a] ? t[a] : "{" + a + "}";
  });
};

function processRangesToFormTable() {
  var rampConfig = {};
  var listOfRanges = document.querySelectorAll("input[type=range]");
  listOfRanges.forEach((a) => (rampConfig[a.id] = a.value));

  console.log(rampConfig);

  /*rangesAsJSobj={
"startingShifts": "71",
"shiftGrowth": "50",
"doorsVsPhones": "50",
"totalIDtextsPlanned": "50",
"relationalIDperVolunteer": "50",
"responseRateDoors": "50",
"responseRatePhones": "50",
"responseRateTexts": "50",
"posRateDoors": "50",
"posRatePhones": "50",
"posRateTexts": "50"
}*/

  const WEEKSAVAILABLE = 16;
  var newItem = {};

  thisWeekShiftCount = rampConfig.startingShifts;
  newItem = {
    "Week Number": 1,
    "Total Weekly Shifts": Math.floor(thisWeekShiftCount),
    //----
    "Petitioning Attempts": 0,
    "Calls Made": Math.floor(
      thisWeekShiftCount *
        (1 - rampConfig.doorsVsPhones / 100) *
        rampConfig.callsPerShift
    ),
    "Doors Knocked": Math.floor(
      thisWeekShiftCount *
        (0 + rampConfig.doorsVsPhones / 100) *
        rampConfig.doorsPerShift
    ),
    "SMS Sent": Math.floor(rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE),
    //----
    "Petitioning +IDs": 0,
    "Calls +IDs": Math.floor(
      (((thisWeekShiftCount *
        (1 - rampConfig.doorsVsPhones / 100) *
        rampConfig.callsPerShift *
        rampConfig.responseRatePhones) /
        100) *
        rampConfig.posRatePhones) /
        100
    ),
    "Doors +IDs": Math.floor(
      (((thisWeekShiftCount *
        (rampConfig.doorsVsPhones / 100) *
        rampConfig.doorsPerShift *
        rampConfig.responseRateDoors) /
        100) *
        rampConfig.posRateDoors) /
        100
    ),
    "Text +IDs": Math.floor(
      ((((rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE) *
        rampConfig.responseRateTexts) /
        100) *
        rampConfig.posRateTexts) /
        100
    ),
    "Relational +IDs": 0,
    "Total Pos IDs": 0,
  };
  newItem["Total Pos IDs"] = Math.floor(
    newItem["Petitioning +IDs"] +
      newItem["Calls +IDs"] +
      newItem["Doors +IDs"] +
      newItem["Text +IDs"] +
      newItem["Relational +IDs"]
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
      tableObject[tableObject.length - 1]["Total Weekly Shifts"] *
      (1 + rampConfig.shiftGrowth / 100);
    newItem = {
      "Week Number": i + 1 + 1,
      "Total Weekly Shifts": Math.floor(thisWeekShiftCount),
      //----
      "Petitioning Attempts": 0,
      "Calls Made": Math.floor(
        thisWeekShiftCount *
          (1 - rampConfig.doorsVsPhones / 100) *
          rampConfig.callsPerShift
      ),
      "Doors Knocked": Math.floor(
        thisWeekShiftCount *
          (0 + rampConfig.doorsVsPhones / 100) *
          rampConfig.doorsPerShift
      ),
      "SMS Sent": Math.floor(rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE),
      //----
      "Petitioning +IDs": 0,
      "Calls +IDs": Math.floor(
        (((thisWeekShiftCount *
          (1 - rampConfig.doorsVsPhones / 100) *
          rampConfig.callsPerShift *
          rampConfig.responseRatePhones) /
          100) *
          rampConfig.posRatePhones) /
          100
      ),
      "Doors +IDs": Math.floor(
        (((thisWeekShiftCount *
          (rampConfig.doorsVsPhones / 100) *
          rampConfig.doorsPerShift *
          rampConfig.responseRateDoors) /
          100) *
          rampConfig.posRateDoors) /
          100
      ),
      "Text +IDs": Math.floor(
        ((((rampConfig.totalIDtextsPlanned / WEEKSAVAILABLE) *
          rampConfig.responseRateTexts) /
          100) *
          rampConfig.posRateTexts) /
          100
      ),
      "Relational +IDs": 0,
      "Total Pos IDs": 0,
    };
    newItem["Total Pos IDs"] = Math.floor(
      newItem["Petitioning +IDs"] +
        newItem["Calls +IDs"] +
        newItem["Doors +IDs"] +
        newItem["Text +IDs"] +
        newItem["Relational +IDs"]
    );
    //newItem.map(a => console.log(a));
    Object.keys(newItem).forEach(function (key, index) {
      totals[key] += newItem[key];
    });
    tableObject.push(newItem);
    //  console.log(totals);
  });
  totals["Week Number"] = "Total";
  tableObject.push(totals);
  // $('#tableContainer').html("<pre>" + JSON.stringify(tableObject, null, '\t') + "</pre>")

  tableObject.forEach((row) => {
    //row
    Object.keys(newItem).forEach(function (key, index) {
      //totals[key] += row[key];
      row[key] = isNaN(row[key]) ? row[key] : nFormatter(row[key], 1);
    });
  });

  $("#tableContainer").html(
    ConvertJsonToTable(tableObject, "", null, "Download")
  );

  // REVERSE TABLE DIRECTO
  $("table").each(function () {
    var $this = $(this);
    var newrows = [];
    $this.find("tr").each(function () {
      var i = 0;
      $(this)
        .find("td")
        .each(function () {
          i++;
          if (newrows[i] === undefined) {
            newrows[i] = $("<tr></tr>");
          }
          newrows[i].append($(this));
        });
      $(this)
        .find("th")
        .each(function () {
          i++;
          if (newrows[i] === undefined) {
            newrows[i] = $("<tr></tr>");
          }
          newrows[i].append($(this));
        });
    });
    $this.find("tr").remove();
    $.each(newrows, function () {
      $this.append(this);
    });
  });

  /*
var calculations = Array;
calculations['Total Weekly Shifts'].push(0);
tableObject = tableObject.map(x => {
y = x;
y['Week 1'] = "asdasd";
return y;
});
formTable(tableObject, "#tableContainer");
*/
}

function setMetric(metricName) {
  document.getElementById("volunteers-page-title").innerHTML = metricName;
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
}
