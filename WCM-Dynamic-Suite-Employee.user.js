// ==UserScript==
// @name         WCM Dynamic Suite v5.32 • Employee Edition
// @namespace    http://tampermonkey.net/
// @version      5.32
// @description  Exact Admin v3.04 CF math • +5% on Fri/Sat/Sun + last 3 days of month + all national holidays • Summer +15% (additional) • Enhanced holiday banner (X days before) • Peak Rate tooltip right-edge aligned + high-contrast • Esign Required tooltip • Deposit click FIXED (stable after updates) • Popup min/max state persists
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

    // ====================== DATE HELPERS ======================
    function getPickupDate() {
        const el = document.querySelector('input[name="PUDTE"]');
        if (!el || !el.value) return null;
        const [m, d, y] = el.value.split('/');
        return new Date(y, m-1, d);
    }

    function getLaborDay(year) {
        let d = new Date(year, 8, 1);
        while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
        return d;
    }

    function isSummerMode(date) {
        if (!date) return false;
        const year = date.getFullYear();
        const summerStart = new Date(year, 3, 1);
        const laborDay = getLaborDay(year);
        const summerEnd = new Date(laborDay); summerEnd.setDate(summerEnd.getDate() + 1);
        return date >= summerStart && date <= summerEnd;
    }

    function isFriSatSun(date) {
        if (!date) return false;
        const dow = date.getDay();
        return dow === 5 || dow === 6 || dow === 0;
    }

    function isLastThreeDaysOfMonth(date) {
        if (!date) return false;
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        return date.getDate() >= lastDay - 2;
    }

    // ====================== HOLIDAY SYSTEM ======================
    function getHolidayInfo(date) {
        if (!date) return { isHoliday: false, name: '', emoji: '', isFederal: false };
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const dow = date.getDay();
        const year = date.getFullYear();

        if (m === 1 && d === 1) return { isHoliday: true, name: "New Year’s", emoji: "🎉", isFederal: true };
        if (m === 1 && dow === 1 && d >= 15 && d <= 21) return { isHoliday: true, name: "MLK Day", emoji: "✊", isFederal: true };
        if (m === 2 && dow === 1 && d >= 15 && d <= 21) return { isHoliday: true, name: "Presidents’ Day", emoji: "🏛️", isFederal: true };
        if (m === 5 && dow === 1 && d >= 25) return { isHoliday: true, name: "Memorial Day", emoji: "🎗️", isFederal: true };
        if (m === 6 && d === 19) return { isHoliday: true, name: "Juneteenth", emoji: "🖤", isFederal: true };
        if (m === 7 && d === 4) return { isHoliday: true, name: "Independence Day", emoji: "🎆", isFederal: true };
        if (m === 9 && dow === 1 && d <= 7) return { isHoliday: true, name: "Labor Day", emoji: "🛠️", isFederal: true };
        if (m === 10 && dow === 1 && d >= 8 && d <= 14) return { isHoliday: true, name: "Columbus Day", emoji: "🗺️", isFederal: true };
        if (m === 11 && d === 11) return { isHoliday: true, name: "Veterans Day", emoji: "🎖️", isFederal: true };
        if (m === 11 && dow === 4 && d >= 22 && d <= 28) return { isHoliday: true, name: "Thanksgiving", emoji: "🦃", isFederal: true };
        if (m === 12 && d === 25) return { isHoliday: true, name: "Christmas", emoji: "🎄", isFederal: true };

        if (m === 2 && d === 14) return { isHoliday: true, name: "Valentine’s Day", emoji: "❤️", isFederal: false };
        if (m === 3 && d === 17) return { isHoliday: true, name: "St. Patrick’s Day", emoji: "🍀", isFederal: false };
        if (m === 5 && d === 5) return { isHoliday: true, name: "Cinco de Mayo", emoji: "🍹", isFederal: false };
        if (m === 10 && d === 31) return { isHoliday: true, name: "Halloween", emoji: "🎃", isFederal: false };
        if (m === 12 && d === 31) return { isHoliday: true, name: "New Year’s Eve", emoji: "🎊", isFederal: false };
        if ((m === 3 && d >= 22 && d <= 31) || (m === 4 && d >= 1 && d <= 25)) return { isHoliday: true, name: "Easter", emoji: "🐰", isFederal: false };
        if (m === 5 && dow === 0 && d >= 8 && d <= 14) return { isHoliday: true, name: "Mother’s Day", emoji: "💐", isFederal: false };
        if (m === 6 && dow === 0 && d >= 15 && d <= 21) return { isHoliday: true, name: "Father’s Day", emoji: "👔", isFederal: false };

        return { isHoliday: false, name: '', emoji: '', isFederal: false };
    }

    function getPeakReason(date) {
        if (!date) return '';
        let reasons = [];
        if (isFriSatSun(date)) reasons.push('Weekend');
        if (isLastThreeDaysOfMonth(date)) reasons.push('End of Month');
        const hol = getHolidayInfo(date);
        if (hol.isHoliday) reasons.push(hol.name);
        return reasons.length ? reasons.join(' + ') : '';
    }

    function getSurchargeMultiplier(date) {
        if (!date) return 1.0;
        let multiplier = 1.0;
        if (isFriSatSun(date) || isLastThreeDaysOfMonth(date) || getHolidayInfo(date).isHoliday) multiplier *= 1.05;
        if (isSummerMode(date)) multiplier *= 1.15;
        return multiplier;
    }

    function getAlerts() {
        const pickup = getPickupDate();
        let messages = [];
        if (!pickup) return '';

        const today = new Date();
        today.setHours(0,0,0,0);
        pickup.setHours(0,0,0,0);
        const diffDays = Math.ceil((pickup - today) / (1000*60*60*24));

        if (diffDays < 0) messages.push('⚠️ PICKUP DATE IN THE PAST!');
        else if (diffDays <= 2) messages.push(`⚠️ Pickup in ${diffDays} day${diffDays===1?'':'s'} — act fast!`);

        for (let offset = 0; offset <= 2; offset++) {
            const checkDate = new Date(pickup);
            checkDate.setDate(checkDate.getDate() + offset);
            const hol = getHolidayInfo(checkDate);
            if (hol.isHoliday) {
                let msg;
                if (offset === 0) {
                    msg = hol.isFederal 
                        ? `${hol.emoji} ${hol.name} – Holiday surcharge applies!`
                        : `${hol.emoji} ${hol.name}`;
                } else {
                    const dayWord = offset === 1 ? 'day' : 'days';
                    const surcharge = hol.isFederal ? ' – Holiday surcharge applies!' : '';
                    msg = `${hol.emoji} ${offset} ${dayWord} before ${hol.name}${surcharge}`;
                }
                messages.push(msg);
                break;
            }
        }
        return messages.length ? messages.join('<br>') : '';
    }

    // ====================== CALCULATIONS ======================
    function calculateDeposit() {
        const subtotalTds = document.querySelectorAll('td.TD7[align="right"][colspan="4"]');
        let subtotalText = subtotalTds.length ? subtotalTds[0].nextElementSibling.querySelector('b')?.textContent.trim() || '0' : '0';
        const subtotal = parseFloat(subtotalText.replace(/[$,]/g, '')) || 0;
        const extra = parseFloat(document.querySelector('input[name="EXTRA1AMT"]')?.value || 0) || 0;
        const discount = parseFloat(document.querySelector('input[name="DISCOUNT"]')?.value || 0) || 0;
        const deposit = subtotal * 0.2 + extra - discount;
        let totalEstimate = 0;
        document.querySelectorAll('td[colspan="4"]').forEach(td => {
            if (td.textContent.includes('Total Estimate')) totalEstimate = parseFloat(td.nextElementSibling.querySelector('b')?.textContent.replace(/[$,]/g,'') || 0);
        });
        const remaining = totalEstimate - deposit;
        const split = remaining / 2;
        const ccFee = deposit * 0.046;
        return { subtotal: subtotal.toFixed(2), extra: extra.toFixed(2), discount: discount.toFixed(2), deposit: deposit.toFixed(2), totalEstimate: totalEstimate.toFixed(2), remaining: remaining.toFixed(2), split: split.toFixed(2), ccFee: ccFee.toFixed(2), rawDeposit: deposit };
    }

    function calculateCF() {
        let cfInput = document.querySelector('input[name="CFLBS"]');
        let cf = cfInput ? parseFloat(cfInput.value) || 0 : 0;

        let distanceTd = Array.from(document.querySelectorAll('td.TD2')).find(td => td.textContent.includes('Distance:'));
        let miles = 0;
        if (distanceTd) {
            let text = distanceTd.textContent;
            let match = text.match(/Distance:\s*(\d+)\s*Miles/);
            if (match) miles = parseInt(match[1]);
        }

        let pricePerCf = 'Invalid';
        const date = getPickupDate();
        if (cf > 0 && miles > 0) {
            const p_short_300 = 2.13;
            const slope_short = -0.2 / 700;
            const p_long_300 = 3.75;
            const slope_long = -0.5 / 700;
            const delta = Math.max(0, Math.floor((cf - 300) / 75) * 75);
            let p_short = p_short_300 + slope_short * delta;
            let p_long = p_long_300 + slope_long * delta;
            p_short = Math.max(p_short, 0);
            p_long = Math.max(p_long, 0);

            const mi_min = 5;
            const mi_max = 1970;
            let frac = (miles - mi_min) / (mi_max - mi_min);
            frac = Math.max(0, Math.min(1, frac));
            let price = p_short + frac * (p_long - p_short);

            let minPrice = 1.60;
            if (miles > 2000) minPrice = 2.75;
            else if (miles > 1000) minPrice = 2.25;
            else if (miles < 100) minPrice = 1.00;

            price = Math.max(minPrice, Math.min(4.75, price));
            const multiplier = getSurchargeMultiplier(date);
            price = price * multiplier;
            price = Math.round(price / 0.05) * 0.05;
            pricePerCf = '$' + price.toFixed(2);
        }
        const peakReason = getPeakReason(date);
        return { cf, miles, pricePerCf, isPeakRate: !!peakReason, peakReason };
    }

    // ====================== ESIGN CHECK ======================
    function checkEsignStatus() {
        const bookButton = Array.from(document.querySelectorAll('input[type="button"], button'))
            .find(el => el.value && el.value.includes('Book This Job'));

        if (!bookButton) return;

        const esignRow = document.querySelector('tr[style*="font-family:Arial;font-size:10pt;"]');
        const hasEsignReceived = esignRow && esignRow.textContent.includes('Esign Received');

        if (hasEsignReceived) {
            bookButton.disabled = false;
            bookButton.style.opacity = '1';
            bookButton.style.cursor = 'pointer';
            bookButton.title = '';
        } else {
            bookButton.disabled = true;
            bookButton.style.opacity = '0.5';
            bookButton.style.cursor = 'not-allowed';
            bookButton.title = 'Esign Required Before Booking';
        }
    }

    // ====================== COMPACT POPUP ======================
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
            headerTitle.textContent = 'WCM Summer Suite v5.32 ☀️';
            header.style.background = 'linear-gradient(90deg, #ff7e5f, #feb47b)';
            header.style.color = '#fff';
            tooltipColor = '#ff7e5f';
        } else {
            headerTitle.textContent = 'WCM Suite v5.32 ❄️';
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

        // DEPOSIT CLICK – simplified keys + longer delay
        const content = document.getElementById('wcm-content');
        content.addEventListener('click', function(e) {
            if (e.target.closest('#dep-click')) {
                const data = calculateDeposit();
                localStorage.setItem('autoDepositAmount', data.rawDeposit.toFixed(2));
                localStorage.setItem('autoDepositNotes', new Date().toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}));
                setTimeout(() => {
                    if (typeof submitFunction === 'function') submitFunction(4);
                }, 150);
            }
        });

        // PEAK TOOLTIP
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

        // CF CLICK
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

    // ====================== PAYMENTS PAGE ======================
    if (window.location.href.includes(PAYMENTS_PATH)) {
        window.addEventListener('load', () => {
            const amt = localStorage.getItem('autoDepositAmount');
            const notes = localStorage.getItem('autoDepositNotes');

            if (amt && notes) {
                if (!localStorage.getItem('updateInProgress')) {
                    localStorage.setItem('updateInProgress','true');
                    document.querySelector('input[name="RSRV"]').checked = true;
                    document.querySelector('input[name="PAYAMT"]').value = amt;
                    document.querySelector('input[name="NOTES"]').value = notes;
                    if (typeof UpdatePayment === 'function') UpdatePayment();
                } else {
                    if (typeof submitFunction === 'function') submitFunction(3);
                    localStorage.removeItem('autoDepositAmount');
                    localStorage.removeItem('autoDepositNotes');
                    localStorage.removeItem('updateInProgress');
                }
            }
        });
    }

    // ====================== AUTO RUN ======================
    if (window.location.href.includes(CHARGES_PATH)) {
        window.addEventListener('load', createPopup);
        setTimeout(() => { if (!document.getElementById('wcm-suite-popup')) createPopup(); }, 800);
    }
})();
