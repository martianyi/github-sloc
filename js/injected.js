'use strict'

var github_sloc_token
var discoverReposObserved = false
var miniReposObserved = false
var observeConf = {childList: true, subtree: true}

chrome.storage.sync.get('github_sloc_token', function (result) {
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  insertSloc()
  $(document).on('pjax:complete', function () {
    insertSloc()
  })
})

function insertSloc () {

  // Project detail page
  const $repoMeta = $('.repository-meta-content')
  if ($repoMeta.length !== 0) {
    $repoMeta.append('<span class="github-sloc"></span>')
    getSloc(location.pathname, 2)
      .then(lines => $('.github-sloc').text('SLOC: ' + lines))
      .catch(e => console.log(e))
  }

  // Discover repositories page
  if (location.pathname === '/dashboard/discover') {
    if (!discoverReposObserved) {
      var targetNode = document.getElementById('recommended-repositories-container')
      var CLASS_NAME = 'mb-4 js-discover-repositories'
      var callback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.className === CLASS_NAME) {
              $(node).find('h3 a').each(appendSloc)
            }
          })
        })
      }
      var observer = new MutationObserver(callback)
      observer.observe(targetNode, observeConf)
      discoverReposObserved = true
    }
    $(targetNode).find('h3 a').each(appendSloc)
  }

  // Mini repo list
  if (!miniReposObserved) {
    var yourRepos = document.getElementById('your_repos')
    var miniRepoCallback = function (mutations) {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.className === 'mini-repo-list') {
            $(node).find('.mini-repo-list-item').each(appendSloc)
          }
        })
      })
    }
    var miniRepoObserver = new MutationObserver(miniRepoCallback)
    miniRepoObserver.observe(yourRepos, observeConf)
    miniReposObserved = true
  }
  $('.mini-repo-list-item').each(appendSloc)

  // Explore, Collections page
  $('article h1 a').each(appendSloc)
  $('article h3 a').each(appendSloc)

  // Search, Trending page
  $('.repo-list h3 a').each(appendSloc)

  // Your repositories page
  if (/\/repositories$/.test(location.pathname)) {
    // todo:
  }
}

function appendSloc () {
  var $el = $(this)
  if ($el.hasClass('has-sloc')) {
    return
  }
  getSloc($el.attr('href'), 2)
    .then(lines => {
      $el.addClass('has-sloc')
        .append('<span class=\'text-gray\'>(' + lines + ' sloc)</span>')
    })
    .catch(e => console.log(e))
}

function getSloc (repo, tries) {

  if (!repo) {
    return Promise.reject(new Error('No repo provided'))
  }

  //We try several times then stop
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



