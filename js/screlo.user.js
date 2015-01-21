// ==UserScript==
// @name        screlo
// @description Thomas Brouard - OpenEdition
// @namespace   http://revues.org/
// @include     /^http://lodel\.revues\.org/[0-9]{2}/*/
// @include     /^http://formations\.lodel\.org/[0-9]{2}/*/
// @include     http://*.revues.org/*
// @version     15.1.1
// @downloadURL	https://github.com/thomas-fab/screlo/raw/master/js/screlo.user.js
// @updateURL	https://github.com/thomas-fab/screlo/raw/master/js/screlo.user.js
// @grant       none
// ==/UserScript==
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
  "name": "screlo",
  "version": "15.1.1",
  "description": "Script de relecture Lodel",
  "main": "dist/screlo.js",
  "dependencies": {},
  "devDependencies": {
    "browserify": "^8.1.1",
    "grunt": "^0.4.5",
    "grunt-browserify": "^3.3.0",
    "grunt-contrib-clean": "^0.6.0",
    "grunt-contrib-concat": "^0.5.0",
    "grunt-contrib-copy": "^0.7.0",
    "grunt-contrib-watch": "^0.6.1",
    "grunt-preprocess": "^4.1.0",
    "preprocess": "^2.1.0"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/thomas-fab/screlo.git"
  },
  "keywords": [
    "lodel"
  ],
  "author": "Thomas Brouard (OpenEdition)",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/thomas-fab/screlo/issues"
  },
  "homepage": "https://github.com/thomas-fab/screlo"
}

},{}],2:[function(require,module,exports){
// ################ CONFIGURATION ###############

var xprt = {},
    pkg = require('../package.json');

xprt.version = pkg.version;

xprt.appUrls = {
    
    stylesheat: "https://rawgit.com/thomas-fab/screlo/master/css/screlo.css",
    update: "https://github.com/thomas-fab/screlo/raw/master/js/screlo.user.js"
}

module.exports = xprt;
},{"../package.json":1}],3:[function(require,module,exports){
// ################ SCRELO CORE ###############

var xprt = {},
    version = require("./config.js").version,
    improveLodel = require("./lodel.js").improveLodel,
    getTests = require("./tests-revues.js"),
    reqUi = require("./ui.js"), // TODO: Ouh c'est vilain ce nom
    addCss = reqUi.addCss,
    ui = reqUi.ui,
    utils = require ("./utils.js"),
    retournerUrl = utils.retournerUrl,
    nomCourt = utils.nomCourt;
    


// Objet Notification
function Notification (test, root) {

    this.id = typeof test.id === 'number' ? test.id : 0;
    this.name = typeof test.name === 'string' ? test.name : '';
    this.help = typeof test.help === 'string' ? test.help : '';
    this.type = typeof test.type === 'string' ? test.type : 'danger';
    this.label = typeof test.label === 'string' ? test.label : test.name;
    this.labelPos = typeof test.labelPos === 'string' ? test.labelPos : "before";
    this.count = 0;
    this.markers = [];
    this.active = false;

    // Debug
    this.root = root;
    this.version = Notification.prototype.version;

}

// TODO: remplacer une config "schema" qui englobe Notification et Marker
Notification.prototype.version = "15.1.1+b"; // NOTE: Valeur à modifier quand l'architecture de l'objet Notification change. Permet d'éviter les incompatibilités avec les objets obsolètes qui peuvent se trouver dans localStorage.

Notification.prototype.getName = function () {

    var html = this.name;

    if (this.count > 0) {
        html = html + " <span>" + this.count + "</span>";
    }

    return html;
};

Notification.prototype.addMarker = function (element, label) {
    label = label !== undefined ? label : this.label;

    this.markers.push(
        new Marker ({
            element: element,
            label: label,
            type: this.type,
            pos: this.labelPos
        })
    );

    this.count++;

    return this;
};

Notification.prototype.activate = function () {
    this.active = true;
    return this;
};




// Objet Marker
function Marker (options) {

    this.id = typeof options.id === 'number' ? options.id : 0;
    this.label = typeof options.label === 'string' ? options.label : "";
    this.type = typeof options.type === 'string' ? options.type : 'danger';
    this.labelPos = typeof options.labelPos === 'string' ? options.labelPos : "before";
    this.element = options.element;
    this.valid = this.element && this.element.nodeType === 1 && this.label !== "";

    if (!this.valid) {
        console.log("Erreur à la création du Marker : paramètres invalides.");
    }

}

Marker.prototype.inject = function () {

    var $span = $('<span class="screlo-marqueur"></span>').addClass(this.type).attr("data-screlo-marqueur-text", this.label).attr("data-screlo-marqueur-id", this.id);

    if (!this.valid) {
        return;
    }

    if (this.labelPos !== "after") {
        $span.prependTo(this.element);
    } else {
        $span.appendTo(this.element);    
    }
    $("body").addClass("hasMarqueur");

};




// Determiner le contexte d'execution
function getContexte (importClasses) {

    var contexte = { "classes" : {} };

    for ( var i=0; i < importClasses.length; i++ ) {
        contexte.classes[importClasses[i]] = true;
    }

    if (contexte.classes.numero) {
        var urls = [],                
            tocElements = $('ul.summary li.textes .title');

        contexte.toc = [];

        tocElements.each( function() {
            var obj = {},
                id = $(this).children('a').eq(0).attr('href');
            if (id !== undefined) {
                obj.id = id;
            }
            obj.$element = $(this);
            contexte.toc.push(obj);
        });
    }

    contexte.admin = ($('#lodel-container').length !== 0);
    contexte.isMotscles = $("body").hasClass("indexes") && $("body").is("[class*='motscles']");
    contexte.idPage = location.pathname.match(/(\d+)$/g);
    contexte.nomCourt = nomCourt();
    contexte.localStorage = JSON.parse(localStorage.getItem(contexte.nomCourt));
    contexte.localStorage = contexte.localStorage ? contexte.localStorage : {};

    if (contexte.localStorage.papier !== false) {
        contexte.localStorage.papier = true;
    }

    if (!contexte.localStorage.erreurs) {
        contexte.localStorage.erreurs = {};
    }

    return contexte;

}




// Effectuer les tests
function relire(tests, root) {

    function injectMarker(marker) {
        marker.inject();
    }

    var thisTest,
        notif,
        res,
        notifs = [],
        nbTests = 0;

    root = typeof root !== undefined ? root : document;

    for (var i = 0; i < tests.length; i++) {

        thisTest = tests[i];

        if (thisTest.condition) {

            notif = new Notification(thisTest, root);
            res = thisTest.action(notif, root);

            if (res.active) {

                if (res.markers.length > 0) {
                    res.markers.forEach( injectMarker );
                }

                notifs.push(res);
            }

            nbTests++;
        }
    }

    if (notifs[0] === undefined && nbTests > 0 && (contexte.classes.textes || root !== document)) {

        var successMessage = new Notification({
            name: 'Aucune erreur détectée <span>' + nbTests + ' tests</span>',
            type: "succes"
        });

        notifs.push(successMessage);
    }

    return notifs;
}




// Afficher les erreurs
// TODO: renommer en notif
function afficherErreurs(erreurs, target) {

    // TODO: revoir ici pour notifications + n'afficher les marqueurs que si notif.root === document.
    erreurs.sort(function (a, b) {
        var ordre = ['screlo-exception','danger','warning','print','succes'],
            typeA = ordre.indexOf(a.type),
            typeB = ordre.indexOf(b.type),
            err;

        if (typeA > typeB)
            return 1;
        if (typeA < typeB)
            return -1;
        return 0;
    });

    for (var i = 0; i < erreurs.length; i++) {

        err = erreurs[i];

        if (err.version === Notification.prototype.version) {

            if (!(err instanceof Notification)) { // TODO: ça arrive quand ça sort du localStorage, mais je pense qu'il faudrait faire ça dès le moment où le localStorage est transformé en objet => genre une fonction getLS()
                err = new Notification(err);
            }

            $('<li class="erreur ' + err.type + '">' + err.getName() + '</li>').appendTo(target);
        }
    }
}




// Afficher un message screlo-exception
// FIXME: obsolete
function afficherScreloException (message, target) {
    var erreur = new Erreur(message, "screlo-exception"),
        erreurs = [erreur];

    afficherErreurs(erreurs, target);
}




// Relecture Ajax
function relectureAjax(id, callback, total) {

    var url =  retournerUrl("site") + id;

    // NOTE: comme Lodel utilise une vieille version de jquery (1.4) on ne peut pas utiliser $.get().done().fail().always(). On utilise donc $.ajax()       
    $.ajax({
        url: url,
        timeout: 20000,
        success: function(data) {
            if (data && data.match(/\n.*(<body.*)\n/i) !== null) {
                var root = data.match(/\n.*(<body.*)\n/i)[1].replace("body", "div"),
                    classes = $(root).get(0).className.split(/\s+/),
                    contexte = getContexte(classes), 
                    container = $("<div></div>");
                container.append($(data).find("#main"));

                var tests = getTests(contexte),
                    erreurs = relire(tests, container);

                afficherErreurs(erreurs, "ul#relecture" + id);
                cacherErreurs(id, erreurs);
            } else {
                erreurAjax(id);                        
            }
        },
        error: function() {
            erreurAjax(id);
        },
        complete: function() {
            $("ul#relecture" + id).addClass("complete");

            if (callback && typeof(callback) === "function" && total) {
                callback(total);
            }
        }                
    });

    function erreurAjax(id) {
        afficherScreloException("Impossible de charger ce document", "ul#relecture" + id);
    }
}




function relireToc(contexte) {

    if (contexte.classes.numero && contexte.toc.length !== 0) {

        $("#screlo-tests #screlo-infocache").remove();
        $(".screlo-relecture").empty();
        $("body").addClass("loading");

        var total = contexte.toc.length;

        for (var i = 0; i < total; i++) {
            relectureAjax(contexte.toc[i].id, relireTocProgression, total);
        }
    } else {
        alert("Impossible d'exécuter cette fonction (relireToc).");
    }               
}




function relireTocProgression(total) {
    if (total === $(".screlo-relecture.complete").length) {
        $("body").removeClass("loading");
        $(".complete").removeClass("complete");
    }
}




// Cacher les Erreurs dans le ls pour limiter les requetes
// TODO: dans le core ?
function cacherErreurs (contexte, erreurs) {
    var id = contexte.idPage;
    contexte.localStorage.erreurs[id] = erreurs;
    localStorage.setItem(contexte.nomCourt, JSON.stringify(contexte.localStorage));
}




function run () {

    var contexte = getContexte(document.body.className.split(/\s+/)),
        tests = getTests(contexte),
        erreurs = relire(tests, document);

    addCss();
    ui(contexte, relireToc);
    afficherErreurs(erreurs, "#screlo-tests");
    cacherErreurs(contexte, erreurs);
    improveLodel();

    console.log('Screlo.js version ' + version + ' est chargé !');
    
}

xprt.relireToc = relireToc;
xprt.run = run;

module.exports = xprt;

},{"./config.js":2,"./lodel.js":5,"./tests-revues.js":7,"./ui.js":8,"./utils.js":9}],4:[function(require,module,exports){
// ################ JQUERY PLUGINS ###############

module.exports = function (jQuery) {
    
    // NOTE: problème sur Chrome si les plugins jquery ne sont pas chargés au début

    /*
    * jQuery Highlight Regex Plugin v0.1.2 (https://github.com/jbr/jQuery.highlightRegex)
    * (c) 2009-13 Jacob Rothstein - MIT license
    */
    !function(a){var b=function(c){if(c&&c.childNodes){var d=a.makeArray(c.childNodes),e=null;a.each(d,function(a,d){3===d.nodeType?""===d.nodeValue?c.removeChild(d):null!==e?(e.nodeValue+=d.nodeValue,c.removeChild(d)):e=d:(e=null,d.childNodes&&b(d))})}};a.fn.highlightRegex=function(c,d){return"object"==typeof c&&"RegExp"!==c.constructor.name&&(d=c,c=void 0),"undefined"==typeof d&&(d={}),d.className=d.className||"highlight",d.tagType=d.tagType||"span",d.attrs=d.attrs||{},"undefined"==typeof c||""===c.source?a(this).find(d.tagType+"."+d.className).each(function(){a(this).replaceWith(a(this).text()),b(a(this).parent().get(0))}):a(this).each(function(){var e=a(this).get(0);b(e),a.each(a.makeArray(e.childNodes),function(e,f){var g,h,i,j,k,l;if(b(f),3==f.nodeType){if(a(f).parent(d.tagType+"."+d.className).length)return;for(;f.data&&(j=f.data.search(c))>=0&&(k=f.data.slice(j).match(c)[0],k.length>0);)g=document.createElement(d.tagType),g.className=d.className,a(g).attr(d.attrs),l=f.parentNode,h=f.splitText(j),f=h.splitText(k.length),i=h.cloneNode(!0),g.appendChild(i),l.replaceChild(g,h)}else a(f).highlightRegex(c,d)})}),a(this)}}(jQuery); // jshint ignore:line
    
    return jQuery;
    
};
},{}],5:[function(require,module,exports){
// ################ LODEL IMPROVEMENTS ###############




// Bookmarklet debugger (version light)
function debugStylage () {
    
    // On recherche les P et SPAN vides (sauf COinS !)
    $('p, span:not(.Z3988)').not('#screlo-main *').not('.screlo-marqueur').each(function() {

        // Elements vides
        var strEmpty = ($(this).get(0).tagName == 'P') ? 'paragraphe vide' : '\u00A0';
        if (($(this).text().match(/^(nbsp|\s)*$/g) !== null) && ($(this).has('img').length === 0)) // FIXME: fonctionne pas bien sur les <p> car span.paranumber fait que le text est jamais vide
            $(this).text(strEmpty).addClass('FIXME');

        // Mises en forme locales
        if ($(this).attr('style') !== undefined)
            $(this).attr('title', $(this).attr('style')).addClass('TODO');
    });
    
}




// Fixer le menu de navigation pour boucler sur tous les éléments
function fixNav () {
    
    function addNav(dirClass, url) {
        $('.navEntities').append($('<a></a>').addClass(dirClass + " corrected").attr('href', url));
    }

    function navInToolbar(buttonId, url) {
        $("#screlo-toolbar a[data-screlo-button='" + buttonId + "']").attr("href", url).removeClass("hidden");
    }

    if ($('.navEntities .goContents').length !== 0) {

        var tocUrl = $('.navEntities .goContents').attr('href'),
            result =  $("<div></div>").load( tocUrl + " #main", function() {
                var idPage = location.pathname.match(/(\d+)$/g)[0],
                    toc = $(this).find('ul.summary li:not(.fichiers) a:first-child').map( function() {
                    return $(this).attr('href');
                }).get(),
                    i = $.inArray(idPage, toc);

                if (i !== -1) {
                    $('.navEntities a.goPrev, .navEntities a.goNext').remove();
                    if (i !== 0) {
                        addNav('goPrev', toc[i-1]);
                        navInToolbar("goprev", toc[i-1]);
                    } 
                    if (i+1 !== toc.length) {
                        addNav('goNext', toc[i+1]);
                        navInToolbar("gonext", toc[i+1]);
                    }
                    $('<span></span>').css({'float': 'left', 'margin': '2px 5px'}).text(Number(i+1) + '/' + Number(toc.length)).prependTo('.navEntities');
                }
            });

        navInToolbar("gocontents", tocUrl);
    }
    
}




// Liens vers la source sur TOC de la publication
function sourceDepuisToc () {
    
    $('ul.summary li:not(.fichiers) .title').each( function() {
        var id = $(this).children('a').eq(0).attr('href'),
            href ='lodel/edition/index.php?do=download&type=source&id=' + id;
        if (id !== undefined) {
            $(this).append('<a href="' + href + '"> Ⓦ</a>');
        }
    });   
    
}




// Tout lancer d'un seul coup
function improveLodel () {
    
    debugStylage();
    fixNav();
    sourceDepuisToc();

}


var xprt = {};

xprt.improveLodel = improveLodel;

module.exports = xprt;
},{}],6:[function(require,module,exports){
if (!window.jQuery) {

    console.log("Erreur : Screlo nécessite jQuery");

} else {

    $( function () {
        
        var run = require("./core.js").run;
        
        $ = jQuery = require("./jquery-plugins.js")(jQuery);
        
        run();
        
    });

}
},{"./core.js":3,"./jquery-plugins.js":4}],7:[function(require,module,exports){
// ############### TESTS REVUES.ORG ###############

var utils = require("./utils"),
    latinize = utils.latinize,
    urlEstValide = utils.urlEstValide,
    isValidIsbn = utils.isValidIsbn,
    getPText = utils.getPText;
// TODO : $ = require("plugins.js")($); // Ou alors dans main


module.exports = function (contexte) {
    return [

        {
            name: "Absence d'auteur",
            id: 1,
            condition: contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations,
            action: function (notif, root) {

                var champAuteur = $('#docAuthor', root);

                if(champAuteur.length === 0){
                    notif.activate();
                }

                return notif;
            }
        },

        {
            name: "Absence du facsimilé",
            id: 2,
            type: "print",
            condition: contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations && contexte.localStorage.papier,
            action: function (notif, root) {

                if($('#wDownload.facsimile', root).length === 0){
                    notif.activate();
                }

                return notif;
            }
        },

        {
            name: "Erreur de pagination",
            id: 3,
            type: "print",
            condition: contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations && contexte.localStorage.papier,
            action: function (notif, root) {

                if($('#docPagination', root).length === 0){

                    notif.name = "Pas de pagination";
                    notif.activate();

                } else if (!/^p\. [0-9-]*$/i.test($('#docPagination', root).text())) {

                    notif.name = "Mauvais format de pagination";
                    notif.activate();

                }

                return notif;
            }
        },

        {
            name: "Pas de date de publication électronique (numéro)",
            id: 4,
            condition: contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations,
            action: function (notif, root) {

                // FIXME: ce test ne fonctionne que si la page est affichée en français > à passer au niveau du numéro
                var refElectro = $('#quotation > h3:last', root).next('p').text();

                if (refElectro.match(/mis en ligne le ,/)) {
                    notif.activate();
                }

                return notif;

            }
        },

        {	
            name: "Absence de référence de l'oeuvre commentée",
            id: 5,
            condition: contexte.classes.textes && (contexte.classes.compterendu || contexte.classes.notedelecture),
            action: function (notif, root) {

                if ($("#docReference", root).length === 0) {
                    notif.activate();
                }

                return notif;

            }
        },

        {
            name: "Utilisation de police(s) non Unicode",
            id: 6,
            label: "Police",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var el = $('#content [style*="Symbol"], #content [style*="symbol"], #content [style*="Wingdings"], #content [style*="wingdings"], #content [style*="Webdings"], #content [style*="webdings"]', root);

                el.each(function() {
                    notif.addMarker(this).activate();
                });

                return notif;                        
            }
        },

        {
            name: "Retour à la ligne dans le titre ou dans un intertitre",
            id: 7,
            label: "Retour à la ligne",
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('.texte:header br, h1#docTitle br', root).each( function() {
                    notif.addMarker(this).activate();
                });

                return notif;

            }
        },

        {
            name: "Titre d'illustration mal placé",
            id: 8,
            label: "Titre mal placé",
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('table + .titreillustration, img + .titreillustration, div.textIcon + .titreillustration', root).each( function() {

                    if ($(this).next('table, img, div.textIcon').length === 0) { // titreillus apres illus = erreur, sauf si suivi d'illus
                        notif.addMarker(this).activate();
                    }

                });

                return notif;

            }
        },

        {
            name: "Légende d'illustration mal placée",
            id: 9,
            label: "Légende mal placée",
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('.creditillustration + .legendeillustration, div.textIcon + .legendeillustration', root).each( function() {
                    notif.addMarker(this).activate();
                });

                return notif;

            }
        },

        {
            name: "Caractère minuscule en début de paragraphe",
            id: 10,
            label: "Minuscule",
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('#text > .text > *:not(.textandnotes), #text > .text > .textandnotes > *, #text > .text > *:header', root).not('.citation,.paragraphesansretrait, blockquote, .sidenotes, ol, ul, li, table, table *').each( function() {

                    var firstChar = getPText($(this)).charAt(0);

                    if (latinize(firstChar).match(/^[a-z]/)) {
                        notif.addMarker(this).activate();
                    }

                });

                return notif;

            }
        },

        {
            name: "Citation stylée en Normal",
            id: 11,
            label: "Citation",
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('#text > .text > *:not(.textandnotes), #text > .text > .textandnotes > *', root).not('.citation, .epigraphe, blockquote, .sidenotes, ol, ul, li, :header').each( function() {

                    var string = getPText($(this));

                    if (string.charAt(0).match(/[«"“]/) && string.slice(-20).match(/[”"»]/)) {
                        notif.addMarker(this).activate();
                    }
                });

                return notif;

            }
        },

        {
            name: "Listes mal formatées", // NOTE: Test "Listes mal formatées" amelioré pour éviter les faux positifs sur les initiales de noms propres. Ne matchent que les intiales de la forme /^[A-Z]\.\s/ qui s'inscrivent dans une suite qui commence par "A.", "B.", etc. ou "A:", B:"...
            id: 12,
            type: "warning",
            label: "Liste",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                function listInfos (string) {
                    var ulTest = string.match(/^([•∙◊–—>-])\s/),
                        olTest = string.match(/^([0-9a-z]{1,3})[\/.):–—-]\s/i),
                        ALPHATest = string.match(/[A-Z][.:]\s/),
                        res = { 
                            "type": false,
                            "symbol": "",
                        };

                    if (ulTest !== null) {
                        res.type = "ul";
                        res.symbol = ulTest[1];

                    } else if (olTest !== null) {

                        if (ALPHATest !== null) {
                            res.type = "alpha";
                        } else {
                            res.type = "ol";
                        }                        
                        res.symbol = olTest[1];
                    }
                    return res;                          
                }

                function getLetter (start, dir) {
                    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    return alphabet[alphabet.indexOf(start) + dir];
                }

                var collection = $('#text > .text > p, #text > .text > .textandnotes > p', root).not(".titreillustration"),
                    err = [],
                    alphaCollection = {},
                    i,
                    prevLetter,
                    lastRecordedLetter;

                collection.each( function(index) {
                    var string = getPText($(this)),
                        infos = listInfos(string);

                    if (infos.type === "ul" | infos.type === "ol") {
                        err.push(this);
                    } else if (infos.type === "alpha") {
                        alphaCollection[index] = { 
                            "symbol": infos.symbol, 
                            "element": this 
                        };
                    }                            
                });

                for (i=0; i<collection.length; i++) {
                    if (alphaCollection[i]) {
                        prevLetter = getLetter(alphaCollection[i].symbol, -1);
                        if (
                            ( alphaCollection[i].symbol === "A" && !alphaCollection[i-1] && alphaCollection[i+1].symbol === "B" ) ||
                            ( alphaCollection[i].symbol !== "A" && alphaCollection[i-1] && alphaCollection[i-1].symbol === prevLetter && lastRecordedLetter === prevLetter )
                        ) {
                            err.push(alphaCollection[i].element);
                            lastRecordedLetter = alphaCollection[i].symbol;
                        }
                    }
                }

                for (i=0; i<err.length; i++) {
                    notif.addMarker(err[i]).activate();
                }

                return notif;

            }
        },

        {
            name: "Styles inconnus utilisés",
            id: 13,
            label: "Style inconnu",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var textWhitelist = "p.remerciements, p.texte, p.paragraphesansretrait, p.creditillustration, p.crditsillustration, p.epigraphe, p.citation, p.citationbis, p.citationter, p.titreillustration, p.legendeillustration, p.question, p.reponse, p.separateur, p.encadre";

                $('#text > .text p', root).each( function() {
                    if (!$(this).is(textWhitelist)) {
                        notif.addMarker(this, "Style inconnu : " + $(this).attr("class")).activate();
                    }
                });

                return notif;

            }
        },

        {
            name: "Incohérence dans la numérotation des notes",
            id: 14,
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var e = false,
                    debut = 0;

                $('#notes > p > a[id^=ftn]', root).each( function(index) {
                    if (index === 0) {
                        debut = parseInt($(this).text());
                    } else {
                        if (parseInt($(this).text()) !== index + debut) {
                            notif.activate();
                            return false;
                        }
                    }
                });

                return notif;
            }
        },

        {
            name: "Mauvais style de note",
            id: 15,
            label: "Style inconnu",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $("#notes p:not(.notesbaspage):not(.notebaspage)", root).each( function() {
                    notif.addMarker(this, "Style inconnu : " + $(this).attr("class")).activate();
                });

                return notif;

            }			
        },

        {
            name: "Intertitre dans une liste",
            id: 16,
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $("#content ol :header, #content ul :header, #content li:header", root).each( function() {
                    notif.addMarker(this).activate();
                });

                return notif;

            }			
        },

        {
            name: "Ponctuation à la fin du titre ou d'un intertitre",
            id: 17,
            type: "warning",
            label: "Ponctuation",
            labelPos: "after",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('.texte:header, #docTitle, #docSubtitle, #docAltertitle > div', root).each( function() {
                    if( $(this).text().trim().match(/[\.:;=]$/) ) {
                        notif.addMarker(this).activate();
                    }
                });

                return notif;

            }			
        },

        {
            name: "Mises en formes locales sur le titre",
            id: 18,
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('#docTitle, #docTitle *', root).each( function() {
                    if ($(this).attr("style")) {
                        notif.activate();
                        return false;
                    }
                });

                return notif;

            }			
        },

        {
            name: "Appel de note dans le titre",
            id: 19,
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                if ($('#docTitle .footnotecall', root).length !== 0) {
                    notif.activate();
                }

                return notif;

            }
        },

        {
            name: "Titre d'illustration stylé en légende",
            id: 20,
            type: "warning",
            label: "Titre plutôt que légende",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $('.legendeillustration', root).each( function() {
                    if( $(this).text().match(/^(fig|tabl|illus|image|img|sch)/i) ) {
                        notif.addMarker(this).activate();
                    }
                });

                return notif;

            }			
        },

        {
            name: "Champs d'index Word",
            id: 21,
            label: "Champ d'index",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $("a:contains('Error: Reference source not found'), a[href^='#id']", root).each( function() {
                    notif.addMarker(this).activate();
                });

                return notif;

            }			
        },

        {
            name: "Remerciement en note 1",
            id: 22,
            label: "Remerciement",
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var $el = $("#notes .notesbaspage:first", root),
                    str = $el.text(),
                    merci = /(merci|thank)/i; // TODO: compléter

                if (str.match(merci)) {
                    notif.addMarker($el.get(0)).activate();
                }

                return notif;
            }			
        },

        {
            name: "Composition des mots-cles", // TODO: à passer en nouvelle architecture
            id: 23,
            type: "warning",
            labelPos: "after",
            condition: contexte.isMotscles || (contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations),
            action: function (notif, root) {

                function testerMotsCles($collection, notif) {

                    $collection.each( function() {
                        var latinAlphanum = /[\u0030-\u0039\u0040-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]/,
                            motCle = $(this).text().trim(),
                            alertes = [];

                        // Premier caractère invalide
                        if (!motCle.substr(0,1).match(latinAlphanum)) {
                            alertes.push('Initiale');   
                        }

                        // Point final
                        if (motCle.slice(-1) === '.') {
                            alertes.push('Point final');   
                        }

                        // Mauvais séparateurs
                        if (motCle.match(/[\-/;–—][\u0030-\u0039\u0040-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F \s]*[\-/;–—]/) && motCle.length > 20 ) {
                            alertes.push('Vérifier les séparateurs');   
                        }

                        if (alertes.length !== 0){
                            notif.addMarker(this, alertes.join(' | ')).activate();
                        }
                    });

                    return notif;
                }

                if (contexte.isMotscles) {
                    notif = testerMotsCles($('#pageBody .entries ul li', root), notif);
                } else if (contexte.classes.textes) {
                    notif = testerMotsCles($('#entries .index a', root), notif);
                }

                return notif;
            }
        },

        {
            name: "Hierarchie du plan incohérente",
            id: 24,
            type: "warning",
            label: "Hierarchie",
            labelPos: "after",
            condition: contexte.classes.textes,
            action: function (notif, root) {
                var precedent = 0;

                $('#toc div', root).each( function () {
                    var niveau = Number($(this).attr('class').slice(-1));
                    if (niveau > precedent + 1 || (precedent === 0 && niveau != 1)) {
                        notif.addMarker(this).activate();
                    }
                    precedent = niveau;
                });

                return notif;
            }			
        },

        {
            name: "Vérifier les doublons",
            id: 25,
            type: "warning",
            label: "Doublon",
            labelPos: "after",
            condition: contexte.isMotscles,
            action: function (notif, root) {
                var arr = {},
                    text = "",
                    err = 0;

                $('#pageBody .entries ul li', root).each( function (index) {
                    text = latinize($(this).text()).replace(/[\s;–—-]+/g, '').toLowerCase();
                    if (arr[text]) {
                        arr[text].push(index);
                    } else {
                        arr[text] = [index];
                    }
                });

                $.each(arr, function (key, eqs) {
                    var i,
                        el;

                    if ($.isArray(eqs) && eqs.length > 1) {
                        for (i=0; i<eqs.length; i++) {
                            el = $('#pageBody .entries ul li', root).eq(eqs[i])[0];
                            notif.addMarker(el).activate();
                        }
                    }
                });

                return notif;
            }			
        },

        {
            name: "Format de nom d'auteur : capitales, caractères interdits",
            id: 26,
            type: "warning",
            label: "Format",
            labelPos: "after",
            condition: contexte.classes.indexes || (contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations),
            action: function (notif, root) {
                var text = "";

                $('span.familyName', root).each( function () {
                    text = latinize($(this).text().trim());
                    if (text === text.toUpperCase() || text.match(/[&!?)(*\/]/)) {

                        if (!contexte.classes.textes || $(this).is('#docAuthor *, #docTranslator *')) {
                            notif.addMarker(this).activate();
                        }

                    }
                });

                return notif;

            }			
        },

        {
            name: "Auteur sans prénom",
            id: 27,
            type: "warning",
            label: "Nom seul",
            labelPos: "after",
            condition: contexte.classes.indexes || (contexte.classes.textes && !contexte.classes.actualite && !contexte.classes.informations),
            action: function (notif, root) {

                var err = 0;

                $('span.familyName', root).each( function () {
                    if ($(this).text().trim() === $(this).parent().text().trim()) {

                        if (!contexte.classes.textes || $(this).is('#docAuthor *, #docTranslator *')) {
                            notif.addMarker(this).activate();
                        }

                    }
                });

                return notif;
            }			
        },

        {
            name: "Format d'image non supporté",
            id: 28,
            labelPos: "after",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $("img[src$='.wmf'], .image_error", root).each( function () {
                    notif.addMarker(this).activate();
                });

                return notif;

            }			
        },

        {
            name: "Intertitre sur plusieurs paragraphes",
            id: 29,
            type: "warning",
            label: "Double intertitre",
            labelPos: "after",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $(".texte:header + .texte:header", root).each( function () {

                    if ($(this).prev('.texte:header')[0].nodeName === this.nodeName) {
                        notif.addMarker(this).activate();  
                    }

                });

                return notif;

            }			
        },

        {
            name: "Caractères Symbol",
            id: 30,
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var symbolsRegex = 	/[]/g,
                    match = $("#docBody", root).text().match(symbolsRegex);

                if (match) {
                    if (root === document) {
                        $('#docBody', root).highlightRegex(symbolsRegex, {
                            tagType:   'span',
                            className: 'symbolalert'
                        });
                        $("body").addClass("hasMarqueur");
                    }

                    // TODO: utiliser le même type de marqueur qu'habituellement
                    notif.count = match.length;
                    notif.activate();
                }

                return notif;

            }
        },

        {
            name: "Vérifier le stylage du résumé et des mots-clés",
            id: 31,
            type: "warning",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var nbMots = $("#entries .index h3", root).filter( function(i,e) {
                    return !$(e).text().match(/(Index|Índice|Indice)/);
                }).length,
                    nbResumes = $("#abstract .tabContent", root).length;

                if (nbMots !== 0 && nbResumes !== 0 && nbMots !== nbResumes) {
                    notif.activate(); 
                }

                return notif;
            }			
        },

        {
            name: "Numéro sans couverture",
            id: 32,
            condition: contexte.classes.numero && contexte.localStorage.papier,
            type: "print",
            action: function (notif, root) {

                if ($("#publiInformation img", root).length === 0) {
                    notif.activate();
                }

                return notif;
            }			
        },

        {
            name: "Pas de texte dans le document",
            id: 33,
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var element = $("#docBody #text", root),
                    text = element.text().trim();

                if (element.length === 0 || text === "") {
                    notif.activate();
                }

                return notif;
            }
        },

        {
            name: "Document sans titre",
            id: 34,
            condition: contexte.classes.textes,
            action: function (notif, root) {

                var element = $("#docTitle", root),
                    text = element.text().trim();

                if (element.length === 0 || text === "" || text === "Document sans titre") {
                    notif.activate();
                }

                return notif;
            }			
        },

        {
            // FIXME: ne fonctionne pas avec Ajax
            name: "Lien(s) caché(s) vers Wikipedia",
            id: 35,
            type: "warning",
            label: "Wikipedia",
            labelPos: "after",
            condition: contexte.classes.textes,
            action: function (notif, root) {

                $("#content a[href*='wikipedia']", root).each( function () {
                    if ($(this).text() !== $(this).attr("href")) {
                        notif.addMarker(this).activate();
                    }
                });

                return notif;
            }			
        },

        {
            name: "Lien(s) à vérifier",
            id: 36,
            type: "warning",
            label: "Lien à vérifier",
            labelPos: "after",
            condition: contexte.classes.textes,
            action: function (notif, root) {
                var url = "";

                $("#main p a[href]:not(.footnotecall, .FootnoteSymbol, [href^=mailto])", root).each( function () {
                    url = $(this).attr("href");
                    if (!urlEstValide(url)) { 
                        notif.addMarker(this).activate();
                    }
                });

                return notif;

            }			
        },

        {
            name: "ISBN invalide",
            id: 37,
            labelPos: "after",
            condition: contexte.classes.numero,
            action: function (notif, root) {

                var element = $("#publiISBN").eq(0), 
                    isbn;

                if (element.length !== 0) {
                    isbn = element.text().replace("ISBN", "");
                    if ( !isValidIsbn(isbn) ) {
                        notif.addMarker(element.get(0)).activate();
                    }
                }

                return notif;
            }			
        }//,

    ]; 
};
},{"./utils":9}],8:[function(require,module,exports){
// ################ SCRELO UI ###############


var xprt = {},
    config = require("./config.js"),
    appUrls = config.appUrls,
    screloVersion = config.version,
    utils = require("./utils.js"),
    retournerUrl = utils.retournerUrl;




// Injection d'une feuille de style
function addCss () {
    $('head').append('<link rel="stylesheet" href="' + appUrls.stylesheat + '" type="text/css" />');
}




// Ui
// TODO: a séparer, c'est moche
function ui (contexte, relireToc) {
    
    var papier = contexte.localStorage.papier === true ? "" : " class='off'",
        buttons = ["<a data-screlo-button='edit' title='Editer' href='" + retournerUrl('editer') + "'>Editer</a>",
                   "<a data-screlo-button='download' title='Récupérer la source' href='" + retournerUrl('doc') + "'>Récupérer la source</a>",
                   "<a data-screlo-button='upload' title='Recharger la source' href='" + retournerUrl('otx') + "'>Recharger la source</a>",
                   "<a data-screlo-button='ajax' title='Relecture du numéro'>Relecture du numéro</a>",
                   "<a data-screlo-button='clear' title='Vider le cache pour ce site'>Vider le cache pour ce site</a>",
                   "<a data-screlo-button='cycle' title='Aller au marqueur suivant'>Aller au marqueur suivant</a>",
                   "<a data-screlo-button='papier' title='Revue papier'" + papier + ">Revue papier</a>",
                   "<a data-screlo-button='info' title='Informations'>Informations</a>",
                   "<span></span>",
                   "<a data-screlo-button='gocontents' class='hidden' title='Parent'>Parent</a>",
                   "<a data-screlo-button='goprev' class='hidden' title='Précédent'>Précédent</a>",
                   "<a data-screlo-button='gonext' class='hidden' title='Suivant'>Suivant</a>",
                   "<form id='form-acces-rapide'><input id='acces-rapide' type='text' data-screlo-action='go' placeholder='▶'/></form>"],
        squel = "<div id='screlo-main'><ul id='screlo-infos'></ul><ul id='screlo-tests'></ul><div id='screlo-toolbar'>" + buttons.join('\n') + "</div></div><div id='screlo-loading' ></div>";
    
    $(squel).appendTo("body");

    // Preparer a la relecture Ajax en ajoutant les conteneurs et afficher les erreurs en cache si elles existent
    if (contexte.classes.publications && contexte.toc) {
        var id = "",
            lsErreurs,
            $target,
            lsExists = false,
            $element,
            $prev;

        for (var i=0; i<contexte.toc.length; i++ ) {

            id = contexte.toc[i].id;
            $element = contexte.toc[i].$element;

            // NOTE: manip indispensable pour séparer les résultats en cas d'alias. Le markup de la maquette ne permet pas de faire mieux.
            if ($element.nextUntil(".title", ".altertitle").length !== 0) {
                $prev = $element.nextUntil(".title", ".altertitle").last();
            } else if ($element.nextUntil(".title", ".subtitle").length !== 0) {
                $prev = $element.nextUntil(".title", ".subtitle").last();
            } else {
                $prev = $element;
            }

            $target = $("<ul class='screlo-relecture' id='relecture" + id + "'></ul>").insertAfter($prev);
            lsErreurs = contexte.localStorage.erreurs[id];

            if (lsErreurs) {
                afficherErreurs(lsErreurs, $target);
                lsExists = true;
            }
        }

        if (lsExists) {
            $("<li id='screlo-infocache'>Erreurs chargées à partir du cache de Screlo. <a href='#'>Mettre à jour.</a></li>").appendTo("#screlo-tests");
        }

        // Fix de maquette : certaines publications ont un style height inline sur #main
        if ( $('#main[style*="height"]').length ) {
            var expectedHeight = $("#main").css("height");
            $("#main").css({"height": "auto", "min-height": expectedHeight});
        }
    }

    // Fonctions
    $( "[data-screlo-button='info']" ).click(function( event ) {
        event.preventDefault();
        var msg = 'Screlo version ' + screloVersion + '\n\nScrelo effectue les tests suivants :\n' + listerTests(tests).join('\n') + '\n\nUne mise à jour de Screlo est peut-être disponible. Forcer la mise à jour ?',
            user = false;
        user = confirm(msg);
        if (user) {
            window.location.href = appUrls.update;
        }
    });

    $( "[data-screlo-button='ajax']" ).click(function( event ) {
        event.preventDefault();
        relireToc(contexte);
    });

    // TODO: à revoir (doublon ci-dessus + .live() pas très performant : préférer {display: none} + .click())
    // NOTE: avec un jquery recent il faudrait utiliser .on()
    $("#screlo-infocache").live("click", function ( event ) {
        event.preventDefault();
        relireToc(contexte);
    });

    $( "[data-screlo-button='clear']" ).click(function( event ) {
        event.preventDefault();
        var msg = 'Vider le cache de Screlo pour le site "' + contexte.nomCourt + '" ?',
            user = false;
        user = confirm(msg);
        if (user) {
            localStorage.removeItem(contexte.nomCourt);
            location.reload();
        }
    });

    $( "[data-screlo-button='cycle']" ).click(function( event ) {
        event.preventDefault();
        cycle();
    });

    $( "[data-screlo-button='papier']" ).click(function( event ) {
        event.preventDefault();
        var ls = contexte.localStorage,
            toggle = !contexte.localStorage.papier;
        ls.papier = toggle;
        localStorage.setItem(contexte.nomCourt, JSON.stringify(ls));
        location.reload();
    });

    $( "#form-acces-rapide" ).submit(function( event ) {
        event.preventDefault();
        var idAcces = $('input#acces-rapide').val();
        if (typeof idAcces === 'string') {
            window.location.href = retournerUrl(idAcces);
        }
    });
    
}




// Faire défiler les marqueurs un par un
function cycle () {
    
    var winPos = $(window).scrollTop(),
        maxScroll = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) - window.innerHeight,
        marqueurs = $(".screlo-marqueur, .symbolalert").map(function() {
            return $(this).offset().top;
        }).get();

    for (var i=0; i<marqueurs.length+1; i++) {
        if (i === marqueurs.length || winPos >= maxScroll) {
            $(window).scrollTop(marqueurs[0]);
        } else if (marqueurs[i] > winPos + 10) {
            $(window).scrollTop(marqueurs[i]);
            break;
        }
    }
}


xprt.addCss = addCss;
xprt.ui = ui;

module.exports = xprt;
},{"./config.js":2,"./utils.js":9}],9:[function(require,module,exports){
// ################ UTILS ###############

var xprt = {};


// Generer des URL
function retournerUrl (quoi) {
    
    var h = location.href,
        p = location.pathname,
        a = p.replace(/[^/]+$/g, ''),
        b = p.match(/(\d+)$/g),
        parent = $("#breadcrumb #crumbs a:last").attr('href');
    
    if (quoi === "doc") {
        h = 'http://' + window.location.host + a + 'lodel/edition/index.php?do=download&type=source&id=' + b;
    } else if (quoi === "otx") {
        h = 'http://' + window.location.host + a + 'lodel/edition/oochargement.php?identity=' + b + '&idparent=' + parent + '&reload=1';
    } else if (quoi === "editer") {
        h = 'http://' + window.location.host + a + 'lodel/edition/index.php?do=view&id=' + b;
    } else if (quoi === "site") {
        h = 'http://' + window.location.host + a;
    } else if (typeof quoi === 'string') {
        h = 'http://' + window.location.host + a + quoi;   
    }
    
    return h;   
}




// Recuperer le nom court
function nomCourt () {
    
    var host = window.location.host,
        p = location.pathname.replace(/\/(\d+)\//,'');
    
    if (host.indexOf("formations.lodel.org") > -1 || host.indexOf("lodel.revues.org") > -1 || host.indexOf("devel.revues.org") > -1) {
        return p.substr(0, p.indexOf('/'));
    } else {
        return host.substr(0, host.indexOf('.'));
    }
}




// Suppression des accents pour trouver les doublons de mots-clés
// http://stackoverflow.com/questions/990904/javascript-remove-accents-in-strings#answer-9667752
function latinize (str) {
    
    var latin_map = {"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x","’":"'","–":"-","—":"-"};
    
    return str.replace(/[^A-Za-z0-9\[\] ]/g, function(a){return latin_map[a]||a;});
}




// Fonction générique pour tester les URL absolues (https://gist.github.com/dperini/729294)
function urlEstValide (url) {
    
    var regex = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i;
    
    return regex.test(url) && url.trim().substr(-1).match(/[).,\]]/) ===  null;
}




// Fonction générique pour tester les ISBN (http://pastebin.com/j9kfEUHt)
function isValidIsbn (isbn) {

    var sum = 0,
        i;

    isbn = String(isbn).replace(/[^\dX]/gi, '');

    if(isbn.length == 10) {
        if(isbn[9].toUpperCase() == 'X') {
            isbn[9] = 10;
        }

        for(i = 0; i < isbn.length; i++) {
            sum += ((10-i) * parseInt(isbn[i]));
        }
        return (sum % 11 === 0);

    } else if(isbn.length === 13) {

        for (i = 0; i < isbn.length; i++) {
            if(i % 2 === 0) {
                sum += parseInt(isbn[i]);
            } else {
                sum += parseInt(isbn[i]) * 3;
            }
        }
        return (sum % 10 === 0);

    } else {
        return false;
    }
}




// Récupérer le texte des paragraphes
function getPText ($p) {
    
    var clone = $p.clone();
    
    clone.find('span.paranumber, span.screlo-marqueur').remove();
    
    return String(clone.text()).trim();
}


xprt.retournerUrl =	retournerUrl;
xprt.nomCourt =	nomCourt;
xprt.latinize =	latinize;
xprt.urlEstValide =	urlEstValide;
xprt.isValidIsbn =	isValidIsbn;
xprt.getPText =	getPText;

module.exports = xprt;
},{}]},{},[6]);
