/* 송도키즈 소아청소년과의원 — 화면 동작
   모든 페이지가 이 파일 하나를 쓴다. 기능마다 해당 요소가 있을 때만 움직인다. */
(function () {
  "use strict";

  /* 진료 시간(분 단위). 바뀌면 여기와 build.py의 HOURS_ROWS를 함께 고친다. */
  var HOURS = {
    weekday: { open: 8 * 60 + 30, close: 18 * 60 + 30, lunch: [13 * 60, 14 * 60] },
    saturday: { open: 9 * 60, close: 13 * 60 + 30, lunch: null },
  };
  /* 날짜가 고정된 공휴일(월-일). 설·추석·대체공휴일은 해마다 달라 넣지 않았다. */
  var FIXED_HOLIDAYS = ["1-1", "3-1", "5-5", "6-6", "8-15", "10-3", "10-9", "12-25"];

  function $(id) {
    return document.getElementById(id);
  }

  /* ── 옛 한 페이지 주소(#fees 등)로 들어오면 새 페이지로 보낸다 ── */
  var LEGACY = {
    "#clinics": "clinics/",
    "#fees": "fees/",
    "#location": "location/",
    "#growth-sim": "growth-calculator/",
    "#devices": "equipment/",
    "#greeting": "about/#greeting",
    "#promise": "about/#promise",
    "#space": "about/#space",
  };
  if (document.querySelector(".hero") && LEGACY[location.hash]) {
    location.replace(LEGACY[location.hash]);
    return;
  }

  /* ── 머리글 메뉴 (좁은 화면) ── */
  var header = document.querySelector(".site-header");
  var nav = $("site-nav");
  var toggle = document.querySelector(".nav-toggle");

  if (nav && toggle) {
    var setNav = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
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
    /* 초점이 메뉴 밖으로 나가면 닫는다 */
    header.addEventListener("focusout", function (e) {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (e.relatedTarget && !header.contains(e.relatedTarget)) setNav(false);
    });
    document.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !header.contains(e.target)) setNav(false);
    });
  }

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
      return {
        state: "closed",
        label: "오늘은 휴진입니다",
        short: "오늘은 휴진입니다 (일요일)",
        detail: "일요일과 공휴일은 쉽니다. 월요일 오전 8시 30분에 진료를 시작합니다.",
      };
    }
    if (FIXED_HOLIDAYS.indexOf(now.md) !== -1) {
      return { state: "closed", label: "오늘은 휴진입니다", short: "오늘은 휴진입니다 (공휴일)", detail: "공휴일은 쉽니다." };
    }
    var h = now.dow === 6 ? HOURS.saturday : HOURS.weekday;
    var t = now.minutes;
    if (t < h.open) {
      return {
        state: "closed",
        label: "진료 전입니다",
        short: "진료 전 · 오늘 " + clock(h.open) + "에 시작",
        detail: "오늘 " + clock(h.open) + "에 진료를 시작합니다. " + caution,
      };
    }
    if (t >= h.close) {
      return { state: "closed", label: "오늘 진료가 끝났습니다", short: "오늘 진료가 끝났습니다", detail: caution };
    }
    if (h.lunch && t >= h.lunch[0] && t < h.lunch[1]) {
      return {
        state: "lunch",
        label: "점심시간입니다",
        short: "점심시간 · " + clock(h.lunch[1]) + "에 오후 진료 시작",
        detail: clock(h.lunch[1]) + "에 오후 진료를 시작합니다.",
      };
    }
    return {
      state: "open",
      label: "지금 진료 중입니다",
      short: "지금 진료 중 · 오늘 " + clock(h.close) + "까지",
      detail: "오늘은 " + clock(h.close) + "까지 진료합니다. " + caution,
    };
  }

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  var statusEls = document.querySelectorAll("[data-status]");
  function renderStatus() {
    var s = todayStatus();
    Array.prototype.forEach.call(statusEls, function (box) {
      box.dataset.state = s.state;
      setText(box.querySelector("[data-status-text]"), s.short);
      setText(box.querySelector("[data-status-label]"), s.label);
      setText(box.querySelector("[data-status-detail]"), s.detail);
    });
  }
  if (statusEls.length) {
    try {
      renderStatus();
      setInterval(renderStatus, 60 * 1000);
    } catch (err) {
      /* 시간대를 읽지 못하는 브라우저에서는 기본 안내문을 그대로 둔다. */
    }
  }

  /* ── 날짜 도구 ── */
  var t0 = new Date();
  var todayLocal = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  var todayIso = [t0.getFullYear(), String(t0.getMonth() + 1).padStart(2, "0"), String(t0.getDate()).padStart(2, "0")].join("-");

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
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── 영유아 건강검진 시기 ── */
  var checkupForm = document.querySelector("#checkup-calc form");
  if (checkupForm) {
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
    var checkupOut = $("checkup-out");
    var birthInput = $("c-birth");
    var birthError = $("c-birth-error");
    birthInput.max = todayIso;

    var checkupRanges = function (birth) {
      return ROUNDS.map(function (r) {
        if (r.days) return { name: r.name, from: addDays(birth, r.days[0]), to: addDays(birth, r.days[1]) };
        /* "생후 4~6개월"은 만 4개월이 되는 날부터 만 7개월이 되기 전날까지 */
        return { name: r.name, from: addMonths(birth, r.months[0]), to: addDays(addMonths(birth, r.months[1] + 1), -1) };
      });
    };
    var fail = function (msg) {
      birthError.textContent = msg;
      birthError.hidden = false;
      birthInput.setAttribute("aria-invalid", "true");
      checkupOut.textContent = "";
      birthInput.focus();
    };

    birthInput.addEventListener("input", function () {
      if (birthInput.getAttribute("aria-invalid") === "true" && birthInput.value) {
        birthError.hidden = true;
        birthError.textContent = "";
        birthInput.removeAttribute("aria-invalid");
      }
    });

    checkupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var birth = parseDate(birthInput.value);
      if (!birth) return fail("생년월일을 넣어 주세요. 예: 2024년 3월 15일");
      if (birth > todayLocal) return fail("생년월일이 오늘보다 뒤입니다. 날짜를 다시 확인해 주세요.");
      birthError.hidden = true;
      birthError.textContent = "";
      birthInput.removeAttribute("aria-invalid");
      checkupOut.textContent = "";

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
      list.setAttribute("role", "list");
      ranges.forEach(function (r) {
        var li = el("li", r.status === "now" ? "is-now" : r.status === "past" ? "is-past" : "");
        li.appendChild(el("span", "r-name", r.name));
        li.appendChild(el("span", "r-date", fmt(r.from) + " ~ " + fmt(r.to)));
        li.appendChild(el("span", "r-tag", r.status === "now" ? "지금 가능" : r.status === "past" ? "지남" : "예정"));
        list.appendChild(li);
      });
      checkupOut.appendChild(list);
    });
  }

  /* ── 주소 복사 ── */
  var copyBtn = $("copy-addr");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = copyBtn.getAttribute("data-copy");
      var msg = $("copy-msg");
      var done = function (ok) {
        msg.textContent = ok ? "주소를 복사했습니다." : "복사하지 못했습니다. 주소를 길게 눌러 복사해 주세요.";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            done(true);
          },
          function () {
            done(false);
          }
        );
      } else {
        done(false);
      }
    });
  }

  /* ── 키 예측 시뮬레이터 (부모 키 기반 유전적 예측 키) ── */
  var simForm = $("sim-form");
  if (!simForm) return;

  var SIM_MIN = 140;
  var SIM_MAX = 210;
  var SIM_SPREAD = 8.5; /* 유전적 예측 키의 통상 범위(±8.5cm) */
  var simMsg = $("sim-msg");
  var simResult = $("sim-result");
  var simLive = $("sim-live");
  var simFields = [
    { key: "father", name: "아빠 키" },
    { key: "mother", name: "엄마 키" },
  ].map(function (f) {
    f.num = $("sim-" + f.key);
    f.range = $("sim-" + f.key + "-range");
    return f;
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
  function sex() {
    return simForm.querySelector('input[name="sim-sex"]:checked').value;
  }

  /* 화면낭독기에는 값이 멈춘 뒤 한 문장만 알린다 */
  var liveTimer = null;
  function announce(text) {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      setText(simLive, text);
    }, 800);
  }

  /* 틀린 칸을 찾아 알린다. 입력하는 도중에는 알리지 않고(quiet), 칸을 떠날 때 알린다. */
  function checkParents(quiet) {
    var bad = simFields.filter(function (f) {
      return !simValid(parseFloat(f.num.value));
    });
    simFields.forEach(function (f) {
      if (bad.indexOf(f) === -1) f.num.removeAttribute("aria-invalid");
      else if (!quiet) f.num.setAttribute("aria-invalid", "true");
    });
    if (!bad.length) simMsg.textContent = "";
    else if (!quiet) {
      simMsg.textContent =
        bad
          .map(function (f) {
            return f.name;
          })
          .join("와 ") +
        "는 " + SIM_MIN + "~" + SIM_MAX + "cm 사이 숫자로 넣어 주세요.";
    }
    simResult.classList.toggle("is-stale", bad.length > 0);
    return !bad.length;
  }

  function renderSim(quiet) {
    if (!checkParents(quiet)) return;
    var father = parseFloat(simFields[0].num.value);
    var mother = parseFloat(simFields[1].num.value);
    var boy = sex() === "m";
    var child = (father + mother) / 2 + (boy ? 6.5 : -6.5);
    var lo = child - SIM_SPREAD;
    var hi = child + SIM_SPREAD;

    $("sim-out").textContent = one(child);
    $("sim-rangeline").textContent =
      "같은 부모에게서도 아이마다 차이가 있어, 보통 " + one(lo) + "~" + one(hi) + "cm 범위로 봅니다.";
    $("sim-formula").textContent =
      "(" + trim(father) + " + " + trim(mother) + ") ÷ 2 " + (boy ? "+" : "−") + " 6.5";

    $("sim-v-father").textContent = trim(father);
    $("sim-v-mother").textContent = trim(mother);
    $("sim-v-child").textContent = one(child);
    $("sim-b-father").style.height = barPct(father) + "%";
    $("sim-b-mother").style.height = barPct(mother) + "%";
    /* 아이 막대는 예측 키까지, 그 위아래로 걸친 띠가 통상 범위다 */
    $("sim-b-child").style.height = barPct(child) + "%";
    var band = $("sim-band");
    band.style.height = barPct(hi) - barPct(lo) + "%";
    band.style.bottom = barPct(lo) + "%";
    $("sim-v-child").style.bottom = "calc(" + barPct(hi) + "% + 8px)";

    simFields.forEach(function (f) {
      f.range.setAttribute("aria-valuetext", trim(parseFloat(f.num.value)) + "cm");
    });
    announce("유전적 예측 키 약 " + one(child) + "cm, 보통 " + one(lo) + "에서 " + one(hi) + "cm 범위입니다.");
  }

  /* ── 성장도표 비교 (2017 소아청소년 성장도표, 만 3~17세) ── */
  var SD = window.KR_HEIGHT_SD;
  var Z_LINES = [-3, -2, -1, 0, 1, 2, 3];
  var LAST_MONTH = 227;
  var birthIn = $("sim-birth");
  var heightIn = $("sim-height");
  var childMsg = $("sim-child-msg");
  var growthBody = $("sim-growth-body");
  var growthEmpty = $("sim-growth-empty");
  birthIn.max = todayIso;

  /* 개월 수(소수)에서 표준편차 일곱 줄의 키를 구한다 */
  function sdRow(s, months) {
    var t = SD[s];
    var x = Math.max(SD.start, Math.min(LAST_MONTH, months)) - SD.start;
    var i = Math.min(t.length - 2, Math.floor(x));
    var f = x - i;
    return t[i].map(function (v, k) {
      return v + (t[i + 1][k] - v) * f;
    });
  }
  /* 키 → z점수. 표준편차 줄 사이는 직선으로 잇고, ±3SD 밖은 바깥 구간의 기울기를 이어 쓴다 */
  function zOf(s, months, cm) {
    var r = sdRow(s, months);
    var k = 0;
    while (k < 5 && cm > r[k + 1]) k++;
    return Z_LINES[k] + (cm - r[k]) / (r[k + 1] - r[k]);
  }
  function heightAt(s, months, z) {
    var r = sdRow(s, months);
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

  function drawCurve(s, months, cm, z, adult, gene) {
    var svg = $("sim-svg");
    var title = svg.querySelector("title");
    while (svg.lastChild && svg.lastChild !== title) svg.removeChild(svg.lastChild);
    var X0 = 48, X1 = 588, Y0 = 20, Y1 = 330;
    var yMin = 80, yMax = s === "m" ? 200 : 185;
    var x = function (m) { return X0 + ((m - 36) / (LAST_MONTH - 36)) * (X1 - X0); };
    var y = function (v) { return Y1 - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * (Y1 - Y0); };
    var line = function (zz, from) {
      var d = "";
      for (var m = from || 36; m <= LAST_MONTH; m += 3) d += (d ? "L" : "M") + x(m).toFixed(1) + " " + y(heightAt(s, m, zz)).toFixed(1);
      return d + "L" + x(LAST_MONTH).toFixed(1) + " " + y(heightAt(s, LAST_MONTH, zz)).toFixed(1);
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
    for (var m2 = LAST_MONTH; m2 >= 36; m2 -= 3) hi += "L" + x(m2).toFixed(1) + " " + y(heightAt(s, m2, 1.881)).toFixed(1);
    hi += "L" + x(36).toFixed(1) + " " + y(heightAt(s, 36, 1.881)).toFixed(1);
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
      if (m3 > months) path += "L" + x(m3).toFixed(1) + " " + y(heightAt(s, m3, cz)).toFixed(1);
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

  function renderGrowth(quiet) {
    var bv = birthIn.value;
    var hv = heightIn.value;
    var show = function (on) {
      growthBody.hidden = !on;
      growthEmpty.hidden = on;
    };
    var warn = function (input, msg) {
      if (!quiet) {
        childMsg.textContent = msg;
        input.setAttribute("aria-invalid", "true");
      }
      return show(false);
    };
    if (quiet !== true || (!bv && !hv)) {
      childMsg.textContent = "";
      birthIn.removeAttribute("aria-invalid");
      heightIn.removeAttribute("aria-invalid");
    }
    if (!bv && !hv) return show(false);
    var birth = parseDate(bv);
    var cm = parseFloat(hv);
    if (!birth || !isFinite(cm)) return show(false);
    var months = ageMonths(birth);
    if (birth > todayLocal || months < 36 || months >= 216) {
      return warn(birthIn, "성장도표 비교는 만 3세부터 17세까지 할 수 있습니다. 생년월일을 확인해 주세요.");
    }
    if (cm < 70 || cm > 200) return warn(heightIn, "지금 키는 70~200cm 사이 숫자로 넣어 주세요.");
    var father = parseFloat(simFields[0].num.value);
    var mother = parseFloat(simFields[1].num.value);
    if (!simValid(father) || !simValid(mother)) return show(false);
    childMsg.textContent = "";
    birthIn.removeAttribute("aria-invalid");
    heightIn.removeAttribute("aria-invalid");

    var s = sex();
    var z = zOf(s, months, cm);
    var zc = Math.max(-3.5, Math.min(3.5, z));
    var adult = heightAt(s, LAST_MONTH, zc);
    var gene = (father + mother) / 2 + (s === "m" ? 6.5 : -6.5);
    var pct = normCdf(z) * 100;
    var rank = pct < 1 ? "1" : pct > 99 ? "99" : Math.round(pct) + "";
    var unit = pct < 1 ? "번째보다 작음" : pct > 99 ? "번째보다 큼" : "번째";

    var pctEl = $("sim-pct");
    pctEl.textContent = rank;
    pctEl.nextElementSibling.textContent = unit;
    $("sim-adult").textContent = one(adult);

    var flag = $("sim-flag");
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
    drawCurve(s, months, cm, z, adult, gene);
    announce(
      "성장도표 비교: 또래 100명 중 " + rank + unit + ". 이 순서를 유지하면 만 18세에 약 " + one(adult) + "cm입니다."
    );
  }

  simFields.forEach(function (f) {
    f.range.addEventListener("input", function () {
      f.num.value = f.range.value;
      renderSim(true);
      if (SD) renderGrowth(true);
    });
    f.num.addEventListener("input", function () {
      var n = parseFloat(f.num.value);
      if (simValid(n)) f.range.value = n;
      renderSim(true);
      if (SD) renderGrowth(true);
    });
    f.num.addEventListener("change", function () {
      renderSim(false);
    });
  });
  Array.prototype.forEach.call(simForm.querySelectorAll('input[name="sim-sex"]'), function (r) {
    r.addEventListener("change", function () {
      renderSim(false);
      if (SD) renderGrowth(true);
    });
  });
  if (SD) {
    [birthIn, heightIn].forEach(function (input) {
      input.addEventListener("input", function () {
        renderGrowth(true);
      });
      input.addEventListener("change", function () {
        renderGrowth(false);
      });
    });
  }
  simForm.addEventListener("submit", function (e) {
    e.preventDefault();
  });
  renderSim(true);
  clearTimeout(liveTimer); /* 처음 그릴 때는 알리지 않는다 */
})();
