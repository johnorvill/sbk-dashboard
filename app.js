const dataset = window.__SBK_DATA__;

if (!dataset) {
  throw new Error("Dataset saknas. Kör tools/convert_excel.py först.");
}

const breedMetrics = [
  { key: "HD-Rtg %", label: "HD-röntgade", type: "percent" },
  { key: "ED-Rtg %", label: "ED-röntgade", type: "percent" },
  { key: "MH %", label: "MH", type: "percent" },
  { key: "MT %", label: "MT", type: "percent" },
  { key: "Ext/Utst %", label: "Exteriör/Utställning", type: "percent" },
  { key: "Andel Bruks", label: "Bruksandel", type: "percent" },
];

const kennelSortOptions = [
  { key: "Reggade 2019 - 2023", label: "Registrerade" },
  { key: "MH %", label: "MH %" },
  { key: "HD Rtg %", label: "HD-röntgen %" },
  { key: "HD-Fel %", label: "HD-fel %" },
  { key: "ED Rtg %", label: "ED-röntgen %" },
  { key: "ED-Fel %", label: "ED-fel %" },
  { key: "MT %", label: "MT %" },
  { key: "MT GK %", label: "MT GK %" },
  { key: "Ext/Utst %", label: "Ext/Utst %" },
  { key: "Andel Bruks", label: "Andel bruks" },
  { key: "Medel av Skott", label: "Skott" },
  { key: "Inavel", label: "Låg inavel", invert: true },
];

const tableColumns = [
  { key: "Kennel", label: "Kennel", type: "text" },
  { key: "Ras", label: "Ras", type: "text" },
  { key: "Reggade 2019 - 2023", label: "Registrerade", type: "number" },
  { key: "MH %", label: "MH %", type: "percent" },
  { key: "HD-Fel %", label: "HD-Fel %", type: "percent" },
  { key: "ED-Fel %", label: "ED-Fel %", type: "percent" },
  { key: "MT %", label: "MT %", type: "percent" },
  { key: "Inavel", label: "Inavel", type: "decimal" },
];

const scatterMetrics = [
  { key: "Reggade 2019 - 2023", label: "Registrerade", type: "number" },
  { key: "MH %", label: "MH %", type: "percent" },
  { key: "HD Rtg %", label: "HD-röntgen %", type: "percent" },
  { key: "HD-Fel %", label: "HD-fel %", type: "percent" },
  { key: "ED Rtg %", label: "ED-röntgen %", type: "percent" },
  { key: "ED-Fel %", label: "ED-fel %", type: "percent" },
  { key: "MT %", label: "MT %", type: "percent" },
  { key: "Ext/Utst %", label: "Ext/Utst %", type: "percent" },
  { key: "Andel Bruks", label: "Andel Bruks", type: "percent" },
  { key: "Inavel", label: "Inavel", type: "decimal" },
];

const state = {
  breed: "Alla raser",
  kennelQuery: "",
  kennelExactMatch: false,
  sortKey: "Reggade 2019 - 2023",
  scatterXKey: "Reggade 2019 - 2023",
  scatterYKey: "MH %",
  tableSortKey: "Reggade 2019 - 2023",
  tableSortDirection: "desc",
  minRegistered: 0,
  selectedKennel: null,
};

const elements = {
  metaBlock: document.querySelector("#metaBlock"),
  breedSelect: document.querySelector("#breedSelect"),
  kennelSelect: document.querySelector("#kennelSelect"),
  kennelOptions: document.querySelector("#kennelOptions"),
  sortMetric: document.querySelector("#sortMetric"),
  scatterXMetric: document.querySelector("#scatterXMetric"),
  scatterYMetric: document.querySelector("#scatterYMetric"),
  minRegistered: document.querySelector("#minRegistered"),
  minRegisteredValue: document.querySelector("#minRegisteredValue"),
  resetFilters: document.querySelector("#resetFilters"),
  summaryCards: document.querySelector("#summaryCards"),
  breedOverviewTitle: document.querySelector("#breedOverviewTitle"),
  breedSpotlight: document.querySelector("#breedSpotlight"),
  breedMetricBars: document.querySelector("#breedMetricBars"),
  topBreedsList: document.querySelector("#topBreedsList"),
  scatterWrapper: document.querySelector("#scatterWrapper"),
  kennelDetail: document.querySelector("#kennelDetail"),
  kennelTableHead: document.querySelector("#kennelTableHead"),
  kennelTableBody: document.querySelector("#kennelTableBody"),
  kennelTableTitle: document.querySelector("#kennelTableTitle"),
};

const breeds = [...dataset.breeds]
  .filter((row) => row["Ras"] && row["Ras"] !== "Totalt")
  .sort((a, b) => toNumber(b["Reg 2019 - 2023"]) - toNumber(a["Reg 2019 - 2023"]));
const kennels = dataset.kennels.filter((row) => row["Kennel"] && row["Ras"]);
const breedLookup = new Map(breeds.map((row) => [row["Ras"], row]));

function toNumber(value) {
  return Number.isFinite(value) ? value : Number(value) || 0;
}

function asPercent(value) {
  return `${(toNumber(value) * 100).toFixed(1)} %`;
}

function asDecimal(value, digits = 2) {
  return toNumber(value).toFixed(digits).replace(".", ",");
}

function asInt(value) {
  return Math.round(toNumber(value)).toLocaleString("sv-SE");
}

function safeText(value, fallback = "Ingen data") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function formatMetricValue(metricKey, value) {
  const metric = scatterMetrics.find((item) => item.key === metricKey) || tableColumns.find((item) => item.key === metricKey);
  if (!metric) {
    return safeText(value);
  }
  if (metric.type === "percent") {
    return asPercent(value);
  }
  if (metric.type === "decimal") {
    return asDecimal(value, 4);
  }
  return asInt(value);
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

function scoreKennel(row) {
  const value = toNumber(row[state.sortKey]);
  const option = kennelSortOptions.find((item) => item.key === state.sortKey);
  return option?.invert ? -value : value;
}

function breedFamilyName(value) {
  if (!value) {
    return "";
  }
  return String(value)
    .split(/[\/,]/)[0]
    .trim()
    .toLowerCase();
}

function breedMatchesSelection(rowBreed) {
  if (state.breed === "Alla raser") {
    return true;
  }
  if (rowBreed === state.breed) {
    return true;
  }
  return breedFamilyName(rowBreed) === breedFamilyName(state.breed);
}

function getFilteredKennels() {
  return kennels
    .filter((row) => breedMatchesSelection(row["Ras"]))
    .filter((row) => toNumber(row["Reggade 2019 - 2023"]) >= state.minRegistered)
    .filter((row) => {
      if (!state.kennelQuery) {
        return true;
      }
      const kennelName = row["Kennel"].toLowerCase();
      const query = state.kennelQuery.toLowerCase();
      return state.kennelExactMatch ? kennelName === query : kennelName.includes(query);
    })
    .sort((a, b) => scoreKennel(b) - scoreKennel(a));
}

function getKennelOptions() {
  return kennels
    .filter((row) => breedMatchesSelection(row["Ras"]))
    .filter((row) => toNumber(row["Reggade 2019 - 2023"]) >= state.minRegistered)
    .map((row) => row["Kennel"])
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b, "sv"));
}

function currentBreed() {
  if (state.breed !== "Alla raser") {
    return breedLookup.get(state.breed) ?? breeds[0];
  }
  const filtered = getFilteredKennels();
  const groupCounts = new Map();
  filtered.forEach((row) => {
    groupCounts.set(row["Ras"], (groupCounts.get(row["Ras"]) || 0) + toNumber(row["Reggade 2019 - 2023"]));
  });
  const topBreedName = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return breedLookup.get(topBreedName) ?? breeds[0];
}

function renderMeta() {
  const totalRegistrations = breeds.reduce((sum, row) => sum + toNumber(row["Reg 2019 - 2023"]), 0);
  elements.metaBlock.innerHTML = `
    <div class="meta-chip">
      <strong>${dataset.meta.breedCount}</strong>
      <span>raser i underlaget</span>
    </div>
    <div class="meta-chip">
      <strong>${dataset.meta.kennelCount}</strong>
      <span>kennlar jämförda</span>
    </div>
    <div class="meta-chip">
      <strong>${asInt(totalRegistrations)}</strong>
      <span>registreringar totalt</span>
    </div>
  `;
}

function renderFilterOptions() {
  elements.breedSelect.innerHTML = [
    `<option>Alla raser</option>`,
    ...breeds.map((row) => `<option>${row["Ras"]}</option>`),
  ].join("");
  elements.breedSelect.value = state.breed;

  elements.sortMetric.innerHTML = kennelSortOptions
    .map((option) => `<option value="${option.key}">${option.label}</option>`)
    .join("");
  elements.sortMetric.value = state.sortKey;

  const scatterOptionsMarkup = scatterMetrics
    .map((metric) => `<option value="${metric.key}">${metric.label}</option>`)
    .join("");
  elements.scatterXMetric.innerHTML = scatterOptionsMarkup;
  elements.scatterYMetric.innerHTML = scatterOptionsMarkup;
  elements.scatterXMetric.value = state.scatterXKey;
  elements.scatterYMetric.value = state.scatterYKey;

  const kennelOptions = getKennelOptions();
  elements.kennelOptions.innerHTML = kennelOptions
    .map((kennel) => `<option value="${escapeAttribute(kennel)}"></option>`)
    .join("");
  elements.kennelSelect.placeholder =
    state.breed === "Alla raser"
      ? "Välj eller skriv kennelnamn"
      : `Skriv kennel inom ${state.breed}`;
  elements.kennelSelect.value = state.selectedKennel ?? state.kennelQuery;
}

function renderSummaryCards(filteredKennels) {
  const totalRegs = filteredKennels.reduce((sum, row) => sum + toNumber(row["Reggade 2019 - 2023"]), 0);
  const avgMh = filteredKennels.length
    ? filteredKennels.reduce((sum, row) => sum + toNumber(row["MH %"]), 0) / filteredKennels.length
    : 0;
  const leader = filteredKennels[0];

  const cards = [
    { label: "Visade kennlar", value: asInt(filteredKennels.length), note: state.breed },
    { label: "Registreringar i urvalet", value: asInt(totalRegs), note: "Summerat för filtrerade kennlar" },
    { label: "Snitt MH %", value: asPercent(avgMh), note: "Mentalbeskrivna hundar" },
    {
      label: "Ledar-kennel",
      value: safeText(leader?.Kennel),
      note: leader ? `${safeText(leader.Ras)} · ${asInt(leader["Reggade 2019 - 2023"])} hundar` : "Ingen träff",
    },
  ];

  elements.summaryCards.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
          <p class="subtle">${card.note}</p>
        </article>
      `
    )
    .join("");
}

function renderBreedSection(filteredKennels) {
  const breed = currentBreed();
  elements.breedOverviewTitle.textContent =
    state.breed === "Alla raser" ? "Mest synlig ras i nuvarande urval" : "Detaljvy för vald ras";

  const kennelCount = filteredKennels.filter((row) => breedMatchesSelection(row["Ras"]) && breedFamilyName(row["Ras"]) === breedFamilyName(breed["Ras"])).length;
  elements.breedSpotlight.innerHTML = `
    <h3>${breed["Ras"]}</h3>
    <p class="subtle">Rasprofil baserad på bladet "Alla raser". Kennlar i nuvarande vy: ${kennelCount}.</p>
    <div class="spotlight-grid">
      <div class="mini-metric"><span>Registrerade 2019-2023</span><strong>${asInt(breed["Reg 2019 - 2023"])}</strong></div>
      <div class="mini-metric"><span>Kullstorlek</span><strong>${asDecimal(breed["Kullstorlek"])}</strong></div>
      <div class="mini-metric"><span>0 % inavelökning</span><strong>${asPercent(breed["Kullar med 0% inavelökning (5 gen)"])}</strong></div>
      <div class="mini-metric"><span>Skott</span><strong>${asDecimal(breed["Skott"])}</strong></div>
      <div class="mini-metric"><span>Skott 5 andel</span><strong>${asPercent(breed["Skott 5 Andel"])}</strong></div>
      <div class="mini-metric"><span>MH totalt</span><strong>${asInt(breed["MH"])}</strong></div>
    </div>
  `;

  elements.breedMetricBars.innerHTML = breedMetrics
    .map((metric) => {
      const value = Math.max(0, Math.min(1, toNumber(breed[metric.key])));
      return `
        <div class="metric-row">
          <span>${metric.label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${value * 100}%"></div></div>
          <strong>${asPercent(value)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderTopBreeds() {
  const topBreeds = breeds.slice(0, 8);
  elements.topBreedsList.innerHTML = topBreeds
    .map(
      (breed, index) => `
        <article class="rank-item">
          <header>
            <div>
              <span class="subtle">#${index + 1}</span>
              <h3>${breed["Ras"]}</h3>
            </div>
            <div>
              <span class="subtle">Registreringar</span>
              <strong>${asInt(breed["Reg 2019 - 2023"])}</strong>
            </div>
          </header>
          <p class="subtle">MH ${asPercent(breed["MH %"])} · HD-fel ${asPercent(breed["HD-Fel %"])} · MT godkända ${asPercent(breed["MT % GK"])}</p>
        </article>
      `
    )
    .join("");
}

function renderScatter(filteredKennels) {
  if (!filteredKennels.length) {
    elements.scatterWrapper.innerHTML = `<div class="empty-state">Inga kennlar matchar filtret.</div>`;
    return;
  }

  const width = 560;
  const height = 340;
  const padding = 36;
  const xMetric = scatterMetrics.find((metric) => metric.key === state.scatterXKey) ?? scatterMetrics[0];
  const yMetric = scatterMetrics.find((metric) => metric.key === state.scatterYKey) ?? scatterMetrics[1];
  const maxX = Math.max(...filteredKennels.map((row) => toNumber(row[state.scatterXKey])), 1);
  const maxY = Math.max(...filteredKennels.map((row) => toNumber(row[state.scatterYKey])), 1);

  const points = filteredKennels.slice(0, 120).map((row) => {
    const x = padding + (toNumber(row[state.scatterXKey]) / maxX) * (width - padding * 2);
    const y = height - padding - (toNumber(row[state.scatterYKey]) / maxY) * (height - padding * 2);
    const radius = 5 + toNumber(row["HD Rtg %"]) * 10;
    const active = state.selectedKennel === row["Kennel"] ? "active" : "";
    const label = `${row["Kennel"]} | ${row["Ras"]} | ${xMetric.label} ${formatMetricValue(state.scatterXKey, row[state.scatterXKey])} | ${yMetric.label} ${formatMetricValue(state.scatterYKey, row[state.scatterYKey])}`;
    return `<circle class="plot-point ${active}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" data-kennel="${escapeAttribute(row["Kennel"])}" data-label="${escapeAttribute(label)}"><title>${row["Kennel"]}</title></circle>`;
  });

  elements.scatterWrapper.innerHTML = `
    <div class="chart-tooltip" id="chartTooltip"></div>
    <svg viewBox="0 0 ${width} ${height}" aria-label="Kennelplot">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(31,36,48,0.35)"></line>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(31,36,48,0.35)"></line>
      <text x="${width / 2}" y="${height - 6}" text-anchor="middle" fill="#5f6b76" font-size="12">${xMetric.label}</text>
      <text x="14" y="${height / 2}" text-anchor="middle" fill="#5f6b76" font-size="12" transform="rotate(-90 14 ${height / 2})">${yMetric.label}</text>
      ${points.join("")}
    </svg>
  `;

  const tooltip = elements.scatterWrapper.querySelector("#chartTooltip");
  elements.scatterWrapper.querySelectorAll(".plot-point").forEach((point) => {
    point.addEventListener("mouseenter", () => {
      tooltip.textContent = point.dataset.label;
      tooltip.classList.add("visible");
    });
    point.addEventListener("mousemove", (event) => {
      const bounds = elements.scatterWrapper.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - bounds.left + 10}px`;
      tooltip.style.top = `${event.clientY - bounds.top}px`;
    });
    point.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
    point.addEventListener("click", () => {
      state.selectedKennel = point.dataset.kennel;
      render();
    });
  });
}

function renderKennelDetail(filteredKennels) {
  const selected = filteredKennels.find((row) => row["Kennel"] === state.selectedKennel) ?? filteredKennels[0];

  if (!selected) {
    elements.kennelDetail.innerHTML = `<div class="empty-state">Välj en ras eller sänk filtret för att se kenneldata.</div>`;
    return;
  }

  state.selectedKennel = selected["Kennel"];
  elements.kennelDetail.innerHTML = `
    <h3>${selected["Kennel"]}</h3>
    <p class="subtle">${selected["Ras"]}${selected["Även raserna"] ? ` · Även ${selected["Även raserna"]}` : ""}</p>
    <div class="detail-grid">
      <div class="detail-metric"><span>Registrerade</span><strong>${asInt(selected["Reggade 2019 - 2023"])}</strong></div>
      <div class="detail-metric"><span>MH %</span><strong>${asPercent(selected["MH %"])}</strong></div>
      <div class="detail-metric"><span>HD-röntgen %</span><strong>${asPercent(selected["HD Rtg %"])}</strong></div>
      <div class="detail-metric"><span>HD-fel %</span><strong>${asPercent(selected["HD-Fel %"])}</strong></div>
      <div class="detail-metric"><span>ED-röntgen %</span><strong>${asPercent(selected["ED Rtg %"])}</strong></div>
      <div class="detail-metric"><span>ED-fel %</span><strong>${asPercent(selected["ED-Fel %"])}</strong></div>
      <div class="detail-metric"><span>MT %</span><strong>${asPercent(selected["MT %"])}</strong></div>
      <div class="detail-metric"><span>MT GK %</span><strong>${selected["MT GK %"] == null ? "Ingen data" : asPercent(selected["MT GK %"])}</strong></div>
      <div class="detail-metric"><span>Andel bruks</span><strong>${asPercent(selected["Andel Bruks"])}</strong></div>
      <div class="detail-metric"><span>Inavel</span><strong>${asDecimal(selected["Inavel"], 4)}</strong></div>
    </div>
  `;
}

function renderKennelTable(filteredKennels) {
  const activeColumn = tableColumns.find((column) => column.key === state.tableSortKey);
  const sortedKennels = [...filteredKennels].sort((left, right) => {
    const direction = state.tableSortDirection === "asc" ? 1 : -1;
    if (activeColumn?.type === "text") {
      return safeText(left[state.tableSortKey]).localeCompare(safeText(right[state.tableSortKey]), "sv") * direction;
    }
    return (toNumber(left[state.tableSortKey]) - toNumber(right[state.tableSortKey])) * direction;
  });

  elements.kennelTableTitle.textContent = `${filteredKennels.length} kennlar i urvalet`;
  elements.kennelTableHead.innerHTML = `
    <tr>
      ${tableColumns
        .map((column) => {
          const isActive = column.key === state.tableSortKey;
          const indicator = isActive ? (state.tableSortDirection === "asc" ? "↑" : "↓") : "";
          return `<th><button type="button" data-sort="${escapeAttribute(column.key)}">${column.label}<span class="sort-indicator">${indicator}</span></button></th>`;
        })
        .join("")}
    </tr>
  `;

  elements.kennelTableBody.innerHTML = sortedKennels
    .slice(0, 20)
    .map(
      (row) => `
        <tr data-kennel="${escapeAttribute(row["Kennel"])}">
          <td>${row["Kennel"]}</td>
          <td>${row["Ras"]}</td>
          <td>${asInt(row["Reggade 2019 - 2023"])}</td>
          <td>${asPercent(row["MH %"])} </td>
          <td>${asPercent(row["HD-Fel %"])} </td>
          <td>${asPercent(row["ED-Fel %"])} </td>
          <td>${asPercent(row["MT %"])} </td>
          <td>${asDecimal(row["Inavel"], 4)}</td>
        </tr>
      `
    )
    .join("");

  elements.kennelTableBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedKennel = row.dataset.kennel;
      render();
    });
  });

  elements.kennelTableHead.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.tableSortKey === key) {
        state.tableSortDirection = state.tableSortDirection === "asc" ? "desc" : "asc";
      } else {
        state.tableSortKey = key;
        state.tableSortDirection = key === "Kennel" || key === "Ras" ? "asc" : "desc";
      }
      render();
    });
  });
}

function render() {
  const filteredKennels = getFilteredKennels();
  elements.minRegisteredValue.textContent = String(state.minRegistered);
  renderFilterOptions();
  renderSummaryCards(filteredKennels);
  renderBreedSection(filteredKennels);
  renderTopBreeds();
  renderScatter(filteredKennels);
  renderKennelDetail(filteredKennels);
  renderKennelTable(filteredKennels);
}

function bindEvents() {
  elements.breedSelect.addEventListener("change", (event) => {
    state.breed = event.target.value;
    state.kennelQuery = "";
    state.kennelExactMatch = false;
    state.selectedKennel = null;
    render();
  });

  elements.kennelSelect.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    const isExactOption = getKennelOptions().includes(value);
    state.kennelQuery = value;
    state.kennelExactMatch = isExactOption;
    state.selectedKennel = isExactOption ? value : null;
    render();
  });

  elements.kennelSelect.addEventListener("change", (event) => {
    const value = event.target.value.trim();
    const isExactOption = getKennelOptions().includes(value);
    state.kennelQuery = value;
    state.kennelExactMatch = isExactOption;
    state.selectedKennel = isExactOption ? value : null;
    render();
  });

  elements.sortMetric.addEventListener("change", (event) => {
    state.sortKey = event.target.value;
    state.selectedKennel = null;
    state.tableSortKey = event.target.value;
    state.tableSortDirection = "desc";
    render();
  });

  elements.scatterXMetric.addEventListener("change", (event) => {
    state.scatterXKey = event.target.value;
    render();
  });

  elements.scatterYMetric.addEventListener("change", (event) => {
    state.scatterYKey = event.target.value;
    render();
  });

  elements.minRegistered.addEventListener("input", (event) => {
    state.minRegistered = toNumber(event.target.value);
    state.selectedKennel = null;
    render();
  });

  elements.resetFilters.addEventListener("click", () => {
    state.breed = "Alla raser";
    state.kennelQuery = "";
    state.kennelExactMatch = false;
    state.sortKey = "Reggade 2019 - 2023";
    state.scatterXKey = "Reggade 2019 - 2023";
    state.scatterYKey = "MH %";
    state.tableSortKey = "Reggade 2019 - 2023";
    state.tableSortDirection = "desc";
    state.minRegistered = 0;
    state.selectedKennel = null;
    render();
  });
}

renderMeta();
bindEvents();
render();
