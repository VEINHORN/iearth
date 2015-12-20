var socket = io();
socket.on("tweet", function(tweet) {
  console.log(tweet)
  var text = tweet.text;
  tweet.entities.urls.forEach(function(elm, i, arr) {
    var a = document.createElement('a');
    a.setAttribute('href', elm.url);
    a.innerHTML = elm.url;

    text = text.replace(elm.url, a.outerHTML);
  });

  var tweetForGlobe = {
    id: tweet.id,
    lat: tweet.coordinates.coordinates[1],
    lng: tweet.coordinates.coordinates[0],
    text : text,
    image: tweet.user.profile_image_url
  }
  globe.addTweet(tweetForGlobe);
  toastr.options = {
    "closeButton": true,
    "newestOnTop": true,
    "timeOut": 30000,
    "progressBar": true,
    "onclick": function() {
      var url = "https://twitter.com/" + tweet.user.name + "/status/" + tweet.id_str;
      window.open(url, '_blank');
    }
  }
  toastr.info("<div><p>" + text + "</p></div>");
});

var container = document.getElementById('container');
var globe = new DAT.Globe(container);
globe.addCityMarker();

// globe.animate();

// globe.addData(data[i][1], {format: 'magnitude', name: data[i][0], animated: true});

//var i, tweens = [];

/*var settime = function(globe, t) {
  return function() {
    new TWEEN.Tween(globe).to({time: t/years.length},500).easing(TWEEN.Easing.Cubic.EaseOut).start();
    var y = document.getElementById('year'+years[t]);
    if (y.getAttribute('class') === 'year active') {
      return;
    }
    var yy = document.getElementsByClassName('year');
    for(i=0; i<yy.length; i++) {
      yy[i].setAttribute('class','year');
    }
    y.setAttribute('class', 'year active');
  };
};*/

/*for(var i = 0; i<years.length; i++) {
  var y = document.getElementById('year'+years[i]);
  y.addEventListener('mouseover', settime(globe,i), false);
}*/

// TWEEN.start();


/*xhr.open('GET', '/globe/population909500.json', true);
xhr.onreadystatechange = function(e) {
  if (xhr.readyState === 4) {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      window.data = data;
      for (i=0;i<data.length;i++) {
        globe.addData(data[i][1], {format: 'magnitude', name: data[i][0], animated: true});
      }
      // globe.createPoints();
      settime(globe,0)();
      globe.animate();
      document.body.style.backgroundImage = 'none'; // remove loading
    }
  }
};
xhr.send(null);*/
