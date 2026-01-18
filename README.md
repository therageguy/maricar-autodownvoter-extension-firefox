# Maricar Auto-Downvoter

A Firefox extension that automatically downvotes Disqus comments on `horriblepp.info` based on user-defined display names, profile handles, and optional keywords.

## Features

- **Automated Downvoting**: Automatically clicks the downvote button on comments matching your criteria.
- **Dual User Detection**: Matches users by their **Display Name** (e.g., "TheRageGuy") OR their **Profile Handle/Username** (e.g., `therageguy123` from `disqus.com/by/therageguy123`).
- **Keyword Filtering**: Optionally target only specific comments containing certain keywords. If no keywords are provided, all comments by the target user are downvoted.
- **Real-Time Monitoring**: Uses a `MutationObserver` to detect and process new comments instantly as they load, without requiring a page refresh.
- **Persistent History**: Remembers the unique IDs of downvoted posts to prevent re-downvoting or duplicate actions, even if you un-downvote manually or reload the page.
- **Smart Checks**: Verifies if a comment is already downvoted (checks for `downvoted` class and `aria-pressed="true"`) before acting.
- **Statistics**: specific Dashboard to track total downvotes and breakdown by user.

## Installation

Since this extension is not signed by Mozilla yet, you must load it as a "Temporary Add-on".

1.  Open Firefox and navigate to `about:debugging`.
2.  Click on **This Firefox** in the sidebar.
3.  Click the **Load Temporary Add-on...** button.
4.  Navigate to the folder containing this extension and select the `manifest.json` file.
5.  The extension is now active. Note that temporary add-ons are removed when you restart Firefox.

## Usage

1.  **Open Options**: Click the extension icon in your toolbar and select **Options**.
2.  **Add a Rule**:
    - **Username**: Enter the Display Name (e.g., `John Doe`) OR the unique Profile Handle (e.g., `john_doe_99`).
    - **Keywords**: (Optional) Enter comma-separated keywords (e.g., `spam, bot`). Leave empty to target *all* comments by that user.
    - Click **Add Rule**.
3.  **Browse**: Visit `horriblepp.info`. The extension will automatically work in the background.
4.  **View Stats**: Check the Options page to see the downvote counters increment.

## Permissions

- `storage`: To save your rules, statistics, and history of processed post IDs.
- `host_permissions`:
    - `*://*.horriblepp.info/*`: To activate on the target site.
    - `*://*.disqus.com/*`: To access the Disqus comment iframe where the actual buttons are located.

## License

Private / Personal Use.
