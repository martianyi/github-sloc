"use strict";

var github_sloc_token;

chrome.storage.sync.get('github_sloc_token', function (result) {
    if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token;
    insertSloc();
    $(document).on('pjax:complete', function () {
        insertSloc();
    });
});

function insertSloc() {
    const $repoMeta = $('.repository-meta-content');
    if ($repoMeta.length !== 0) {
        $repoMeta.append('<span class="github-sloc"></span>');
        const $sloc = $('.github-sloc');
        getSloc(location.pathname, 5)
            .then(lines => $sloc.text("SLOC: " + lines))
            .catch(e => console.log(e));
    }
    $('.repo-list h3 a').each(function () {
        getSloc($(this).attr('href'), 5)
            .then(lines => $(this).append("<span class='text-gray'>(" + lines + " sloc)</span>"))
            .catch(e => console.log(e));
    });
}

function getSloc(repo, tries) {

    if (!repo) {
        return Promise.reject(new Error("No repo provided"));
    }

    //GitHub's API returns an empty object the first time it is accessed
    //We try five times then stop
    if (tries === 0) {
        return Promise.reject(new Error("Too many requests"));
    }

    let url = "https://api.github.com/repos" + repo + "/stats/code_frequency";

    if (github_sloc_token != null) {
        url += "?access_token=" + github_sloc_token;
    }

    return fetch(url)
        .then(x => x.json())
        .then(x => x.reduce((total, changes) => total + changes[1] + changes[2], 0))
        .catch(err => getSloc(repo, tries - 1));
}



