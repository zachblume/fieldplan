const STRIPE_PUBLISHABLE_KEY = "pk_live_51KdRMYBJeGJY0XUpxLC0ATkmSCI39HdNSTBW7r7dGD1wNTx8lVMQfmxMPMFf0NRIvMiJOGfnu6arDbb4F5Ajdj7N00jYyxsOtO";

const prices = {};

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
  measurementId: "G-RW17X0TYNJ"
};

// Replace with your cloud functions location
const functionLocation = 'us-east1';

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebaseApp.firestore();

/**
 * Firebase Authentication configuration
 */
const firebaseUI = new firebaseui.auth.AuthUI(firebase.auth());
const firebaseUiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function (authResult, redirectUrl) {
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
    firebase.auth.GoogleAuthProvider.PROVIDER_ID//,
    //firebase.auth.EmailAuthProvider.PROVIDER_ID,
  ],

  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  // Your terms of service url.
  tosUrl: 'https://example.com/terms',
  // Your privacy policy url.
  privacyPolicyUrl: 'https://example.com/privacy',
};
firebase.auth().onAuthStateChanged((firebaseUser) => {
  if (firebaseUser) {
    document.querySelector('#loader').style.display = 'none';
    document.querySelector('main').style.display = 'block';
    currentUser = firebaseUser.uid;
    startDataListeners();
    //console.log(firebaseUser)
  } else {
    document.querySelector('main').style.display = 'none';
    firebaseUI.start('#firebaseui-auth-container', firebaseUiConfig);
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
        const priceSnap = await doc.ref
          .collection('prices')
          .where('active', '==', true)
          .orderBy('unit_amount')
          .get();

        if (!'content' in document.createElement('template')) {
          console.error('Your browser doesn’t support HTML template elements.');
          return;
        }

        const product = doc.data();
        const container = template.content.cloneNode(true);

        container.querySelector('h2').innerText = product.name.toUpperCase();
        container.querySelector('.description').innerText =
          product.description?.toUpperCase() || '';
        // Prices dropdown
        priceSnap.docs.forEach((doc) => {
          const priceId = doc.id;
          const priceData = doc.data();
          prices[priceId] = priceData;
          const content = document.createTextNode(
            `${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: priceData.currency,
            }).format((priceData.unit_amount / 100).toFixed(2))} per ${
            priceData.interval ?? 'once'
            }`
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
        document.querySelector('#subscribe').style.display = 'block';
        return;
      }
      document.querySelector('#subscribe').style.display = 'none';
      document.querySelector('#my-subscription').style.display = 'block';
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
      LoggedInHomePageDisplay();
      const element = document.querySelector("body");

      element.classList.add("logged-in");
    });
}

/**
 * Event listeners
 */

// Signout button
document
  .getElementById('signout')
  .addEventListener('click', () => firebase.auth().signOut());

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
  if (prices[selectedPrice.price]?.recurring?.usage_type !== 'metered')
    selectedPrice.quantity = 1;
  const checkoutSession = {
    automatic_tax: false,//automatic_tax: true,
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

  const docRef = await db
    .collection('customers')
    .doc(currentUser)
    .collection('checkout_sessions')
    .add(checkoutSession);
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

// Billing portal handler
document
  .querySelector('#billing-portal-button')
  .addEventListener('click', async (event) => {
    document.querySelectorAll('button').forEach((b) => (b.disabled = true));

    // Call billing portal function
    const functionRef = firebase
      .app()
      .functions('us-central1')
      .httpsCallable('ext-firestore-stripe-payments-createPortalLink');
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

let firstchart;
function LoggedInHomePageDisplay() {
  document.querySelector('#LoggedInUser').style.display = 'block';
  firstchart = new Chart(document.getElementById("bar-chart"), {
    type: 'bar',
    data: {
      labels: [0],
      datasets: [
        {
          label: "Contact Attempts",
          backgroundColor: "#3e95cd",
          data: [0]
        }
      ]
    },
    options: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Contact attempts by week'
      }
    }
  });
  db.collection("data").doc("weeklycontacthistory")
    .onSnapshot((doc) => {
      var parseddata = JSON.parse(doc.data().resultstring);
      console.log("Current data: ", parseddata);
      updateGraph(parseddata);
    });

}

function updateGraph(graphdata) {
  console.log(graphdata[0].week.value)
  firstchart.data.labels =
    graphdata.map(
      x => new Date(x.week.value).toLocaleDateString('en-us',
        { month: "short", day: "numeric" }
      ));
  firstchart.data.datasets[0].data = graphdata.map(x => x.contactattempts);
  firstchart.update();
  console.log("updated");
}