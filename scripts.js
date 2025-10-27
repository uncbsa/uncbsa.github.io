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
    // Core identity
    name: getVal(row, 'Name'),
    photo: getVal(row, 'Headshot URL'),
    
    // Contact information
    email: getVal(row, 'Primary Email ID'),
    email2: getVal(row, 'Secondary Email ID'),
    linkedin: getVal(row, 'LinkedIn'),
    
    // Personal information
    gender: getVal(row, 'Gender'),
    
    // Academic information
    starting_year: getVal(row, 'Starting Year'),
    year: getVal(row, 'Year of Passing (or Projected)'),
    program: getVal(row, 'Department at UNC'),
    degree: getVal(row, 'Degree/M.S./Ph.D.'),
    bio: getVal(row, 'Research Topic'),
    
    // Background education
    background_uni1: getVal(row, 'Background University #1'),
    background_uni2: getVal(row, 'Background University #2'),
    highest_education: getVal(row, 'Highest Level of Education'),
    
    // Professional information
    company: getVal(row, 'Currently Working at'),
    role: getVal(row, 'Title/ Designation/Role'),
    
    // Location
    location: getVal(row, 'Current State'),
    district_bd: getVal(row, 'District in Bangladesh')
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
  const name = safe(item.name);
  let photoUrl = item.photo;
  
  // Use local image for Navid Fazle Rabbi
  if (name.toLowerCase().includes('navid fazle rabbi')) {
    photoUrl = 'images/navid.jpeg';
  }
  
  const photoHtml = photoUrl 
    ? `<div class="photo"><img src="${safe(photoUrl)}" alt="${name}" loading="lazy" onerror="this.style.display='none'"></div>`
    : `<div class="initials">${initials(name)}</div>`;

  // Create contact section with icons
  const contactItems = [];
  // Add primary email if exists
  if (item.email) {
    contactItems.push(`
      <a class="contact-item" href="mailto:${safe(item.email)}" title="${safe(item.email)}">
        <i class="fa-regular fa-envelope"></i>
      </a>`);
  }
  // Add secondary email if exists
  if (item.email2) {
    contactItems.push(`
      <a class="contact-item" href="mailto:${safe(item.email2)}" title="${safe(item.email2)}">
        <i class="fa-regular fa-envelope"></i>
      </a>`);
  }
  // Add LinkedIn if exists
  if (item.linkedin) {
    const linkedinUrl = item.linkedin.startsWith('http') ? item.linkedin : `https://${item.linkedin}`;
    contactItems.push(`
      <a class="contact-item" href="${safe(linkedinUrl)}" target="_blank" rel="noopener" title="LinkedIn">
        <i class="fa-brands fa-linkedin-in"></i>
      </a>`);
  }

  // Combine years if both exist
  const yearDisplay = item.starting_year && item.year 
    ? `${item.starting_year} - ${item.year}` 
    : item.starting_year || item.year || '';

  // Create info sections with combined fields
  const infoItems = [
    // Personal Information
    item.gender ? ['<i class="fa-solid fa-venus-mars"></i>Gender', item.gender] : null,
    
    // Academic Information
    yearDisplay ? ['<i class="fa-solid fa-calendar-days"></i>Year', yearDisplay] : null,
    item.program ? ['<i class="fa-solid fa-building-columns"></i>Department', item.program] : null,
    item.degree ? ['<i class="fa-solid fa-user-graduate"></i>Degree', item.degree] : null,
    
    // Past Universities
    (item.background_uni1 || item.background_uni2) ? [
      '<i class="fa-solid fa-school"></i>Past Universities', 
      [item.background_uni1, item.background_uni2].filter(Boolean).join(',')] : null,
    
    // Highest Education
    item.highest_education ? ['<i class="fa-solid fa-graduation-cap"></i>Highest Education', item.highest_education] : null,
    
    // Professional Information
    item.company ? ['<i class="fa-solid fa-building"></i>Organization', item.company] : null,
    item.role ? ['<i class="fa-solid fa-briefcase"></i>Position', item.role] : null,
    
    // Location Information
    item.location ? ['<i class="fa-solid fa-location-dot"></i>Current Location', item.location] : null,
    item.district_bd ? ['<i class="fa-solid fa-home"></i>Home Country Location', item.district_bd] : null
  ].filter(Boolean);  // Remove any null entries
  
  // Split into two columns for better layout
  const midPoint = Math.ceil(infoItems.length / 2);
  const leftColumn = infoItems.slice(0, midPoint);
  const rightColumn = infoItems.slice(midPoint);

  // Build HTML
  return `
  <article class="card" tabindex="0">
    <div class="card-header">
      <div class="avatar">${photoHtml}</div>
      <div class="header-text">
        <h3 class="name">${name}</h3>
        ${contactItems.length ? `<div class="contact-links">${contactItems.join('')}</div>` : ''}
      </div>
    </div>
    
    <div class="card-content">
      <div class="info-grid">
        <div class="info-column">
          ${leftColumn.map(([k, v]) => `
            <div class="info-row">
              <span class="info-label">${k}</span>
              <span class="info-value">${safe(v)}</span>
            </div>
          `).join('')}
        </div>
        <div class="info-column">
          ${rightColumn.map(([k, v]) => `
            <div class="info-row">
              <span class="info-label">${k}</span>
              <span class="info-value">${safe(v)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
    </div>
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

