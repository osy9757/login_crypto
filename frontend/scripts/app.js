// app.js

document.getElementById('testButton').addEventListener('click', function() {
    fetch('/api.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('response').innerText = JSON.stringify(data);
        })
        .catch(error => {
            document.getElementById('response').innerText = '오류 발생: ' + error;
        });
});
