/* exported getCssSkeleton,initViewer */


$.arrayIntersect = function(a, b){
    return $.grep(a, function(i)
    {
        return $.inArray(i, b) > -1;
    });
};

// gib ein CSS-Skelett für die Tags aus (zum Copy&pasten)
function getCssSkeleton(insertRandomColor) {
	var header = '@charset "utf-8";\n';
	header += '@namespace svg url(http://www.w3.org/2000/svg);\n';
	var cssDefs = "";
	//Output the labels
	tags.forEach(function(tag){
		var randomColor = (insertRandomColor?'#' + Math.floor(Math.random() * 16777215).toString(16):false);
		var cssClassName = tag.cssClass;
		//add the SVG class
		cssDefs += 'svg|*.tag-' + cssClassName + '-highlight{\n';
		if(randomColor){
			cssDefs += 'fill: ' + randomColor + ';\n';
		}
		cssDefs += '}\n';
		//add the button class
		cssDefs += 'button.tag-' + cssClassName + '{\n';
		if(randomColor){
			cssDefs += 'background-color: ' + randomColor + ';\n';
		}
		cssDefs += '}\n';
	});
	return (header + cssDefs);
}

function loadProjectsList() {
	return $.ajax({
  		url: options.projectFilesDir,
  		dataType: "html",
		success: function(data) {
			$(data).find("a[href$='/']").not("a[href^='/']").each(function(){
				var dirName = $(this).attr('href');
				var projectSelector = $('#projectSelector');
				var projectLabel = dirName.substr(0, dirName.length - 1);
				projectFiles.push(dirName);
				projectSelector.append(
					$('<option></option>').val(dirName).html(projectLabel)
				);
			});
		}
	});
}

function _refreshViewsList() {
	var viewSelector = $('#viewSelector');
	viewSelector.empty();
//	$("#viewSelector options").remove();
	var $views = $("<div></div>");
	$("object > view", projectXML).each(function() {
		var filename = $("original", this).attr("filename");
		var objectId = $(this).attr("id");
		$views.append($("<option></option>").html(filename).val(objectId));
	});
	viewSelector.append($views.find("option"));
}

function _loadView(viewId) {
	if(panZoom) {
		panZoom.destroy();
	}
	$("#svg-container").empty();
	var $svg = constructSVG(viewId);
	$("#svg-container").append($svg[0]);
	// Lade das SVG
	panZoom = svgPanZoom('#svg-container', {
		zoomEnabled: true,
		controlIconsEnabled: true,
		fit: true,
		center: true
	});
	//transparenz für Bitmap von Slider übernehmen
	$($svg[0]).children('image').css('opacity', parseFloat($('#image-opacity').val()));
	registerPanZoomEvents();
}

function constructSVG(viewId) {
	elementIds = [];
	var $view = $("object > view[id='" + viewId + "']", projectXML);
	var $img = $("img", $view);
	var height = parseInt($img.attr("height"), 10);
	var width = parseInt($img.attr("width"), 10);

	var $svg = $('<svg xmlns="http://www.w3.org/2000/svg" style="border:1px solid black"></svg>')
		.attr("width", width)
		.attr("height", height)

		.attr("viewbox", width + " " + height)
		.attr("id", viewId)
	;
	var d3svg = d3.selectAll($svg.toArray());
	d3svg.append("image")
		.attr("xlink:href", options.projectFilesDir + projectDir + $img.attr("src"))
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", width)
		.attr("height", height)
	;
	var d3transformGroup = d3svg.append("g").attr("transform", "scale(" + width + ", " + height + ")");

	$("layer", $view).each(function() {
		var groupId = $(this).attr("id");
		elementIds.push(groupId);
		var d3group = d3transformGroup.append("g")
			.attr('id', groupId)
		;
		$(this).find("svg\\:svg,svg").children("svg\\:g,g").find("*").each(function() {
			var tagName = this.tagName.substring(4, this.tagName.length);
			var d3element = d3group.append(tagName);
			$.each(this.attributes, function(key, attr) {
				d3element.attr(attr.name, attr.value);
			});
		});
	});
	return $svg;
}

//hole alle Tags aus XML
function _getTags(){
	tags = [];
	var $tagNodes = $("group[type='tag']", projectXML);
	// gehe jede Node durch, füge Tag zu json objekt (tags) hinzu
	$.each($tagNodes,  function(index, tagNode){
		var tagName = $(tagNode).find("rdf\\:RDF,RDF").children("rdf\\:Description,Description").children("dc\\:title,title").html();
		//Klassennamen dürfen keine Leerzeichen enthalten: ersetzen durch "_"
		var cssClass = tagName.replace(/ /g,'_');
		var ids = [];
		var hashedIDs = [];
		// füge ID aus XML (member/@xlink:href) zu array hashedIDs hinzu
		$.each($(tagNode).children("member"), function(idx, member){
			var linkedId = $(member).attr("xlink:href");
			if (linkedId.length !== 0){
				hashedIDs.push(linkedId);
				ids.push(linkedId.substr(1));
			}
		});
		// speichere Label und ids aus dem XML in eine globale Variable "tags"(objekt) plus Name der css-Klasse
		tags.push({
			"label": tagName,
			"cssClass": cssClass,
			"ids_hashed": hashedIDs,
			"ids": ids
		});
	});
}

//lade die Tags für den ausgewählten view neu (zeige keine Tags, die nicht im View vorkommen)
function _refreshTags() {
	//leere Tag Buttons Liste
	$("#tagbox-dyn").empty();
	var $tagButtons = $("<div></div>");
	tags.forEach(function(tag, idx){
  		var foundIds = $.arrayIntersect(elementIds, tag.ids);
		//Zeige nur Buttons für Tags, die auch IDs haben
		if(foundIds.length > 0) {
			var $button = $('<button class="button toggle-button"><span class="button-label">' + tag.label + ' (' + foundIds.length +')</span></button>');
			$button.addClass('tag-' + tag.cssClass);
			//speichere den Index des "tags"-objekts als "data-tagIndex" attribut des Buttons (um beim "mouseup" die IDs holen zu können)
			$button.attr('data-tagIndex', idx);
			//hänge Button an #tagbox an
			$tagButtons.append($button);
		}
	});
	$("#tagbox-dyn").append($tagButtons);
}

function loadProject(projectDir) {
	var _self = this;
	/*var projectLabel = projectDir.substr(0, projectDir.length - 1);*/
	/*console.debug("loading " + projectLabel + "...");*/
	return $.get(options.projectFilesDir + projectDir + "project.xml", function( data ) {
		_self.projectDir = projectDir;
		projectXML = data;
		_refreshViewsList();
		_getTags();		
		$('#tagbox-dyn').empty();
		//Lade das dazugehörige tags.css (und entferne das des alten Projekts)
		$('#tags-css').remove();
		$("<link>").insertBefore('#main-css').attr({type : 'text/css', rel : 'stylesheet'}).attr('href', options.projectFilesDir + projectDir + 'tags.css');
		$("#viewSelector").trigger("change");
		/*console.debug("... done");*/
	});
}

function registerEventListeners() {
	//dunkles Theme ein/ausschalten
	$("#toggle-theme").on("mouseup", function() {
		var group = $("#viewbox, #tagbox"); //alle
		group.toggleClass("theme-black");
		if(group.hasClass("theme-black")){
			$("#toggle-theme").html("&#9788;"); //highlight-on class im css definieren
		}else{
			$("#toggle-theme").html("&#9788;"); //highlight-off class im css definieren
		}
	});					
				
	//Alle Elemente ausblenden
	// Wenn Projekt Dropdown sich ändert
	$("#projectSelector").on("change", function() {
		var optionSelected = $("option:selected", this);
		var projectDir = optionSelected.val();
		loadProject(projectDir);
		$('#anno-popup').hide("fast");
	});

	// Wenn view Dropdown sich ändert
	$("#viewSelector").on("change", function() {
		var viewSelected = $("option:selected", this);
		_loadView(viewSelected.val());
		_refreshTags();
		$('#anno-popup').hide("fast");
	});

	// Hintergrundbild Transparenz slider
	$('#image-opacity').on("mousedown", function() {
		$(this).on("mousemove", function () {
			$('#svg-container >> svg image').css("opacity", $(this).val());
		});
	}).on("mouseup", function() {
		$(this).off("mousemove");
	});

	//SVG Gruppenelemente mouseover
	$("#viewbox").on("mouseenter", "svg >> svg > g g", function (event) {
		_svgMouseoverHighlight($(event.currentTarget));
	})
	.on("mouseout", "svg >> svg > g g", function(event) {
		var isSelectedElement = ($(event.currentTarget).attr("id") === _svgSelectedElementId);
		if(!isSelectedElement){
			_svgMouseoverHighlight_disable($(event.currentTarget));
		}
	})
	.on("mouseup", "svg >> svg > g g", function(event) {
		if(!_dragging){
			// entferne Highlight von einem eventuell vorher selektiertem Element
			_svgMouseoverHighlight_disable($('#' + _svgSelectedElementId));
			_svgSelectedElement = $(event.currentTarget);
			_svgSelectedElementId = _svgSelectedElement.attr("id");
			showAnnotations($(event.currentTarget));
			/*
			verschiebe das Annnotations-Popup rechts neben die Element boundingbox
			var offset = 50;
			var bbox = event.currentTarget.getBoundingClientRect();
			moveAnnoPopupTo(bbox.x + bbox.width + offset, bbox.y);
		*/
		}
	});

	//Annotation ein- und ausblenden
	$('#anno-popup').on("mouseup", ".annotation-header", function() {
		var $header = $(this);
		$header.parent().find(".annotation-body").toggle("fast");
/*		
		var isVisible = $header.parent().children(".annotation-body").first().css("display")=="none"?false:true;
		$('#popup').find(".annotation-body").hide("fast");
		if(!isVisible) $header.parent().find(".annotation-body").show("fast");
*/
	});


	//Escape Key 
	$(document).keyup(function(event) {
	    if (event.keyCode === 27) {
	    	closeAnnoPopup();
	    }
	});	

	//close the Popup
	$('.close-button').on('mouseup', function(){
		var $popup = $(this).closest(".popup");
		$popup.hide("fast");
		switch ($popup.attr("id")){
			case "anno-popup":
				closeAnnoPopup();
			break;
		}
		
	});

	$(document).on('mousedown touchstart', function(event) {
		_$draggedElement = $(event.target);
		_clickOffset.x = (event.pageX - _$draggedElement.offset().left);
		_clickOffset.y = (event.pageY - _$draggedElement.offset().top);
	})
	.on('mousemove touchmove', function(event) {
		if(_$draggedElement){
			_dragging = true;
			// windowBar angeklickt
			if(_$draggedElement.hasClass("windowBar")){
				var $popup = _$draggedElement.closest(".popup");
				event.preventDefault();
				movePopupTo($popup, (event.pageX - _clickOffset.x), (event.pageY - _clickOffset.y));
			}
		}
	})
	.on('mouseup touchend', function(event) {
		var $target = $(event.target);
		//Tag Toggle Buttons
		if(!_dragging){
			var $lightbulb = null;
			//alle Buttons mit der Klasse "toggle-button"
			if ($target.hasClass("toggle-button")) {
				$lightbulb = $target.find(".activated");
				var tagIndex = $target.attr("data-tagindex");
				toggleTagElements(tagIndex, $lightbulb.length === 0);
			} else if ($target.attr('id') === 'getCssSkeleton'){
				var $content = getCssSkeleton(options.cssSkeletonRandomColors);
				$('#cssSkeletonTextarea').html($content);
				$('#cssSkeleton-popup').show("fast");
			}else if($target.attr('id') === 'toggle-all'){
				$lightbulb = $target.find(".activated");
				if($lightbulb.length > 0){
					$('#svg-container >> svg > g > *:not(.svg-element-highlight)').hide();
					$lightbulb.remove();
				} else {
					$('#svg-container >> svg > g > *:not(.svg-element-highlight)').show();
					$target.append("<span class='activated'>&#128161;</span>");
				}
			}
		}
		_clickOffset = {x: null, y:null};
		_dragging = false;
		_$draggedElement = null;

	});
}

function toggleTagElements(tagIndex, show) {
	var $button = $('#tagbox-dyn button[data-tagindex="' + tagIndex + '"]');
	var tagObj = tags[tagIndex];
	var ids = tagObj.ids_hashed;
	// baue den namen der SVG-CSS-Klasse zusammen
	var svgCssClass = 'tag-' + tagObj.cssClass + '-highlight';
	// selektiere die SVGElemente (mit dem zusammengebauten ID-Selektor-String)
	var svgElements = $(ids.join(","));
	//ToDo: Check ob sonst andere highlight klasse
	//$('#svg-container >> svg > g > *[class^="tag-"]').show()
	svgElements.toggleClass(svgCssClass, show);
	svgElements.toggle(show);
	// Wenn gehighlighted wird, füge "lightbulb"-span (mit Klasse "activated") hinter dem Label ein. Falls nicht: lösche den "activated" span.
	if(show) {
		svgElements.addClass("svg-element-highlight");
		$button.children("span.button-label").append("<span class='activated'>&#128161;</span>");
	} else {
		svgElements.removeClass("svg-element-highlight");
		$button.children("span.button-label").children("span.activated").remove();
	}
}

//Synchronisieren von svg zoom/pan und popup
function registerPanZoomEvents() {
/*	panZoom.setOnZoom(function(level){
    });
    panZoom.setOnPan(function(point){
		moveAnnoPopupTo((_svgSelectedElement.position().x + _svgSelectedElement.width()), (_svgSelectedElement.position().y + _svgSelectedElement.height()));
    });*/
}

function closeAnnoPopup() {
	_svgMouseoverHighlight_disable($('#' + _svgSelectedElementId));
	_svgSelectedElementId = null;
	_svgSelectedElement = null;
}

function movePopupTo($popup, x, y) {
	/* Popup soll nicht über die Dokumentgrenzen hinaus verschoben werden dürfen*/
	x = Math.min(x, ($(document).width() - $popup.width()) );
	y = Math.min(y, ($(document).height() - $popup.height()) );
	x = Math.max(x, 0);
	y = Math.max(y, 0);
	$popup.css("transform", "translate(" + x + "px, " + y + "px)");
}

function _svgMouseoverHighlight_disable($svgElement) {
	$svgElement.removeClass("mouseover-highlight");
}

function _svgMouseoverHighlight($svgElement) {
	$svgElement.addClass("mouseover-highlight");
}

function showAnnotations($svgElement) {
	var groupId = $svgElement.attr("id");
	if(groupId){
		//suche nach annotationen für Gruppe
		var $annotations = $("rdf\\:RDF,RDF", projectXML).children("rdf\\:Description[rdf\\:about='#" + groupId + "']");
		var annoArray = [];
		if($annotations.length > 0){
			$annotations.each(function() {
				var $this = $(this);
				var language = $this.attr("xml:lang");
				var title = $this.find("dc\\:title,title").text();
				var annotationText = $("HIBase\\:annotation,annotation", $this).text();
/*				console.debug(annotationText);*/
				annoArray.push({
					language: language,
					title: title,
					html: annotationText
				});
			});
		}
		var $annoPopup = $("#anno-popup");
		var $annoDisplay = $annoPopup.find(".annotation-wrapper");
		$annoDisplay.empty();
		annoArray.forEach(function(anno) {
			var hiLanguageCode = anno.language;
			var isoLangCode = langCodeMap[hiLanguageCode];

			var $annoBody = $("<div></div>").addClass("annotation-body");
			var $annoLang = $("<span></span>").addClass("annotation-lang");
			if(options.showLangFlags && isoLangCode){
				$annoLang.addClass("flag-icon flag-icon-" + isoLangCode);
			}else{
				$annoLang.html("(" + hiLanguageCode + ")");
			}
			var $annoTitle = $("<span></span>").addClass("annotation-title").html(anno.title);
			var $annoHeader = $("<div></div>").addClass("annotation-header")
				.append($annoTitle)
				.append($annoLang);

			$annoBody.html(anno.html);
			//Baue Eintrag zusammen
			var $annoEntry = $("<div></div>").addClass("annotation-entry")
				.append($annoHeader)
				.append($annoBody);
			//Hänge Eintrag an AnnoDisplay an
			$annoEntry.appendTo($annoDisplay);
		});
		$annoDisplay.appendTo($annoPopup);
		//Erste annotation komplett anzeigen
		$annoDisplay.find(".annotation-body").show();
		$annoPopup.show("fast");

	}
}

function initViewer() {
	$('#image-opacity').attr("step", options.imageOpacityStep);
	$('#image-opacity').val(options.initialImageOpacity);
	/*Anno Popup auf die Initialposition setzen*/
	movePopupTo($('#anno-popup'), options.initialAnnoPopupPos.x, options.initialAnnoPopupPos.y);
	registerEventListeners();
	$.when(loadProjectsList()).then(function(){
		//fürs debuggen und entwickeln: wähle testprojekt

		//lade ausgewähltes Projekt
		$.when(loadProject($("#projectSelector option:selected").val())).then(function() {
			/*console.info("project loaded.");*/
		});
	});
}

/*function debug_inscription-mouseover() {
	console.debug($('#f1cf9260-9e65-48ba-8e17-0461a6b9b43c'));
}
*/
var _clickOffset = {x: null, y:null};
var _svgSelectedElementId = null;
var _svgSelectedElement = null;
var _dragging = false;
var _$draggedElement = null;

var options = {
	projectFilesDir: "projects/",
	showLangFlags: false,
	initialAnnoPopupPos: {x: 600, y: 200},
	initialImageOpacity: 0.5,
	imageOpacityStep: 0.01,
	cssSkeletonRandomColors: true
};

var panZoom = null;
var projectDir = null;
var projectFiles = [];
var projectXML = null;
var tags = [];
var elementIds = [];
