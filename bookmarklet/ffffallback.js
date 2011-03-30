(function() {
  var $ = {
    memo: {},
  }
  $.each = function(collection, callback) {
    if(!collection) {
      return;
    }
    if(collection.hasOwnProperty('length') && collection.length == 0) {
      return;
    }
    var key;
    for (key in collection) {
      if(collection.hasOwnProperty(key) && key !== 'length') {
        callback.call(collection, collection[key], key);
      }
    }
  };

  $.getComputedStyleOfElement = function(elem) {
    /**
     *  Based on this blog entry:
     *  http://blog.stchur.com/2006/06/21/css-computed-style/
     */
    if (typeof elem.currentStyle != 'undefined') {
      return elem.currentStyle;
    }
    return document.defaultView.getComputedStyle(elem, null);
  };

  $.trimString = function(string, characterToTrim) {
    characterToTrim = characterToTrim || ' ';
    while(string[0] == characterToTrim) {
      string = string.substring(1);
    }
    while(string[string.length - 1] == characterToTrim) {
      string = string.substring(0, string.length - 1);
    }
    return string;
  }

  $.unquote = function(string) {
    return $.trimString($.trimString($.trimString(string), '"'), "'");
  }

  $.getFontsFromDeclaration = function(fontDeclaration) {
    if($.getFontsFromDeclaration.memo[fontDeclaration]) {
      console.log('memo');
      return $.getFontsFromDeclaration.memo[fontDeclaration];
    }

    var fonts = [];
    $.each(fontDeclaration.split(','), function(font) {
      fonts.push($.unquote(font));
    });

    $.getFontsFromDeclaration.memo[fontDeclaration] = fonts;
    return $.unique(fonts);
  }
  $.getFontsFromDeclaration.memo = {};

  $.getElementFont = function(elem) {
    var style = $.getComputedStyleOfElement(elem);
    if(style && style['font-family']) {
      return style['font-family'];
    } else {
      return null;
    }
  }

  $.unique = function(array) {
    var uniquedArray = [];
    var i;
    for(i = 0; i < array.length; i++) {
      if(uniquedArray.indexOf(array[i]) < 0) {
        uniquedArray.push(array[i]);
      }
    }
    return uniquedArray;
  }

  $.getAllFontsInUse = function(elem) {
    var elemFont = $.getElementFont(elem);
    var fonts = elemFont ? [elemFont] : [];
    $.each(elem.childNodes, function(childElem) {
      fonts = fonts.concat($.getAllFontsInUse(childElem));
    });
    return $.unique(fonts).sort();
  }

  $.getClassForFont = function(font) {
    $.memo.getClassForFont = $.memo.getClassForFont || [];
    if($.memo.getClassForFont.length === 0) {
      $.memo.getClassForFont = $.getAllFontsInUse(document.body);
    }

    var index = $.memo.getClassForFont.indexOf(font);
    if(index < 0) {
      return false;
    } else {
      return 'ffffallback-fontclass-' + index;
    }
  };

  $.addClassToElement = function(className, element) {
    var elementClassName = className;
    if(element.getAttribute('class')) {
      elementClassName = element.getAttribute('class') + ' ' + elementClassName;
    }
    element.setAttribute('class', elementClassName);
  };

  $.removeClassFromElement = function(classNameToRemove, element) {
    var elementClassName = '';
    var classes = (element.getAttribute('class') || '').split(' ');
    $.each(classes, function(existingClassName) {
      if(existingClassName !== classNameToRemove) {
        elementClassName += existingClassName + ' ';
      }
    });
    element.setAttribute('class', $.trimString(elementClassName));
  };

  $.addFontClasses = function(elem, parentFont) {
    parentFont = parentFont || null;
    var font = $.getElementFont(elem);

    if(elem.getAttribute) {
      var className = false;
      if(font) {
        className = $.getClassForFont(font) || false;
      }
      if(className) {
        //  Only add the class name if the font is different from the parent element
        //  or if this element explicitly defines the parent's font.
        className = className || 'ffffallback-fontclass-inherit-parent';
        $.addClassToElement(className, elem);
      }
    }

    $.each(elem.childNodes, function(childElem) {
      $.addFontClasses(childElem, font);
    });
  }

  $.capitalize = function(string) {
    return string.toUpperCase().substring(0, 1) + string.substring(1);
  }

  $.createElementWithContent = function(tagName, content) {
    var elem = document.createElement(tagName);
    elem.innerHTML = content;
    return elem;
  };

  $.event = function(element, event, handler, capture) {
    capture = capture || false;
    var boundHandler = function() {
      return handler.apply(element, arguments);
    }
    element.addEventListener(event, boundHandler, false);
    return boundHandler;
  };

  $.setFallbackCSS = function(cssObject) {
    var cssText = '';

    $.each(cssObject, function(declarations, selector) {
      cssText += '#ffffallback-content-container ' + selector + ' {\n';
      cssText += 'color: magenta !important;';
      $.each(declarations, function(value, key) {
        cssText += '  ' + key + ': ' + value + ';\n';
      });
      cssText += '}\n\n';
    });

    var styleElement = document.getElementById('ffffallback-css');
    if(!styleElement) {
      styleElement = $.createElementWithContent('style', '');
      styleElement.setAttribute('id', 'ffffallback-css');
      document.body.appendChild(styleElement);
    }

    styleElement.innerText = cssText;
    console.log('Did set', cssText);
  };

  window.$fallback = $;

  $.init = function() {
    console.log('start');

    var clonedCopy = $.createElementWithContent('div', document.body.innerHTML);
    clonedCopy.setAttribute('id', 'ffffallback-content-container');

    //  Copy padding. TBD -- give cloned copy negative version of padding as margin
    //  to counteract positioning? Doesn't seem necessary but not sure why.
    var bodyStyle = getComputedStyle(document.body);
    clonedCopy.style.paddingBottom = bodyStyle['padding-bottom'] || 0;
    clonedCopy.style.paddingLeft = bodyStyle['padding-left'] || 0;
    clonedCopy.style.paddingRight = bodyStyle['padding-right'] || 0;
    clonedCopy.style.paddingTop = bodyStyle['padding-top'] || 0;

    document.body.appendChild(clonedCopy);
    console.log('Added clone');
    $.addFontClasses(clonedCopy);
    console.log('Added font classes');

    //  OK, now add the controller
    var controller = $.createElementWithContent('div', '\
  <form id="ffffallback-toggles">\
  <h1 id="ffffallback-title"><abbr title="Fast, flexible font fallback!">ffffallback!</abbr> <input type="submit" id="ffffallback-update" value="Update" /></h1>\
  <div id="ffffallback-radios">\
  <label><input type="radio" name="ffffallback-display-mode" accesskey="o" id="ffffallback-display-mode-original" /> Original</label>\
  <label class="radio-checked"><input type="radio" name="ffffallback-display-mode" accesskey="b" id="ffffallback-display-mode-both" checked /> Both</label>\
  <label><input type="radio" name="ffffallback-display-mode" accesskey="f" id="ffffallback-display-mode-fallback" /> Fallback</label>\
  </div>\
  <ul id="ffffallback-fonts"></ul>\
  </form>\
  ');
    controller.setAttribute('id', 'ffffallback-controller');
    document.body.appendChild(controller);
    var fontList = document.getElementById('ffffallback-fonts');
    fontList.innerHTML = '';

    //  Size the controller
    var resizeController = function() {
      var controller = document.getElementById('ffffallback-controller');
      var title = document.getElementById('ffffallback-title');
      var fonts = document.getElementById('ffffallback-fonts');
      var toggles = document.getElementById('ffffallback-toggles');

      fonts.style.maxHeight = (controller.offsetHeight - (title.offsetHeight + toggles.offsetHeight + 40)) + 'px';
    }
    window.addEventListener('resize', resizeController, false);
    resizeController();

    var fontClass;
    $.each($.getAllFontsInUse(document.body), function(font) {
      fontClass = $.getClassForFont(font);
      fontList.appendChild($.createElementWithContent('li', '<b>' + font + '</b><input type="text" value="" placeholder="Fallback font" class="ffffallback-specify-font" data:font-class="' + fontClass + '" />'));
    });

    $.event(document.getElementById('ffffallback-display-mode-original'), 'click', function() {
      $.removeClassFromElement('ffffallback-hide-original', document.body);
      $.addClassToElement('ffffallback-hide-fallback', document.body);
      //below is Josh's handywork... I have no idea how to toggle... plz help Mark

      $.each(document.getElementsByClassName('radio-checked'), function(elem) {
        $.removeClassFromElement('radio-checked', elem);
      });

      $.addClassToElement('radio-checked', this.parentNode);
      console.log(document.body.className);
    });
    $.event(document.getElementById('ffffallback-display-mode-both'), 'click', function() {
      $.removeClassFromElement('ffffallback-hide-original', document.body);
      $.removeClassFromElement('ffffallback-hide-fallback', document.body);
      //below is Josh's handywork... I have no idea how to toggle... plz help Mark
      $.each(document.getElementsByClassName('radio-checked'), function(elem) {
        console.log('Oh elem is!', elem);
        $.removeClassFromElement('radio-checked', elem);
      });
      $.addClassToElement('radio-checked', this.parentNode);
      console.log(document.body.className);
    });
    $.event(document.getElementById('ffffallback-display-mode-fallback'), 'click', function() {
      $.addClassToElement('ffffallback-hide-original', document.body);
      $.removeClassFromElement('ffffallback-hide-fallback', document.body);
      //below is Josh's handywork... I have no idea how to toggle... plz help Mark
      $.each(document.getElementsByClassName('radio-checked'), function(elem) {
        $.removeClassFromElement('radio-checked', elem);
      });
      $.addClassToElement('radio-checked', this.parentNode);
      console.log(document.body.className);
    });

    $.event(document.getElementById('ffffallback-update'), 'click', function(e) {
      e.preventDefault();

      console.log('Updating');

      var cssDeclarations = {};
      $.each(document.getElementsByClassName('ffffallback-specify-font'), function(fontInput) {
        //var className = fontInput.getAttribute('data:font-class');
        if(!fontInput.getAttribute) {
          return;
        }
        var className = fontInput.getAttribute('data:font-class');
        var value = $.trimString(fontInput.value);
        if(!value) {
          return;
        }
        cssDeclarations['.' + className] = {
          //  TODO: 'font' instead of font-family?
          'font-family': value
        };
      });
      console.log(cssDeclarations);
      $.setFallbackCSS(cssDeclarations);
    });
  }
  
  window.addEventListener('load', function() {
    $.init();
  }, false);
  
  if(document.body) {
    $.init();
  }
})();