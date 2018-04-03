'use strict'

var github_sloc_token
var discoverReposObserved = false
var miniReposObserved = false
var topicReposObserved = false
var observeConf = {childList: true, subtree: true}

chrome.storage.sync.get('github_sloc_token', function (result) {
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  $(document).on('pjax:complete', init)
  init()
})

function init () {

  // Project detail page
  var $repoMeta = $('.repository-meta-content')
  if ($repoMeta.length !== 0) {
    $repoMeta.append('<span class="github-sloc"></span>')
    getSLOC(location.pathname, 3)
      .then(lines => $repoMeta.append('<span class="github-sloc">' + lines + ' sloc</span>'))
      .catch(e => console.log(e))
    return
  }

  // Discover repos page
  if (location.pathname === '/dashboard/discover') {
    var targetNode = document.getElementById('recommended-repositories-container')
    if (!discoverReposObserved) {
      var CLASS_NAME = 'mb-4 js-discover-repositories'
      var callback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.className === CLASS_NAME) {
              $(node).find('h3 a').each(insertSLOC)
            }
          })
        })
      }
      var observer = new MutationObserver(callback)
      observer.observe(targetNode, observeConf)
      discoverReposObserved = true
    }
    $(targetNode).find('h3 a').each(insertSLOC)
  }

  // Mini repo list
  var MINI_REPO_CLASS = '.mini-repo-list-item'
  if (!miniReposObserved) {
    var yourRepos = document.getElementById('your_repos')
    var orgYourRepos = document.getElementById('org_your_repos')
    if (yourRepos || orgYourRepos) {
      var miniRepoCallback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.className === 'mini-repo-list') {
              $(node).find(MINI_REPO_CLASS).each(insertSLOC)
            }
          })
        })
      }
      var miniRepoObserver = new MutationObserver(miniRepoCallback)
      if (yourRepos) {
        miniRepoObserver.observe(yourRepos, observeConf)
      }
      if (orgYourRepos) {
        miniRepoObserver.observe(orgYourRepos, observeConf)
      }
      miniReposObserved = true
    }
  }
  $(MINI_REPO_CLASS).each(insertSLOC)

  // Explore, Collections, Topics page
  $('article h1 a').each(insertSLOC)
  $('article h3 a').each(insertSLOC)
  if (!topicReposObserved) {
    var topicNode = document.querySelector('.container-lg.topic.p-responsive')
    if (topicNode) {
      var topicRepoCallback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (/article/i.test(node.tagName)) {
              $(node).find('h3 a').each(insertSLOC)
            }
          })
        })
      }
      var topicRepoObserver = new MutationObserver(topicRepoCallback)
      topicRepoObserver.observe(topicNode, observeConf)
      topicReposObserved = true
    }
  }

  // Search, Trending page
  $('.repo-list h3 a').each(insertSLOC)

  // etc
  var tab = getParameterByName('tab')
  if (/\/repositories$/.test(location.pathname) || ['stars', 'repositories'].includes(tab)) {
    $('h3 a').each(insertSLOC)
  }
}

function insertSLOC () {
  var $el = $(this)
  if ($el.hasClass('has-sloc')) return
  getSLOC($el.attr('href'), 3)
    .then(lines => $el.addClass('has-sloc').append('<span class=\'text-gray\'>(' + lines + ' sloc)</span>'))
    .catch(e => console.log(e))
}

function getSLOC (repo, tries) {
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
    .catch(e => getSLOC(repo, tries - 1))
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}



