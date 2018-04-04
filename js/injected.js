'use strict'

let github_sloc_token
let discoverReposObserved = false
let miniReposObserved = false
let topicReposObserved = false
const observeConf = {childList: true, subtree: true}

chrome.storage.sync.get('github_sloc_token',  (result) => {
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  $(document).on('pjax:complete', init)
  init()
})

function init () {

  // Project detail page
  let $repoMeta = $('.repository-meta-content')
  if ($repoMeta.length !== 0) {
    $repoMeta.append('<span class="github-sloc"></span>')
    getSLOC(location.pathname, 3)
      .then(lines => $repoMeta.append('<span class="github-sloc">' + lines + ' sloc</span>'))
      .catch(e => console.log(e))
    return
  }

  // Discover repos page
  if (location.pathname === '/dashboard/discover') {
    const targetNode = document.getElementById('recommended-repositories-container')
    if (!discoverReposObserved) {
      const CLASS_NAME = 'mb-4 js-discover-repositories'
      const callback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.className === CLASS_NAME) {
              $(node).find('h3 a').each(insertSLOC)
            }
          })
        })
      }
      const observer = new MutationObserver(callback)
      observer.observe(targetNode, observeConf)
      discoverReposObserved = true
    }
    $(targetNode).find('h3 a').each(insertSLOC)
  }

  // Mini repo list
  const MINI_REPO_CLASS = '.mini-repo-list-item'
  if (!miniReposObserved) {
    const yourRepos = document.getElementById('your_repos')
    const orgYourRepos = document.getElementById('org_your_repos')
    if (yourRepos || orgYourRepos) {
      const miniRepoCallback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.className === 'mini-repo-list') {
              $(node).find(MINI_REPO_CLASS).each(insertSLOC)
            }
          })
        })
      }
      const miniRepoObserver = new MutationObserver(miniRepoCallback)
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
    const topicNode = document.querySelector('.container-lg.topic.p-responsive')
    if (topicNode) {
      const topicRepoCallback = function (mutations) {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (/article/i.test(node.tagName)) {
              $(node).find('h3 a').each(insertSLOC)
            }
          })
        })
      }
      const topicRepoObserver = new MutationObserver(topicRepoCallback)
      topicRepoObserver.observe(topicNode, observeConf)
      topicReposObserved = true
    }
  }

  // Search, Trending page
  $('.repo-list h3 a').each(insertSLOC)

  // etc
  const tab = getParameterByName('tab')
  if (/\/repositories$/.test(location.pathname) || ['stars', 'repositories'].includes(tab)) {
    $('h3 a').each(insertSLOC)
  }
}

function insertSLOC () {
  const $el = $(this)
  if ($el.hasClass('has-sloc')) return
  getSLOC($el.attr('href'), 3)
    .then(lines => $el.addClass('has-sloc').append('<span class=\'text-gray\'>(' + lines + ' sloc)</span>'))
    .catch(e => console.log(e))
}

function getSLOC (repo, tries) {
  if (!repo) {
    return Promise.reject(new Error('GitHub SLOC: No repo provided'))
  }
  //We try several times then stop
  if (tries === 0) {
    return Promise.reject(new Error('GitHub SLOC: Failed to get SLOC of ' + repo))
  }
  let url = 'https://api.github.com/repos' + repo + '/stats/code_frequency'
  if (github_sloc_token != null) {
    url += '?access_token=' + github_sloc_token
  }
  return fetch(url)
    .then(x => x.json())
    .then(x => {
      return x.reduce((total, changes) => {
        let n = total + changes[1] + changes[2]
        return n > 0 ? n : 0
      }, 0)
    })
    .catch(e => getSLOC(repo, tries - 1))
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}