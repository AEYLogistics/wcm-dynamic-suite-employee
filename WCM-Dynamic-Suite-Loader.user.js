// ==UserScript==
// @name         WCM Dynamic Suite Loader v5.22
// @namespace    http://tampermonkey.net/
// @version      5.22
// @description  Loads the full WCM Dynamic Suite from GitHub (real code stays hidden)
// @author       @Bakurki
// @match        https://zebra.hellomoving.com/wc.dll?*
// @grant        GM_xmlhttpRequest
// @updateURL    https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js
// @downloadURL  https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js
// ==/UserScript==

(function() {
    'use strict';

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://github.com/AEYLogistics/wcm-dynamic-suite-employee/raw/refs/heads/main/WCM-Dynamic-Suite-Employee.user.js",
        onload: function(response) {
            if (response.status === 200) {
                const script = document.createElement('script');
                script.textContent = response.responseText;
                document.head.appendChild(script);
            } else {
                console.error('Failed to load WCM Dynamic Suite');
            }
        }
    });
})();