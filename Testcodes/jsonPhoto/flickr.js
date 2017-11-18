$(document).ready(function() {

//When the Button is Click starts the function
  $('button').click(function(){

//remove/add selected class on the button
//highlight the button
    $("button").removeClass("selected");
    $(this).addClass("selected");

//getJSON form the API of flickr API with "?jsoncallback=?"
    var flickrAPI = "https://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";

//Set animal to the button(this) text used from html
    var animal = $(this).text();
//Data to send to API as
    var flickrOptions = {
      //Query string parameters from flickr API content matching some criteria  (ID : option)
      tags: animal,
      format: "json"
    };

    //Build the HTML from all the data from JSON
      function displayPhotos(data) {
        var photoHTML = '<ul>';
        $.each(data.items, function(i, photo){
          photoHTML += '<li class="grid-25 tablet-grid-50">';
          photoHTML += '<a href="'+ photo.link +'" class="image">';
          photoHTML += '<img src="'+ photo.media.m +'"></a></li>';
        });
        photoHTML += '</ul>';
        $('#photos').html(photoHTML);
      };//END displayPhotos

    $.getJSON(flickrAPI, flickrOptions, displayPhotos);
  });//end Click


//*******************************************************
  //When the FORM Button is Click starts the function
    $('form').submit(function(evt){
      evt.preventDefault();

      //Set animal from the search form text used from html
          var animal = $('#search').val();

  //getJSON form the API of flickr API with "?jsoncallback=?"
      var flickrAPI = "https://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";

  //Data to send to API as
      var flickrOptions = {
        //Query string parameters from flickr API content matching some criteria  (ID : option)
        tags: animal,
        format: "json"
      };

    
      //Build the HTML from all the data from JSON
        function displayPhotos(data) {
          var photoHTML = '<ul>';
          $.each(data.items, function(i, photo){
            photoHTML += '<li class="grid-25 tablet-grid-50">';
            photoHTML += '<a href="'+ photo.link +'" class="image">';
            photoHTML += '<img src="'+ photo.media.m +'"></a></li>';
          });
          photoHTML += '</ul>';
          $('#photos').html(photoHTML);
        };//END displayPhotos

      $.getJSON(flickrAPI, flickrOptions, displayPhotos);
    });//end FORM

});//End READY
