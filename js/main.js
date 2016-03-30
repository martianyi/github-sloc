function insertSloc(){
	"use strict";
	var tasks = [];
	if($('.repo-list-name a')){
		$('.repo-list-name a').each(function(){
			let repoListMeta = $(this).parent().siblings(".repo-list-meta");
			return tasks.push(getSloc($(this).text()).then(lines => repoListMeta.text(repoListMeta.text() + ", Total sloc:"+ lines)))
		})
		return Promise.all(tasks);
	}
}

function getSloc(repo){
	"use strict";

	var github_token = localStorage.github_token;
	github_token = github_token?github_token:'';

	let url = "https://api.github.com/repos/{repo}/stats/contributors?access_token="+github_token;
	url.replace(/{repo}/, repo);

	return fetch(url)
	.then(response => response.json())
	.then(contributors => contributors
	.map(contributor => contributor.weeks
	.reduce((lineCount, week) => lineCount + week.a - week.d, 0)))
	.then(lineCounts => lineCounts.reduce((lineTotal, lineCount) => lineTotal + lineCount))
}

window.onload = insertSloc;
