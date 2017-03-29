var github_token = "";
chrome.storage.sync.get('github_token', function (result) {
    if (result.github_token && result.github_token != null) github_token = result.github_token;
    document.getElementById('github_token').value = github_token;
    document.getElementById('save').onclick = function () {
        if (!document.getElementById('github_token').value) {
            alert('Personal access token required');
            return;
        }
        // Save it using the Chrome extension storage API.
        chrome.storage.sync.set({'github_token': document.getElementById('github_token').value}, function () {
            // Notify that we saved.
            alert('Personal access token saved');
        });
    };
});