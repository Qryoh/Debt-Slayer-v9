function updateSimulatorFields() {
  const loanType = document.getElementById("loan-type").value;
  const dynamicFields = document.getElementById("dynamic-fields");
  let fieldsHtml = "";

  switch(loanType) {
    case "credit-card":
      const existingDebt = debts
        .filter(d => d.debtType === "Credit Card")
        .reduce((sum, debt) => sum + debt.amount, 0);

      fieldsHtml = `
        <div class="simulator-card">
          <label>Total Credit Card Debt</label>
          <input type="number" id="total-debt" value="${existingDebt || ''}" placeholder="Enter total debt" min="0" step="100">
        </div>
        <div class="simulator-card">
          <label>Total Credit Limit</label>
          <input type="number" id="credit-limit" placeholder="Enter total credit limit" min="0" step="100">
        </div>
        <div class="simulator-card">
          <label>Credit Card Payoff Amount</label>
          <input type="number" id="payoff-amount" placeholder="Enter payoff amount" min="0" step="100">
        </div>
        <div class="simulator-card">
          <label>Open a New Credit Card?</label>
          <select id="new-card">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div class="simulator-card">
          <label>Number of Currently Open Credit Cards</label>
          <input type="number" id="cards-open" placeholder="Number of open cards" min="0" value="0">
        </div>`;
      break;

    case "auto-loan":
      fieldsHtml = `

// Handle intro APR checkbox changes
document.getElementById("hasIntroAPR").addEventListener("change", (e) => {
  const monthsInput = document.getElementById("introAPRMonths");
  const endDateInput = document.getElementById("introAPREndDate");

  monthsInput.style.display = e.target.checked ? "block" : "none";
  if (!e.target.checked) {
    monthsInput.value = "";
    endDateInput.value = "";
  }
});

document.getElementById("introAPRMonths").addEventListener("change", (e) => {
  const months = parseInt(e.target.value);
  if (!isNaN(months)) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    document.getElementById("introAPREndDate").value = endDate.toISOString();
  }
});

        <div class="simulator-card">
          <label>Loan Balance</label>
          <input type="number" id="loan-balance" placeholder="Enter loan balance" min="0" step="100">
        </div>
        <div class="simulator-card">
          <label>Choose Action</label>
          <select id="loan-action">
            <option value="new">Open New Auto Loan</option>
            <option value="payoff">Pay Off Auto Loan</option>
          </select>
        </div>`;
      break;

    case "student-loan":
      fieldsHtml = `
        <div class="simulator-card">
          <label>Total Loan Balance</label>
          <input type="number" id="loan-balance" placeholder="Enter loan balance" min="0" step="100">
        </div>
        <div class="simulator-card">
          <label>Deferment Status</label>
          <select id="deferment-status">
            <option value="in-school">In School</option>
            <option value="paying">Paying</option>
            <option value="deferred">Deferred</option>
          </select>
        </div>
        <div class="simulator-card">
          <label>Any Missed Payments?</label>
          <select id="missed-payments">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>`;
      break;
    case "personal-loan":
      fieldsHtml = `
        <div class="simulator-card">
          <label>Loan Amount</label>
          <input type="number" id="loan-amount" placeholder="Enter loan amount" min="0" step="100">
        </div>
        <div class="simulator-card">
          <label>Loan Term (months)</label>
          <input type="number" id="loan-term" placeholder="Enter term in months" min="1" max="360">
        </div>
        <div class="simulator-card">
          <label>Interest Rate (%) - Optional</label>
          <input type="number" id="loan-interest" placeholder="Enter APR" min="0" max="100" step="0.1">
        </div>
        <div class="simulator-card">
          <label style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="no-installment-loans" style="width: auto; min-height: auto !important;">
            <span>This is my first installment loan</span>
          </label>
        </div>`;
      break;
  }

  dynamicFields.innerHTML = fieldsHtml;
}

function resetSimulator() {
  document.getElementById('base-credit-score').value = '';
  document.getElementById('loan-type').selectedIndex = 0;
  document.getElementById('dynamic-fields').innerHTML = '';
  document.getElementById('simulation-result').classList.add('hidden');
  document.getElementById('score-warning').style.display = 'none';
}

function simulateScore() {
  const scoreInput = document.getElementById("base-credit-score");
  const baselineScore = parseInt(scoreInput.value);

  if (!baselineScore || baselineScore < 300 || baselineScore > 850) {
    document.getElementById("score-warning").style.display = "block";
    document.getElementById("simulation-result").classList.add("hidden");
    return;
  }
  document.getElementById("score-warning").style.display = "none";

  let pointDelta = 0;
  const changes = [];
  const loanType = document.getElementById("loan-type").value;

  const creditImpact = {
    creditCard: {
      payOff: (payoffAmt, totalDebt) => {
        const utilizationDrop = payoffAmt / totalDebt;
        if (utilizationDrop >= 0.9) return 30;
        if (utilizationDrop >= 0.5) return 15;
        if (utilizationDrop >= 0.25) return 5;
        return 0;
      },
      openNew: (cardsOpen = 0) => cardsOpen >= 5 ? -10 : -5
    },
    autoLoan: {
      payOff: (balance) => balance > 1000 ? 10 : 2,
      openNew: () => -12
    },
    studentLoan: {
      missedPayment: (status) => status === "yes" ? -60 : 0,
      deferment: (status) => status === "in-school" ? 0 : status === "deferred" ? -5 : 0
    }
  };

  switch(loanType) {
    case "personal-loan":
      const loanAmount = parseFloat(document.getElementById("loan-amount").value) || 0;
      const loanTerm = parseInt(document.getElementById("loan-term").value) || 0;
      const isFirstLoan = document.getElementById("no-installment-loans").checked;

      // Base impact for new account
      pointDelta -= 5;
      changes.push({points: -5, reason: "Opening new credit account"});

      // Amount-based impact
      let amountImpact = 0;
      if (loanAmount > 20000) amountImpact = -10;
      else if (loanAmount > 10000) amountImpact = -8;
      else if (loanAmount > 5000) amountImpact = -5;
      else if (loanAmount > 2000) amountImpact = -3;

      if (amountImpact !== 0) {
        pointDelta += amountImpact;
        changes.push({points: amountImpact, reason: `Loan amount impact ($${loanAmount.toLocaleString()})`});
      }

      // Term impact
      if (loanTerm > 48) {
        pointDelta -= 2;
        changes.push({points: -2, reason: "Extended loan term (>48 months)"});
      }

      // Credit mix benefit
      if (isFirstLoan) {
        pointDelta += 4;
        changes.push({points: 4, reason: "Improved credit mix with first installment loan"});
      }
      break;

    case "credit-card":
      const totalDebt = parseFloat(document.getElementById("total-debt").value) || 0;
      const payoffAmount = parseFloat(document.getElementById("payoff-amount").value) || 0;
      const newCard = document.getElementById("new-card").value;
      const cardsOpen = parseInt(document.getElementById("cards-open")?.value) || 0;

      const creditLimit = parseFloat(document.getElementById("credit-limit").value) || 0;

      if (totalDebt > 0 && payoffAmount > 0 && creditLimit > 0) {
        const newUtilization = ((totalDebt - payoffAmount) / creditLimit) * 100;
        let utilizationImpact = 0;

        if (newUtilization < 10) utilizationImpact = 20;
        else if (newUtilization <= 30) utilizationImpact = 10;
        else if (newUtilization <= 50) utilizationImpact = 0;
        else if (newUtilization <= 75) utilizationImpact = -10;
        else utilizationImpact = -20;

        pointDelta += utilizationImpact;
        changes.push({
          points: utilizationImpact,
          reason: `Credit utilization ${newUtilization.toFixed(1)}% after payoff`
        });
      }

      if (newCard === "yes") {
        const newCardImpact = creditImpact.creditCard.openNew(cardsOpen);
        pointDelta += newCardImpact;
        changes.push({points: newCardImpact, reason: "Opening new credit card"});
      }
      break;

    case "auto-loan":
      const balance = parseFloat(document.getElementById("loan-balance").value) || 0;
      const action = document.getElementById("loan-action").value;

      if (action === "payoff" && balance > 0) {
        const payoffImpact = creditImpact.autoLoan.payOff(balance);
        pointDelta += payoffImpact;
        changes.push({points: payoffImpact, reason: "Paying off auto loan"});
      } else if (action === "new") {
        const newLoanImpact = creditImpact.autoLoan.openNew();
        pointDelta += newLoanImpact;
        changes.push({points: newLoanImpact, reason: "Opening new auto loan"});
      }
      break;

    case "student-loan":
      const defermentStatus = document.getElementById("deferment-status").value;
      const missedPayments = document.getElementById("missed-payments").value;

      const defermentImpact = creditImpact.studentLoan.deferment(defermentStatus);
      if (defermentImpact !== 0) {
        pointDelta += defermentImpact;
        changes.push({points: defermentImpact, reason: "Loan deferment status"});
      }

      const missedPaymentImpact = creditImpact.studentLoan.missedPayment(missedPayments);
      if (missedPaymentImpact !== 0) {
        pointDelta += missedPaymentImpact;
        changes.push({points: missedPaymentImpact, reason: "Missed payment impact"});
      }
      break;
  }

  const finalScore = Math.max(300, Math.min(850, baselineScore + pointDelta));

  const resultElement = document.getElementById("simulation-result");
  const changeColor = pointDelta >= 0 ? "#48bb78" : "#e53e3e";
  const sign = pointDelta > 0 ? "+" : "";

  let changesHtml = changes.map(change => {
    const changeSign = change.points > 0 ? "+" : "";
    const changeStyle = change.points >= 0 ? "color: #48bb78" : "color: #e53e3e";
    return `<div><span style="${changeStyle}">${changeSign}${change.points}</span> - ${change.reason}</div>`;
  }).join("");

  resultElement.innerHTML = `
    <div style="font-size: 1.5em; margin-bottom: 10px;">
      <div style="color: ${changeColor}; font-weight: bold; font-size: 1.2em;">
        Your estimated score change is: ${sign}${pointDelta} points
      </div>
      <div style="margin-top: 10px;">
        Simulated score: ${finalScore}
      </div>
    </div>
    <div style="margin: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
      ${changesHtml}
    </div>
    <div style="margin-top: 15px; font-size: 0.9em; opacity: 0.8;">
      <div>This is a simplified simulation for educational purposes.</div>
      <div style="margin-top: 10px; font-style: italic;">
        View how your actions affect your score over time
      </div>
    </div>
  `;
  resultElement.classList.remove("hidden");
}

const form = document.getElementById("debt-form");
const list = document.getElementById("debtList");

let debts = JSON.parse(localStorage.getItem('debts') || '[]');
let debtHistory = JSON.parse(localStorage.getItem('debtHistory') || '[]');

function saveToLocalStorage() {
  localStorage.setItem('debts', JSON.stringify(debts));
  localStorage.setItem('debtHistory', JSON.stringify(debtHistory));
}

function logDebtChange(debtName, action, amount, newBalance, interestPaid) {
  debtHistory.push({
    date: new Date().toISOString(),
    debtName,
    action,
    amount,
    newBalance,
    interestPaid
  });
  saveToLocalStorage();
}

// Add function to clear all storage
function clearAllData() {
  localStorage.clear();
  debts = [];
  debtHistory = [];
  displayDebts();
}

function showDebtAddedToast() {
  const toast = document.createElement('div');
  toast.className = 'debt-added-toast';
  toast.innerHTML = '<span class="emoji">🔥</span> Debt Added!';
  document.body.appendChild(toast);

  // Remove after animation completes
  setTimeout(() => toast.remove(), 2800);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("debtName").value;
  const mascot = document.querySelector('.mascot');

  // Add fire breathing animation
  mascot.classList.add('breathing-fire');
  setTimeout(() => mascot.classList.remove('breathing-fire'), 1000);

  // Show toast notification
  showDebtAddedToast();
  const amount = parseFloat(document.getElementById("debtAmount").value);
  const dueDate = document.getElementById("dueDate").value;
  const apr = parseFloat(document.getElementById("apr").value);
  const debtType = document.getElementById("debtType").value;
  const loanTerm = document.getElementById("loanTerm").value;
  const hasIntroAPR = document.getElementById("hasIntroAPR").checked;
  const introAPRMonths = hasIntroAPR ? parseInt(document.getElementById("introAPRMonths").value) : null;

  debts.push({
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name,
    amount,
    dueDate,
    apr: isNaN(apr) ? null : apr,
    debtType,
    loanTerm: (debtType === "Auto Loan" || debtType === "Home Loan") ? loanTerm : null,
    hasIntroAPR: debtType === "Credit Card" ? hasIntroAPR : false,
    introAPRMonths: debtType === "Credit Card" ? introAPRMonths : null,
    paidThisCycle: false,
    confirmPayment: false,
    lastPaymentDate: null,
    paymentHistory: [],
    paymentCooldownDays: 15,
    totalPaid: 0,
    totalInterestPaid: 0
  });

  // Reset form fields explicitly
  document.getElementById("debtType").selectedIndex = 0;
  document.getElementById("debtName").value = "";
  document.getElementById("debtAmount").value = "";
  document.getElementById("dueDate").value = "";
  document.getElementById("apr").value = "";

  displayDebts();
  updateNextPaymentTimer(); // Update the timer immediately
});

// Start the clock when page loads
// Draggable functionality
function makeDraggable(element) {
  let offsetX = 0, offsetY = 0;
  const header = element.querySelector('.panel-header');
  if (!header) return;

  header.onmousedown = dragMouseDown;
  header.ontouchstart = dragTouchStart;

  function dragTouchStart(e) {
    if (window.innerWidth <= 768) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = element.getBoundingClientRect();
    element.classList.add('dragging');

    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    element.style.position = 'fixed';
    element.style.top = rect.top + 'px';
    element.style.left = rect.left + 'px';

    document.ontouchend = closeDragElement;
    document.ontouchmove = elementTouchDrag;
    header.style.cursor = 'grabbing';
  }

  function elementTouchDrag(e) {
    e.preventDefault();
    const touch = e.touches[0];

    let newLeft = touch.clientX - offsetX;
    let newTop = touch.clientY - offsetY;

    const rect = element.getBoundingClientRect();

    newTop = Math.max(0, Math.min(window.innerHeight - rect.height, newTop));
    newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, newLeft));

    element.style.top = newTop + "px";
    element.style.left = newLeft + "px";
  }

  function dragMouseDown(e) {
    if (window.innerWidth <= 768 || e.target.classList.contains('panel-close')) return;
    e.preventDefault();

    const rect = element.getBoundingClientRect();
    element.classList.add('dragging');

    // Calculate offset between mouse and panel position
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // Set initial position
    element.style.position = 'fixed';
    element.style.top = rect.top + 'px';
    element.style.left = rect.left + 'px';

    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    header.style.cursor = 'grabbing';
  }

  function elementDrag(e) {
    e.preventDefault();

    // Calculate new position based on mouse position minus offset
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    const rect = element.getBoundingClientRect();
    const minVisible = Math.min(rect.width, rect.height) * 0.2;

    // Ensure panel stays within viewport bounds
    newTop = Math.max(0, Math.min(window.innerHeight - rect.height, newTop));
    newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, newLeft));

    element.style.top = newTop + "px";
    element.style.left = newLeft + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    header.style.cursor = 'grab';
    element.classList.remove('dragging');
    element.style.transition = 'all 0.3s ease';

    // Snap back if too far out of bounds
    const rect = element.getBoundingClientRect();
    if (rect.right < 50) element.style.left = '10px';
    if (rect.left > window.innerWidth - 50) element.style.left = (window.innerWidth - rect.width - 10) + 'px';
    if (rect.bottom < 50) element.style.top = '10px';
    if (rect.top > window.innerHeight - 50) element.style.top = (window.innerHeight - rect.height - 10) + 'px';
  }
}

function toggleMinimize(panel) {
  panel.classList.toggle('minimized');
  const btn = panel.querySelector('.minimize-btn');
  const header = panel.querySelector('.panel-header span');
  if (panel.classList.contains('minimized')) {
    btn.textContent = '▼';
    if (panel.classList.contains('debt-history-sidebar')) {
      header.textContent = '📉 Debt History';
    }
  } else {
    btn.textContent = '_';
    if (panel.classList.contains('debt-history-sidebar')) {
      header.textContent = 'Debt History';
    }
  }
}

function analyzeCreditProfile(score, utilization, accounts, history) {
  let tips = [];

  if (utilization > 30) {
    tips.push("🚨 Your credit utilization is high. Try to keep it under 30% for better credit health.");
  }

  if (score < 670) {
    tips.push("💡 Consider focusing on on-time payments and reducing debt to improve your score.");
  }

  if (accounts < 2) {
    tips.push("📊 Having a mix of credit types can improve your score when managed responsibly.");
  }

  if (history < 2) {
    tips.push("⏳ Keep your oldest accounts open to build credit history length.");
  }

  return tips.length > 0 ? tips.join("<br><br>") : "✅ Your credit profile looks healthy! Keep up the good work!";
}



// Function to update loan term options
function updateLoanTermDropdown(debtType) {
  const loanTermSelect = document.getElementById("loanTerm");
  loanTermSelect.innerHTML = '<option value="" disabled selected>Select Loan Term</option>';

  if (debtType === "Auto Loan") {
    loanTermSelect.style.display = "block";
    [24, 36, 48, 60, 72, 84].forEach(months => {
      const option = document.createElement("option");
      option.value = months;
      option.textContent = `${months} months`;
      loanTermSelect.appendChild(option);
    });
  } else if (debtType === "Home Loan") {
    loanTermSelect.style.display = "block";
    [15, 20, 25, 30].forEach(years => {
      const option = document.createElement("option");
      option.value = years * 12;
      option.textContent = `${years} years`;
      loanTermSelect.appendChild(option);
    });
  } else {
    loanTermSelect.style.display = "none";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  
  // Add event listener for debt type changes
  document.getElementById("debtType").addEventListener("change", (e) => {
    updateLoanTermDropdown(e.target.value);
    const introAPRFields = document.getElementById("introAPRFields");
    introAPRFields.style.display = e.target.value === "Credit Card" ? "block" : "none";
    if (e.target.value !== "Credit Card") {
      document.getElementById("hasIntroAPR").checked = false;
      document.getElementById("introAPRMonths").value = "";
      document.getElementById("introAPRMonths").style.display = "none";
    }
  });

  // Ensure dashboard is visible
  const dashboardSummary = document.querySelector('.floating-panel.dashboard-summary');
  if (dashboardSummary) {
    dashboardSummary.style.display = 'block';
    dashboardSummary.classList.remove('hidden');
  }

  // Hide debt history by default
  const debtHistoryPanel = document.querySelector('.floating-panel.debt-history');
  if (debtHistoryPanel) {
    debtHistoryPanel.classList.add('hidden');
    debtHistoryPanel.style.display = 'none';
  }

  // Menu functionality
  const menuButton = document.querySelector('.menu-button');
  const menuContent = document.querySelector('.menu-content');

  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContent.classList.toggle('show');

    // Update button text based on screen width
    const buttonText = window.innerWidth <= 768 ? "Overview at a Glance" : "Dashboard Tools";
    menuButton.textContent = "☰";
  });

  // Update menu button text on resize
  window.addEventListener('resize', () => {
    const buttonText = window.innerWidth <= 768 ? "Overview at a Glance" : "Dashboard Tools";
    const menuButton = document.querySelector('.menu-button');
    if (menuButton) {
      menuButton.textContent = "☰";
    }
  });

  // Handle dashboard panel close button
  document.addEventListener('DOMContentLoaded', () => {
    const dashboardPanel = document.querySelector('.dashboard-summary');
    if (dashboardPanel) {
      const header = dashboardPanel.querySelector('.panel-header');
      if (header) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close';
        closeBtn.innerHTML = '←';
        closeBtn.onclick = () => {
          dashboardPanel.style.display = 'none';
          dashboardPanel.classList.add('hidden');
        };
        header.appendChild(closeBtn);
      }
    }
  });

  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    if (!item.disabled) {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const panelId = item.getAttribute('data-panel');
        const panel = document.querySelector(`.floating-panel.${panelId}`);

        if (window.innerWidth > 768) {
          panel.style.display = 'block';
          panel.classList.add('animate-open');
          panel.addEventListener('animationend', () => {
            panel.classList.remove('animate-open');
          }, { once: true });
        }

        if (panelId === 'dashboard-summary' && window.innerWidth <= 768) {
          const dashboardPanel = document.querySelector('.dashboard-summary');
          if (dashboardPanel) {
            dashboardPanel.classList.add('visible');
            dashboardPanel.style.display = 'block';
          }
        }
        if (panel) {
          // Show panel
          panel.style.display = 'block';
          panel.classList.remove('hidden');

          // Add close button if not exists
          if (!panel.querySelector('.panel-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'panel-close';
            closeBtn.innerHTML = '←';
            closeBtn.onclick = () => {
              if (window.innerWidth > 768) {
                panel.classList.add('animate-close');
                panel.addEventListener('animationend', () => {
                  panel.style.display = 'none';
                  panel.classList.add('hidden');
                  panel.classList.remove('animate-close');
                }, { once: true });
              } else {
                panel.style.display = 'none';
                panel.classList.add('hidden');
              }
            };
            panel.querySelector('.panel-header').appendChild(closeBtn);
          }

          // Position panel relative to menu
          const menuRect = menuContent.getBoundingClientRect();
          if (window.innerWidth > 768) {
            panel.style.position = 'fixed';
            panel.style.top = '50%';
            panel.style.left = `${menuRect.left - 320}px`;
            panel.style.transform = 'translateY(-50%)';
          } else {
            panel.style.position = 'fixed';
            panel.style.top = '50%';
            panel.style.left = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.style.width = '90%';
            panel.style.maxWidth = '400px';
          }

          // Show panel with animation
          panel.classList.remove('hidden');
          requestAnimationFrame(() => {
            panel.classList.add('visible');
            // Make panel draggable when it becomes visible
            makeDraggable(panel);
          });

          // Hide menu
          menuContent.classList.remove('show');
        }
      });
    }
  });

  // Credit tracker functionality
  const creditForm = document.getElementById('credit-form');
  const creditHealthPanel = document.querySelector('.credit-health');
  const creditTips = document.getElementById('credit-tips');

  // Make credit health panel draggable like other panels
  if (creditHealthPanel) {
    makeDraggable(creditHealthPanel);
  }

  creditForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateCreditTracker()) return;

    const score = parseInt(document.getElementById('creditScore').value);
    const utilization = parseInt(document.getElementById('utilization').value);
    const accounts = parseInt(document.getElementById('accounts').value);
    const history = parseInt(document.getElementById('history').value);

    creditTips.innerHTML = analyzeCreditProfile(score, utilization, accounts, history);
  });

// Mobile input section minimize functionality
  const inputSection = document.querySelector('.input-section');
  const minimizeBtn = document.querySelector('.mobile-minimize-btn');
  const addDebtBtn = document.querySelector('.add-debt-button');

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      inputSection.classList.add('minimized');
    });
  }

  if (addDebtBtn) {
    addDebtBtn.addEventListener('click', () => {
      inputSection.classList.remove('minimized');
    });
  }

  // Make all floating panels draggable and minimizable
  const panels = document.querySelectorAll('.floating-panel');
  panels.forEach(panel => {
    if (!panel.querySelector('.panel-header')) {
      const content = panel.innerHTML;
      panel.innerHTML = `
        <div class="panel-header">
          <span>${panel.classList.contains('notification-banner') ? '📢 Disclosure' : 
                 panel.classList.contains('progress-tracker') ? 'Debt Progress' : 
                 panel.classList.contains('debt-history-sidebar') ? 'Debt History' : 
                 'Dashboard Summary'}</span>
        </div>
        <div class="panel-content">${content}</div>
      `;
    }
    makeDraggable(panel);

    // Add minimize button if not exists and panel is not credit simulator, credit tracker, debt history, or progress tracker
    let header = panel.querySelector('.panel-header');
    if (!header.querySelector('.minimize-btn') && 
        !panel.classList.contains('credit-simulator') && 
        !panel.classList.contains('credit-tracker') && 
        !panel.classList.contains('debt-history') && 
        !panel.classList.contains('progress-tracker') &&
        !panel.classList.contains('credit-health')) {
      const minBtn = document.createElement('button');
      minBtn.className = 'minimize-btn';
      minBtn.textContent = '_';
      minBtn.onclick = (e) => {
        e.stopPropagation();
        toggleMinimize(panel);
      };
      header.appendChild(minBtn);
    }
  });
});

function displayDebtHistory() {
  const historyPanel = document.querySelector('.floating-panel.debt-history');
  if (!historyPanel) return;

  const contentPanel = historyPanel.querySelector('.panel-content.debt-history');
  if (!contentPanel) {
    console.error('Debt history content panel not found');
    return;
  }

  const content = debtHistory.slice().reverse().map(entry => `
    <div class="history-entry">
      ${new Date(entry.date).toLocaleDateString()}: 
      ${entry.debtName} - $${(entry.amount || 0).toFixed(2)} paid 
      (Interest Paid: $${(entry.interestPaid || 0).toFixed(2)})
    </div>
  `).join('') || '<div class="history-entry">No payment history yet</div>';

  contentPanel.innerHTML = content;
}

function displayDebts() {
  list.innerHTML = "";
  const groupedDebts = {};
  let total = 0;
  let totalPaid = 0;
  let totalOriginal = 0;

  // Calculate totals
  debts.forEach(debt => {
    total += debt.amount;
    totalPaid += debt.totalPaid;
    totalOriginal += debt.amount + debt.totalPaid;
  });

  // Add progress tracker
  let progressSection = document.querySelector('.progress-tracker');
  if (!progressSection) {
    progressSection = document.createElement("div");
    progressSection.className = "progress-tracker";
    document.body.appendChild(progressSection);
  }
  const progressPercentage = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  const progressContent = progressSection.querySelector('.panel-content');
  if (progressContent) {
    progressContent.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercentage}%; transition: width 0.3s ease-out"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 5px;">
        <span>Total Paid: ${totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>Remaining: ${total.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    `;
  }

  // Group Debts by category
  debts.forEach((debt) => {
    if (!groupedDebts[debt.debtType]) {
      groupedDebts[debt.debtType] = [];
    }
    groupedDebts[debt.debtType].push(debt);
  });

  // Loop through each group and render
  for (const type in groupedDebts) {
    const section = document.createElement("div");
    section.className = "category-section";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = `${type} (${groupedDebts[type].length})`;
    section.appendChild(header);

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "debt-cards";

    let totalGroup = 0;

    groupedDebts[type].forEach((debt, index) => {
      totalGroup += debt.amount;
      total += debt.amount;

      const div = document.createElement("div");
      div.className = "debt-card";
      const aprText = debt.apr !== null
        ? `APR: ${debt.apr.toFixed(2)}%`
        : `APR: N/A`;

      const interestText = debt.apr !== null
        ? `📈 Monthly Interest: $${(debt.amount * (debt.apr / 100 / 12)).toFixed(2)}`
        : `📈 Monthly Interest: N/A`;

      div.innerHTML = `
        <strong>${debt.name}</strong><br>
        Amount: $${debt.amount.toFixed(2)}<br>
        Type: ${debt.debtType}<br>
        ${aprText}<br>
        ${interestText}<br>
        Total Paid: $${debt.totalPaid.toFixed(2)}<br>
        Interest Paid: $${debt.totalInterestPaid.toFixed(2)}<br>
        Due Day: ${getOrdinalSuffix(new Date(debt.dueDate).getDate())}<br>
        <em>${generateReminder(debt)}</em><br>
        ${generatePaymentButton(index, debt)}
        <br><br>
      `;

      section.appendChild(div);
    });


    section.appendChild(cardsContainer);
    list.appendChild(section);
  }

  displayDebtHistory();
}

function markAsPaid(index, debtType) {
  const typeDebts = debts.filter(d => d.debtType === debtType);
  const debt = typeDebts[index];
  if (!debt) {
    console.error('Debt not found');
    return;
  }

  // If not confirmed yet, show payment input
  if (!debt.confirmPayment) {
    debt.confirmPayment = true;
    displayDebts();
    return;
  }

  const paymentInput = document.querySelector(`input[data-index="${index}"]`);
  if (!paymentInput) {
    alert('Please expand the category to make a payment');
    return;
  }
  const paymentAmount = parseFloat(paymentInput.value);

  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    alert('Please enter a valid payment amount');
    return;
  }

  if (paymentAmount > debt.amount) {
    alert('Payment amount cannot be greater than debt amount');
    return;
  }

  // Check if payment is allowed (cooldown period)
  if (debt.lastPaymentDate) {
    const lastPayment = new Date(debt.lastPaymentDate);
    const today = new Date();
    const daysSinceLastPayment = Math.floor((today - lastPayment) / (1000 * 60 * 60 * 24));

    if (daysSinceLastPayment < debt.paymentCooldownDays) {
      alert(`Please wait ${debt.paymentCooldownDays - daysSinceLastPayment} more days before making another payment`);
      return;
    }
  }

  // Update debt amount and payment history
  const paymentDate = new Date();
  debt.amount -= paymentAmount;
  debt.lastPaymentDate = paymentDate.toISOString();
  debt.paymentHistory.push({
    amount: paymentAmount,
    date: paymentDate.toISOString(),
    remainingBalance: debt.amount
  });
  debt.totalPaid += paymentAmount;

  //Calculate interest paid
  const monthlyInterest = debt.apr ? (paymentAmount * (debt.apr / 100)) / 12 : 0;
  debt.totalInterestPaid += monthlyInterest;

  logDebtChange(debt.name, 'payment', paymentAmount, debt.amount, monthlyInterest);

  // Calculate next due date based on the original due day
  const originalDueDate = new Date(debt.dueDate);
  const originalDueDay = originalDueDate.getDate();
  const nextDue = new Date();

  // Set to first day of next month
  nextDue.setDate(1);
  nextDue.setMonth(nextDue.getMonth() + 1);

  // Set to the original due day
  nextDue.setDate(originalDueDay);

  // Handle month-end cases
  while (nextDue.getDate() !== originalDueDay) {
    nextDue.setDate(nextDue.getDate() - 1);
  }

  debt.dueDate = nextDue.toISOString().split("T")[0];
  debt.paidThisCycle = debt.amount <= 0;
  debt.confirmPayment = false;

  // Store the current open state of all sections
  const openSections = Array.from(document.querySelectorAll('details')).map(detail => detail.open);

  displayDebts();

  // Restore the open state
  document.querySelectorAll('details').forEach((detail, i) => {
    if (openSections[i]) detail.open = true;
  });
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return day + "th";
  switch (day % 10) {
    case 1: return day + "st";
    case 2: return day + "nd";
    case 3: return day + "rd";
    default: return day + "th";
  }  }

function updateClock() {
  // Store the current open state of all sections
  const openSections = Array.from(document.querySelectorAll('details')).map(detail => detail.open);

  displayDebts();
  updateNextPaymentTimer();

  // Restore the open state
  document.querySelectorAll('details').forEach((detail, i) => {
    if (openSections[i]) detail.open = true;
  });

  setTimeout(updateClock, 60000); // Update every minute
}

function updatePayoffEstimate(payment, balance, apr, debtName) {
  if (!payment || payment <= 0) return;

  const payoff = calculatePayoff(balance, apr, parseFloat(payment));
  const element = document.getElementById(`estimate-${debtName}`);
  if (element) {
    element.innerHTML = `At $${parseFloat(payment).toFixed(2)}/month, you'll be debt-free in ${payoff.months} months and pay around $${payoff.totalInterest.toFixed(2)} in interest.`;
  }
}

function updateNextPaymentTimer() {
  const timerElement = document.getElementById('nextPaymentTimer');
  if (!debts.length) {
    timerElement.innerHTML = "No debts added yet";
    return;
  }

  const now = new Date();
  let nextPaymentDate = null;
  let nextDebtName = "";
  let totalDebt = 0;
  let activeDebts = 0;
  const maxDays = 59;

  debts.forEach(debt => {
    if (debt.amount <= 0) return;
    totalDebt += debt.amount;
    activeDebts++;

    const dueDate = new Date(debt.dueDate);
    let nextDueDate = new Date(dueDate);

    // If due date has passed, move to next month while preserving the day
    while (nextDueDate < now) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      // Handle month-end cases
      while (nextDueDate.getDate() !== dueDate.getDate()) {
        nextDueDate.setDate(nextDueDate.getDate() - 1);
      }
    }

    const daysDiff = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24));
    if (daysDiff <= maxDays && (!nextPaymentDate || nextDueDate < nextPaymentDate)) {
      nextPaymentDate = nextDueDate;
      nextDebtName = debt.name;
    }
  });

  if (nextPaymentDate) {
    const daysUntil = Math.ceil((nextPaymentDate - now) / (1000 * 60 * 60 * 24));
    timerElement.innerHTML = `
      💰 Total Debt: $${totalDebt.toFixed(2)}<br>
      📊 Active Debts: ${activeDebts}<br>
      ⏰ Next Payment: ${nextDebtName}<br>
      ⌛ Next Payment Due In ${daysUntil} Days
    `;
  } else {
    timerElement.innerHTML = "No upcoming payments";
  }
}

function generateReminder(debt) {
  const now = new Date();
  const currentTime = now.getTime();
  const oneDay = 1000 * 60 * 60 * 24;

  // Get the original due date
  let dueDate = new Date(debt.dueDate);

  // If we have payment history, calculate next due date from last payment
  if (debt.paymentHistory.length > 0) {
    const lastPayment = new Date(debt.lastPaymentDate);
    dueDate = new Date(lastPayment);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(new Date(debt.dueDate).getDate()); // Keep original due day
  } else {
    // If no payments yet, calculate from original due date
    while (dueDate < now) {
      const nextMonth = dueDate.getMonth() + 1;
      const year = dueDate.getFullYear() + Math.floor(nextMonth / 12);
      const month = nextMonth % 12;
      const targetDay = dueDate.getDate();

      // Handle month end cases
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(targetDay, lastDayOfMonth);

      dueDate = new Date(year, month, actualDay);
      dueDate.setHours(0, 0, 0, 0);
    }
  }

  const timeDiff = dueDate.getTime() - currentTime;
  const daysLeft = Math.ceil(timeDiff / oneDay);

  let emoji = "🌇";
  if (daysLeft <= 0) emoji = "❗️";
  else if (daysLeft === 1) emoji = "⚠️";
  else if (daysLeft <= 7) emoji = "⌛";
  else if (daysLeft <= 14) emoji = "⏳";
  else if (daysLeft > 30) emoji = "✅";

  if (daysLeft > 30) {
    return `Due in ${daysLeft} day(s) - You're ahead of the curve! ${emoji}`;
  } else if (daysLeft <= 0) {
    return `Due TODAY! ${emoji}`;
  } else {
    return `Due in ${daysLeft} day(s) ${emoji}`;
  }
}

function calculatePayoff(balance, apr, monthlyPayment) {
  let remainingBalance = balance;
  let months = 0;
  let totalInterest = 0;

  while (remainingBalance > 0 && months < 1200) { // 100 year limit
    const monthlyInterest = (remainingBalance * (apr / 100)) / 12;
    totalInterest += monthlyInterest;

    remainingBalance = remainingBalance + monthlyInterest - monthlyPayment;
    months++;
  }

  return {
    months: Math.ceil(months),
    totalInterest: totalInterest
  };
}

function deleteDebt(debtId) {
  debts = debts.filter(d => d.id !== debtId);
  saveToLocalStorage();
  displayDebts();
}

function generatePaymentButton(index, debt) {
  // Get index within the debt type group
  const typeIndex = debts.filter(d => d.debtType === debt.debtType).indexOf(debt);

  // Add delete button HTML
  const deleteButtonHtml = `
    <div class="debt-header">
      <button 
        class="delete-btn"
        title="Delete"
        onclick="event.stopPropagation(); event.preventDefault(); deleteDebt('${debt.id}'); return false;"
      >
        🗑️
      </button>
    </div>
  `;

  // Calculate monthly interest
  const monthlyInterest = debt.apr ? (debt.amount * (debt.apr / 100)) / 12 : 0;
  const interestWarning = debt.apr ? 
    `<div class="interest-warning">💡 Pay $${monthlyInterest.toFixed(2)} before due date to avoid interest charges</div>` : '';

  if (debt.paidThisCycle) {
    return `
      ${deleteButtonHtml}
      <button class="payment-success-btn" disabled>✅ Paid!</button>
      ${interestWarning}
    `;
  }

  if (debt.lastPaymentDate) {
    const lastPayment = new Date(debt.lastPaymentDate);
    const today = new Date();
    const daysSinceLastPayment = Math.floor((today - lastPayment) / (1000 * 60 * 60 * 24));

    if (daysSinceLastPayment < debt.paymentCooldownDays) {
      return `
        ${deleteButtonHtml}
        <div class="payment-wrapper">
          <button disabled style="opacity: 0.5; margin: 5px auto;">✅ Payment received. You can pay again in ${debt.paymentCooldownDays - daysSinceLastPayment} days.</button>
        </div>`;
    }
  }

  const uniqueId = `${debt.debtType.replace(/\s+/g, '')}-${index}`;
  if (debt.confirmPayment) {
    const defaultPayment = debt.amount * 0.05; // Default 5% of balance
    const payoffCalc = calculatePayoff(debt.amount, debt.apr || 0, defaultPayment);
    return `
      ${deleteButtonHtml}
      <div class="payment-wrapper">
        <div class="payoff-estimate" id="estimate-${debt.name}">
          At $${defaultPayment.toFixed(2)}/month, you'll be debt-free in ${payoffCalc.months} months and pay around $${payoffCalc.totalInterest.toFixed(2)} in interest.
        </div>
        <input type="number" 
               id="payment-input-${uniqueId}"
               data-index="${typeIndex}"
               data-debt-type="${debt.debtType}"
               placeholder="Enter payment amount"
               value="${defaultPayment.toFixed(2)}"
               oninput="updatePayoffEstimate(this.value, ${debt.amount}, ${debt.apr || 0}, '${debt.name}')"
               step="0.01"
               min="0.01"
               max="${debt.amount}"
               required
        >
        <button onclick="event.stopPropagation(); event.preventDefault(); markAsPaid(${typeIndex}, '${debt.debtType}'); return false;">Confirm Payment ✅</button>
      </div>`;
  } else {
    return `
      ${deleteButtonHtml}
      <div class="payment-wrapper" 
           onclick="event.stopPropagation(); event.preventDefault(); return false;" 
           onmousedown="event.stopPropagation(); event.preventDefault(); return false;">
        <button id="pay-button-${uniqueId}" 
                onclick="event.stopPropagation(); event.preventDefault(); markAsPaid(${typeIndex}, '${debt.debtType}'); return false;">Make Payment</button>
      </div>`;
  }
}
function validateCreditTracker() {
  const score = parseInt(document.getElementById('creditScore').value);
  const utilization = parseFloat(document.getElementById('utilization').value);
  const accounts = parseInt(document.getElementById('accounts').value);
  const history = parseFloat(document.getElementById('history').value);
  let isValid = true;

  //Credit Score Validation
  if (isNaN(score) || score < 300 || score > 850) {
    showError('creditScore', 'Please enter a valid credit score between 300 and 850.');
    isValid = false;
  } else {
    hideError('creditScore');
  }

  //Utilization Validation
  if (isNaN(utilization) || utilization < 0 || utilization > 100) {
    showError('utilization', 'Please enter a valid utilization percentage between 0 and 100.');
    isValid = false;
  } else {
    hideError('utilization');
  }

  //Accounts Validation
  if (isNaN(accounts) || accounts < 0) {
    showError('accounts', 'Please enter a valid number of open accounts (0 or greater).');
    isValid = false;
  } else {
    hideError('accounts');
  }

  //History Validation
  if (isNaN(history) || history < 0 || history > 50) {
    showError('history', 'Please enter a valid credit history in years (0-50).');
    isValid = false;
  } else {
    hideError('history');
  }

  return isValid;
}

function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  field.parentNode.insertBefore(errorElement, field.nextSibling);
  field.classList.add('invalid');
}

function hideError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = field.parentNode.querySelector('.error-message');
  if (errorElement) {
    errorElement.remove();
  }
  field.classList.remove('invalid');
}

function resetSimulator() {
  document.getElementById('base-credit-score').value = '';
  document.getElementById('loan-type').selectedIndex = 0;
  document.getElementById('dynamic-fields').innerHTML = '';
  document.getElementById('simulation-result').classList.add('hidden');
  document.getElementById('score-warning').style.display = 'none';
}

// Login handling moved to index.html