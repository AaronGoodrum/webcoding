$(document).ready(function() {

    //When the FORM Button is Click starts the function
      $('form').submit(function(evt){
        evt.preventDefault();

        //Set animal from the search form text used from html
            var api_search = $('#search').val();

    //getJSON form the API of flickr API with "?jsoncallback=?"
        var flickrAPI = "https://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?";

    //Data to send to API as
        var flickrOptions = {
          //Query string parameters from flickr API content matching some criteria  (ID : option)
          tags: api_search,
          format: "json"
        };


        //Build the HTML from all the data from JSON
          function displayPhotos(data) {
            var photoHTML = '<ul>';

            $.each(data.items, function(i, photo){
            photoHTML += '<img class="img-thumbnail rounded" src="'+ photo.media.m +'">';
            });

            photoHTML += '</ul>';

            $('#photos').html(photoHTML);
          };//END displayPhotos

        $.getJSON(flickrAPI, flickrOptions, displayPhotos);
      });//end FORM



});//END READY
