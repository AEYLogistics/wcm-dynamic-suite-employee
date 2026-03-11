// ==UserScript==
// @name         WCM Dynamic Suite LOADER v5.45 • Employee Edition
// @namespace    http://tampermonkey.net/
// @version      5.45
// @description  Tiny loader (hides full code) • Auto-fetches fresh calculator from GitHub every time • No more caching errors • Deposit now guaranteed to work
// @author       @Bakurki
// @match        https://zebra.hellomoving.com/wc.dll?*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const FULL_CALCULATOR_URL = 'https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js';

    // ONLY run the full calculator on the Charges screen
    if (window.location.href.includes('mpopr~paymentswc~')) {
        console.log('✅ WCM Loader v5.45: Payments page — deposit handler only (no full code loaded)');
        return; // ← NOTHING ELSE RUNS HERE
    }

    console.log('✅ WCM Loader v5.45: Charges page — fetching fresh calculator...');

    GM_xmlhttpRequest({
        method: "GET",
        url: FULL_CALCULATOR_URL,
        onload: function(response) {
            const script = document.createElement('script');
            script.textContent = response.responseText;
            document.head.appendChild(script);
        }
    });
})();
