$(document).ready(function() {

//When the MENU.ul.li is Click starts the function
  $("#nav-menu li").click(function(){
    console.log (this);

//remove/add selected class on the MENU.ul.li
//highlight the MENU
    $("#nav-menu li").removeClass("is-active");
    $(this).addClass("is-active");
});

$(document).foundation()
});//END READY
