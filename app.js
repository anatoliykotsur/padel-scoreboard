(function () {
  "use strict";

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return DAY_NAMES[dt.getUTCDay()] + ", " + MONTH_NAMES[dt.getUTCMonth()] + " " + dt.getUTCDate();
  }

  function setsWon(match) {
    let a = 0, b = 0;
    for (const s of match.sets) {
      if (s.a > s.b) a++;
      else if (s.b > s.a) b++;
    }
    return { a, b };
  }

  function matchWinner(match) {
    if (match.status !== "completed" || !match.sets.length) return null;
    const { a, b } = setsWon(match);
    if (a > b) return "A";
    if (b > a) return "B";
    return "tie";
  }

  function nextUpMatchId(matches) {
    const upcoming = matches.filter((m) => m.status !== "completed");
    if (!upcoming.length) return null;
    upcoming.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
    return upcoming[0].id;
  }

  function pluralize(n, single, plural) {
    return n + " " + (n === 1 ? single : plural);
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === "class") node.className = props[k];
        else if (k === "style") node.setAttribute("style", props[k]);
        else if (k === "html") node.innerHTML = props[k];
        else node.setAttribute(k, props[k]);
      }
    }
    if (children) {
      for (const c of children) {
        if (c == null) continue;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function renderHeader(data) {
    document.getElementById("venue").textContent = data.venue || "";
    document.getElementById("header-team-a").textContent = data.teams.A.name;
    document.getElementById("header-team-b").textContent = data.teams.B.name;
    document.getElementById("series-label-a").textContent = data.teams.A.name;
    document.getElementById("series-label-b").textContent = data.teams.B.name;
    document.documentElement.style.setProperty("--team-a", data.teams.A.color);
    document.documentElement.style.setProperty("--team-b", data.teams.B.color);
  }

  function renderSeries(data) {
    let aWins = 0, bWins = 0, played = 0;
    for (const m of data.matches) {
      if (m.status === "completed") {
        played++;
        const w = matchWinner(m);
        if (w === "A") aWins++;
        else if (w === "B") bWins++;
        else if (w === "tie") { aWins += 0.5; bWins += 0.5; }
      }
    }
    const fmtScore = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
    document.getElementById("series-score-a").textContent = fmtScore(aWins);
    document.getElementById("series-score-b").textContent = fmtScore(bWins);

    const total = data.matches.length;
    const remaining = total - played;
    const meta = document.getElementById("series-meta");
    if (remaining === 0) {
      meta.textContent = pluralize(total, "match", "matches") + " played · season complete";
    } else if (played === 0) {
      meta.textContent = pluralize(total, "match", "matches") + " scheduled · season starts soon";
    } else {
      meta.textContent = pluralize(played, "match", "matches") + " played · " + remaining + " remaining";
    }
  }

  function renderSetColumn(index, set, teams) {
    const tied = set.a === set.b;
    const aOnTop = tied || set.a > set.b;
    const top = aOnTop
      ? { team: "A", value: set.a, color: teams.A.color }
      : { team: "B", value: set.b, color: teams.B.color };
    const bot = aOnTop
      ? { team: "B", value: set.b, color: teams.B.color }
      : { team: "A", value: set.a, color: teams.A.color };

    const cell = (entry, state) => {
      let title;
      if (state === "tied") title = "Set " + (index + 1) + " tied";
      else if (state === "winner") title = teams[entry.team].name + " won set " + (index + 1);
      else title = teams[entry.team].name + " lost set " + (index + 1);
      return el("div", {
        class: "set-cell " + state,
        style: "--cell-color: " + entry.color + ";",
        title: title,
      }, [
        el("span", { class: "swatch" }),
        el("span", { class: "num" }, [String(entry.value)]),
      ]);
    };

    return el("div", { class: "set-col" + (tied ? " tied" : "") }, [
      el("div", { class: "set-label" }, ["Set " + (index + 1) + (tied ? " · tie" : "")]),
      cell(top, tied ? "tied" : "winner"),
      cell(bot, tied ? "tied" : "loser"),
    ]);
  }

  function renderMatch(match, data, nextId) {
    const isNext = match.id === nextId && match.status !== "completed";
    const winner = matchWinner(match);

    const card = el("article", {
      class: "match" + (match.status === "completed" ? " completed" : " upcoming") + (isNext ? " next-up" : ""),
    });

    let pillClass, pillText;
    if (match.status === "completed") {
      if (winner === "tie") { pillClass = "pill tied"; pillText = "Tied"; }
      else { pillClass = "pill completed"; pillText = "Completed"; }
    } else if (isNext) {
      pillClass = "pill next-up"; pillText = "Next up";
    } else {
      pillClass = "pill"; pillText = "Upcoming";
    }

    const head = el("div", { class: "match-head" }, [
      el("div", { class: "match-meta" }, [
        el("div", { class: "match-num" }, ["Match " + match.id]),
        el("div", { class: "match-when" }, [formatDate(match.date) + " · " + match.time]),
        el("div", { class: "match-where" }, ["Court " + match.court]),
      ]),
      el("div", { class: pillClass }, [
        el("span", { class: "dot" }),
        pillText,
      ]),
    ]);
    card.appendChild(head);

    if (match.status === "completed" && match.sets.length) {
      const grid = el("div", { class: "score-grid" });
      match.sets.forEach((s, i) => grid.appendChild(renderSetColumn(i, s, data.teams)));
      card.appendChild(grid);

      if (winner === "tie") {
        const summary = el("div", { class: "match-summary tied" }, [
          el("span", { class: "dot" }),
          el("span", { class: "winner-name" }, ["Tied 1–1"]),
          el("span", {}, ["match split, no winner"]),
        ]);
        card.appendChild(summary);
      } else if (winner) {
        const wTeam = data.teams[winner];
        const lTeam = data.teams[winner === "A" ? "B" : "A"];
        const summary = el("div", {
          class: "match-summary",
          style: "--summary-color: " + wTeam.color + ";",
        }, [
          el("span", { class: "dot" }),
          el("span", { class: "winner-name" }, [wTeam.name]),
          el("span", {}, ["def. " + lTeam.name]),
        ]);
        card.appendChild(summary);
      }
    } else {
      const empty = el("div", { class: "score-grid empty" }, [
        match.status === "scheduled" ? "Not played yet" : "—",
      ]);
      card.appendChild(empty);
    }

    return card;
  }

  function renderMatches(data) {
    const container = document.getElementById("matches");
    container.innerHTML = "";
    const sorted = data.matches.slice().sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
    const nextId = nextUpMatchId(sorted);
    for (const m of sorted) {
      container.appendChild(renderMatch(m, data, nextId));
    }
  }

  function renderUpdated(data) {
    const node = document.getElementById("updated");
    if (!data.lastUpdated) return;
    const dt = new Date(data.lastUpdated);
    if (isNaN(dt.getTime())) return;
    const opts = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    node.textContent = "Updated " + dt.toLocaleString(undefined, opts);
  }

  function render(data) {
    renderHeader(data);
    renderSeries(data);
    renderMatches(data);
    renderUpdated(data);
  }

  async function load() {
    try {
      const res = await fetch("matches.json?_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      render(data);
    } catch (err) {
      const container = document.getElementById("matches");
      container.innerHTML = "";
      container.appendChild(
        el("div", { class: "match" }, [
          el("div", { class: "match-meta" }, [
            el("div", { class: "match-num" }, ["Error"]),
            el("div", { class: "match-when" }, ["Failed to load matches.json"]),
            el("div", { class: "match-where" }, [String(err && err.message ? err.message : err)]),
          ]),
        ])
      );
    }
  }

  load();
})();
