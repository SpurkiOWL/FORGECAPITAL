const fallbackAccounts = [
  { login: "forge_alpha", balanceWithPercent: "124 500 ₽ +18.4%" },
  { login: "capital_prime", balanceWithPercent: "98 750 ₽ +11.2%" },
  { login: "north_engineer", balanceWithPercent: "76 840 ₽ +7.9%" },
  { login: "vault_sigma", balanceWithPercent: "142 300 ₽ +21.6%" },
  { login: "iron_delta", balanceWithPercent: "53 620 ₽ -2.3%" }
];

const state = {
  accounts: [],
  page: 0,
  perPage: 3
};

const track = document.querySelector("#accountsTrack");
const dots = document.querySelector("#dots");
const totalBalance = document.querySelector("#totalBalance");
const statusPill = document.querySelector("#statusPill");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

function normalizeNumber(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/\s/g, "")
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractBalance(value) {
  if (typeof value === "number") return value;
  const match = String(value ?? "").match(/[-+]?\d[\d\s.,]*/);
  return match ? normalizeNumber(match[0]) : 0;
}

function normalizeAccount(row) {
  const balanceWithPercent =
    row.balanceWithPercent ??
    row.BalanceWithPercent ??
    row["Баланс с процентами"] ??
    row["баланс с процентами"] ??
    "";

  return {
    login: String(row.login ?? row.Login ?? row["Логин"] ?? "").trim(),
    balanceWithPercent: String(balanceWithPercent).trim(),
    balance: extractBalance(balanceWithPercent)
  };
}

function getPerPage() {
  if (window.matchMedia("(max-width: 620px)").matches) return 1;
  if (window.matchMedia("(max-width: 860px)").matches) return 2;
  return 3;
}

function pageCount() {
  return Math.max(1, Math.ceil(state.accounts.length / state.perPage));
}

function setStatus(text, isError = false) {
  statusPill.textContent = text;
  statusPill.classList.toggle("error", isError);
}

function renderCards() {
  if (!state.accounts.length) {
    track.innerHTML = '<div class="empty">Нет данных для отображения</div>';
    return;
  }

  track.innerHTML = state.accounts
    .map((account) => {
      return `
        <article class="account-card">
          <p class="account-label">Логин</p>
          <h2 class="login">${escapeHtml(account.login || "Без логина")}</h2>
          <p class="account-label">Баланс с процентами</p>
          <p class="balance">${escapeHtml(account.balanceWithPercent || "0")}</p>
        </article>
      `;
    })
    .join("");
}

function renderTotal() {
  const total = state.accounts.reduce((sum, account) => sum + account.balance, 0);
  totalBalance.textContent = formatTotal(total);
}

function formatTotal(total) {
  const sample = state.accounts.find((account) => account.balanceWithPercent)?.balanceWithPercent ?? "";
  const currency = String(sample).match(/₽|руб\.?|RUB|\$|USD|€|EUR/i)?.[0]?.toLowerCase();
  const value = numberFormatter.format(total);

  if (!currency) return value;
  if (currency === "$" || currency === "usd") return `$${value}`;
  if (currency === "€" || currency === "eur") return `€${value}`;
  return `${value} ₽`;
}

function renderDots() {
  const count = pageCount();
  dots.innerHTML = Array.from({ length: count }, (_, index) => {
    const active = index === state.page ? " active" : "";
    return `<button class="dot${active}" type="button" aria-label="Страница ${index + 1}" data-page="${index}"></button>`;
  }).join("");
}

function renderPosition() {
  const cards = track.querySelectorAll(".account-card");
  const card = cards[0];
  if (!card) return;
  const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
  const step = card.getBoundingClientRect().width + gap;
  track.style.transform = `translateX(${-state.page * state.perPage * step}px)`;
  prevBtn.disabled = state.page === 0;
  nextBtn.disabled = state.page >= pageCount() - 1;
  renderDots();
}

function render() {
  state.perPage = getPerPage();
  state.page = Math.min(state.page, pageCount() - 1);
  renderCards();
  renderTotal();
  renderPosition();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadAccounts() {
  const apiUrl = window.FORGE_CONFIG?.apiUrl?.trim();

  if (!apiUrl) {
    state.accounts = fallbackAccounts;
    setStatus("Демо-данные");
    render();
    return;
  }

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error);
    const rows = Array.isArray(payload) ? payload : payload.accounts;
    state.accounts = rows.map(normalizeAccount).filter((row) => row.login);
    setStatus("Данные обновлены");
  } catch (error) {
    console.error(error);
    state.accounts = fallbackAccounts;
    setStatus("Ошибка API", true);
  }

  render();
}

prevBtn.addEventListener("click", () => {
  state.page = Math.max(0, state.page - 1);
  renderPosition();
});

nextBtn.addEventListener("click", () => {
  state.page = Math.min(pageCount() - 1, state.page + 1);
  renderPosition();
});

dots.addEventListener("click", (event) => {
  const button = event.target.closest(".dot");
  if (!button) return;
  state.page = Number(button.dataset.page);
  renderPosition();
});

window.addEventListener("resize", render);
loadAccounts();
