'use strict'

const SI_SUFFIXES = ['', 'k', 'M', 'G', 'T', 'P', 'E']
const GH_RESERVED_USER_NAMES = [
  'orgs'
]
const DEFAULT_RETRY_TIMES = 3
const DEFAULT_RETRY_DELAY = 500
const SHOULD_RETRY_STATUS = [0, 202]

let github_sloc_token
let discoverReposObserved = false
let miniReposObserved = false
let topicReposObserved = false
const observeConf = {childList: true, subtree: true}

chrome.storage.sync.get('github_sloc_token', (result) => {
  if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token
  $(document).on('pjax:complete', init)
  init()
})

function init () {

  // Project detail page
  const SLOC_ID = 'github-sloc'
  const $repoSummary = $('.numbers-summary')
  const slocElm = document.getElementById(SLOC_ID)
  if ($repoSummary.length !== 0 && !slocElm) {
    const match = location.pathname.match(/([^\/]+)\/([^\/]+)?/)
    let username = match[1]
    let reponame = match[2]
    let repoURI = `${username}/${reponame}`
    getSLOC(repoURI, DEFAULT_RETRY_TIMES)
      .then(lines => {
        $repoSummary.append(
          '<li id="' + SLOC_ID + '">' +
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
  if (location.pathname === '/discover') {
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
  const $this = $(this)
  if ($this.hasClass('has-sloc')) {
    return
  }
  const match = $this.attr('href').match(/([^\/]+)\/([^\/]+)?/)
  let username = match[1]
  let reponame = match[2]
  if (~GH_RESERVED_USER_NAMES.indexOf(username)) {
    return
  }
  let repoURI = `${username}/${reponame}`
  getSLOC(repoURI, DEFAULT_RETRY_TIMES)
    .then(lines => {
      $this.addClass('has-sloc').append('<span class=\'text-gray\'>(' + intAbbr(lines) + ' sloc)</span>')
    })
    .catch(e => console.error(e))
}

function getSLOC (repo, tries) {
  if (!repo) {
    return Promise.reject(new Error('GitHub SLOC: no repo provided'))
  }
  if (tries === 0) {
    return Promise.reject(new Error('GitHub SLOC: failed to get SLOC for ' + repo))
  }
  let url = `https://api.github.com/repos/${repo}/stats/code_frequency`
  let headers = {}
  if (github_sloc_token != null) {
    headers['Authorization'] = 'token ' + github_sloc_token
  }
  return fetch(url, {headers: headers})
    .then(resp => {
      if (SHOULD_RETRY_STATUS.includes(resp.status)) {
        return delay(DEFAULT_RETRY_DELAY).then(() => {
          return getSLOC(repo, tries - 1)
        })
      } else if (resp.status === 200) {
        return resp.json().then((data) => {
          return data.reduce((total, changes) => {
            let n = total + changes[1] + changes[2]
            return n < 0 ? 0 : n
          }, 0)
        })
      } else if (resp.status === 403) {
        if (parseInt(resp.headers.get("X-RateLimit-Remaining")) === 0) {
          if (github_sloc_token == null) {
            // notify user to set their token
            window.open(chrome.extension.getURL("options.html"), '_blank')
          }
          throw new Error('GitHub SLOC: api rate limit exceed')
        }
        throw new Error('GitHub SLOC: 403 forbidden')
      } else {
        throw new Error('GitHub SLOC: api return a bad status: ' + resp.status)
      }
    })
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

function delay (t, v) {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t)
  })
}
