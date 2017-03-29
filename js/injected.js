"use strict";

var github_sloc_token;

chrome.storage.sync.get('github_sloc_token', function (result) {
    if (result && result.github_sloc_token != null) github_sloc_token = result.github_sloc_token;
    insertSloc();
    insertSlocWhenSearch();
    $(document).on('pjax:complete', function () {
        insertSloc();
        insertSlocWhenSearch();
    });
});

function insertSloc() {
    const $repoMeta = $('.repository-meta-content');
    if ($repoMeta.length != 0) {
        $repoMeta.append('<span class="github-sloc">Counting SLOC...</span>');
        const $sloc = $('.github-sloc');
        getSloc(location.pathname, 5)
            .then(lines => $sloc.text("SLOC: " + lines))
            .catch(e => $sloc.text("Error when counting SLOC", e.toString()));
    }
}

function insertSlocWhenSearch() {
    if (location.pathname === '/search') {
        $('.repo-list h3 a').each(function () {
            getSloc($(this).attr('href'), 5)
                .then(lines => $(this).parent().next('p').text($(this).parent().next('p').text() + "(SLOC:" + lines +")"))
                .catch(e => console.log(e));
        });
    }
}

function getSloc(repo, tries) {

    if (repo.length === 0) {
        return Promise.reject(new Error("No repo provided"));
    }

    //GitHub's API returns an empty object the first time it is accessed
    //We try five times then stop
    if (tries === 0) {
        return Promise.reject(new Error("Too many tries"));
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



