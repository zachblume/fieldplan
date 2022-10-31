console.time();
console.timeLog();

function tooltipsPlugin(opts) {
  // save/restore cursor and tooltip state across re-inits
  let cursLeft = -10;
  let cursTop = -10;

  const cursorMemo = {
    set: (left, top) => {
      cursLeft = left;
      cursTop = top;
    },
    get: () => ({ left: cursLeft, top: cursTop }),
  };
  let cursortt;
  let seriestt;

  function init(u, opts, data) {
    console.log('opts', opts);
    let over = u.over;

    let tt = (cursortt = document.createElement('div'));
    tt.className = 'tooltip';
    tt.textContent = '(x,y)';
    tt.style.pointerEvents = 'none';
    tt.style.position = 'absolute';
    tt.style.background = 'rgba(0,0,255,0.1)';
    over.appendChild(tt);

    seriestt = opts.series.map((s, i) => {
      if (i == 0) return;

      let tt = document.createElement('div');
      tt.className = 'tooltip';
      tt.textContent = 'Tooltip!';
      tt.style.pointerEvents = 'none';
      tt.style.position = 'absolute';
      tt.style.background = 'rgba(0,0,0,1)';
      tt.style.color = 'white';
      tt.style.padding = '.3rem .5rem';
      //tt.style.fontWeight = 'bold';
      over.appendChild(tt);
      return tt;
    });

    seriestt2 = opts.series.map((s, i) => {
      if (i == 0) return;

      let tt = document.createElement('div');
      tt.className = 'tooltip';
      tt.textContent = 'Tooltip!';
      tt.style.pointerEvents = 'none';
      tt.style.position = 'absolute';
      tt.style.background = 'rgba(0,0,0,1)';
      tt.style.color = 'white';
      tt.style.padding = '.3rem .5rem';
      //tt.style.fontWeight = 'bold';
      over.appendChild(tt);
      return tt;
    });

    function hideTips() {
      cursortt.style.display = 'none';
      seriestt.forEach((tt, i) => {
        if (i == 0) return;

        tt.style.display = 'none';
      });
      seriestt2.forEach((tt, i) => {
        if (i == 0) return;

        tt.style.display = 'none';
      });
    }

    function showTips() {
      cursortt.style.display = null;
      seriestt.forEach((tt, i) => {
        if (i == 0) return;

        let s = u.series[i];
        tt.style.display = s.show ? null : 'none';
      });
      seriestt2.forEach((tt, i) => {
        if (i == 0) return;

        let s = u.series[i];
        tt.style.display = s.show ? null : 'none';
      });
    }

    over.addEventListener('mouseleave', () => {
      if (!u.cursor._lock) {
        //	u.setCursor({left: -10, top: -10});
        hideTips();
      }
    });

    over.addEventListener('mouseenter', () => {
      showTips();
    });

    if (u.cursor.left < 0) hideTips();
    else showTips();
  }

  function setCursor(u) {
    const { left, top, idx } = u.cursor;

    opts?.cursorMemo?.set(left, top);

    // this is here to handle if initial cursor position is set
    // not great (can be optimized by doing more enter/leave state transition tracking)
    //	if (left > 0)
    //		u.cursortt.style.display = null;

    cursortt.style.display = 'none';
    cursortt.style.left = left + 'px';
    cursortt.style.top = top + 'px';
    cursortt.textContent = '(' + u.posToVal(left, 'x').toFixed(2) + ', ' + u.posToVal(top, 'y').toFixed(2) + ')';

    // can optimize further by not applying styles if idx did not change
    seriestt.forEach((tt, i) => {
      if (i == 0) return;

      let s = u.series[i];

      if (s.show) {
        // this is here to handle if initial cursor position is set
        // not great (can be optimized by doing more enter/leave state transition tracking)
        //	if (left > 0)
        //		tt.style.display = null;

        let xVal = u.data[0][idx];
        let yVal = u.data[i][idx];

        const locale_options = { weekday: 'short', month: 'short', day: 'numeric' };
        tt.textContent = yVal;
        tt.textContent = '' + new Date(xVal * 1000).toLocaleDateString('us-EN', locale_options);
        tt.style.fontSize = '12px';
        tt.style.left = Math.round(u.valToPos(xVal, 'x')) - 38 + 'px';

        //tt.style.top = Math.round(u.valToPos(yVal, s.scale)) + 'px';
        tt.style.bottom = '-1.8rem';

        tt2 = seriestt2[i];
        tt2.textContent = yVal;

        tt2.style.left = Math.round(u.valToPos(xVal, 'x')) + 'px';

        tt2.style.top = Math.round(u.valToPos(yVal, s.scale) - 35) + 'px';
        //tt2.style.bottom = '-2.2rem';
      }
    });
  }

  return {
    hooks: {
      init,
      setCursor,
      setScale: [
        (u, key) => {
          console.log('setScale', key);
        },
      ],
      setSeries: [
        (u, idx) => {
          console.log('setSeries', idx);
        },
      ],
    },
  };
}
//end tooltips plugin uplot

const data = [
  [0, 1, 2, 3, 4], //x labels
  [0, 1, 2, 3, 4], //y metric
];

function getSize() {
  return {
    width: window.innerWidth - 100,
    height: window.innerHeight - 200,
  };
}

const { linear, stepped, bars, spline, spline2 } = uPlot.paths;

// generate bar builder with 60% bar (40% gap) & 100px max bar width
const _bars60_100 = bars({ size: [0.6, 100] });
const _bars100Left = bars({ size: [1], align: 1 });
const _bars100Right = bars({ size: [1], align: -1 });
const _stepBefore = stepped({ align: -1 }); //, ascDesc: true
const _stepAfter = stepped({ align: 1 }); //, ascDesc: true
const _linear = linear();
const _spline = spline();
//	const _spline2      = spline2();

function paths(u, seriesIdx, idx0, idx1, extendGap, buildClip) {
  let s = u.series[seriesIdx];
  let style = s.drawStyle;
  let interp = s.lineInterpolation;

  return _bars60_100(u, seriesIdx, idx0, idx1, extendGap, buildClip);
}

let uplotopts = {
  //cursor: cursorMemo?.get(),
  cursor: { y: false },
  plugins: [
    tooltipsPlugin({
      //cursorMemo,
    }),
  ],
  //plugins: [tooltipsPlugin()],
  //title: 'Resize',
  ...getSize(),
  axes: [
    {
      space: 40,

      // [0]:   minimum num secs in found axis split (tick incr)
      // [1]:   default tick format
      // [2-7]: rollover tick formats
      // [8]:   mode: 0: replace [1] -> [2-7], 1: concat [1] + [2-7]
      values: function (...args) {
        return args[1].map((a) =>
          new Date(a * 1000).toLocaleDateString('en-us', {
            month: 'short',
            day: 'numeric',
          })
        );
      },
      //grid: { show: false },
      //  splits:
    },
    { grid: { show: false } },
  ],

  scales: {
    x: {
      //time: true,
      //range: [0, 100],
      //auto: false,
      //distr: 2,
      time: true,
    },
    y: {
      auto: true,
    },
  },
  legend: {
    //live: false,
    show: false,
    markers: {
      width: 0,
    },
  },
  padding: [null, 0, null, 0],
  series: [
    {
      label: 'time',
    },
    {
      label: 'metric',
      stroke: '#000',
      drawStyle: 1,
      width: 2,
      points: {
        filter: function () {
          return Array();
        },
      },
      paths,
      fill: '#000',
    },
  ],
};

//  uplotopts.cursor.y = 'false';

function throttle(cb, limit) {
  var wait = false;

  return () => {
    if (!wait) {
      requestAnimationFrame(cb);
      wait = true;
      setTimeout(() => {
        wait = false;
      }, limit);
    }
  };
}

/*   window.addEventListener(
        'resize',
        throttle(() =>
        u.setSize(
          getSize()
        ), 100)
      );
*/

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
      count = 0;
      allRecords.result.forEach((doc) => {
        if (doc.parentPath.includes('data')) {
          docName = doc.document.name.split('/').pop();
          resultStringValue = doc.document.fields.resultstring.stringValue;
          count++;
          if (count == 3) createGraph(JSON.parse(resultStringValue));
          //console.log(resultStringValue);

          //console.timeLog('idb');
        }
      });
      console.log('idb finish');
      console.timeLog();
    };
  };
}

function createGraph(graphdata, ...chartdocid) {
  //  chartobject = { ...globalchart_options };
  //  console.log(chartobject);
  console.log('createGraph called');
  console.timeLog();
  const labels = graphdata.map((x) => {
    try {
      return new Date(x.period.value).getTime() / 1000;
    } catch (error) {
      console.error(error);
      return x.period == null ? '' : x.period;
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
    }
  });

  const series = graphdata.map((x) => x.metric);

  const data = [labels, series];
  console.log(data);
  charts.push(new uPlot(uplotopts, data, document.getElementById('chartcontainer')));
  console.timeLog();
  console.log('creategraph ended');
  //u.setData([labels, series], false);
}

loadAllGraphDataDirectlyFromIDB();

/*window.addEventListener('resize', (e) => {
        charts.forEach((chart) => {
          chart.setSize(getSize());
        });
      });*/

var ro = new ResizeObserver((entries) => {
  for (let entry of entries) {
    const cr = entry.contentRect;
    console.log('Element:', entry.target);
    console.log(`Element size: ${cr.width}px x ${cr.height}px`);
    console.log(`Element padding: ${cr.top}px ; ${cr.left}px`);
    charts.forEach((chart) => {
      chart.setSize({
        width: cr.width,
        height: (cr.width * 2) / 3,
      });
    });
  }
});

// Observe one or multiple elements
ro.observe(document.getElementById('chartcontainer'));
