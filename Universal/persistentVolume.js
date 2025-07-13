// ==UserScript==
// @name         HTML5 Volume Saver
// @namespace    http://tampermonkey.net/
// @version      2025-07-13
// @description  Saves and applies HTML5 video/audio volume settings on a per-site basis.
// @author       CrimsonTomato
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Get the hostname of the current site (e.g., "www.youtube.com")
    // This will be our unique key for storing the volume.
    const siteKey = window.location.hostname;
    const DEFAULT_VOLUME = 1.0; // 100% volume for sites you visit for the first time.

    let siteSpecificVolume = null;

    // --- Core Functions ---

    // 1. Function to save the volume level for the current site
    async function saveVolume(volume) {
        // Only write to storage if the volume has actually changed
        if (volume !== siteSpecificVolume) {
            siteSpecificVolume = volume;
            // Use the site's hostname as the key
            await GM_setValue(siteKey, volume);
        }
    }

    // 2. Function to apply the saved volume to a media element
    async function applyVolume(element) {
        // If we haven't loaded the volume for this site yet, do it once.
        if (siteSpecificVolume === null) {
            // Retrieve the volume using the site's hostname, or use the default.
            siteSpecificVolume = await GM_getValue(siteKey, DEFAULT_VOLUME);
        }

        // Set the volume.
        element.volume = siteSpecificVolume;

        // If the saved volume is greater than 0, also un-mute the element.
        // This prevents videos from staying muted if you previously set the volume to 0.
        if (siteSpecificVolume > 0) {
            element.muted = false;
        }

        // Listen for when the user manually changes the volume on this element
        element.addEventListener('volumechange', handleVolumeChange);
    }

    // 3. Event handler that triggers when a user adjusts volume
    function handleVolumeChange(event) {
        // When the volume is changed, save the new level.
        const newVolume = event.target.volume;
        saveVolume(newVolume);
    }


    // --- Element Discovery using MutationObserver ---

    // The observer efficiently finds <video> and <audio> tags as they are added to the page.
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the new element is a media tag
                    if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                        applyVolume(node);
                    }
                    // Check if the new element *contains* any media tags
                    node.querySelectorAll('video, audio').forEach(applyVolume);
                }
            }
        }
    });

    // Start observing the page for changes as early as possible.
    observer.observe(document, {
        childList: true,
        subtree: true
    });

    // In case some elements loaded before the observer started, run it once on existing media.
    document.querySelectorAll('video, audio').forEach(applyVolume);
})();