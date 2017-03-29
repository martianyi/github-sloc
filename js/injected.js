"use strict";

var github_token;

chrome.storage.sync.get('github_token', function (result) {
    github_token = result.github_token;
    insertSloc();
    insertSlocWhenSearch();
    $(document).on('pjax:complete', function () {
        insertSloc();
        insertSlocWhenSearch();
    });
});

function insertSlocWhenSearch() {
    if (location.pathname === '/search') {
        $('.repo-list h3 a').each(function () {
            getSloc($(this).attr('href'), 5)
                .then(lines => $(this).parent().next('p').text($(this).parent().next('p').text() + "SLOC:" + lines))
                .catch(e => console.error(e));
        });
    }
}

function insertSloc() {
    const repoMeta = $('.repository-meta-content');
    if (repoMeta.length != 0) {
        repoMeta.append('\n<span class="sloc">Counting SLOC...</span>');
        const repo = location.pathname;
        getSloc(repo, 5)
            .then(lines => $('.sloc').text("SLOC: " + lines))
            .catch(e => console.error(e));
    }
}

function getSloc(repo, tries) {

    if (repo.length === 0) {
        return Promise.reject("No repo provided");
    }

    //GitHub's API returns an empty object the first time it is accessed
    //We try five times then stop
    if (tries === 0) {
        return Promise.reject("Too many tries");
    }

    let url = "https://api.GitHub.com/repos" + repo + "/stats/code_frequency";

    if (github_token != null) {
        url += "?access_token=" + github_token;
    }

    return fetch(url)
        .then(x => x.json())
        .then(x => x.reduce((total, changes) => total + changes[1] + changes[2], 0))
        .catch(err => getSloc(repo, tries - 1));
}



