// ==UserScript==
// @name         WCM Dynamic Suite v5.36 • Employee Edition
// @namespace    http://tampermonkey.net/
// @version      5.36
// @description  Exact Admin v3.04 CF math • +5% on Fri/Sat/Sun + last 3 days of month + all national holidays • Summer +15% (additional) • Enhanced holiday banner (X days before) • Peak Rate tooltip right-edge aligned + high-contrast • Esign Required tooltip • Deposit click with WAIT until Payments screen is fully loaded
// @author       @Bakurki
// @match        https://zebra.hellomoving.com/wc.dll?*
// @updateURL    https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js
// @downloadURL  https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CHARGES_PATH = 'mpcharge~chargeswc~';
    const PAYMENTS_PATH = 'mpopr~paymentswc~';

    // ====================== 210px ULTRA-COMPACT CSS ======================
    const style = document.createElement('style');
    style.textContent = `
        #wcm-suite-popup { position:fixed; top:78px; right:20px; width:210px; background:#fff; border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.15); overflow:hidden; z-index:99999; font-family:'Inter',Arial,sans-serif; font-size:12.6px; }
        #wcm-suite-header { border-bottom:1px solid #e9ecef; padding:7px 10px; display:flex; align-items:center; justify-content:space-between; font-weight:700; font-size:12px; cursor:move; transition:all .3s; }
        .wcm-content { padding:9px; max-height:420px; overflow-y:auto; }
        .wcm-row { display:flex; justify-content:space-between; margin-bottom:4px; align-items:center; }
        .wcm-label { font-weight:500; color:#555; }
        .wcm-value { font-weight:700; }
        .wcm-deposit { font-size:18.5px; color:#007bff; cursor:pointer; padding:4px; border-radius:7px; transition:.2s; }
        .wcm-deposit:hover { background:#e3f2fd; }
        .wcm-cf { color:#28a745; font-weight:700; cursor:pointer; }
        .wcm-peak { background:#ff4757; color:#fff; font-size:10px; padding:1px 6px; border-radius:99px; margin-left:4px; cursor:pointer; }

        #wcm-peak-tooltip {
            position: fixed; z-index: 100000; padding: 8px 12px; border-radius: 6px; font-size: 11.5px; white-space: nowrap;
            box-shadow: 0 6px 16px rgba(0,0,0,0.25); pointer-events: none; opacity: 0; transition: opacity .15s;
            color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.6);
        }

        .wcm-alert { background:#fff3cd; color:#856404; padding:6px; margin-bottom:8px; border-radius:7px; font-size:11px; text-align:center; border:1px solid #ffeaa7; }

        .wcm-header-buttons { display:flex; gap:8px; align-items:center; }
        .wcm-close, .wcm-toggle { background:none; border:none; font-size:19px; color:#adb5bd; cursor:pointer; line-height:1; padding:0; }
        .wcm-close:hover, .wcm-toggle:hover { color:#495057; }
    `;
    document.head.appendChild(style);

    // ====================== PAYMENTS PAGE – WAIT UNTIL LOADED (strictly isolated) ======================
    if (window.location.href.includes(PAYMENTS_PATH)) {
        window.addEventListener('load', () => {
            const amt = localStorage.getItem('autoDepositAmount');
            const notes = localStorage.getItem('autoDepositNotes');

            if (amt && notes) {
                let attempts = 0;
                const maxAttempts = 30;

                const interval = setInterval(() => {
                    attempts++;
                    const payAmtField = document.querySelector('input[name="PAYAMT"]');
                    const notesField = document.querySelector('input[name="NOTES"]');
                    const reserveCheckbox = document.querySelector('input[name="RSRV"]');

                    if (payAmtField && notesField && reserveCheckbox) {
                        clearInterval(interval);
                        if (!localStorage.getItem('updateInProgress')) {
                            localStorage.setItem('updateInProgress','true');
                            reserveCheckbox.checked = true;
                            payAmtField.value = amt;
                            notesField.value = notes;
                            if (typeof UpdatePayment === 'function') UpdatePayment();
                        } else {
                            if (typeof submitFunction === 'function') submitFunction(3);
                            localStorage.removeItem('autoDepositAmount');
                            localStorage.removeItem('autoDepositNotes');
                            localStorage.removeItem('updateInProgress');
                        }
                    }

                    if (attempts >= maxAttempts) clearInterval(interval);
                }, 100);
            }
        });
    }

    // ====================== CHARGES PAGE ONLY (strict isolation – nothing runs on Payments) ======================
    if (window.location.href.includes(CHARGES_PATH)) {
        let isFullView = localStorage.getItem('wcm-isFullView') !== 'false';

        function createPopup() {
            if (document.getElementById('wcm-suite-popup')) return;

            const popup = document.createElement('div');
            popup.id = 'wcm-suite-popup';

            const savedTop = localStorage.getItem('wcm-popup-top');
            const savedLeft = localStorage.getItem('wcm-popup-left');
            if (savedTop) popup.style.top = savedTop;
            if (savedLeft) popup.style.left = savedLeft;

            popup.innerHTML = `
                <div id="wcm-suite-header">
                    <span id="wcm-header-title"></span>
                    <div class="wcm-header-buttons">
                        <button id="wcm-toggle" class="wcm-toggle">−</button>
                        <button id="wcm-close" class="wcm-close">×</button>
                    </div>
                </div>
                <div class="wcm-content" id="wcm-content"></div>
            `;
            document.body.appendChild(popup);

            const tooltip = document.createElement('div');
            tooltip.id = 'wcm-peak-tooltip';
            document.body.appendChild(tooltip);

            let pos1=0,pos2=0,pos3=0,pos4=0;
            const header = popup.querySelector('#wcm-suite-header');
            header.onmousedown = e => {
                if (e.target.id === 'wcm-close' || e.target.id === 'wcm-toggle') return;
                e.preventDefault();
                pos3 = e.clientX; pos4 = e.clientY;
                document.onmouseup = () => {
                    localStorage.setItem('wcm-popup-top', popup.style.top);
                    localStorage.setItem('wcm-popup-left', popup.style.left);
                    document.onmouseup = document.onmousemove = null;
                };
                document.onmousemove = ev => {
                    pos1 = pos3 - ev.clientX; pos2 = pos4 - ev.clientY;
                    pos3 = ev.clientX; pos4 = ev.clientY;
                    popup.style.top = (popup.offsetTop - pos2) + "px";
                    popup.style.left = (popup.offsetLeft - pos1) + "px";
                };
            };

            renderContent(popup);
            checkEsignStatus();

            const observer = new MutationObserver(checkEsignStatus);
            observer.observe(document.body, { childList: true, subtree: true });
        }

        function renderContent(popup) {
            const data = calculateDeposit();
            const cf = calculateCF();
            const alertHTML = getAlerts() ? `<div class="wcm-alert">${getAlerts()}</div>` : '';
            const content = document.getElementById('wcm-content');
            const date = getPickupDate();
            const peakReason = cf.peakReason;
            const peakBadge = cf.isPeakRate ? `<span class="wcm-peak" data-reason="${peakReason}">🔥 Peak Rate</span>` : '';

            const headerTitle = document.getElementById('wcm-header-title');
            const header = popup.querySelector('#wcm-suite-header');
            const tooltip = document.getElementById('wcm-peak-tooltip');

            let tooltipColor;
            if (isSummerMode(date)) {
                headerTitle.textContent = 'WCM Summer Suite v5.36 ☀️';
                header.style.background = 'linear-gradient(90deg, #ff7e5f, #feb47b)';
                header.style.color = '#fff';
                tooltipColor = '#ff7e5f';
            } else {
                headerTitle.textContent = 'WCM Suite v5.36 ❄️';
                header.style.background = 'linear-gradient(90deg, #0288d1, #81d4fa)';
                header.style.color = '#fff';
                tooltipColor = '#0288d1';
            }
            tooltip.style.background = tooltipColor;

            const html = isFullView ? `
                ${alertHTML}
                <div class="wcm-row"><span class="wcm-label">Subtotal:</span><span class="wcm-value">$${data.subtotal}</span></div>
                <div class="wcm-row"><span class="wcm-label">Binding:</span><span class="wcm-value" style="color:#28a745">+$${data.extra}</span></div>
                <div class="wcm-row"><span class="wcm-label">Discount:</span><span class="wcm-value" style="color:#dc3545">-$${data.discount}</span></div>
                <div class="wcm-row"><span class="wcm-label">Total Est:</span><span class="wcm-value">$${data.totalEstimate}</span></div>
                <hr style="margin:6px 0">
                <div class="wcm-row" id="dep-click"><span class="wcm-label" style="font-weight:700">Deposit:</span><span class="wcm-deposit">$${data.deposit}</span></div>
                <div class="wcm-row"><span class="wcm-label">Remaining:</span><span class="wcm-value">$${data.remaining}</span></div>
                <div class="wcm-row"><span class="wcm-label">4.6% Fee:</span><span class="wcm-value">+$${data.ccFee}</span></div>
                <hr style="margin:6px 0">
                <div class="wcm-row"><span class="wcm-label">CF:</span><span class="wcm-value">${cf.cf} cf</span></div>
                <div class="wcm-row"><span class="wcm-label">Miles:</span><span class="wcm-value">${cf.miles} mi</span></div>
                <div class="wcm-row"><span class="wcm-label">CF Price:</span><span class="wcm-cf">${cf.pricePerCf}${peakBadge}</span></div>
            ` : `
                ${alertHTML}
                <div class="wcm-row"><span class="wcm-label">Subtotal:</span><span class="wcm-value">$${data.subtotal}</span></div>
                <div class="wcm-row"><span class="wcm-label">Binding:</span><span class="wcm-value" style="color:#28a745">+$${data.extra}</span></div>
                <div class="wcm-row"><span class="wcm-label">Discount:</span><span class="wcm-value" style="color:#dc3545">-$${data.discount}</span></div>
                <hr style="margin:6px 0">
                <div class="wcm-row" id="dep-click"><span class="wcm-label" style="font-weight:700">Deposit:</span><span class="wcm-deposit">$${data.deposit}</span></div>
                <hr style="margin:6px 0">
                <div class="wcm-row"><span class="wcm-label">CF Price:</span><span class="wcm-cf">${cf.pricePerCf}${peakBadge}</span></div>
            `;

            content.innerHTML = html;
            attachListeners(popup);
        }

        function attachListeners(popup) {
            document.getElementById('wcm-close').onclick = () => popup.style.display = 'none';

            document.getElementById('wcm-toggle').onclick = function() {
                isFullView = !isFullView;
                localStorage.setItem('wcm-isFullView', isFullView);
                this.textContent = isFullView ? '−' : '+';
                renderContent(popup);
            };

            const contentEl = document.getElementById('wcm-content');
            if (contentEl) {
                contentEl.addEventListener('click', function(e) {
                    if (e.target.closest('#dep-click')) {
                        const data = calculateDeposit();
                        localStorage.setItem('autoDepositAmount', data.rawDeposit.toFixed(2));
                        localStorage.setItem('autoDepositNotes', new Date().toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}));
                        setTimeout(() => {
                            if (typeof submitFunction === 'function') submitFunction(4);
                        }, 150);
                    }
                });
            }

            const tooltip = document.getElementById('wcm-peak-tooltip');
            const peakBadges = document.querySelectorAll('.wcm-peak');
            peakBadges.forEach(badge => {
                badge.onmousemove = (e) => {
                    tooltip.textContent = badge.getAttribute('data-reason') || 'Peak Rate Active';
                    const width = tooltip.offsetWidth || 140;
                    tooltip.style.left = (e.pageX - width - 12) + 'px';
                    tooltip.style.top = (e.pageY + 18) + 'px';
                    tooltip.style.opacity = '1';
                };
                badge.onmouseleave = () => tooltip.style.opacity = '0';
            });

            const cfPriceEls = document.querySelectorAll('.wcm-cf');
            cfPriceEls.forEach(el => {
                el.onclick = () => {
                    const priceInput = document.querySelector('input[name="I1PERCFLBS"]');
                    const lockCheckbox = document.querySelector('input[name="LCKPERCF"]');
                    const bindingSelect = document.querySelector('select[name="BINDING"]');
                    const extraText = document.querySelector('input[name="EXTRA1"]');
                    const submitBtn = document.querySelector('input[name="SUBMIT_3"]');

                    if (priceInput) priceInput.value = calculateCF().pricePerCf.replace('$','');
                    if (lockCheckbox) lockCheckbox.checked = true;
                    if (bindingSelect) bindingSelect.value = '1';
                    if (extraText) extraText.value = 'Origin and Destination';

                    if (submitBtn) setTimeout(() => submitBtn.click(), 300);
                };
            });
        }

        window.addEventListener('load', createPopup);
        setTimeout(() => { if (!document.getElementById('wcm-suite-popup')) createPopup(); }, 800);
    }
})();
