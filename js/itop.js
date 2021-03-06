//Pour le templating des tables
var TemplateEngine = function (tpl, data) {
    var temp = tpl
    var re = /{([^}]+)?}/g, match;
    while (match = re.exec(tpl)) {
        temp = temp.replace(match[0], data[match[1]]);
    }
    return temp;
}
//Recup d'un param dans l'url
function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;
    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};
//Surlignage et coloration syntaxique d'un flux JSON
function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    $('#JSONResult').show();
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
//Chargement d'une salle avec url
function GetLocation() {
    $('#result').val('');
    var oJSON = {
        operation: 'core/get',
        'class': 'Location',
        key: "SELECT Location WHERE name = \"" + getUrlParameter('id') + "\""
    };
    CallWSLocation(oJSON);
}
//Appel du WS Itop pour une salle
function CallWSLocation(oJSON) {
    $('#result').html('');
    $('#loading').show();
    $.ajax({
        type: "POST",
        url: getITopUrl(),
        dataType: "json",
        data: { auth_user: $('#auth_user').val(), auth_pwd: $('#auth_pwd').val(), json_data: JSON.stringify(oJSON) },
        crossDomain: 'true',
        success: function (data) {
            try {
                $('#datacenter').show();
                if (data) { fillTable(data, "matable"); }
            //    $('#result').html(syntaxHighlight(data));
            } catch (e) {
                console.log(e);
            } finally {
                $('#loading').hide();
            }
        },
        error: function () {
            $('#loading').hide();
        }
    });
    return false;
}
//Order by location
function locationByName(a, b) {
    if (a.orderitem != undefined) {
        return a.orderitem.localeCompare(b.orderitem)
    }
}

function sanitizeRack(a){
    var char = a.name.charAt(a.name.length-2);
    if (char>='0' && char <='9'){
        a.orderitem=a.name; 
    }else{
        a.orderitem=a.name.substring(0,a.name.length-1)+'0'+a.name.substring(a.name.length-1); //ajout 0x
    }
    return a;
}

//Remplissage de la table des racks
function fillTable(data, idTable) {
    if (data) {
        //on a pas l'id alors on passe par le 1er objet du JSON
        var salle = Object.keys(data.objects).slice(0, 1).map(function(key){return data.objects[key];})[0];

        $('#name').html(salle.fields.name);
        $('#' + idTable).not(':first').not(':last').remove();
        var Us = 0;
        var tableHead = '<tr class="thead"><th>Rack</th></tr>';
        var theRacks = '';
        var racks = '';
        racks = salle.fields.physicaldevice_list;

        racks.map(sanitizeRack).sort(locationByName).forEach(function (rack) {
            if (rack.finalclass == 'Rack') {
                theRacks += TemplateEngine($("#racks_line").html(), rack)
            }
        });
        $('#' + idTable + ' tbody').html(tableHead + theRacks);
        $('#login').hide();
    }
}
//Chargement d'un rack avec nom passé en param
function GetRackWithName(name) {
    $('#server').hide();
    $('#rack').hide();
    $('#result').val('');
    var oJSON = {
        operation: 'core/get',
        'class': 'Rack',
        key: "SELECT Rack WHERE name = \"" + name + "\""
    };
    CallWSRack(oJSON);
}
//Chargement d'un rack avec nom dans l'url
function GetRack() {
    GetRackWithName(getUrlParameter('id')) ;
}
//Appel du WS Itop pour un rack
function CallWSRack(oJSON) {
    $('#result').html('');
    $('#loading').show();
    $.ajax({
        type: "POST",
        url: getITopUrl(),
        dataType: "json",
        data: { auth_user: $('#auth_user').val(), auth_pwd: $('#auth_pwd').val(), json_data: JSON.stringify(oJSON) },
        crossDomain: 'true',
        success: function (data) {
            try{
                $('#rack').show();
                if (data) { fillTableRack(data, "tablerack"); }
            //    $('#result').html(syntaxHighlight(data));
            } catch (e) {
                console.log(e);
            } finally {
                $('#loading').hide();
            }
        },
        error: function () {
            $('#loading').hide();
        }
    });
    return false;
}
//Order by rack
function rackByName(a, b) {
    if (a.description != undefined) {
        return -a.description.localeCompare(b.description)
    }
}
//Nettoyage des objets d'un rack +  typage métier
function SanitizeAndAddPersoType(type) {
    return function (a) {
        // ajout de l'enclosure_name aux objets qui ne l'ont pas
        if (a['enclosure_name'] == undefined) {
            a.enclosure_name = '';
        }
        //typage des objets : Device ou Chassi
        a.persoType = type;
        return a;
    }
}
//Remplissage du tableau avec les U
function fillTableRack(data, idTable) {
    if (data) {
        //on a pas l'id alors on passe par le 1er objet du JSON
        var rack = Object.keys(data.objects).slice(0, 1).map(function (key) { return data.objects[key] })[0];

        $('#namerack').html(rack.fields.name);
        var nbu = rack.fields.nb_u;
        $('#nbu').html(nbu);
        $('#' + idTable).not(':first').not(':last').remove();
        var Us = 0;
        var tableHead = '<tr class="thead"><th>U</th><th>Type</th><th>Description</th><th>U occup&eacute;(s)</th><th>Marque</th><th>Modele</th><th>Status</th></tr>';
        var theDevices = '';
        devices = rack.fields.device_list.map(SanitizeAndAddPersoType('Device'));
        enclosures = rack.fields.enclosure_list.map(SanitizeAndAddPersoType('Chassi'));

        enclosures.concat(devices).sort(rackByName).forEach(function (device) {
            if (device.enclosure_name == '') {
                if (device.nb_u != 0) { Us += parseInt(device.nb_u); }
                theDevices += TemplateEngine($("#u_line").html(), device)
            }
        });

        $('#' + idTable + ' tbody').html(tableHead + theDevices);
        $('#uuse').html(Us);
        $('#upercent').html(parseFloat(Us / nbu * 100).toFixed(2));
        $('#login').hide();
    }
}
//Chargement d'un chassi avec nom passé en param
function GetEnclosureWithName(name,persoType) {
    if (persoType=='Chassi'){
        $('#result').val('');
        var oJSON = {
            operation: 'core/get',
            'class': 'Server',
            key: "SELECT Server WHERE enclosure_name = \"" + name + "\"",
            output_fields: "name,brand_name"
        };
        CallWSEnclosure(oJSON);
    }else{
        $('#server').hide();
    }
}
//Appel du WS Itop pour un rack
function CallWSEnclosure(oJSON) {
    $('#result').html('');
    $('#loading').show();
    $.ajax({
        type: "POST",
        url: getITopUrl(),
        dataType: "json",
        data: { auth_user: $('#auth_user').val(), auth_pwd: $('#auth_pwd').val(), json_data: JSON.stringify(oJSON) },
        crossDomain: 'true',
        success: function (data) {
            try{
                $('#enclosure').show();
                if (data) { fillTableEnclosure(data, "tableserver"); }
            //    $('#result').html(syntaxHighlight(data));
            } catch (e) {
                console.log(e);
            } finally {
                $('#loading').hide();
            }
        },
        error: function () {
            $('#loading').hide();
        }
    });
    return false;
}
//Remplissage du tableau avec les U
function fillTableEnclosure(data, idTable) {
    if (data) {
        //on a pas l'id alors on passe par le nom
        var theServer=Object.keys(data.objects)
            .filter(function(a){return a.startsWith("Serve")})
            .map(function (key) { return data.objects[key].fields })
            .reduce(function(a,b){return a+TemplateEngine($("#server_line").html(), b)},"");
            
        $('#' + idTable).not(':first').not(':last').remove();
        var tableHead = '<tr class="thead"><th>Description</th><th>Marque</th></tr>';
        $('#' + idTable + ' tbody').html(tableHead + theServer);
        $('#server').show();
        $('#login').hide();
    }
}