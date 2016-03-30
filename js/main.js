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
        var self = this;
        var repoListMeta = $(self).parent().siblings(".repo-list-meta");
        return tasks.push(getSloc($(self).text()).then(function (lines) {
            return repoListMeta.text(repoListMeta.text() + ", Total sloc is " + lines);
        }, function(e){
            return console.error(e)
        }));
    });
    return Promise.all(tasks);

}

function getSloc(repo) {
    "use strict";

    var url = "https://api.github.com/repos/" + repo + "/stats/contributors?access_token=" + github_token;

    return fetch(url).then(function (response) {
        return response.json();
    }).then(function (contributors) {
        return contributors.map(function (contributor) {
            return contributor.weeks.reduce(function (lineCount, week) {
                return lineCount + week.a - week.d;
            }, 0);
        });
    }).then(function (lineCounts) {
        return lineCounts.reduce(function (lineTotal, lineCount) {
            return lineTotal + lineCount;
        });
    });
}

window.onload = load();
