var slideIndex = 0;
carousel();

function carousel() {
    var i;
    var x = document.getElementsByClassName("carousel-item");
    for (i = 0; i < x.length; i++) {
      x[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > x.length) {slideIndex = 1}
    x[slideIndex-1].style.display = "block";
    setTimeout(carousel, 7000); // Change image every 3 seconds

}


$(document).on('click','.navbar-collapse.show',function(e) {
    if( $(e.target).is('a') && $(e.target).attr('class') != 'dropdown-toggle' ) {
        $(this).collapse('hide');
    }
});
