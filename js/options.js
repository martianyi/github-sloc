var github_token = localStorage.github_token;
github_token = github_token?github_token:'';
document.getElementById('github_token').value = github_token;
document.getElementById('save').onclick = function(){
    localStorage.github_token = document.getElementById('github_token').value;
    alert('保存成功。');
}