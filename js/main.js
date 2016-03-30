"use strict";
var github_token = "";

function load() {
    chrome.storage.sync.get('github_token', function (result) {
        if (result.github_token != "null") github_token = result.github_token;
        if (document.location.pathname === '/search') {
            insertSloc();
        }
    })
}

function insertSloc() {
    "use strict";

    var tasks = [];

    $('.repo-list-name a').each(function () {
        let self = this;
        let repoListMeta = $(self).parent().siblings(".repo-list-meta");
        let task = getSloc($(self).text(), 5)
            .then(lines => repoListMeta.text(repoListMeta.text() + ", Total sloc is " + lines))
            .catch(e=>console.error(e));
        return tasks.push(task);
    });

    return Promise.all(tasks);

}

function getSloc(repo, tries) {
    "use strict";

    if (repo.length === 0) {
        return Promise.reject("No repo provided");
    }

    //Github's API returns an empty object the first time it is accessed
    //We try five times then stop
    if (tries === 0) {
        return Promise.reject("Too many tries");
    }

    var url = "https://api.github.com/repos/" + repo + "/stats/code_frequency?access_token=" + github_token;

    return fetch(url)
        .then(x=>x.json())
        .then(x=>x.reduce((total, changes)=>total + changes[1] + changes[2], 0))
        .catch(err => getSloc(repo, tries - 1));
}

load();
