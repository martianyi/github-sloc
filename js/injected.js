'use strict'

var github_sloc_token

chrome.storage.sync.get('github_sloc_token', function (result) {
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  insertSloc()
  $(document).on('pjax:complete', function () {
    insertSloc()
  })
})

function insertSloc () {
  const $repoMeta = $('.repository-meta-content')

  // Project detail page
  if ($repoMeta.length !== 0) {
    $repoMeta.append('<span class="github-sloc"></span>')
    const $sloc = $('.github-sloc')
    getSloc(location.pathname, 5)
      .then(lines => $sloc.text('SLOC: ' + lines))
      .catch(e => console.log(e))
  }

  // Discover repositories page
  if (location.pathname === '/dashboard/discover') {
    var targetNode = document.getElementById('recommended-repositories-container')
    var config = {childList: true, subtree: true}
    var callback = function (mutations) {
      mutations.forEach(mutation => {
        var target = mutation.target
        if (target.className === 'mb-4 js-discover-repositories') {
          mutation.addedNodes.forEach(node => {
            if (node.className === 'mb-4 js-discover-repositories') {
              $(node).find('h3 a').each(function () {
                appendSloc($(this))
              })
            }
          })
        }
      })
    }
    var observer = new MutationObserver(callback)
    observer.observe(targetNode, config)
    $(targetNode).find('h3 a').each(function () {
      appendSloc($(this))
    })
  }

  // Search, Trending page, etc
  $('.repo-list h3 a').each(function () {
    appendSloc($(this))
  })
}

function appendSloc (el) {
  getSloc(el.attr('href'), 5)
    .then(lines => {
      if (el.hasClass('has-sloc')) return
      el.addClass('has-sloc')
      el.append('<span class=\'text-gray\'>(' + lines + ' sloc)</span>')
    })
    .catch(e => console.log(e))
}

function getSloc (repo, tries) {

  if (!repo) {
    return Promise.reject(new Error('No repo provided'))
  }

  //We try five times then stop
  if (tries === 0) {
    return Promise.reject(new Error('Too many requests'))
  }

  let url = 'https://api.github.com/repos' + repo + '/stats/code_frequency'

  if (github_sloc_token != null) {
    url += '?access_token=' + github_sloc_token
  }

  return fetch(url)
    .then(x => x.json())
    .then(x => x.reduce((total, changes) => total + changes[1] + changes[2], 0))
    .catch(err => getSloc(repo, tries - 1))
}



