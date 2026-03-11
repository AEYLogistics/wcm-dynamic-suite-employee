// ==UserScript==
// @name         WCM Dynamic Suite v5.48 • Employee Edition (Smart Loader)
// @namespace    http://tampermonkey.net/
// @version      5.48
// @description  Smart Loader: deposit handler runs DIRECTLY on Payments (no full script injected) • Full calculator ONLY fetched on Charges • No more addEventListener error
// @author       @Bakurki
// @match        https://zebra.hellomoving.com/wc.dll?*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const CHARGES_PATH = 'mpcharge~chargeswc~';
    const PAYMENTS_PATH = 'mpopr~paymentswc~';
    const FULL_CALCULATOR_URL = 'https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js';

    // ====================== PAYMENTS PAGE – DIRECT HANDLER (no full script ever loaded) ======================
    if (window.location.href.includes(PAYMENTS_PATH)) {
        console.log('✅ WCM v5.48 Smart Loader: PAYMENTS page – deposit handler active (no full code loaded)');
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
        return; // ← HARD STOP – NO FULL SCRIPT EVER LOADED HERE
    }

    // ====================== CHARGES PAGE ONLY – FETCH FULL CALCULATOR ======================
    if (window.location.href.includes(CHARGES_PATH)) {
        console.log('✅ WCM v5.48 Smart Loader: CHARGES page – fetching full calculator');
        GM_xmlhttpRequest({
            method: "GET",
            url: FULL_CALCULATOR_URL,
            onload: function(response) {
                const script = document.createElement('script');
                script.textContent = response.responseText;
                document.head.appendChild(script);
            }
        });
        return;
    }

    console.log('WCM v5.48 Smart Loader: Neither Charges nor Payments – exiting');
})();
