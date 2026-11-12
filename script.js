/* 송도키즈 소아청소년과의원 — 화면 동작 */
(function () {
  "use strict";

  /* 진료 시간(분 단위). 바뀌면 여기와 index.html의 표를 함께 고친다. */
  var HOURS = {
    weekday: { open: 8 * 60 + 30, close: 18 * 60 + 30, lunch: [13 * 60, 14 * 60] },
    saturday: { open: 9 * 60, close: 13 * 60 + 30, lunch: null },
  };
  /* 날짜가 고정된 공휴일(월-일). 설·추석·대체공휴일은 해마다 달라 넣지 않았다. */
  var FIXED_HOLIDAYS = ["1-1", "3-1", "5-5", "6-6", "8-15", "10-3", "10-9", "12-25"];

  /* ── 머리글 ── */
  var header = document.querySelector(".site-header");
  var nav = document.getElementById("site-nav");
  var toggle = document.querySelector(".nav-toggle");

  function onScroll() {
    header.classList.toggle("is-stuck", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setNav(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  }
  toggle.addEventListener("click", function () {
    setNav(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setNav(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setNav(false);
      toggle.focus();
    }
  });

  /* ── 지금 진료 중인지 (한국 시간 기준) ── */
  function seoulNow() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      weekday: "short",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) {
      o[p.type] = p.value;
    });
    return {
      dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday),
      md: o.month + "-" + o.day,
      minutes: (Number(o.hour) % 24) * 60 + Number(o.minute),
    };
  }

  function clock(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    var ap = h < 12 ? "오전" : "오후";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return ap + " " + h12 + "시" + (m ? " " + m + "분" : "");
  }

  function todayStatus() {
    var now = seoulNow();
    var caution = "공휴일과 임시 휴진은 전화로 확인해 주세요.";
    if (now.dow === 0) {
      return { state: "closed", label: "오늘은 휴진입니다", detail: "일요일과 공휴일은 쉽니다. 월요일 오전 8시 30분에 진료를 시작합니다." };
    }
    if (FIXED_HOLIDAYS.indexOf(now.md) !== -1) {
      return { state: "closed", label: "오늘은 휴진입니다", detail: "공휴일은 쉽니다." };
    }
    var h = now.dow === 6 ? HOURS.saturday : HOURS.weekday;
    var t = now.minutes;
    if (t < h.open) {
      return { state: "closed", label: "진료 전입니다", detail: "오늘 " + clock(h.open) + "에 진료를 시작합니다. " + caution };
    }
    if (t >= h.close) {
      return { state: "closed", label: "오늘 진료가 끝났습니다", detail: caution };
    }
    if (h.lunch && t >= h.lunch[0] && t < h.lunch[1]) {
      return { state: "lunch", label: "점심시간입니다", detail: clock(h.lunch[1]) + "에 오후 진료를 시작합니다." };
    }
    return { state: "open", label: "지금 진료 중입니다", detail: "오늘은 " + clock(h.close) + "까지 진료합니다. " + caution };
  }

  var today = document.getElementById("today");
  function renderToday() {
    var s = todayStatus();
    today.dataset.state = s.state;
    document.getElementById("today-label").textContent = s.label;
    document.getElementById("today-detail").textContent = s.detail;
  }
  try {
    renderToday();
    setInterval(renderToday, 60 * 1000);
  } catch (err) {
    /* 시간대를 읽지 못하는 브라우저에서는 기본 안내문을 그대로 둔다. */
  }

  /* ── 클리닉 탭 ── */
  var tablist = document.querySelector('[role="tablist"]');
  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  /* 스크립트가 꺼져 있으면 다섯 패널이 모두 펼쳐진 채로 보인다. 켜져 있을 때만 하나로 접는다. */
  selectTab(tabs[0], false);

  function revealTab(tab) {
    /* 가로로 넘치는 탭 줄 안에서만 움직인다(페이지 세로 위치는 건드리지 않는다). */
    var left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
    tablist.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }

  tablist.addEventListener("click", function (e) {
    var tab = e.target.closest('[role="tab"]');
    if (tab) {
      selectTab(tab, false);
      revealTab(tab);
    }
  });
  tablist.addEventListener("keydown", function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    var next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      selectTab(next, true);
      revealTab(next);
    }
  });

  /* ── 영유아 건강검진 시기 ── */
  var ROUNDS = [
    { name: "신생아", days: [14, 35] },
    { name: "4개월", months: [4, 6] },
    { name: "9개월", months: [9, 12] },
    { name: "18개월", months: [18, 24] },
    { name: "30개월", months: [30, 36] },
    { name: "42개월", months: [42, 48] },
    { name: "54개월", months: [54, 60] },
    { name: "66개월", months: [66, 71] },
  ];

  function addMonths(date, n) {
    var d = new Date(date.getFullYear(), date.getMonth() + n, 1);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(date.getDate(), last));
    return d;
  }
  function addDays(date, n) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  }
  function fmt(d) {
    return d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate();
  }
  function fmtLong(d) {
    return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
  }

  function checkupRanges(birth) {
    return ROUNDS.map(function (r) {
      if (r.days) return { name: r.name, from: addDays(birth, r.days[0]), to: addDays(birth, r.days[1]) };
      /* "생후 4~6개월"은 만 4개월이 되는 날부터 만 7개월이 되기 전날까지 */
      return { name: r.name, from: addMonths(birth, r.months[0]), to: addDays(addMonths(birth, r.months[1] + 1), -1) };
    });
  }

  var checkupForm = document.querySelector("#checkup-calc form");
  var checkupOut = document.getElementById("checkup-out");
  var birthInput = document.getElementById("c-birth");
  var t0 = new Date();
  var todayLocal = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  birthInput.max = [t0.getFullYear(), String(t0.getMonth() + 1).padStart(2, "0"), String(t0.getDate()).padStart(2, "0")].join("-");

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  checkupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    checkupOut.textContent = "";
    var v = birthInput.value;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) {
      checkupOut.appendChild(el("p", "calc-msg", "생년월일을 선택해 주세요."));
      birthInput.focus();
      return;
    }
    var birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (birth > todayLocal) {
      checkupOut.appendChild(el("p", "calc-msg", "생년월일이 오늘보다 뒤입니다. 날짜를 다시 확인해 주세요."));
      birthInput.focus();
      return;
    }
    var ranges = checkupRanges(birth);
    var current = null;
    var upcoming = null;
    ranges.forEach(function (r) {
      r.status = todayLocal > r.to ? "past" : todayLocal >= r.from ? "now" : "next";
      if (r.status === "now" && !current) current = r;
      if (r.status === "next" && !upcoming) upcoming = r;
    });

    var msg;
    if (current) msg = "지금 " + current.name + " 검진을 받을 수 있습니다. " + fmtLong(current.to) + "까지입니다.";
    else if (upcoming) msg = "다음은 " + upcoming.name + " 검진입니다. " + fmtLong(upcoming.from) + "부터 받을 수 있습니다.";
    else msg = "영유아 건강검진 기간이 모두 지났습니다.";
    checkupOut.appendChild(el("p", "calc-msg", msg));

    var list = el("ul", "rounds");
    ranges.forEach(function (r) {
      var li = el("li", r.status === "now" ? "is-now" : r.status === "past" ? "is-past" : "");
      li.appendChild(el("span", "r-name", r.name));
      li.appendChild(el("span", "r-date", fmt(r.from) + " ~ " + fmt(r.to)));
      li.appendChild(el("span", "r-tag", r.status === "now" ? "지금 가능" : r.status === "past" ? "지남" : "예정"));
      list.appendChild(li);
    });
    checkupOut.appendChild(list);
  });

  /* ── 키 예측 시뮬레이터 (부모 키 기반 유전적 예측 키) ── */
  var SIM_MIN = 140;
  var SIM_MAX = 210;
  var SIM_SPREAD = 8.5; /* 유전적 예측 키의 통상 범위(±8.5cm) */
  var simForm = document.getElementById("sim-form");
  var simMsg = document.getElementById("sim-msg");
  var simFields = ["father", "mother"].map(function (k) {
    return { num: document.getElementById("sim-" + k), range: document.getElementById("sim-" + k + "-range") };
  });

  function simValid(n) {
    return isFinite(n) && n >= SIM_MIN && n <= SIM_MAX;
  }
  /* 막대 높이: 130cm를 바닥, 215cm를 꼭대기로 본다 */
  function barPct(cm) {
    return Math.max(8, Math.min(100, ((cm - 130) / 85) * 100));
  }
  function one(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
  }
  function trim(n) {
    return String(Math.round(n * 10) / 10);
  }

  function renderSim() {
    var father = parseFloat(simFields[0].num.value);
    var mother = parseFloat(simFields[1].num.value);
    if (!simValid(father) || !simValid(mother)) {
      simMsg.textContent = "키는 " + SIM_MIN + "~" + SIM_MAX + "cm 사이 숫자로 넣어 주세요.";
      return;
    }
    simMsg.textContent = "";
    var boy = simForm.querySelector('input[name="sim-sex"]:checked').value === "m";
    var child = (father + mother) / 2 + (boy ? 6.5 : -6.5);
    var lo = child - SIM_SPREAD;
    var hi = child + SIM_SPREAD;

    document.getElementById("sim-out").textContent = one(child);
    document.getElementById("sim-rangeline").textContent =
      "같은 부모에게서도 아이마다 차이가 있어, 보통 " + one(lo) + "~" + one(hi) + "cm 범위로 봅니다.";
    document.getElementById("sim-formula").textContent =
      "(" + trim(father) + " + " + trim(mother) + ") ÷ 2 " + (boy ? "+" : "−") + " 6.5";

    document.getElementById("sim-v-father").textContent = trim(father);
    document.getElementById("sim-v-mother").textContent = trim(mother);
    document.getElementById("sim-v-child").textContent = one(child);
    document.getElementById("sim-b-father").style.height = barPct(father) + "%";
    document.getElementById("sim-b-mother").style.height = barPct(mother) + "%";
    /* 아이 막대는 예측 키까지, 그 위아래로 걸친 띠가 통상 범위다 */
    document.getElementById("sim-b-child").style.height = barPct(child) + "%";
    var band = document.getElementById("sim-band");
    band.style.height = barPct(hi) - barPct(lo) + "%";
    band.style.bottom = barPct(lo) + "%";
    document.getElementById("sim-v-child").style.bottom = "calc(" + barPct(hi) + "% + 8px)";
  }

  /* ── 성장도표 비교 (2017 소아청소년 성장도표, 만 3~17세) ── */
  var SD = window.KR_HEIGHT_SD;
  var Z_LINES = [-3, -2, -1, 0, 1, 2, 3];
  var LAST_MONTH = 227;
  var birthIn = document.getElementById("sim-birth");
  var heightIn = document.getElementById("sim-height");
  var childMsg = document.getElementById("sim-child-msg");
  var growthBody = document.getElementById("sim-growth-body");
  var growthEmpty = document.getElementById("sim-growth-empty");
  birthIn.max = birthInput.max;

  /* 개월 수(소수)에서 표준편차 일곱 줄의 키를 구한다 */
  function sdRow(sex, months) {
    var t = SD[sex];
    var x = Math.max(SD.start, Math.min(LAST_MONTH, months)) - SD.start;
    var i = Math.min(t.length - 2, Math.floor(x));
    var f = x - i;
    return t[i].map(function (v, k) {
      return v + (t[i + 1][k] - v) * f;
    });
  }
  /* 키 → z점수. 표준편차 줄 사이는 직선으로 잇고, ±3SD 밖은 바깥 구간의 기울기를 이어 쓴다 */
  function zOf(sex, months, cm) {
    var r = sdRow(sex, months);
    var k = 0;
    while (k < 5 && cm > r[k + 1]) k++;
    return Z_LINES[k] + (cm - r[k]) / (r[k + 1] - r[k]);
  }
  function heightAt(sex, months, z) {
    var r = sdRow(sex, months);
    var k = Math.max(0, Math.min(5, Math.floor(z + 3)));
    return r[k] + (z - Z_LINES[k]) * (r[k + 1] - r[k]);
  }
  /* 표준정규분포 누적확률 (Abramowitz–Stegun 근사) */
  function normCdf(z) {
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989423 * Math.exp((-z * z) / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  function ageMonths(birth) {
    var m = (todayLocal.getFullYear() - birth.getFullYear()) * 12 + (todayLocal.getMonth() - birth.getMonth());
    var anchor = addMonths(birth, m);
    if (anchor > todayLocal) {
      m -= 1;
      anchor = addMonths(birth, m);
    }
    var next = addMonths(birth, m + 1);
    return m + (todayLocal - anchor) / (next - anchor);
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (k) {
      n.setAttribute(k, attrs[k]);
    });
    if (text != null) n.textContent = text;
    return n;
  }

  function drawCurve(sex, months, cm, z, adult, gene) {
    var svg = document.getElementById("sim-svg");
    var title = svg.querySelector("title");
    while (svg.lastChild && svg.lastChild !== title) svg.removeChild(svg.lastChild);
    var X0 = 48, X1 = 588, Y0 = 20, Y1 = 330;
    var yMin = 80, yMax = sex === "m" ? 200 : 185;
    var x = function (m) { return X0 + ((m - 36) / (LAST_MONTH - 36)) * (X1 - X0); };
    var y = function (v) { return Y1 - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * (Y1 - Y0); };
    var line = function (zz, from) {
      var d = "";
      for (var m = from || 36; m <= LAST_MONTH; m += 3) d += (d ? "L" : "M") + x(m).toFixed(1) + " " + y(heightAt(sex, m, zz)).toFixed(1);
      return d + "L" + x(LAST_MONTH).toFixed(1) + " " + y(heightAt(sex, LAST_MONTH, zz)).toFixed(1);
    };

    for (var v = yMin; v <= yMax; v += 20) {
      svg.appendChild(svgEl("line", { x1: X0, x2: X1, y1: y(v), y2: y(v), class: "g-grid" }));
      svg.appendChild(svgEl("text", { x: X0 - 8, y: y(v) + 5, class: "g-tick", "text-anchor": "end" }, v));
    }
    for (var a = 3; a <= 18; a += 3) {
      var mx = a === 18 ? LAST_MONTH : a * 12;
      svg.appendChild(svgEl("text", { x: x(mx), y: Y1 + 24, class: "g-tick", "text-anchor": "middle" }, a + "세"));
    }
    var lo = line(-1.881), hi = "";
    for (var m2 = LAST_MONTH; m2 >= 36; m2 -= 3) hi += "L" + x(m2).toFixed(1) + " " + y(heightAt(sex, m2, 1.881)).toFixed(1);
    hi += "L" + x(36).toFixed(1) + " " + y(heightAt(sex, 36, 1.881)).toFixed(1);
    svg.appendChild(svgEl("path", { d: lo + hi + "Z", class: "g-band" }));
    svg.appendChild(svgEl("path", { d: line(0), class: "g-mid" }));

    /* 유전적 예측 키: 만 18세 자리에 범위와 점 */
    var gx = x(LAST_MONTH) + 18;
    svg.appendChild(svgEl("line", { x1: gx, x2: gx, y1: y(gene + SIM_SPREAD), y2: y(gene - SIM_SPREAD), class: "g-gene-range" }));
    svg.appendChild(svgEl("rect", { x: gx - 6, y: y(gene) - 6, width: 12, height: 12, rx: 2, transform: "rotate(45 " + gx + " " + y(gene) + ")", class: "g-gene" }));

    /* 아이의 곡선: 지금부터 만 18세까지 같은 z점수로 */
    var cz = Math.max(-3.5, Math.min(3.5, z));
    var path = "M" + x(months).toFixed(1) + " " + y(cm).toFixed(1);
    for (var m3 = Math.ceil(months / 3) * 3; m3 <= LAST_MONTH; m3 += 3) {
      if (m3 > months) path += "L" + x(m3).toFixed(1) + " " + y(heightAt(sex, m3, cz)).toFixed(1);
    }
    path += "L" + x(LAST_MONTH).toFixed(1) + " " + y(adult).toFixed(1);
    svg.appendChild(svgEl("path", { d: path, class: "g-child" }));
    svg.appendChild(svgEl("circle", { cx: x(LAST_MONTH), cy: y(adult), r: 5, class: "g-end" }));
    svg.appendChild(svgEl("circle", { cx: x(months), cy: y(cm), r: 8, class: "g-dot" }));
    /* 곡선이 오른쪽 위로 올라가므로 라벨은 왼쪽 위에, 자리가 없으면 오른쪽 아래에 둔다 */
    var roomLeft = x(months) > 170;
    svg.appendChild(svgEl("text", { x: x(months) + (roomLeft ? -12 : 14), y: y(cm) + (roomLeft ? -14 : 26), class: "g-label", "text-anchor": roomLeft ? "end" : "start" }, "지금 " + one(cm) + "cm"));

    var years = Math.floor(months / 12);
    title.textContent =
      "성장 곡선 그래프. 만 " + years + "세 " + Math.floor(months - years * 12) + "개월, 키 " + one(cm) +
      "cm. 지금의 순서를 유지하면 만 18세에 약 " + one(adult) + "cm, 유전적 예측 키는 약 " + one(gene) + "cm.";
  }

  function renderGrowth() {
    var bv = birthIn.value;
    var hv = heightIn.value;
    var show = function (on) {
      growthBody.hidden = !on;
      growthEmpty.hidden = on;
    };
    childMsg.textContent = "";
    if (!bv && !hv) return show(false);
    var bm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bv);
    var cm = parseFloat(hv);
    if (!bm || !isFinite(cm)) return show(false);
    var birth = new Date(Number(bm[1]), Number(bm[2]) - 1, Number(bm[3]));
    var months = ageMonths(birth);
    if (birth > todayLocal || months < 36 || months >= 216) {
      childMsg.textContent = "성장도표 비교는 만 3세부터 17세까지 할 수 있습니다. 생년월일을 확인해 주세요.";
      return show(false);
    }
    if (cm < 70 || cm > 200) {
      childMsg.textContent = "지금 키는 70~200cm 사이 숫자로 넣어 주세요.";
      return show(false);
    }
    var father = parseFloat(simFields[0].num.value);
    var mother = parseFloat(simFields[1].num.value);
    if (!simValid(father) || !simValid(mother)) return show(false);

    var sex = simForm.querySelector('input[name="sim-sex"]:checked').value;
    var z = zOf(sex, months, cm);
    var zc = Math.max(-3.5, Math.min(3.5, z));
    var adult = heightAt(sex, LAST_MONTH, zc);
    var gene = (father + mother) / 2 + (sex === "m" ? 6.5 : -6.5);
    var pct = normCdf(z) * 100;
    var rank = pct < 1 ? "1번째보다 앞" : pct > 99 ? "99번째보다 뒤" : Math.round(pct) + "";

    var pctEl = document.getElementById("sim-pct");
    pctEl.textContent = pct < 1 ? "1" : pct > 99 ? "99" : rank;
    pctEl.nextElementSibling.textContent = pct < 1 ? "번째보다 작음" : pct > 99 ? "번째보다 큼" : "번째";
    document.getElementById("sim-adult").textContent = one(adult);

    var flag = document.getElementById("sim-flag");
    if (Math.round(pct) < 3) {
      flag.textContent = "같은 나이·성별 100명 중 3번째보다 작은 키입니다. 성장도표에서는 이 범위를 저신장으로 보고 진료를 권합니다.";
      flag.hidden = false;
    } else if (Math.abs(z) > 3.5) {
      flag.textContent = "성장도표 범위를 많이 벗어난 값입니다. 생년월일과 키를 다시 확인해 주세요.";
      flag.hidden = false;
    } else {
      flag.hidden = true;
    }
    show(true);
    drawCurve(sex, months, cm, z, adult, gene);
  }

  if (SD) {
    birthIn.addEventListener("input", renderGrowth);
    birthIn.addEventListener("change", renderGrowth);
    heightIn.addEventListener("input", renderGrowth);
    simForm.addEventListener("change", renderGrowth);
    simForm.addEventListener("input", renderGrowth);
  }

  simFields.forEach(function (f) {
    f.range.addEventListener("input", function () {
      f.num.value = f.range.value;
      renderSim();
    });
    f.num.addEventListener("input", function () {
      var n = parseFloat(f.num.value);
      if (simValid(n)) f.range.value = n;
      renderSim();
    });
  });
  simForm.addEventListener("change", renderSim);
  simForm.addEventListener("submit", function (e) {
    e.preventDefault();
  });
  renderSim();

  /* 다른 구역에서 특정 탭을 열어 주는 링크 */
  document.addEventListener("click", function (e) {
    var link = e.target.closest("[data-open-tab]");
    if (!link) return;
    var tab = document.getElementById(link.getAttribute("data-open-tab"));
    if (tab) selectTab(tab, false);
  });
})();
