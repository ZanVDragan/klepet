/*
	global $,
	global Klepet,
	global io
*/

/**
 * @param message to check for image/youtube links.
 * @return content to be added accordingly.
 */
 function checkLink(message) {
 	// Image Regex
 	var imgReg = /^https?:\/\/.{1,}\.(jpg|png|gif)$/i;
 	// Youtube Regex
 	var videoReg = /^https?:\/\/www.youtube.com\/watch\?v=.{1,}$/i;
 	
 	// Array of message content.
 	var msgSplit = message.split(" ");
 	var addition = "";
 	// Iterate over the message and check for regex match.
 	for (var i = 0; i < msgSplit.length; i++) {
 		if (imgReg.test(msgSplit[i])) {
 			addition += " <img class = \"margin-left-20\" src = \""+ msgSplit[i] +"\" width = \"200px\" alt = \"" + msgSplit[i] + "\">";
 		} else if (videoReg.test(msgSplit[i])) {
 			// Get link for embeded player.
 			var vidSrc = "https://www.youtube.com/embed/" + msgSplit[i].split("?v=")[1];
 			addition += " <iframe class = \"margin-left-20\" src = \"" + vidSrc + "\" width = \"200px\" height = \"150px\" allowfullscreen><\/iframe>";
 		}
 	}
 	
 	return addition;
 }
 
function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var addition = addition = checkLink(sporocilo);
  if (jeSmesko || addition.length) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $("<div class = \"bold-text\"></div>").html(sporocilo+addition);
  } else {
    return $("<div class = \"bold-text\"></div>").text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
	sporocilo += checkLink(sporocilo);
	return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $("#seznam-uporabnikov div").click(function() {
      	$("#poslji-sporocilo").focus();
    	$("#poslji-sporocilo").val("/zasebno \"" + $(this).text() + "\" ");
  	});
  });
  
  // Check for poke event.
  socket.on("dregljaj", function(vzdevek) {
  	$("#sporocila").append(divElementEnostavniTekst(vzdevek.vzdevek + " vas je dregnil!"));
  	$("#vsebina").jrumble();
  	// Start shaking the screen.
  	$("#vsebina").trigger("startRumble");
  	// Wait for 1.5s.
  	setTimeout(function() {
  		// Stop shaking the screen.
  		$("#vsebina").trigger("stopRumble");
  	}, 1500);
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  };
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
