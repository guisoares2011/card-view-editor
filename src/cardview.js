/**
 * Card View Editor Plugin
 *
 * With this plugin you can create card with livepreview
 * and order as your preference.
 *
 * This lib require only another lib to support load images local
 * This lib doesn't use jQuery to be fast
 *
 * @version 1.0
 * @author : Guilherme Soares
 * @required https://github.com/blueimp/JavaScript-Load-Image
*/

(function(root){
	"use strict";

	/** ECMA Polyfill **/
	if (!String.prototype.startsWith) {
	    String.prototype.startsWith = function(searchString, position){
	      position = position || 0;
	      return this.substr(position, searchString.length) === searchString;
	  };
	}
	if (!Array.prototype.indexOf) {
	    Array.prototype.indexOf = function(d, e) {
	        var a;
	        if (null == this) throw new TypeError('"this" is null or not defined');
	        var c = Object(this),
	            b = c.length >>> 0;
	        if (0 === b) return -1;
	        a = +e || 0;
	        Infinity === Math.abs(a) && (a = 0);
	        if (a >= b) return -1;
	        for (a = Math.max(0 <= a ? a : b - Math.abs(a), 0); a < b;) {
	            if (a in c && c[a] === d) return a;
	            a++
	        }
	        return -1
	    };
	}
	/** ECMA Polyfill **/

	/*** CARD ***/
	var Card = function(el){
		this.el = el;
		this.properties = {};
		this.readProperties();
	}

	Card.prototype = {
		
		readProperties : function(){
			var attr;
			for(var j = 0; j < this.el.attributes.length; j++){
				attr = this.el.attributes[j];
				if(!attr.nodeName.startsWith("data-card-")) continue;
				this.setProperty(attr.nodeName.replace("data-card-", ""), attr.nodeValue);
			}
		},

		getElement : function(){
			return this.el;
		},

		getProperty : function(name){
			return name in this.properties ? this.properties[name] : null;
		},

		setProperty : function(name, value){ 
			this.properties[name] = value;
		},

		setContent : function(content){
			if(content instanceof Element){	
				this.el.innerHTML = "";
				this.el.appendChild(content)
			} else {
				this.el.innerHTML = content;
			}
		},

		select: function(){
			this.el.className += " card-selected";
		},

		unselect: function(){
			this.el.className = this.el.className.replace(" card-selected", "");
		}
	};
	/*** CARD ***/

	/**********************************
     * Properties CardViewEditor
     *********************************
	*/
	var fields = (function(){
		
		//Abstract Class
		var BaseField = function(target, options){
			this.target = document.querySelector(target);
			this.options = options || {};
			this.key = null;
		}

		BaseField.prototype = {
			getKey: function(){ return this.key; },
			setKey: function(key){ this.key = key; },
			clear: function(){ console.warn("Base Method must be overwritten"); },
			getValue: function(){ console.warn("Base Method must be overwritten"); },
			setValue: function(){ console.warn("Base Method must be overwritten"); },
			onchangeValue: function(callback){ console.warn("Base Method must be overwritten"); } 
		}

		//Text Field
		var TextField =  function(target, options){
			BaseField.apply(this, arguments);
		}

		TextField.prototype = Object.create(BaseField.prototype);
		TextField.prototype.getValue = function(){
			return this.target.value;
		}
		TextField.prototype.setValue = function(value){
			this.target.value = value;
		}
		TextField.prototype.clear = function(){ 
			this.setValue(''); 
		};
		TextField.prototype.onchangeValue = function(fn){
			fn = fn || function(){};
			var self = this;
			this.target.addEventListener("keyup", function(){
				fn.call(self, this.value)
			});
		}

		//IMAGE FIELD
		var ImageField =  function(target, options){
			BaseField.apply(this, arguments);

			//this.reader = new FileReader();
		}

		ImageField.prototype = Object.create(BaseField.prototype);
		ImageField.prototype.getValue = function(){
			return this.target.files;
		}
		ImageField.prototype.setValue = function(value){
			//this.target.val(value);
		}
		ImageField.prototype.clear = function(){ 
			this.target.value = '';
		};
		ImageField.prototype.onchangeValue = function(fn){
			var self = this;
			this.target.addEventListener("change", function(){
				var file = self.getValue();
				if (file.length > 0) {
					loadImage(file[0], function (img) {
						fn.call(self, {
							result: img,
							value: self.getValue()[0]
						})
					}, {maxWidth: self.options.maxWidth || 350 });
				}
			});
		}

		return {
			BaseField: BaseField,
			TextField: TextField,
			ImageField: ImageField
		}
	})();
	/*********************/

	var CardViewEditor = function(object, options){
		this.el = document.querySelector(object);
		this.el.className += " card-container";
		this.cards = [];
		this.events = {};
		this.cardSelected = null;
		this.scopedElement = null;
		this.scopedElementEvent = null;
		this.default_options = {
			
			//It's necessary 1 of 8 part of card to change the position
			//This value cannot be 0 or null
			minPosition : 16,

			livepreview: true,

			properties: {
				/* {name: "title", type: "text", target: "#test"} */
				/* {name: "title", type: "combo", target: "#test"} */
				/* {name: "title", type: "image", target: "#test"} */
			},

			generateCardViewContent : function (card){
				return "<p>Card content</p>";
			},

			generateFakeCardViewContent : function (card){
				return "<p class='full-text-card'>Place the card here</p>";
			}
		};
		this.options = $.extend(null, this.default_options, options);
		this.createEventCardPropertiesEvent();
		this.readCurrentCards();
	};

	CardViewEditor.prototype = {

		createEventCardPropertiesEvent : function(){
			var self = this, target = null;
			if(this.livepreview == false) return;
			var properties = this.options.properties, property = null;
			var callback = function(value){
				self.updateAttributeCard(this.getKey(), value);
			};
			for(var key in properties){
				property = properties[key];
				if(!(property instanceof fields.BaseField)) continue;
				property.setKey(key)
				property.onchangeValue(callback);
			}
		},

		updateAttributeCard : function(name, value){
			if(!this.cardSelected) return;
			this.cardSelected.setProperty(name, value)
			this.cardSelected.setContent(this.options.generateCardViewContent(this.cardSelected));
			this.trigger("change:" + name, this.cardSelected, value);
		},
		
		readCurrentCards: function(){
			var children = this.el.children, card = {}, attr = null;;
			for(var i = 0; i < children.length; i++){
				card = new Card(children[i]);
				this.createEventCard(card);
				card.setContent(this.options.generateCardViewContent(card));
				this.cards.push(card);
			}
			if(children.length > 0)
				this.selectCard(this.cards[0]);
		},

		addCard : function(card){
			if(!(card instanceof Card)) {
				var el = document.createElement("div");
				el.className = "card-view";
				this.el.appendChild(el);
				card = new Card(el);
			}
			this.createEventCard(card);
			card.setContent(this.options.generateCardViewContent(card));
			this.cards.push(card);
			this.selectCard(card);
		},	

		hasCardSelected : function(){
			return this.cardSelected != null;
		},

		removeCardSelected : function(){
			if(!this.hasCardSelected()) return;
			var index = this.cards.indexOf(this.cardSelected);
			console.log(index, this.cards)
			if(index != -1){
				var el = this.cardSelected.getElement();
				el.parentNode.removeChild(el);
				this.cards.splice(index, 1);
				this.cardSelected = null;
				if(this.cards.length > 0){
					this.selectCard(this.cards[0]);
				}
			}
		},

		on: function(eventName, fn){
			fn = fn || function(){};
			if(!(eventName in this.events)) this.events[eventName] = [fn];
			else this.events[eventName].push(fn);
		},

		trigger : function(eventName){
			if(!(eventName in this.events)) return;
			var args = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : [];
			var events = this.events[eventName];
			for(var i = 0; i < events.length; i++){
				events[i].apply(this, args);
			}
		},
		
		update: function(){
			for(var i = 0; i < this.cards.length; i++){
				this.cards[i].setContent(this.options.generateCardViewContent(this.cards[i]));
			}
		},

		createFakeElement : function(el){
			var fakeEl = document.createElement("div");
			fakeEl.style.height = el.height;
			fakeEl.className = "card-view card-fake";
			fakeEl.innerHTML = this.options.generateFakeCardViewContent();
			el.parentNode.insertBefore(fakeEl, el);
			return fakeEl;		
		},

		dragEventEnd : function(el){
			if(el != this.scopedElement) return;
			var fakeEl = this.scopedElementEvent.fakeEl;
			this.scopedElement.className = this.scopedElement.className.replace(" drag-move", "");
			el.style.marginTop = null;
			fakeEl.parentNode.insertBefore(this.scopedElement, fakeEl);
			fakeEl.parentNode.removeChild(fakeEl);
			this.scopedElement = null;
			this.scopedElementEvent = null;
		},

		mousedownCard: function(self, card, e){
			if(self.scopedElement != null) return;
			var offsetTop = this.offsetTop ;
			self.scopedElement = this;
			this.style.marginTop = this.offsetTop + "px";
			
			//FAKE ELEMENT
			var fakeEl = document.createElement("div");
			fakeEl.style.height = this.height;
			fakeEl.className = "card-view card-fake";
			fakeEl.innerHTML = self.options.generateFakeCardViewContent();
			this.parentNode.insertBefore(fakeEl, this);

			self.scopedElementEvent = {el: this, event: event, offsetTop: offsetTop, fakeEl: fakeEl};
			self.selectCard(card);
			this.className += " drag-move";	
		},

		mousemoveCard: function(self, card, e){
			if(this != self.scopedElement) return;
			var yPosition = self.scopedElementEvent.offsetTop + (e.clientY - self.scopedElementEvent.event.clientY);
			this.style.marginTop = yPosition  + "px";

			var card = null, fakeEl = self.scopedElementEvent.fakeEl,
			maxOffsetTop = null;
			
			//MOVE FAKE ELEMENT
			for(var i = 0; i < self.cards.length; i++){
				if(self.scopedElement == self.cards[i].el) continue;
				card = self.cards[i].el;

				maxOffsetTop = card.offsetTop + card.offsetHeight;
				if(self.scopedElement.offsetTop >= card.offsetTop && self.scopedElement.offsetTop <= maxOffsetTop){
					if(self.scopedElement.offsetTop > (card.offsetTop + (card.offsetHeight/ self.options.minPosition))){
						card.parentNode.insertBefore(fakeEl, card.nextSibling);
					} else {
						card.parentNode.insertBefore(fakeEl, card);
					}
				}
			}
		},

		selectCard : function(card){
			if(this.selectedlCard == card) return;
			for(var i = 0; i < this.cards.length; i++)
				this.cards[i].unselect();
			card.select();
			this.cardSelected = card;
			for(var key in this.options.properties){
				if(key in card.properties){
					this.options.properties[key].setValue(card.properties[key]);
				} else {
					this.options.properties[key].clear();
				}
			}
			this.trigger("onselectcard", card)
		},

		createEventCard : function(card){
			var self = this;
			var el = card.getElement();
			el.addEventListener("mousedown", this.mousedownCard.bind(el, this, card));
			el.addEventListener("mousemove", this.mousemoveCard.bind(el, this, card));
			el.addEventListener("mouseup", this.dragEventEnd.bind(this, el));
			el.addEventListener("mouseleave", this.dragEventEnd.bind(this, el));
		}
	};

	CardViewEditor.fields = fields;
    root.CardViewEditor = CardViewEditor;

})(this);