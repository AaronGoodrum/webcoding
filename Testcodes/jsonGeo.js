
var xhr = new XMLHttpRequest();

xhr.onreadystatechange = function () {
  if(xhr.readyState === 4) {
    var emplo = JSON.parse(xhr.responseText);
    console.log(emplo);
    var statusHTML = '<ul class="emploList">';
    for (var i = 0; i < emplo.length; i++) {
      statusHTML += '<tr>';
      statusHTML += "<td>"+emplo[i].name+"</td>";

      statusHTML += "<li>"+emplo[i].age+"</li>";

      statusHTML += "<li>"+emplo[i].map+"</li>";
      statusHTML += '</tr>';
    }

    statusHTML += '</ul>';
    document.getElementById('fullListEmployee').innerHTML = statusHTML;
  }
};
xhr.open('GET', 'dataJSON.json');
xhr.send();
