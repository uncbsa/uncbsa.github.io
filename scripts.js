const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSRY02YM6vA6268HoEcmuKMc2mP3A1wd67Iw9vLXpdAncAik8Nsik6VJJ6t2ki1UgzgZLX8XsmK6mls/pub?output=csv";

const state = {
  raw: [],
  rows: [],
  filter: "",
};

// Access a value from a parsed CSV row by header name, using the header as-is,
// but being resilient to accidental whitespace/case differences in the file.
function getVal(row, ...headers) {
  if (!row) return "";
  const keys = Object.keys(row);
  for (const h of headers) {
    // 1) Exact match
    if (h in row) return row[h] ?? "";
    // 2) Trimmed match
    const trimmed = String(h).trim();
    const k1 = keys.find((k) => String(k).trim() === trimmed);
    if (k1) return row[k1] ?? "";
    // 3) Case-insensitive trimmed match
    const lower = trimmed.toLowerCase();
    const k2 = keys.find((k) => String(k).trim().toLowerCase() === lower);
    if (k2) return row[k2] ?? "";
  }
  return "";
}

function mapRow(row) {
  return {
    // Core identity (use header exactly as given; allow a trimmed variant)
    name: getVal(row, 'Name ', 'Name'),
    pid: getVal(row, 'PID'),

    // Role and organization
    role: getVal(row, 'Title/ Designation/Role'),
    company: getVal(row, 'Currently Working at'),

    // Academic
    program: getVal(row, 'Department at UNC'),
    degree: getVal(row, 'Degree/M.S./Ph.D.'),
    starting_year: getVal(row, 'Starting Year'),
    year: getVal(row, 'Year of Passing (or Predicted)'),

    // Location and address
    location: getVal(row, 'Current State'),
    current_address: getVal(row, 'Current Address'),
    address_bd: getVal(row, 'Address in Bangladesh'),
    district_bd: getVal(row, 'District in Bangladesh'),

    // Contacts
    phone: getVal(row, 'Contact No.'),
    email: getVal(row, 'Primary Email ID'),
    email2: getVal(row, 'Secondary Email ID'),
    linkedin: getVal(row, 'LinkedIn'),
    website: getVal(row, 'Website'),

    // Extras
    gender: getVal(row, 'Gender'),
    dob: getVal(row, 'Date of Birth'),
    bio: getVal(row, 'Research Topic'),
    highest_education: getVal(row, 'Highest Level of Education'),
    background_uni1: getVal(row, 'Background University #1'),
    background_uni2: getVal(row, 'Background University #2'),
    photo: getVal(row, 'Photo')
  };
}

function initials(name) {
  const n = String(name || "").trim();
  if (!n) return "";
  const parts = n.split(/\s+/);
  const first = parts[0] ? parts[0][0] : "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}

function cardHTML(item) {
  const safe = (v) => escapeHtml(v);
  const emails = [item.email, item.email2].filter((e) => String(e || '').trim() !== '');

  const entries = [];
  // Special grouped fields with icons
  if (item.phone) {
    const phoneHtml = `<a href="tel:${safe(item.phone)}">${safe(item.phone)}</a>`;
    entries.push(['Contact', phoneHtml, 'kv-contact', '<i class="fa-solid fa-phone" aria-hidden="true"></i>']);
  }
  if (emails.length) {
    const emailHtml = emails
      .map((e) => `<a href="mailto:${safe(e)}">${safe(e)}</a>`)
      .join(', ');
    entries.push(['Emails', emailHtml, 'kv-emails', '<i class="fa-solid fa-envelope" aria-hidden="true"></i>']);
  }
  if (item.linkedin) {
    const liHtml = `<a href="${safe(item.linkedin)}" target="_blank" rel="noopener">${safe(item.linkedin)}</a>`;
    entries.push(['Linkedins', liHtml, 'kv-linkedins', '<i class="fa-brands fa-linkedin" aria-hidden="true"></i>']);
  }
  if (String(item.current_address || '').trim() !== '') {
    entries.push(['Current Address', safe(item.current_address), 'kv-addresses kv-address-current', '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>']);
  }
  if (String(item.address_bd || '').trim() !== '') {
    entries.push(['Address in Bangladesh', safe(item.address_bd), 'kv-addresses kv-address-bd', '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>']);
  }

  // Other plain fields
  const others = [
    ['PID', item.pid],
    ['Title/ Designation/Role', item.role],
    ['Currently Working at', item.company],
    ['Department at UNC', item.program],
    ['Degree/M.S./Ph.D.', item.degree],
    ['Starting Year', item.starting_year],
    ['Year of Passing (or Predicted)', item.year],
    ['Current State', item.location],
    ['Website', item.website],
    ['Research Topic', item.bio],
    ['Highest Level of Education', item.highest_education],
    ['Background University #1', item.background_uni1],
    ['Background University #2', item.background_uni2],
    ['District in Bangladesh', item.district_bd],
  ].filter(([, v]) => String(v || '').trim() !== '');

  // Build HTML: place other fields first, then special grouped rows at the bottom
  const kv = others
    .concat(entries)
    .map(([k, v, cls, icon]) => {
      const isUrl = /^https?:\/\//i.test(String(v));
      const valueHtml = isUrl ? `<a href="${safe(v)}" target="_blank" rel="noopener">${safe(v)}</a>` : v === undefined ? '' : String(v);
      const iconHtml = icon ? `${icon}` : '';
      const liClass = cls ? ` class="${cls} kv-accent"` : '';
      return `<li${liClass}><span class="k">${iconHtml}${safe(k)}:</span> <span class="v">${valueHtml}</span></li>`;
    })
    .join('');

  const name = safe(item.name);
  return `
  <article class="card" tabindex="0">
    <h3 class="name">${name}</h3>
    <ul class="kv">${kv}</ul>
  </article>`;
}

function render(rows) {
  const container = document.getElementById("cards");
  if (!container) return;
  container.setAttribute("aria-busy", "true");
  if (!rows || rows.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
        <p>No matches found.</p>
      </div>`;
    container.setAttribute("aria-busy", "false");
    return;
  }
  const html = rows.map(cardHTML).join("");
  container.innerHTML = html;
  container.setAttribute("aria-busy", "false");
}

function filterRows() {
  const q = state.filter.trim().toLowerCase();
  if (!q) return state.raw;
  return state.raw.filter((r) => {
    const hay = [
      r.name, r.role, r.company, r.program, r.degree, r.starting_year, r.year,
      r.location, r.current_address, r.bio, r.highest_education,
      r.background_uni1, r.background_uni2, r.address_bd, r.district_bd,
      r.email, r.email2, r.phone
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    return hay.includes(q);
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function attachSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  const onChange = debounce(() => {
    state.filter = input.value || "";
    state.rows = filterRows();
    render(state.rows);
  }, 200);
  input.addEventListener("input", onChange);
}

function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function showError(msg) {
  const container = document.getElementById("cards");
  if (!container) return;
  container.innerHTML = `
    <div class="error">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <p>${escapeHtml(msg)}</p>
    </div>`;
  container.setAttribute("aria-busy", "false");
}

async function loadCSV() {
  const container = document.getElementById("cards");
  if (container) container.setAttribute("aria-busy", "true");
  try {
    const res = await fetch(CSV_URL, { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    console.groupCollapsed('[Alumni CSV] Parse complete');
    console.log('Fields:', parsed.meta && parsed.meta.fields);
    console.log('Raw rows:', (parsed.data || []).length);
    if (parsed.errors && parsed.errors.length) {
      console.warn('Papa errors:', parsed.errors);
    }
    console.groupEnd();

    const mapped = (parsed.data || []).map(mapRow);
    const rows = mapped.filter((r) => String(r.name || '').trim() !== '');
    state.raw = rows;
    state.rows = rows;
    if (!rows.length) {
      const first = parsed.data && parsed.data[0] ? Object.keys(parsed.data[0]) : [];
      showError(`No rows with a Name found. Detected headers: ${escapeHtml(first.join(', '))}`);
      return;
    }
    render(state.rows);
  } catch (err) {
    showError(`Failed to load alumni data: ${err && err.message ? err.message : 'Network/CORS error'}`);
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  attachSearch();
  loadCSV();
});

