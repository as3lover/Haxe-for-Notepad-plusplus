"use strict";

var DEBUG = true;
var UPDATE_UDL = true; // slow

var previewFile = "preview.html";
var udl2cssFile = "stylemap.json";
var udlBaseFile = "udl.xml";

var $settingsPanel;
var $previewPanel;
var $udlPanel;

var xml;
var mappings;
var tiny;

var xmlSerializer;

var $inputs;
var swatches;

function init() {
  $settingsPanel = null;
  $previewPanel = null;
  $udlPanel = null;
  xml = null;
  mappings = null;
  $inputs = {};
  swatches = [];
  xmlSerializer = new XMLSerializer();
}

$(function() {
  main();
});

function main() {
  console.log("-- UDL 2.1 Themer.js");

  init();
  
  // to preserve order (which $.add() doesn't do)
  $.fn.push = function(selector) {
    Array.prototype.push.apply(this, $.makeArray($(selector)));
    return this;
  };

  $settingsPanel = $("#settings-panel");
  $previewPanel = $("#preview-panel");
  $udlPanel = $("#udl-panel");

  loadPrevieHtml().then(loadUdlBaseFile()).then(loadUdl2CssJson());
}

function loadPrevieHtml() {
  var xhr = fetchUrl(previewFile, $previewPanel, "html");
  xhr.done(function(data) {
    //console.log(data);
    $previewPanel.html(data);
    return xhr;
  });
  return xhr;
}

function getCssSelection(json) {
  var sel = $();
  for (var i=0; json.cssSelectors && i < json.cssSelectors.length; i++) {
    var cssSelector = json.cssSelectors[i];
    if (!cssSelector) sel = sel.push($previewPanel);
    else sel = sel.push($previewPanel.find(cssSelector));
  }
  return sel;
}

function getUdlSelection(json) {
  if (json.udlSelector) return $(xml).find(json.udlSelector);
  else return null;
}

function getInitialValue(json) {
  var sel = getUdlSelection(json);
  if (sel) {
    return sel.attr(json.udlAttr);
  }

  return $(getCssSelection(json)[0]).css(json.cssAttr); // use only the first item (see $.push())
}

function updateUdlValue(id, json, value) {
  if (!UPDATE_UDL) return;
  var sel = getUdlSelection(json);
  if (sel) {
    sel.attr(json.udlAttr, value);
    updateUdl(xml);
  }
}

function createColorInput(id, label, color, json) {
  var form = $('<div class="form-group">' +
    '<small>' +
    '<label for=' + id + ' class="control-label text-muted">' + label + '</label>' +
    '<input class="sc form-control input-sm" id="' + id + '" type="text" value="' + color + '">' + 
    '</small>' +
    '</div>'
  );
  var input = form.find('input');

  var $slider = $(input).ColorPickerSliders({
    //previewontriggerelement: false,
    size: 'sm',
    placement: 'bottom',
    swatches: swatches,
    customswatches: 'udl-swatches',
    hsvpanel: true,
    grouping: true,
    previewformat: 'hex',
    order: {
      hsl: 1
    },
    labels: {'hslhue':'hue', 'hslsaturation':'saturation', 'hsllightness':'lightness'},
    //updateinterval: 60,
    onchange: function(container, color) {
      var hexColor = color.tiny.toHexString(color);
      var $sel = getCssSelection(json);
      $sel.css(json.cssAttr, hexColor);
      updateUdlValue(id, json, $(input).val());
    }
  });

  if (!color) {
    color = getInitialValue(json);
  }
  $(input).val(color);
  if (swatches.indexOf(color) < 0) swatches.push(color);
  
  $slider.on('keyup', function(evt) {
    if (evt.keyCode == 27) {
      $slider.trigger("colorpickersliders.hide");
    }
  });
  
  var update = function(color) {
    $slider.trigger("colorpickersliders.updateColor", color);
    $slider.trigger("colorpickersliders.show").trigger("colorpickersliders.hide");
  };

  $inputs[id] = {el: $slider, update: update, json: json, formEl:form};

  return form;
}

function createTextInput(id, label, value, json) {
  var form = $('<div class="form-group">' + 
    '<small>' +
    '<label for=' + id + ' class="control-label text-muted">' + label + '</label>' +
    '<input class="txt form-control input-sm" id="' + id + '" type="text" value="' + value + '">' + 
    '</small>' +
    '</div>'
  );
  var input = form.find('input');
  $(input).on('change keyup paste', function() {
    update($(this).val());
  });

  if (!value) {
    value = getInitialValue(json);
  }
  $(input).val(value);
  
  var update = function(value) {
    updateUdlValue(id, json, $(input).val());
  };
  $inputs[id] = {el: $(input), update: update, json: json, formEl:form};
  return form;
}

var inputID = 0;
function createInputFor(jsonData, value) {
  if (jsonData.type === "color") {
    return createColorInput(jsonData.type + inputID++, jsonData.label, value, jsonData);
  }
  else if (jsonData.type === "text") {
    return createTextInput(jsonData.type + inputID++, jsonData.label, value, jsonData);
  } else {
    return createTextInput(jsonData.type + inputID++, jsonData.label, value, jsonData);
  }
}

var $slider;
function loadUdl2CssJson() {
  var xhr = fetchUrl(udl2cssFile, $settingsPanel, 'json');
  xhr.done(function(data) {
    mappings = data.mappings;
    $settingsPanel.empty();
    //console.log(data);
    for (var i = 0; i < mappings.length; i++) {
      var item = data.mappings[i];
      var formEl = createInputFor(item);
      //$settingsPanel.append(formEl);
      
      var id = $(formEl).find('input').attr('id');
      var $input = $inputs[id];
      $input.update($input.el.val());

      //console.log(item);
    }
    
    addPagination();

    return xhr;
  });

  return xhr;
}

function addPagination() {
  var tabs = '<div>' +
  '<!-- Nav tabs -->' +
  '<ul class="nav nav-tabs" role="tablist">' +
  '  <li role="presentation" class="active"><a href="#tab0" aria-controls="main" role="tab" data-toggle="tab">Main</a></li>' +
  '  <li role="presentation"><a href="#tab1" aria-controls="secondary" role="tab" data-toggle="tab">Secondary</a></li>' +
  '  <li role="presentation"><a href="#tab2" aria-controls="extra" role="tab" data-toggle="tab">Extra</a></li>' +
  '</ul>' +
  '' +
  '<!-- Tab panes -->' +
  '<div class="tab-content">' +
  '  <div role="tabpanel" class="tab-pane active" id="tab0"></div>' +
  '  <div role="tabpanel" class="tab-pane" id="tab1"></div>' +
  '  <div role="tabpanel" class="tab-pane" id="tab2"></div>' +
  '</div>' +
  '</div>';
  
  var $tabs = $(tabs);
  var i = 0;
  $.each($inputs, function(key, item) {
    var tabNum = Math.floor(i / 7);
    $tabs.find('#tab' + tabNum).append(item.formEl);
    i++;
  });
  
  $settingsPanel.append($tabs);
}

function updateUdl(xmlData) {
  xml = xmlData;
  //console.log(xml);
  $udlPanel.html('<pre class="language-xml"><code>');
  //var escapedData = $('<div/>').text(data).html();
  var data = xmlSerializer.serializeToString(xmlData);
  
  // clone and remove some sections
  var clonedXml = $.parseXML(data);
  $(clonedXml).find('Settings, KeywordLists').html("...");
  
  $udlPanel.find('code').text(xmlSerializer.serializeToString(clonedXml));
  Prism.highlightElement($udlPanel.find("pre code")[0]);
}

function loadUdlBaseFile() {
  var xhr = fetchUrl(udlBaseFile, $udlPanel, "xml");
  xhr.done(function(data) {
    //console.log(data);
    updateUdl(data);
    return xhr;
  });

  return xhr;
}

function fetchUrl(url, $container, dataType) {
  dataType = dataType || "text";
  var xhr = $.ajax(url, {dataType:dataType});
  
  xhr.done(function(data) {
    console.log("Loaded '" + url + "'" + " (dataType:" + dataType + ")");
    return xhr;
  });

  xhr.fail(function(xhr, status, errorStr) {
    $container.html($('<div role="alert">').addClass('alert alert-danger').html("Failed to load <strong>'" + url + "'</strong>: " + errorStr));
    console.error("Failed to load '" + url + "':", status, errorStr);
    return xhr;
  });

  return xhr;
}