const STORAGE_KEY = "beaucute_transactions";

function formatMoney(amount) {
    const sign = amount < 0 ? "-" : "";
    return `${sign}₱${Math.abs(amount).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getTransactions() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error("Failed to read Beaucute transactions:", err);
        return [];
    }
}

function saveTransactions(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

document.addEventListener("DOMContentLoaded", () => {
    const BEGINNING_CASH = 0;
    const INVENTORY_VALUE = 0;
    const LIABILITIES = 0;

    let transactions = getTransactions();

    const barCtx = document.getElementById("barChart").getContext("2d");
    const barChart = new Chart(barCtx, {
        type: "bar",
        data: {
            labels: ["Revenue", "COGS (Stock)", "Operating Bills", "Net Profit"],
            datasets: [{
                label: "Amount (₱)",
                data: [0, 0, 0, 0],
                backgroundColor: ["#4ade80", "#fbbf24", "#fb7185", "#00a0e9"],
                borderColor: "#2b313a",
                borderWidth: 1.5,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    ticks: { color: "#434c59", font: { weight: "600" } },
                    grid: { color: "#dbeafe" }
                },
                x: {
                    ticks: { color: "#2b313a", font: { weight: "700" } },
                    grid: { display: false }
                }
            }
        }
    });

    const doughnutCtx = document.getElementById("doughnutChart").getContext("2d");
    const doughnutChart = new Chart(doughnutCtx, {
        type: "doughnut",
        data: {
            labels: ["Net Profit", "Stock Costs (COGS)", "Operating (OPEX)"],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ["#00a0e9", "#fbbf24", "#fb7185"],
                borderColor: "#2b313a",
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#2b313a",
                        font: { weight: "700" },
                        padding: 16
                    }
                }
            }
        }
    });

    function updateDashboard() {
        transactions = getTransactions();

        let totalRevenue = 0;
        let totalCogs = 0;
        let totalOpex = 0;

        const ledgerList = document.getElementById("ledgerList");
        ledgerList.innerHTML = "";

        if (transactions.length === 0) {
            ledgerList.innerHTML = `
                <div class="ledger-empty">
                    No transactions recorded yet.<br>
                    Checkout items on the Beaucute shop or add a manual entry above!
                </div>
            `;
        } else {
            [...transactions].reverse().forEach(tx => {
                const amount = Number(tx.amount) || 0;
                const isRev = tx.type === "Revenue";
                if (tx.type === "Revenue") totalRevenue += amount;
                else if (tx.type === "COGS") totalCogs += amount;
                else totalOpex += amount;

                const item = document.createElement("div");
                item.className = "ledger-item";
                item.innerHTML = `
                    <div>
                        <strong>${escapeHtml(tx.description || "")}</strong>
                        <div class="ledger-meta">
                            <span>${escapeHtml(tx.date || "")} &bull; ${escapeHtml(tx.type || "")}</span>
                            ${tx.source === "Shop" ? `<span class="source-badge">Shop Order</span>` : ""}
                        </div>
                    </div>
                    <span class="ledger-amount ${isRev ? "text-green" : "text-red"}">
                        ${isRev ? "+" : "-"}${formatMoney(amount)}
                    </span>
                `;
                ledgerList.appendChild(item);
            });
        }

        const totalExpenses = totalCogs + totalOpex;
        const grossProfit = totalRevenue - totalCogs;
        const netIncome = totalRevenue - totalExpenses;
        const endingCash = BEGINNING_CASH + totalRevenue - totalExpenses;
        const ownersEquity = (endingCash + INVENTORY_VALUE) - LIABILITIES;

        document.getElementById("kpiRevenue").textContent = formatMoney(totalRevenue);
        document.getElementById("kpiExpenses").textContent = formatMoney(totalExpenses);
        document.getElementById("kpiNetIncome").textContent = formatMoney(netIncome);
        document.getElementById("kpiCash").textContent = formatMoney(endingCash);

        document.getElementById("isRevenue").textContent = formatMoney(totalRevenue);
        document.getElementById("isCogs").textContent = totalCogs > 0 ? `-${formatMoney(totalCogs)}` : formatMoney(0);
        document.getElementById("isGross").textContent = formatMoney(grossProfit);
        document.getElementById("isOpex").textContent = totalOpex > 0 ? `-${formatMoney(totalOpex)}` : formatMoney(0);
        document.getElementById("isNet").textContent = formatMoney(netIncome);

        document.getElementById("cfInflow").textContent = `+${formatMoney(totalRevenue)}`;
        document.getElementById("cfOutflow").textContent = totalExpenses > 0 ? `-${formatMoney(totalExpenses)}` : formatMoney(0);
        document.getElementById("cfEnding").textContent = formatMoney(endingCash);

        document.getElementById("bsCash").textContent = formatMoney(endingCash);
        document.getElementById("bsEquity").textContent = formatMoney(ownersEquity);

        barChart.data.datasets[0].data = [totalRevenue, totalCogs, totalOpex, Math.max(0, netIncome)];
        barChart.update();

        doughnutChart.data.datasets[0].data = [Math.max(0, netIncome), totalCogs, totalOpex];
        doughnutChart.update();
    }

    document.getElementById("entryForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const desc = document.getElementById("entryDesc").value.trim();
        const type = document.getElementById("entryType").value;
        const amount = parseFloat(document.getElementById("entryAmount").value);

        if (!desc || isNaN(amount) || amount <= 0) return;

        transactions.push({
            date: new Date().toISOString().split("T")[0],
            description: desc,
            type: type,
            amount: amount,
            source: "Manual"
        });

        saveTransactions(transactions);
        e.target.reset();
        updateDashboard();
    });

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            document.querySelectorAll(".statement-view").forEach(v => v.classList.remove("active"));

            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            document.getElementById(btn.getAttribute("data-tab")).classList.add("active");
        });
    });

    document.getElementById("resetDataBtn").addEventListener("click", () => {
        if (!confirm("Reset all Beaucute financial records? This will clear both shop orders and manual entries.")) {
            return;
        }
        localStorage.removeItem(STORAGE_KEY);
        updateDashboard();
    });

    window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY) {
            updateDashboard();
        }
    });

    updateDashboard();
});