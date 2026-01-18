
// content_disqus.js

console.log("Disqus Downvoter: Content script loaded on " + window.location.href);

let rules = [];
let stats = { total: 0, byUser: {} };
let processedPostIds = [];

// Load rules, stats, and processed IDs initially
chrome.storage.local.get(['rules', 'stats', 'processedPostIds'], (result) => {
    rules = result.rules || [];
    stats = result.stats || { total: 0, byUser: {} };
    processedPostIds = result.processedPostIds || [];
    console.log("Disqus Downvoter: Loaded " + rules.length + " rules and " + processedPostIds.length + " processed posts.");

    // Start observing if we are in a Disqus iframe frame
    // Usually Disqus loads comments in an iframe. The manifest matches *://*.disqus.com/embed/comments/*
    // So this script runs INSIDE the iframe.
    startObserver();
});

// Listen for updates to rules (e.g. if user changes settings while page is open)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.rules) {
            rules = changes.rules.newValue;
            console.log("Disqus Downvoter: Rules updated.");
        }
        if (changes.stats) {
            stats = changes.stats.newValue;
        }
        if (changes.processedPostIds) {
            processedPostIds = changes.processedPostIds.newValue;
        }
    }
});

function startObserver() {
    // The comments in Disqus usually have a container.
    // We'll observe the body or a specific container for new nodes.
    // structure often: #post-list .post

    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element
                        // Check if the node itself is a post or contains posts
                        if (node.matches && node.matches('.post')) {
                            processPost(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('.post').forEach(post => processPost(post));
                        }
                    }
                });
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    // Also process existing posts
    document.querySelectorAll('.post').forEach(post => processPost(post));
}

function processPost(postNode) {
    if (postNode.dataset.processedByDownvoter) return;
    postNode.dataset.processedByDownvoter = "true";

    // Extract Post ID
    // ID is often in id="post-ID" or inside message id="post-message-ID"
    let postId = null;
    // Strategy 1: check id of the postNode itself if it looks like "post-NUMBER"
    if (postNode.id && postNode.id.match(/^post-\d+$/)) {
        postId = postNode.id.replace('post-', '');
    }
    // Strategy 2: check for message div id="post-message-NUMBER"
    if (!postId) {
        const messageDiv = postNode.querySelector('div[id^="post-message-"]');
        if (messageDiv) {
            const idMatch = messageDiv.id.match(/post-message-(\d+)/);
            if (idMatch) postId = idMatch[1];
        }
    }

    // If we found an ID, check if we already downvoted it historically
    if (postId && processedPostIds.includes(postId)) {
        console.log(`Disqus Downvoter: Skipping post ${postId} (already in history).`);
        return;
    }

    // 1. Extract Author Display Name
    const authorNode = postNode.querySelector('.author .name, .author a, .post-byline .author');
    let authorDisplayName = "";
    if (authorNode) {
        authorDisplayName = authorNode.textContent.trim();
    }

    // 2. Extract Author Profile Username (handle)
    // Priority 1: data-username attribute on the anchor (best case)
    // Priority 2: href attribute containing /by/username

    let authorProfileId = "";

    // Try to find the specific anchor tag that holds the profile link
    const profileLink = postNode.querySelector('a[data-action="profile"], a[href*="/by/"]');

    if (profileLink) {
        // Try data-username
        if (profileLink.hasAttribute('data-username')) {
            authorProfileId = profileLink.getAttribute('data-username');
        }
        // Try href if data-username failed or empty
        if (!authorProfileId) {
            const href = profileLink.getAttribute('href');
            const match = href && href.match(/\/by\/([^\/]+)\/?/);
            if (match && match[1]) {
                authorProfileId = match[1];
            }
        }
    }

    // Extract Text
    const messageNode = postNode.querySelector('.post-message');
    let messageText = "";
    if (messageNode) {
        messageText = messageNode.textContent;
    }

    console.log(`Disqus Downvoter: Inspection - Display: "${authorDisplayName}", Handle: "${authorProfileId}", ID: "${postId}"`);

    checkAndDownvote(postNode, authorDisplayName, authorProfileId, messageText, postId);
}

function checkAndDownvote(postNode, authorDisplay, authorProfile, text, postId) {
    // Check against rules
    for (let rule of rules) {
        // Check if rule matches Display Name OR Profile ID (case-insensitive for safety, though IDs are usually lowercase)
        const ruleUserLower = rule.username.toLowerCase().trim();
        const displayLower = authorDisplay ? authorDisplay.toLowerCase() : "";
        const profileLower = authorProfile ? authorProfile.toLowerCase() : "";

        const isMatch = (displayLower && ruleUserLower === displayLower) ||
            (profileLower && ruleUserLower === profileLower);

        if (isMatch) {
            let shouldDownvote = false;

            if (rule.keywords && rule.keywords.length > 0) {
                // Check if any keyword matches
                const lowerText = text.toLowerCase();
                for (let keyword of rule.keywords) {
                    if (lowerText.includes(keyword.toLowerCase().trim())) {
                        shouldDownvote = true;
                        break;
                    }
                }
            } else {
                // No keywords = downvote all by this user
                shouldDownvote = true;
            }

            if (shouldDownvote) {
                // Determine which name matched for logging
                const matchedName = (ruleUserLower === displayLower) ? authorDisplay : authorProfile;
                performDownvote(postNode, matchedName, postId);
            }

            return; // processed
        }
    }
}

function performDownvote(postNode, author, postId) {
    // Find downvote button
    // It's usually an 'a' tag or 'button' with specific class or title
    // Structure: .post-control[data-action="downvote"], or .vote-down

    const downvoteBtn = postNode.querySelector('a[data-action="downvote"], button[name="downvote"], .vote-down');

    if (downvoteBtn) {
        // Check if already downvoted? Usually class has 'voted' or 'active' or 'downvoted'
        // Also check aria-pressed as most reliable indicator
        if (downvoteBtn.getAttribute('aria-pressed') === 'true' ||
            downvoteBtn.classList.contains('voted') ||
            downvoteBtn.classList.contains('active') ||
            downvoteBtn.classList.contains('downvoted')) {
            console.log(`Disqus Downvoter: Already downvoted comment by ${author}`);

            // Even if already downvoted visually, ensure ID is saved
            if (postId && !processedPostIds.includes(postId)) {
                savePostId(postId);
            }
            return;
        }

        console.log(`Disqus Downvoter: Downvoting comment by ${author} (ID: ${postId})`);
        downvoteBtn.click();

        // Update stats
        updateStats(author);
        if (postId) savePostId(postId);
    } else {
        console.warn("Disqus Downvoter: Could not find downvote button for matched comment.");
    }
}

function savePostId(postId) {
    if (!postId) return;
    processedPostIds.push(postId);

    // Optional: Limit size of history (e.g. 5000 IDs)
    if (processedPostIds.length > 5000) {
        processedPostIds = processedPostIds.slice(-5000);
    }

    chrome.storage.local.set({ processedPostIds: processedPostIds });
}

function updateStats(author) {
    chrome.storage.local.get(['stats'], (result) => {
        let currentStats = result.stats || { total: 0, byUser: {} };

        currentStats.total = (currentStats.total || 0) + 1;

        if (!currentStats.byUser) currentStats.byUser = {};
        currentStats.byUser[author] = (currentStats.byUser[author] || 0) + 1;

        chrome.storage.local.set({ stats: currentStats });
    });
}
