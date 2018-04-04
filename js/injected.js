'use strict'

let github_sloc_token
let discoverReposObserved = false
let miniReposObserved = false
let topicReposObserved = false
const observeConf = {childList: true, subtree: true}
const SI_SUFFIXES = ['', 'k', 'M', 'G', 'T', 'P', 'E']

chrome.storage.sync.get('github_sloc_token', (result) => {
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  $(document).on('pjax:complete', init)
  init()
})

function init () {

  // Project detail page
  let SLOC_ID = 'github-sloc'
  let $repoSummary = $('.numbers-summary')
  let slocElm = document.getElementById(SLOC_ID)
  if ($repoSummary.length !== 0 && !slocElm) {
    let pathArr = location.pathname.substring(1).split('/')
    let repoURI = '/' + pathArr[0] + '/' + pathArr[1]
    getSLOC(repoURI, 2)
      .then(lines => {
        $repoSummary.append(
          '<li id="'+ SLOC_ID + '">' +
          '<span class="nolink">' +
          '<svg class="octicon octicon-file-code" width="16" height="16" viewBox="0 0 12 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M8.5 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V4.5L8.5 1zM11 14H1V2h7l3 3v9zM5 6.98L3.5 8.5 5 10l-.5 1L2 8.5 4.5 6l.5.98zM7.5 6L10 8.5 7.5 11l-.5-.98L8.5 8.5 7 7l.5-1z"></path></svg>' +
          '<span class="num text-emphasized"> ' +
          intCommas(lines) +
          '</span>' +
          ' sloc' +
          '</span>' +
          '</li>'
        )
      })
      .catch(e => console.error(e))
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
  getSLOC($el.attr('href'), 2)
    .then(lines => $el.addClass('has-sloc').append('<span class=\'text-gray\'>(' + intAbbr(lines) + ' sloc)</span>'))
    .catch(e => console.error(e))
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
  let headers = {}
  if (github_sloc_token != null) {
    headers['Authorization'] = 'token ' + github_sloc_token
  }
  return fetch(url, {headers: headers})
    .then(x => x.json())
    .then(x => {
      return x.reduce((total, changes) => {
        let n = total + changes[1] + changes[2]
        return n > 0 ? n : 0
      }, 0)
    })
    .catch(e => getSLOC(repo, tries - 1))
}

function getParameterByName (name, url) {
  if (!url) url = window.location.href
  name = name.replace(/[\[\]]/g, '\\$&')
  let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

function intAbbr (x) {
  const tier = Math.log10(x) / 3 | 0
  if (tier === 0) return x
  const suffix = SI_SUFFIXES[tier]
  const scale = Math.pow(10, tier * 3)
  const scaled = x / scale
  return scaled.toFixed(1) + suffix
}

function intCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}