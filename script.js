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
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
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

function normalizeAccount(row) {
  const baseBalance =
    row.balance ??
    row.Balance ??
    row["Баланс"] ??
    row["баланс"] ??
    0;
  const balanceWithPercent =
    row.balanceWithPercent ??
    row.BalanceWithPercent ??
    row["Баланс с процентами"] ??
    row["баланс с процентами"] ??
    0;

  const balance = normalizeNumber(baseBalance);
  const currentBalance = normalizeNumber(balanceWithPercent);

  return {
    login: String(row.login ?? row.Login ?? row["Логин"] ?? "").trim(),
    balance,
    balanceWithPercent: currentBalance,
    earned: currentBalance - balance
  };
}

function shouldShowAccount(account) {
  return (
    account.login !== "" &&
    account.login.toLocaleLowerCase("ru-RU") !== "зарплата" &&
    account.balanceWithPercent !== 0
  );
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
          <h2 class="login">${escapeHtml(account.login)}</h2>
          <p class="account-label">Текущий баланс</p>
          <p class="balance">${formatNumber(account.balanceWithPercent)}</p>
          <p class="earned">уже заработано: <strong>${formatSignedNumber(account.earned)}</strong></p>
        </article>
      `;
    })
    .join("");
}

function renderTotal() {
  const total = state.accounts.reduce((sum, account) => sum + account.balanceWithPercent, 0);
  totalBalance.textContent = formatNumber(total);
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function formatSignedNumber(value) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value))}`;
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
    state.accounts = [];
    setStatus("Источник не настроен", true);
    render();
    return;
  }

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error);
    const rows = Array.isArray(payload) ? payload : payload.accounts;
    if (!Array.isArray(rows)) throw new Error("Неверный формат API");
    state.accounts = rows.map(normalizeAccount).filter(shouldShowAccount);
    setStatus("Данные обновлены");
  } catch (error) {
    console.error(error);
    state.accounts = [];
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
