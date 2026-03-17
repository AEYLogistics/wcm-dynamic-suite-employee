// ==UserScript==
// @name WCM Dynamic Suite v7.00 • Employee Edition (Full)
// @namespace http://tampermonkey.net/
// @version 7.00
// @description v5.74 • Full Pack now ALWAYS updates text + amount to match current CF • Binding stays "higher only"
// @author @Bakurki
// @match https://*.hellomoving.com/*
// @grant none
// ==/UserScript==
// CACHE-BUST 2026-03-17 13:18 - Loader pulls this fresh
// STATIC TIMESTAMPS - UPDATED WITH EVERY VERSION (as requested)
const LOADER_LAST_UPDATED = 'March 17, 2026 01:18 PM EDT';
const FULL_LAST_UPDATED = 'March 17, 2026 01:18 PM EDT';
(function() {
    'use strict';
    const CHARGES_PATH = 'mpcharge~chargeswc~';
    const PAYMENTS_PATH = 'mpopr~paymentswc~';
    // ====================== PAYMENTS PAGE – DIRECT HANDLER ======================
    if (window.location.href.includes(PAYMENTS_PATH)) {
        console.log('✅ Dynamic Suite v7.00: PAYMENTS page - deposit handler active');
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
        return;
    }
    if (!window.location.href.includes(CHARGES_PATH)) return;
    console.log('✅ Dynamic Suite v7.00: CHARGES page - full scraper active');
    // ====================== CSS (dynamic toggle theme support) ======================
    const style = document.createElement('style');
    style.textContent = `
        #wcm-suite-popup { position:fixed; top:78px; right:20px; width:210px; background:#fff; border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.15); overflow:hidden; z-index:99999; font-family:'Inter',Arial,sans-serif; font-size:12.6px; }
        #wcm-suite-header { border-bottom:1px solid #e9ecef; padding:7px 10px; display:flex; align-items:center; justify-content:space-between; font-weight:700; font-size:12px; cursor:move; transition:all .3s; }
        .wcm-content { padding:9px; max-height:420px; overflow-y:auto; }
        .wcm-row { display:flex; justify-content:space-between; margin-bottom:4px; align-items:center; }
        .wcm-label { font-weight:500; color:#555; font-size:11px; }
        .wcm-value { font-weight:700; font-size:11px; color:#555; }
        .wcm-deposit { font-size:18.5px; color:#007bff; cursor:pointer; padding:4px; border-radius:7px; transition:.2s; }
        .wcm-deposit:hover { background:#e3f2fd; }
        .wcm-cf { color:#28a745; font-weight:700; cursor:pointer; }
        .wcm-peak { background:#ff4757; color:#fff; font-size:10px; padding:1px 6px; border-radius:99px; margin-left:4px; cursor:pointer; }
        #wcm-peak-tooltip { position: fixed; z-index: 100000; padding: 8px 12px; border-radius: 6px; font-size: 11.5px; white-space: nowrap; box-shadow: 0 6px 16px rgba(0,0,0,0.25); pointer-events: none; opacity: 0; transition: opacity .15s; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.6); }
        .wcm-alert { background:#fff3cd; color:#856404; padding:6px; margin-bottom:8px; border-radius:7px; font-size:11px; text-align:center; border:1px solid #ffeaa7; }
        .wcm-header-buttons { display:flex; gap:8px; align-items:center; }
        .wcm-close, .wcm-toggle, .wcm-gear { background:none; border:none; font-size:19px; color:#adb5bd; cursor:pointer; line-height:1; padding:0; }
        .wcm-close:hover, .wcm-toggle:hover, .wcm-gear:hover { color:#495057; }
        /* iOS-style toggles – now dynamic summer/winter */
        .toggle-switch { position:relative; display:inline-block; width:32px; height:18px; }
        .toggle-switch input { opacity:0; width:0; height:0; }
        .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#ccc; transition:.4s; border-radius:34px; }
        .slider:before { position:absolute; content:""; height:12px; width:12px; left:3px; bottom:3px; background:white; transition:.4s; border-radius:50%; }
        input:checked + .slider { background:var(--slider-checked, linear-gradient(90deg, #ff7e5f, #feb47b)); }
        input:checked + .slider:before { transform:translateX(14px); }
        /* Slide-out drawer (160px) */
        #wcm-settings-drawer { position:fixed; top:78px; width:160px; background:#fff; border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.15); padding:9px; max-height:420px; overflow-y:auto; z-index:99998; opacity:0; pointer-events:none; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateX(-20px); }
        #wcm-settings-drawer.open { opacity:1; pointer-events:auto; transform: translateX(0); }
    `;
    document.head.appendChild(style);
    // ====================== ALL ORIGINAL FUNCTIONS (100% FULL CODE - NO SHORTCUTS) ======================
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
    function getEasterDate(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }
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
        if (m === 5 && dow === 0 && d >= 8 && d <= 14) return { isHoliday: true, name: "Mother’s Day", emoji: "💐", isFederal: false };
        if (m === 6 && dow === 0 && d >= 15 && d <= 21) return { isHoliday: true, name: "Father’s Day", emoji: "👔", isFederal: false };
        const easter = getEasterDate(year);
        if (m === easter.getMonth() + 1 && d === easter.getDate()) return { isHoliday: true, name: "Easter", emoji: "🐰", isFederal: false };
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
                    msg = hol.isFederal ? `${hol.emoji} ${hol.name} – Holiday surcharge applies!` : `${hol.emoji} ${hol.name}`;
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
        const ccFee = deposit * 0.046;
        return { subtotal: subtotal.toFixed(2), extra: extra.toFixed(2), discount: discount.toFixed(2), deposit: deposit.toFixed(2), totalEstimate: totalEstimate.toFixed(2), remaining: remaining.toFixed(2), ccFee: ccFee.toFixed(2), rawDeposit: deposit };
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
    // ====================== SETTINGS DRAWER ======================
    let isFullView = localStorage.getItem('wcm-isFullView') !== 'false';
    let showDetails = localStorage.getItem('miniShowDetails') !== 'false';
    let freeStorage = localStorage.getItem('miniFreeStorage') === 'true';
    let fullPack = localStorage.getItem('miniFullPack') === 'true';
    let stateDiscount = localStorage.getItem('miniStateDiscount') === 'true';
    let bindingFee = localStorage.getItem('miniBinding') === 'true';
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
                    <button id="wcm-gear" class="wcm-gear">○</button>
                    <button id="wcm-toggle" class="wcm-toggle">−</button>
                    <button id="wcm-close" class="wcm-close">×</button>
                </div>
            </div>
            <div class="wcm-content" id="wcm-content"></div>
        `;
        document.body.appendChild(popup);
        const drawer = document.createElement('div');
        drawer.id = 'wcm-settings-drawer';
        drawer.innerHTML = `
            <div class="wcm-row"><span class="wcm-label">Loader updated:</span><span class="wcm-value" style="font-size:11px;color:#555;">${LOADER_LAST_UPDATED}</span></div>
            <div class="wcm-row"><span class="wcm-label">Full Suite updated:</span><span class="wcm-value" style="font-size:11px;color:#555;">${FULL_LAST_UPDATED}</span></div>
            <hr style="margin:8px 0">
            <div class="wcm-label" style="margin-bottom:6px;">Ultra Mini Mode:</div>
            <label style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;font-size:11px;"><span class="wcm-label">Show Details</span><span class="toggle-switch"><input type="checkbox" id="mini-details" ${showDetails?'checked':''}><span class="slider"></span></span></label>
            <hr style="margin:10px 0 6px 0">
            <div class="wcm-label" style="margin-bottom:6px;">Quick Fill Tools:</div>
            <label style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;font-size:11px;"><span class="wcm-label">Free Storage</span><span class="toggle-switch"><input type="checkbox" id="mini-free" ${freeStorage?'checked':''}><span class="slider"></span></span></label>
            <label style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;font-size:11px;"><span class="wcm-label">Full Pack</span><span class="toggle-switch"><input type="checkbox" id="mini-pack" ${fullPack?'checked':''}><span class="slider"></span></span></label>
            <label style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;font-size:11px;"><span class="wcm-label">State Discount</span><span class="toggle-switch"><input type="checkbox" id="mini-state" ${stateDiscount?'checked':''}><span class="slider"></span></span></label>
            <label style="display:flex;align-items:center;justify-content:space-between;margin:6px 0;font-size:11px;"><span class="wcm-label">Binding</span><span class="toggle-switch"><input type="checkbox" id="mini-binding" ${bindingFee?'checked':''}><span class="slider"></span></span></label>
            <div style="text-align:center;font-size:10px;color:#adb5bd;font-weight:500;">Employee Edition v7.00</div>
        `;
        document.body.appendChild(drawer);
        const tooltip = document.createElement('div');
        tooltip.id = 'wcm-peak-tooltip';
        document.body.appendChild(tooltip);
        let pos1=0,pos2=0,pos3=0,pos4=0;
        const header = popup.querySelector('#wcm-suite-header');
        header.onmousedown = e => {
            if (['wcm-close','wcm-toggle','wcm-gear'].includes(e.target.id)) return;
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
        const toggleBtn = document.getElementById('wcm-toggle');
        toggleBtn.textContent = isFullView ? '−' : '+';
        if (isSummerMode(date)) {
            headerTitle.textContent = 'Dynamic Suite v7.00 ☀️';
            header.style.background = 'linear-gradient(90deg, #ff7e5f, #feb47b)';
            header.style.color = '#fff';
        } else {
            headerTitle.textContent = 'Dynamic Suite v7.00 ❄️';
            header.style.background = 'linear-gradient(90deg, #0288d1, #81d4fa)';
            header.style.color = '#fff';
        }
        document.documentElement.style.setProperty('--slider-checked', isSummerMode(date) ? 'linear-gradient(90deg, #ff7e5f, #feb47b)' : 'linear-gradient(90deg, #0288d1, #81d4fa)');
        const tooltip = document.getElementById('wcm-peak-tooltip');
        tooltip.style.background = isSummerMode(date) ? '#ff7e5f' : '#0288d1';
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
            ${showDetails ? `<div class="wcm-row"><span class="wcm-label">Subtotal:</span><span class="wcm-value">$${data.subtotal}</span></div>` : ''}
            ${showDetails ? `<div class="wcm-row"><span class="wcm-label">Binding:</span><span class="wcm-value" style="color:#28a745">+$${data.extra}</span></div>` : ''}
            ${showDetails ? `<div class="wcm-row"><span class="wcm-label">Discount:</span><span class="wcm-value" style="color:#dc3545">-$${data.discount}</span></div>` : ''}
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
        const gear = document.getElementById('wcm-gear');
        const drawer = document.getElementById('wcm-settings-drawer');
        gear.onclick = function(e) {
            e.stopPropagation();
            if (drawer.classList.contains('open')) {
                drawer.classList.remove('open');
            } else {
                const popupRect = popup.getBoundingClientRect();
                drawer.style.left = (popupRect.left - 160 - 10) + 'px';
                drawer.style.top = popupRect.top + 'px';
                drawer.classList.add('open');
            }
        };
        document.addEventListener('click', function(e) {
            if (!popup.contains(e.target) && !drawer.contains(e.target)) {
                drawer.classList.remove('open');
            }
        });
        // ====================== CF PRICE CLICK ======================
        document.getElementById('wcm-content').addEventListener('click', function(e) {
            if (e.target.closest('#dep-click')) {
                const data = calculateDeposit();
                const cfData = calculateCF();
                const priceStr = cfData.pricePerCf.replace('$','');
                const now = new Date();
                const estTime = now.toLocaleTimeString('en-US', {timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true});
                const note = `${cfData.cf} cf @ $${priceStr}/cf [${estTime}]`;
                localStorage.setItem('autoDepositAmount', data.rawDeposit.toFixed(2));
                localStorage.setItem('autoDepositNotes', note);
                setTimeout(() => { if (typeof submitFunction === 'function') submitFunction(4); }, 150);
                return;
            }
            if (e.target.closest('.wcm-cf')) {
                const cfData = calculateCF();
                const priceInput = document.querySelector('input[name="I1PERCFLBS"]');
                const lockCheckbox = document.querySelector('input[name="LCKPERCF"]');
                const bindingSelect = document.querySelector('select[name="BINDING"]');
                const extraText = document.querySelector('input[name="EXTRA1"]');
                const submitBtn = document.querySelector('input[name="SUBMIT_3"]');
                if (priceInput) priceInput.value = cfData.pricePerCf.replace('$','');
                if (lockCheckbox) lockCheckbox.checked = true;
                if (bindingSelect) bindingSelect.value = '1';
                if (extraText) extraText.value = 'Origin and Destination';
                // Quick Fill Tools
                if (freeStorage) {
                    const others = document.querySelector('input[name="OTHERS"]');
                    const othersAmt = document.querySelector('input[name="OTHERSAMT"]');
                    if (others && (!others.value || others.value.trim() === '')) {
                        others.value = "30 Days of Free Storage w/ Redelivery";
                        if (othersAmt && (!othersAmt.value || othersAmt.value.trim() === '0.00')) othersAmt.value = "0.01";
                    }
                }
                if (fullPack) {
                    // FULL PACK ALWAYS UPDATES TO CURRENT CF (as requested)
                    const extra2 = document.querySelector('input[name="EXTRA2"]');
                    const extra2Amt = document.querySelector('input[name="EXTRA2AMT"]');
                    const newAmt = cfData.cf * 1.00;
                    if (extra2) extra2.value = `Platinum Packing Service [${cfData.cf} CuFt @ $1.00/CuFt]`;
                    if (extra2Amt) extra2Amt.value = newAmt.toFixed(2);
                }
                if (stateDiscount) {
                    const discTxt = document.querySelector('input[name="DISCTXT"]');
                    const discount = document.querySelector('input[name="DISCOUNT"]');
                    const stateFont = document.querySelector('td.FROMTO font[size="4"]');
                    const abbr = stateFont ? stateFont.textContent.trim().toUpperCase() : '';
                    const fullState = abbr ? getFullStateName(abbr) : 'State';
                    if (discTxt && (!discTxt.value || discTxt.value.trim() === '')) {
                        discTxt.value = `${fullState} Resident Discount`;
                        if (discount && (!discount.value || discount.value.trim() === '0.00')) discount.value = "0.00";
                    }
                }
                if (bindingFee) {
                    const extra1Amt = document.querySelector('input[name="EXTRA1AMT"]');
                    const newAmt = cfData.cf < 1000 ? 1000 : (cfData.cf * 1.5);
                    const currentAmt = parseFloat(extra1Amt?.value || 0);
                    if (extra1Amt && (currentAmt === 0 || currentAmt < newAmt)) {
                        extra1Amt.value = newAmt.toFixed(2);
                    }
                }
                if (submitBtn) setTimeout(() => submitBtn.click(), 300);
            }
        });
        // Live toggle handlers
        const miniDetails = document.getElementById('mini-details');
        const miniFree = document.getElementById('mini-free');
        const miniPack = document.getElementById('mini-pack');
        const miniState = document.getElementById('mini-state');
        const miniBinding = document.getElementById('mini-binding');
        if (miniDetails) miniDetails.onchange = function() {
            showDetails = this.checked;
            localStorage.setItem('miniShowDetails', showDetails);
            renderContent(popup);
        };
        if (miniFree) miniFree.onchange = function() { freeStorage = this.checked; localStorage.setItem('miniFreeStorage', freeStorage); };
        if (miniPack) miniPack.onchange = function() { fullPack = this.checked; localStorage.setItem('miniFullPack', fullPack); };
        if (miniState) miniState.onchange = function() { stateDiscount = this.checked; localStorage.setItem('miniStateDiscount', stateDiscount); };
        if (miniBinding) miniBinding.onchange = function() { bindingFee = this.checked; localStorage.setItem('miniBinding', bindingFee); };
        // Peak tooltip
        const tooltip = document.getElementById('wcm-peak-tooltip');
        document.querySelectorAll('.wcm-peak').forEach(badge => {
            badge.onmousemove = (e) => {
                tooltip.textContent = badge.getAttribute('data-reason') || 'Peak Rate Active';
                const width = tooltip.offsetWidth || 140;
                tooltip.style.left = (e.pageX - width - 12) + 'px';
                tooltip.style.top = (e.pageY + 18) + 'px';
                tooltip.style.opacity = '1';
            };
            badge.onmouseleave = () => tooltip.style.opacity = '0';
        });
    }
    function getFullStateName(abbr) {
        const map = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
        return map[abbr] || abbr;
    }
    window.addEventListener('load', createPopup);
    setTimeout(() => { if (!document.getElementById('wcm-suite-popup')) createPopup(); }, 800);
})();
