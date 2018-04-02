chrome.storage.sync.get('github_sloc_token', function (result) {
  var github_sloc_token = ''
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  document.getElementById('github_sloc_token').value = github_sloc_token
  document.getElementById('save').onclick = function () {
    if (!document.getElementById('github_sloc_token').value) {
      alert('Personal access token required')
      return
    }
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({'github_sloc_token': document.getElementById('github_sloc_token').value}, function () {
      // Notify that we saved.
      alert('Personal access token saved')
    })
  }
})