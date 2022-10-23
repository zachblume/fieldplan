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

  //console.clear();
  console.timeLog();
  newchart('myChart', globalchart_options);
  console.timeLog();
  newchart('myChart2', globalchart_options);
  console.timeLog();
  newchart('myChart3', globalchart_options);
  console.timeLog();
  newchart('myChart4', globalchart_options);
  console.timeLog();
}
const globalchart_options = {
  type: 'bar',
  data: {
    labels: [1, 2, 3, 4],

    datasets: [
      {
        label: 'Contact Attempts',
        borderColor: '#3e95cd',
        backgroundColor: '#0d6efd', //black //?

        data: [1, 2, 3, 4],
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

async function newchart(id, param_chart_options) {
  charts.push(new Chart(document.getElementById(id), cloneChartOptions(param_chart_options)));
}

async function loadAllGraphDataDirectlyFromIDB() {
  //console.clear();
  console.log('idb function start');
  //console.log(Date.now() - StartTimeLogged);
  console.timeLog();
  console.time('idb');

  var data = {};
  var choices = {
    weeklycontacthistory: 1,
    weeklysurveys: 2,
    weeklysignups: 3,
    vanityvolunteers: 4,
  };
  let testingvalue, idb;

  let DBOpenRequest = window.indexedDB.open('firestore/[DEFAULT]/campaign-data-project/main', 10);
  console.timeLog('idb');

  DBOpenRequest.onsuccess = (event) => {
    console.log('<li>Database initialized.</li>');
    console.timeLog('idb');
    idb = DBOpenRequest.result;
    const transaction = idb.transaction(['remoteDocuments'], 'readwrite');
    transaction.oncomplete = (event) => {
      console.log('<li>Transaction completed.</li>');
      console.timeLog('idb');
    };
    transaction.onerror = (event) => {
      console.log(`<li>Transaction not opened due to error: ${transaction.error}</li>`);
    };
    const objectStore = transaction.objectStore('remoteDocuments');
    var allRecords = objectStore.getAll();

    allRecords.onsuccess = function () {
      allRecords.result.forEach((doc) => {
        if (doc.parentPath.includes('data')) {
          docName = doc.document.name.split('/').pop();
          resultStringValue = doc.document.fields.resultstring.stringValue;
          updateGraph(JSON.parse(resultStringValue), 'myChart' + choices[docName].toString());
          console.timeLog('idb');
        }
      });
      console.log('idb finish');
      console.timeLog();
    };
  };
}

function updateGraph(graphdata, chartdocid) {
  //console.log(graphdata[0]);
  //console.log(chartobject);
  chartobject = { ...globalchart_options };
  console.log(chartobject);
  console.timeLog();
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
  newchart(chartdocid, chartobject);
  //chartobject.update();
  console.log('updated');
}

//HomePageChartCompose();
loadAllGraphDataDirectlyFromIDB();
