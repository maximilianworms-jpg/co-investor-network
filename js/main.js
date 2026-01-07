var sigInst, canvas, $GP;

// 1. Dein Branchen-Mapping
var industryMapping = {
    "#6B6B6B": "Investoren",               
    "#D97DD8": "Health & Climate Tech",    
    "#9900FF": "D11Z",                     
    "#00C7FF": "Enterprise & Data AI",     
    "#FF7045": "Cybersecurity",            
    "#8CB900": "Logistics & Industry 4.0", 
    "#23966F": "Future Work & HR Tech"     
};

function getGroupName(color) {
    if (!color) return "Unbekannt";
    var hex = "";
    if (color.indexOf("rgb") !== -1) {
        var rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            hex = "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1).toUpperCase();
        }
    } else {
        hex = color.toUpperCase();
        if (hex.indexOf("#") === -1) hex = "#" + hex;
    }
    return industryMapping[hex] || "Gruppe (" + hex + ")";
}

var config={};

function GetQueryStringParams(sParam,defaultVal) {
    var sPageURL = ""+window.location;
    if (sPageURL.indexOf("?")==-1) return defaultVal;
    sPageURL=sPageURL.substr(sPageURL.indexOf("?")+1);    
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) return sParameterName[1];
    }
    return defaultVal;
}

jQuery.getJSON(GetQueryStringParams("config","config.json"), function(data, textStatus, jqXHR) {
    config=data;
    $(document).ready(setupGUI(config));
});

function initSigma(config) {
    var data=config.data;
    var a = sigma.init(document.getElementById("sigma-canvas")).drawingProperties(config.sigma.drawingProperties).graphProperties(config.sigma.graphProperties).mouseProperties(config.sigma.mouseProperties);
    sigInst = a;
    a.active = !1; a.neighbors = {}; a.detail = !1;

    dataReady = function() {
        a.clusters = {};
        a.iterNodes(function (b) {
            var clusterKey = b.color; 
            a.clusters[clusterKey] || (a.clusters[clusterKey] = []);
            a.clusters[clusterKey].push(b.id);
            
            // NODE SIZE RANGE FIX: Nutze Werte aus Config (Standard 3-15 falls nicht gesetzt)
            var minSize = config.sigma.drawingProperties.minNodeSize || 3;
            var maxSize = config.sigma.drawingProperties.maxNodeSize || 15;
            // Hier wird die Größe skaliert, falls b.size existiert
            b.displaySize = b.size; 
        });
        a.bind("upnodes", function (a) { nodeActive(a.content[0]) });
        a.draw();
        configSigmaElements(config);
    }
    a.parseJson(data,dataReady);
}

function setupGUI(config) {
    // Logo-Bereich mit Größenbegrenzung und Abständen
    if (config.logo && config.logo.file) {
        var logoHtml = '<div style="margin-bottom: 20px;">' + // Abstand nach unten
                       '<a href="' + (config.logo.link || "#") + '">' +
                       '<img src="' + config.logo.file + '" alt="' + config.logo.text + '" ' +
                       'style="max-width: 100%; height: auto; max-height: 80px; display: block;">' + // max-height begrenzt die vertikale Ausdehnung
                       '</a></div>';
        $("#maintitle").html(logoHtml);
    } else {
        $("#maintitle").html("<h1>" + config.logo.text + "</h1>");
    }

    $("#title").html("<h2 style='margin-top: 10px;'>" + config.text.title + "</h2>"); // Zusätzlicher Puffer oben
    $("#titletext").html(config.text.intro);
    
    // ... restlicher Code (Search, Cluster-Initialisierung etc.)


    $GP = { calculating: !1, showgroup: !1 };
    $GP.intro = $("#intro");
    $GP.info = $("#attributepane");
    $GP.info_name = $GP.info.find(".name");
    $GP.info_link = $GP.info.find(".link");
    $GP.info_data = $GP.info.find(".data");
    $GP.info_p = $GP.info.find(".p");
    $GP.info.find(".returntext, .close").click(nodeNormal);
    $GP.form = $("#mainpanel").find("form");
    
    // SEARCH INITIALISIERUNG
    $GP.search = new Search($GP.form.find("#search"));
    
    $("#attributeselect").show(); 
    $GP.cluster = new Cluster($GP.form.find("#attributeselect"));
    config.GP=$GP;
    initSigma(config);
}

function configSigmaElements(config) {
    $GP=config.GP;
    var a = [], b;
    for (b in sigInst.clusters) {
        var industryName = getGroupName(b);
        a.push('<div style="line-height:22px;"><a href="#' + encodeURIComponent(b) + '"><div style="width:15px;height:15px;border:1px solid #fff;background:' + b + ';display:inline-block;vertical-align:middle;"></div> <span style="vertical-align:middle;margin-left:5px;">' + industryName + ' (' + sigInst.clusters[b].length + ')</span></a></div>');
    }
    $GP.cluster.content(a.join(""));
}

function nodeActive(a) {
    var neighbors = {};
    sigInst.detail = !0;
    var b = sigInst._core.graph.nodesIndex[a];

    sigInst.iterEdges(function (e) {
        if (e.source == a || e.target == a) {
            e.hidden = !1;
            neighbors[e.source == a ? e.target : e.source] = 1;
        } else {
            e.hidden = !0;
        }
    });

    sigInst.iterNodes(function (n) {
        if (n.id == a || neighbors[n.id]) {
            n.hidden = !1;
        } else {
            n.hidden = !0;
        }
    });

    sigInst.draw(2, 2, 2, 2);

    $GP.info_name.html("<div><span>" + b.label + "</span></div>");
    var e = [];
    for (var attr in b.attr.attributes) {
        e.push('<span><strong>' + attr + ':</strong> ' + b.attr.attributes[attr] + '</span><br/>');
    }
    $GP.info_data.show().html(e.join(""));
    $GP.info_p.html("Verbindungen:");
    
    var f = ["<ul>"];
    for (var nId in neighbors) {
        var neighborNode = sigInst._core.graph.nodesIndex[nId];
        f.push('<li class="membership"><a href="#' + neighborNode.label + '" onclick="nodeActive(\'' + neighborNode.id + '\')">' + neighborNode.label + "</a></li>");
    }
    f.push("</ul>");
    $GP.info_link.html(f.join(""));
    $GP.info.animate({width:'show'},350);
}

function showCluster(a) {
    var b = sigInst.clusters[a];
    if (b) {
        sigInst.detail = !0;
        sigInst.iterEdges(function (e) { e.hidden = !0; });
        sigInst.iterNodes(function (n) { n.hidden = (b.indexOf(n.id) < 0); });
        sigInst.draw(2, 2, 2, 2);
        
        var clusterDisplayName = getGroupName(a);
        $GP.info_name.html("<b>" + clusterDisplayName + "</b>");
        $GP.info_data.hide();
        $GP.info_p.html("Mitglieder dieser Gruppe:");
        
        var f = ["<ul>"];
        for (var i = 0; i < b.length; i++) {
            var d = sigInst._core.graph.nodesIndex[b[i]];
            f.push('<li class="membership"><a href="#'+d.label+'" onclick="nodeActive(\'' + d.id + '\')">' + d.label + "</a></li>");
        }
        f.push("</ul>");
        $GP.info_link.html(f.join(""));
        $GP.info.animate({width:'show'},350);
        return !0;
    }
    return !1;
}

function nodeNormal() { 
    sigInst.detail = !1;
    sigInst.iterEdges(function(e){ e.hidden = !1; });
    sigInst.iterNodes(function(n){ n.hidden = !1; }); 
    sigInst.draw(); 
    $GP.info.hide(); 
}

// VOLLSTÄNDIGE SEARCH LOGIK
function Search(a) {
    this.input = a.find("input");
    this.input.keyup($.proxy(function (e) {
        var val = $(e.target).val().toLowerCase();
        if (val.length > 1) {
            sigInst.detail = !0;
            sigInst.iterNodes(function (n) {
                n.hidden = n.label.toLowerCase().indexOf(val) < 0;
            });
        } else {
            sigInst.detail = !1;
            sigInst.iterNodes(function (n) { n.hidden = !1; });
        }
        sigInst.draw();
    }, this));
}

function Cluster(a) {
    this.list = a.find(".list");
    this.content = function(html) { 
        this.list.html(html); 
        this.list.find("a").click(function(e){ 
            e.preventDefault();
            showCluster(decodeURIComponent($(this).attr("href").substr(1))); 
        }); 
    };
    a.find(".select").click($.proxy(function(){ this.list.toggle(); }, this));
}
