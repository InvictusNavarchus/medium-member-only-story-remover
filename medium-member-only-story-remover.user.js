// ==UserScript==
// @name         Medium Member-Only Post Remover
// @namespace    https://github.com/InvictusNavarchus/medium-member-only-story-remover
// @icon         https://www.google.com/s2/favicons?sz=64&domain=medium.com
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/medium-member-only-story-remover/master/medium-member-only-story-remover.user.js
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/medium-member-only-story-remover/master/medium-member-only-story-remover.user.js
// @supportURL   https://github.com/InvictusNavarchus/medium-member-only-story-remover
// @version      0.1.0
// @description  Removes member-only posts from Medium homepage
// @author       Invictus Navarchus
// @match        https://medium.com/*
// @grant        GM_log
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const DEBUG = true; // Set to true to enable detailed logging

    function log(...args) {
        if (DEBUG) {
            if (typeof GM_log === 'function') {
                GM_log(args.join(' '));
            } else {
                console.log('[MRO_Debug]', ...args);
            }
        }
    }

    log('Medium Member-Only Post Remover v1.5 - Script Loaded.');

    const memberIconSelector = 'svg path[fill="#FFC017"]';
    const memberButtonSelector = 'button[aria-label="Member-only story"]';

    function findArticleCard(element) {
        log(`findArticleCard: Starting search from element:`, element.tagName, `Class: '${element.className || 'N/A'}'`);
        let currentElement = element;
        let i; // Declare i here for broader scope

        // Rule A: Try to find the closest <article> tag first - this is often the main container for posts.
        const articleAncestor = element.closest('article');
        if (articleAncestor) {
            // Ensure it's not selecting the entire main content area if an article tag is used too high up.
            // Check if it has a data-testid="post-preview" or contains typical post elements like an H2.
            if (articleAncestor.matches('[data-testid="post-preview"]') || articleAncestor.querySelector('h2')) {
                 log(`findArticleCard: Matched Rule A (closest <article>). Card:`, articleAncestor.tagName, `Class: '${articleAncestor.className || 'N/A'}', ID: '${articleAncestor.id || 'N/A'}'`);
                 return articleAncestor;
            } else {
                log(`findArticleCard: Rule A found <article> but it might be too broad. Element:`, articleAncestor.tagName, `Class: '${articleAncestor.className || 'N/A'}'`);
            }
        } else {
            log(`findArticleCard: Rule A - No <article> ancestor found directly.`);
        }


        for (i = 0; i < 15; i++) {
            if (!currentElement || currentElement.tagName === 'BODY' || currentElement.tagName === 'HTML' || currentElement.id === 'root') {
                log(`findArticleCard: currentElement is null, BODY, HTML, or #root at iteration ${i}. Aborting search for this branch.`);
                return null;
            }
            log(`findArticleCard: Iteration ${i}, currentElement:`, currentElement.tagName, `Class: '${currentElement.className || 'N/A'}', ID: '${currentElement.id || 'N/A'}'`);

            const parent = currentElement.parentElement;
            if (!parent) {
                log(`findArticleCard: currentElement has no parent at iteration ${i}.`);
                return null;
            }

            // Rule 0: Prevent selecting known broad section containers (like Staff Picks section header or right sidebar)
            const h2 = currentElement.querySelector('h2');
            if (h2 && h2.textContent.trim() === "Staff Picks" && currentElement.matches('.fb.fc.fd.y')) {
                 log(`findArticleCard: Rule 0 - currentElement is the Staff Picks main container. Rejecting and going to parent.`);
                 currentElement = parent;
                 continue;
            }
            if (currentElement.matches('.ed.ee.et.eu.ev') || (currentElement.matches('.fb.fc.fd.y') && !currentElement.matches('.gc.y'))) { // .gc.y is an individual staff pick item
                 log(`findArticleCard: Rule 0 - currentElement matches known broad container selector. Going to parent.`);
                 currentElement = parent;
                 continue;
            }

            // Rule 1: Staff Picks individual item structure
            // An item is <div class="gc y">, its parent is <div class="dl y">
            if (currentElement.classList && currentElement.classList.contains('gc') && currentElement.classList.contains('y') &&
                parent.classList && parent.classList.contains('dl') && parent.classList.contains('y')) {
                log(`findArticleCard: Matched Rule 1 (Staff Picks Item). Card:`, currentElement.tagName, currentElement.className);
                const itemH2 = currentElement.querySelector('h2');
                if (itemH2 && itemH2.textContent.trim() === "Staff Picks") {
                    log(`findArticleCard: Rule 1 sanity check failed - H2 is "Staff Picks". Continuing search upwards.`);
                    currentElement = parent;
                    continue;
                }
                return currentElement;
            }

            // Rule 2: Element is an <article> tag (already handled by Rule A, but keep as fallback during iteration)
            if (currentElement.tagName === 'ARTICLE' && (currentElement.matches('[data-testid="post-preview"]') || currentElement.querySelector('h2'))) {
                log(`findArticleCard: Matched Rule 2 (<article> tag during iteration). Card:`, currentElement.tagName, currentElement.className);
                return currentElement;
            }

            // Rule 3: Element is a DIV that is a direct parent of an <article data-testid="post-preview"> tag
            if (currentElement.tagName === 'DIV') {
                const directArticleChild = Array.from(currentElement.children).find(child => child.tagName === 'ARTICLE' && child.matches('[data-testid="post-preview"]'));
                if (directArticleChild) {
                    log(`findArticleCard: Matched Rule 3 (DIV direct parent of <article data-testid="post-preview">). Card:`, currentElement.tagName, currentElement.className);
                    return currentElement;
                }
            }

            // Rule 4: Generic feed item structure for main feed (often an article's direct parent div)
            // Based on new HTML, this is often <div class="n y"> containing the <article>
            // or the <div class="gf mb mc md"> which contains multiple articles. We want the <article> or its immediate parent.
            // The structure seems to be: article > div.gq.y > div.n.bb > ...
            // Let's look for a div that has `role="link"` and `data-href` as these often wrap the clickable area of a post.
            if (currentElement.tagName === 'DIV' && currentElement.getAttribute('role') === 'link' && currentElement.hasAttribute('data-href')) {
                // Check if this div contains an h2 and the original member icon/button
                if (currentElement.querySelector('h2') && currentElement.contains(element)) {
                    log(`findArticleCard: Matched Rule 4 (DIV with role=link, data-href, H2, and original element). Card:`, currentElement.tagName, currentElement.className);
                    return currentElement;
                }
            }
            // More general structure for main feed items: <div class="pj n y"> contains <article>
            // Or <div class="gf mb mc md"> contains <div class="pj n y">
            // We want to target the <article> tag or its closest distinctive wrapper.
            // If currentElement is a DIV with class 'pj n y' and contains an article, it's a good candidate.
            if (currentElement.matches('div.pj.n.y') && currentElement.querySelector('article[data-testid="post-preview"]')) {
                 log(`findArticleCard: Matched Rule 4 variant (div.pj.n.y containing article). Card:`, currentElement.tagName, currentElement.className);
                 return currentElement.querySelector('article[data-testid="post-preview"]') || currentElement; // Prefer the article itself
            }


            currentElement = parent;
        }

        log(`findArticleCard: All checks failed after ${i} iterations. Could not find a suitable article card for element:`, element.tagName, `Class: '${element.className || 'N/A'}'`);
        return null;
    }

    function removeMemberOnlyPosts(rootElement = document.body) {
        log(`removeMemberOnlyPosts: Scanning within root:`, rootElement.tagName, (rootElement === document.body ? 'document.body' : `Class: '${rootElement.className || 'N/A'}' ID: '${rootElement.id || 'N/A'}'`));

        const icons = rootElement.querySelectorAll(memberIconSelector);
        log(`removeMemberOnlyPosts: Found ${icons.length} elements matching memberIconSelector.`);
        icons.forEach((icon, idx) => {
            log(`removeMemberOnlyPosts: Processing icon ${idx + 1}/${icons.length}:`, icon);
            const buttonElement = icon.closest('button');
            const elementToTrace = buttonElement || icon;
            const articleCard = findArticleCard(elementToTrace);

            if (articleCard) {
                const titleEl = articleCard.querySelector('h2');
                const title = titleEl ? titleEl.textContent.trim() : (articleCard.querySelector('a[data-href]')?.getAttribute('data-href') || articleCard.querySelector('a')?.href || 'No title/link found');

                if (titleEl && titleEl.textContent.trim() === "Staff Picks" && (articleCard.matches('.fb.fc.fd.y') || (titleEl && titleEl.parentElement && titleEl.parentElement.classList.contains('gb')) )) {
                    log(`removeMemberOnlyPosts (ICON): CRITICAL - Identified card is the "Staff Picks" section header/container. SKIPPING REMOVAL. Card:`, articleCard.tagName, articleCard.className);
                    return;
                }

                log(`removeMemberOnlyPosts (ICON): Identified article card for removal. Title/Link: "${title}". Card:`, articleCard.tagName, `Class: '${articleCard.className || 'N/A'}'`);
                if (document.body.contains(articleCard)) {
                    log(`removeMemberOnlyPosts (ICON): Removing card: "${title}"`);
                    articleCard.remove();
                } else {
                    log(`removeMemberOnlyPosts (ICON): Card "${title}" already removed or not in document.`);
                }
            } else {
                log(`removeMemberOnlyPosts (ICON): No article card found for icon:`, icon);
            }
        });

        const buttons = rootElement.querySelectorAll(memberButtonSelector);
        log(`removeMemberOnlyPosts: Found ${buttons.length} elements matching memberButtonSelector.`);
        buttons.forEach((button, idx) => {
            log(`removeMemberOnlyPosts: Processing button ${idx + 1}/${buttons.length} with aria-label:`, button);
            const articleCard = findArticleCard(button);
            if (articleCard) {
                const titleEl = articleCard.querySelector('h2');
                const title = titleEl ? titleEl.textContent.trim() : (articleCard.querySelector('a[data-href]')?.getAttribute('data-href') || articleCard.querySelector('a')?.href || 'No title/link found');

                if (titleEl && titleEl.textContent.trim() === "Staff Picks" && (articleCard.matches('.fb.fc.fd.y') || (titleEl && titleEl.parentElement && titleEl.parentElement.classList.contains('gb')) )) {
                    log(`removeMemberOnlyPosts (BUTTON): CRITICAL - Identified card is the "Staff Picks" section header/container. SKIPPING REMOVAL. Card:`, articleCard.tagName, articleCard.className);
                    return;
                }

                log(`removeMemberOnlyPosts (BUTTON): Identified article card for removal. Title/Link: "${title}". Card:`, articleCard.tagName, `Class: '${articleCard.className || 'N/A'}'`);
                if (document.body.contains(articleCard)) {
                    log(`removeMemberOnlyPosts (BUTTON): Removing card: "${title}"`);
                    articleCard.remove();
                } else {
                    log(`removeMemberOnlyPosts (BUTTON): Card "${title}" already removed or not in document.`);
                }
            } else {
                log(`removeMemberOnlyPosts (BUTTON): No article card found for button:`, button);
            }
        });
        log(`removeMemberOnlyPosts: Scan finished for root:`, rootElement.tagName);
    }

    requestAnimationFrame(() => {
        log('Initial scan triggered by requestAnimationFrame.');
        removeMemberOnlyPosts();
        log('Initial scan complete.');
    });

    const observer = new MutationObserver(mutationsList => {
        // log(`MutationObserver: Detected ${mutationsList.length} mutations.`); // Can be too verbose
        let processedMutation = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Only log if it's a significant node, e.g. contains articles or is an article itself
                        if (node.querySelector('article') || node.tagName === 'ARTICLE' || node.querySelector(memberIconSelector) || node.querySelector(memberButtonSelector)) {
                           log(`MutationObserver: Added node is an ELEMENT_NODE. Tag: ${node.tagName}, Class: '${node.className || 'N/A'}'. Scanning it.`);
                        }
                        removeMemberOnlyPosts(node);
                        processedMutation = true;
                    }
                });
            }
        }
        // if(processedMutation) log(`MutationObserver: Finished processing added nodes for this batch of mutations.`);
    });

    log('Setting up MutationObserver on document.body.');
    observer.observe(document.body, { childList: true, subtree: true });

    log('Medium Member-Only Post Remover v1.5 is active with enhanced logging.');

})();
