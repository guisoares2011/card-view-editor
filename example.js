window.addEventListener("DOMContentLoaded", function(){

	var myListView = new CardViewEditor("#destinations", {
		
		properties: {
			"title": new CardViewEditor.fields.TextField("#title"),
			"description": new CardViewEditor.fields.TextField("#description"),
			"cover": new CardViewEditor.fields.ImageField("#cover", {maxWidth: 340})
		},

		generateCardViewContent : function(card){
			var cover = card.getProperty('cover');
			if(cover){
				var el = document.createElement("div");
				el.appendChild(cover.result)
				var title = document.createElement("p");
				title.innerHTML = (card.getProperty('title') || 'No title');
				el.appendChild(title)
				return el;
			} else {
				return "<p>" + (card.getProperty('title') || 'No title') + "</p>";
			}
		}
	});

	var coverContainer = document.getElementById("cover-container");
	var updateCover = function(container, card){
		var cover = card.getProperty("cover");
		if(cover){
			var c = document.getElementById("test");
			loadImage(cover.value, function (img) {
				container.innerHTML = "";
				container.appendChild(img);
			}, {maxWidth: 550 });	
		} else {
			container.innerHTML = "";
		}
	}

	myListView.on("onselectcard", updateCover.bind(null, coverContainer));
	myListView.on("change:cover", updateCover.bind(null, coverContainer));
	document.getElementById("float-button").addEventListener("click", function(){
		myListView.addCard();
	});
	document.getElementById("delete-button").addEventListener("click", function(){
		myListView.removeCardSelected();
	});
});