var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Twit = require('twit')

var T = new Twit({
  consumer_key:         'ksT1c6LdsdiC47gnuWqFm2uRT'
  , consumer_secret:      'om5txGrfoPJMv9w5aQRkhTJrsdtXWjQAVTwIha7E4uUsxPIfQi'
  , access_token:         '262071967-Q1DOCJcH7N1Cub6HS8nbay6jGyQ6P5ACKHQCI49L'
  , access_token_secret:  'HQ3YTC8MT8Qts0ulABc52QRPHP4tEWhNsyJAYN6S5gIf4'
})

var stream = T.stream('statuses/sample')

io.on('connection', function(socket){
  console.log('a user connected');

  stream.on('tweet', function (tweet) {
    if (tweet.geo) {
      console.log("tweeet")
      socket.emit('tweet', tweet)
    }
  })
});


app.use(express.static('public'));


app.get('/', function(req, res){
  res.sendfile('index.html');
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
