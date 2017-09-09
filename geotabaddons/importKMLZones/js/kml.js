"use strict";
var kml = {
    api: null,
    state: null,
    args: {},
    item: null,
    childCallback: {},
    minDate: new Date(Date.UTC(1986, 0, 1)),
    defaultZoneSize: 200,
    localInit: ["addressLookup", "Address Lookup", "customer", "Customer", "office", "Office", "home", "Home"],
    isFormDataSupported: !!window.FormData,
    fileReader: null,
    filter: null,
    colorPickerObj: null,
    zoneCreator: null,
    options: {},
    zonesData: {zones: [], commonStyles: []},
    uploader: null,
    utils: null,
    colorPicker: null,
    vanillaSlider: null,
    waiting: null,
    importedInBG: [],
    itemsPerCall: 50,
    defaultZoneType: "ZoneTypeCustomerId",
    initVariables: function (api, state) {
        this.api = api;
        this.state = state;
        this.args.container = document.getElementById("importKMLZonesId");
        this.local = kml.setupLocal(kml.localInit);
        this.filter = state.getGroupFilter();
        this.utils = new Utils();
        this.fileReader = (typeof FileReader !== "undefined") ? new FileReader() : null;
        this.uploader = new Uploader();
        this.vanillaSlider = new VanillaSlider();
        this.waiting = new Waiting();
        Array.prototype.forEach.call(this.args.container.parentNode.getElementsByClassName("extern"),
            function (element) {
                if (element.id) {
                    kml.args[element.id] = element;
                }
            });
        this.colorPicker = new ColorPicker();
        this.colorPickerObj = this.colorPicker.formColorPicker();
        this.zoneCreator = this.zoneShapeCreator();
        this.options = {
            "zoneTypes": [kml.defaultZoneType],
            "zoneSize": this.defaultZoneSize,
            "zoneColor": kml.colorPickerObj.value(),
            "zoneShape": false, //is not circle === square by default
            "stoppedInsideZones": document.getElementById("stoppedInsideZones").checked
        };
    },
    NOOP: function () {
    },
    setupLocal: function (data) {
        var i, fixed = {}, item;
        if (data.length % 2 !== 0) {
            throw new Error("incorrect data items");
        }
        for (i = 0; i < data.length; i += 2) {
            item = data[i];
            if (fixed[item]) {
                throw new Error(item + " already added");
            }
            fixed[item] = data[i + 1];
        }
        return fixed;
    },
    addSystemZoneTypes: function (a, ignoreAddressLookup) {
        var zoneTypes = {
                "ZoneTypeAddressLookupId": kml.local.addressLookup,
                "ZoneTypeCustomerId": kml.local.customer,
                "ZoneTypeOfficeId": kml.local.office,
                "ZoneTypeHomeId": kml.local.home
            },
            i, ii, tempKey, currentZoneType,
            systemZonesAdded = false;
        /*Loops through all types that the instance has and checks to see if the customer type exists. If it does it is assumed that office and home also exist.*/
        for (i = 0, ii = a.length; i < ii; i += 1) {
            currentZoneType = a[i];
            tempKey = currentZoneType.id || currentZoneType;
            if (!currentZoneType.id) {
                if (ignoreAddressLookup && tempKey === "ZoneTypeAddressLookupId") {
                    a.splice(i, 1);
                    i -= 1;
                    ii -= 1;
                } else {
                    systemZonesAdded = true;
                    a[i] = {
                        id: currentZoneType,
                        name: zoneTypes[tempKey],
                        isSystem: true//TODO: Hack, this should be removed when we change to stiring system types
                    };

                }
            }
        }

        /*If customer was found it is assumed that home and office also exist and so they are not added again*/
        if (!systemZonesAdded) {
            for (var prop in zoneTypes) {
                if (zoneTypes.hasOwnProperty(prop) && (!ignoreAddressLookup || prop != "ZoneTypeAddressLookupId")) {
                    a.push({
                        id: prop,
                        name: zoneTypes[prop],
                        comment: kml.localInit.systemAssignedComment,
                        isSystem: true
                    });
                }
            }
        }
        return a;
    },
    zoneShapeCreator: function () {
        var squareZoneCreator = function (lat, lng, size) {
                var halfSide = (size / 2) || 0.0009,
                    method = [[1, 1], [-1, 1], [-1, -1], [1, -1]],
                    pointsForSaving = [], i;

                for (i = 0; i < method.length; i++) {
                    pointsForSaving.push({
                        x: lng + method[i][0] * halfSide,
                        y: lat + method[i][1] * halfSide / 1.5
                    });
                }

                return pointsForSaving;
            },
            circleZoneCreator = function (lat, lng, diameter) {
                var size = diameter / 2,
                    degOfMaxDistance = 0.00008 / diameter,
                    triangleHeight = size - (degOfMaxDistance * diameter),
                    polygonSide = Math.sqrt(size * size - triangleHeight * triangleHeight) * 2,
                    amountOfSides = Math.ceil(Math.PI / Math.asin(polygonSide / (2 * size))),
                    amountOfPoints = amountOfSides < 20 ? 20 : amountOfSides + 1,
                    angle = 2 * Math.PI / (amountOfPoints - 1),
                    currentAngle = 0,
                    x, y,
                    points = [], i;

                for (i = 0; i < amountOfPoints; i++) {
                    y = lat + (size * Math.cos(currentAngle));
                    x = lng + ((size * Math.sin(currentAngle)) / Math.abs(Math.cos(y * Math.PI / 180)));
                    points.push({
                        x: x,
                        y: y
                    });
                    currentAngle += angle;
                }
                return points;
            },
            metersToDegrees = function (distance) {
                return (360 * distance) / 40075000;//approximately because distance isn't big
            };

        return {
            getZonePoints: function (lat, lng, diameter, isCircle) {
                var degDiameter = diameter ? metersToDegrees(diameter) : 0.0018;
                return isCircle ? circleZoneCreator(lat, lng, degDiameter) : squareZoneCreator(lat, lng, degDiameter);
            }
        };
    },
    parseFiles: function (files) {
        var filesCount = files.length,
            filesLoaded = 0;
        if (filesCount === 0) {
            return;
        }
        kml.waiting.show();
        kml.fileReader.onload = function (e) {
            var contents = e.target.result,
                parser = new DOMParser(),
                kmlDom = parser.parseFromString(contents, "text/xml"),
                placemarks, commonStyles, i;
            if (kml.isFileDataValid(kmlDom, files[filesLoaded].name)) {
                placemarks = kmlDom.documentElement.querySelectorAll("Placemark");
                commonStyles = kmlDom.documentElement.querySelectorAll("Style");
                for (i = 0; i < placemarks.length; i++) {
                    kml.zonesData.zones.push(placemarks[i]);
                }
                for (i = 0; i < commonStyles.length; i++) {
                    if (commonStyles[i].id) {
                        kml.zonesData.commonStyles[commonStyles[i].id] = commonStyles[i];
                    }
                }
            }
            filesLoaded++;
            if (filesLoaded < filesCount) {
                kml.fileReader.readAsText(files[filesLoaded]);
            } else if (filesLoaded === filesCount) {
                kml.populateZoneTables();
            }
            kml.waiting.hide();
        };
        kml.fileReader.readAsText(files[0]);
    },
    isFileDataValid: function (kmlDoc, fileName) {
        var placemark = kmlDoc.documentElement.querySelector("Placemark");
        if (kmlDoc.documentElement.tagName.toLowerCase() != "kml" || !placemark) {
            kml.utils.showError("File '" + fileName + "' content format is incorrect.");
            return false;
        } else if (placemark.getElementsByTagName("name").length === 0) {
            kml.utils.showError("Name field required in " + fileName + ".");
            return false;
        } else if (!kml.isPoint(placemark) && !kml.isPolygon(placemark)) {
            kml.utils.showError(fileName + " must content a point or polygon data.");
            return false;
        }
        return true;
    },
    populateZoneTables: function () {
        var hasValidZones = false,
            isDataValid = function (data) {
                var result = {valid: true, message: ""}, i,
                    inRange = function (value, min, max) {
                        return !!(!isNaN(value) && (value >= min) && (value <= max));
                    };
                if (data.name.length === 0) {
                    result.valid = false;
                    result.message += "Zone name can not be empty. ";
                }
                if (data.points.length === 0) {
                    result.valid = false;
                    result.message += "Zone coordinates can not be empty. ";
                }
                for (i = 0; i < data.points.length; i++) {
                    if (!inRange(data.points[i].y, -90, 90)) {
                        result.valid = false;
                        result.message += "Latitude coordinate value = " + data.points[i].y + " is incorrect. ";
                    }
                    if (!inRange(data.points[i].x, -180, 180)) {
                        result.valid = false;
                        result.message += "Longitude coordinate value = " + data.points[i].x + " is incorrect. ";
                    }
                }
                return result;
            };

        kml.zonesData.zones.forEach(function (zone, index) {
            zone.zoneParameters = kml.getZoneParameters(zone);
            var table = zone.zoneParameters.isPolygon ?
                    document.getElementById("polygonList").querySelector("table") :
                    document.getElementById("pointList").querySelector("table"),
                tr, td, checkbox, isValid = isDataValid(zone.zoneParameters), colorDiv;

            if (table.parentNode.style.display === "none") {
                table.parentNode.style.display = "";
            }

            tr = document.createElement("tr");
            tr.id = "row" + index;
            td = document.createElement("td");
            table.querySelector("tbody").appendChild(tr);
            //name column
            tr.appendChild(td);
            td.textContent = zone.zoneParameters.name;
            //description column
            td = td.cloneNode();
            td.textContent = zone.zoneParameters.comment || "-";
            tr.appendChild(td);
            //color column
            td = td.cloneNode();
            if(zone.zoneParameters.colorFromOptions) {
                td.textContent = "Set by options.";
            } else {
                colorDiv = document.createElement("div");
                colorDiv.className = "colorDiv";
                colorDiv.style.backgroundColor = kml.utils.rgbToHex.apply(kml.utils,
                    kml.utils.colorObjToArr(zone.zoneParameters.fillColor));
                colorDiv.style.opacity = zone.zoneParameters.fillColor.a / 255;
                td.appendChild(colorDiv);
            }
            tr.appendChild(td);
            //selection column
            td = td.cloneNode();
            if (isValid.valid === true) {
                hasValidZones = true;
                checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = index;
                checkbox.className = "importCheckbox";
                checkbox.checked = true;
                td.appendChild(checkbox);
            } else {
                tr.className = "error";
                document.getElementById("exportKML").style.display = "";
                td.textContent = isValid.message;
            }
            tr.appendChild(td);
        });
        if (hasValidZones === true) {
            document.getElementById("importButton").style.display = "";
            document.getElementById("selectAll").checked = true;
            document.getElementById("selectAllLabel").style.display = "";
        }
    },
    isPoint: function (placemark) {
        var point = placemark.getElementsByTagName("Point");
        return point.length > 0 &&
            point[0].getElementsByTagName("coordinates").length > 0;
    },
    isPolygon: function (placemark) {
        var polygon = placemark.getElementsByTagName("Polygon"),
            oBoundary = (polygon.length > 0) ? polygon[0].getElementsByTagName("outerBoundaryIs") : [],
            linearRing = (oBoundary.length > 0) ? oBoundary[0].getElementsByTagName("LinearRing") : [];
        return polygon.length > 0 &&
            oBoundary.length > 0 &&
            linearRing.length > 0 &&
            linearRing[0].getElementsByTagName("coordinates").length > 0;
    },
    getZoneParameters: function (zone) {
        var desc = zone.getElementsByTagName("description"),
            selfStyle = zone.getElementsByTagName("Style").length > 0 ? zone.getElementsByTagName("Style")[0] : null,
            commonStyleId = zone.getElementsByTagName("styleUrl").length > 0 ?
                zone.getElementsByTagName("styleUrl")[0].textContent.replace("#", "") : null,
            commonStyle = commonStyleId ? kml.zonesData.commonStyles[commonStyleId] : null,
            style = selfStyle || commonStyle, colorFromOptions = true, customColor;

        if (style) {
            var polyStyle = style.getElementsByTagName("PolyStyle"),
                color = polyStyle && polyStyle.length > 0 ?
                    polyStyle[0].querySelector("color").textContent.replace("#", "") : null;
            if (color) {
                //kml colors are in abgr format
                var hex = color.slice(-2) + color.slice(4, 6) + color.slice(2, 4),
                    alpha = color.slice(0, 2),
                    rgb = kml.utils.hexToRGBArray(hex);
                customColor = {
                    r: rgb[0],
                    g: rgb[1],
                    b: rgb[2],
                    a: (parseInt(alpha, 16))
                };
                colorFromOptions = false;
            }
        }

        return {
            activeFrom: kml.minDate,
            activeTo: new Date(2050, 0, 1),
            comment: (desc.length > 0) ? kml.utils.decodeHTMLEntities(desc[0].textContent) : "",
            displayed: true,
            externalReference: "",
            fillColor: colorFromOptions ? kml.options.zoneColor : customColor,
            colorFromOptions: colorFromOptions,
            groups: kml.filter,
            name: kml.utils.decodeHTMLEntities(zone.getElementsByTagName("name")[0].textContent.trim()),
            points: kml.getPoints(zone),
            zoneTypes: kml.options.zoneTypes,
            zoneSize: kml.options.zoneSize,
            zoneShape: kml.options.zoneShape,
            mustIdentifyStops: kml.options.stoppedInsideZones,
            isPolygon: kml.isPolygon(zone),
            isPoint: kml.isPoint(zone)
        };
    },
    getPoints: function (placemark) {
        var coordinates = "",
            points = [],
            getDistance = function (sourceLat, sourceLon, targetLat, targetLon) {
                var earthRadius = 6371, // Radius of the earth in km
                    degreeToRad = function (degree) {
                        return degree * (Math.PI / 180);
                    },
                    dLat = degreeToRad(targetLat - sourceLat),
                    dLon = degreeToRad(targetLon - sourceLon),
                    a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(degreeToRad(sourceLat)) * Math.cos(degreeToRad(targetLat)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2),
                    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return earthRadius * c;
            };

        if (kml.isPoint(placemark)) {
            coordinates = placemark.querySelector("coordinates").textContent;
            points = kml.zoneCreator.getZonePoints(coordinates.split(",")[1] * 1, coordinates.split(",")[0] * 1,
                kml.options.zoneSize, kml.options.zoneShape);
        } else if (kml.isPolygon(placemark)) {
            var polygon = placemark.getElementsByTagName("Polygon")[0],
                oBoundary = polygon.getElementsByTagName("outerBoundaryIs"),
                iBoundary = polygon.getElementsByTagName("innerBoundaryIs");
            if (oBoundary.length > 0 && iBoundary.length > 0) {
                var outerCoordinatesTag = oBoundary[0].querySelector("coordinates"),
                    innerCoodrdinatesTag = iBoundary[0].querySelector("coordinates"),
                    outerCoord = outerCoordinatesTag.textContent.trim().split(/\s/),
                    innerCoord = innerCoodrdinatesTag.textContent.trim().split(/\s/),
                    minDistance = null,
                    minDistanceOuterIndex = 0,
                    minDistanceInnerIndex = 0,
                    addPoints = function (start, end, coords) {
                        for (var i = start; i < end; i++) {
                            if (coords[i].length > 0) {
                                points.push({x: coords[i].split(",")[0], y: coords[i].split(",")[1]});
                            }
                        }
                    };
                outerCoord.forEach(function (outer, outerIndex) {
                    if (outer.length > 0) {
                        outer = outer.split(",");
                        innerCoord.forEach(function (inner, innerIndex) {
                            if (inner.length > 0) {
                                inner = inner.split(",");
                                if (minDistance === null) {
                                    minDistance = getDistance(outer[0], outer[1], inner[0], inner[1]);
                                } else if (minDistance > getDistance(outer[0], outer[1], inner[0], inner[1])) {
                                    minDistance = getDistance(outer[0], outer[1], inner[0], inner[1]);
                                    minDistanceOuterIndex = outerIndex;
                                    minDistanceInnerIndex = innerIndex;
                                }
                            }
                        });
                    }
                });
                addPoints(0, minDistanceOuterIndex + 1, outerCoord);
                addPoints(minDistanceInnerIndex, innerCoord.length, innerCoord);
                addPoints(1, minDistanceInnerIndex + 1, innerCoord);
                addPoints(minDistanceOuterIndex, outerCoord.length, outerCoord);
            } else if (oBoundary.length > 0 && iBoundary.length === 0) {
                coordinates = oBoundary[0].querySelector("coordinates");
                coordinates.textContent.trim().split(/\s/).forEach(function (coordPair) {
                    if (coordPair.length > 0) {
                        points.push({x: coordPair.split(",")[0], y: coordPair.split(",")[1]});
                    }
                });
            }
        }
        return points;
    },
    markRowSuccess: function (rowId, zoneId) {
        var row = document.getElementById("row" + rowId),
            link = document.createElement("a"),
            showMapButton = document.createElement("button"),
            showMapImage = document.createElement("span");

        row.className = "imported";
        row.lastChild.textContent = "Zone successfully imported.";
        showMapImage.className = "geotabButtonIcons iconSearch";
        showMapButton.appendChild(showMapImage);
        showMapButton.style.float = "right";
        showMapButton.className = "geotabButton emptyButton";
        link.appendChild(showMapButton);
        link.href = "#map,zones:!((id:" + zoneId + "))";
        row.firstChild.appendChild(link);
    },
    markRowError: function (rowId, errorString) {
        var row = document.getElementById("row" + rowId);
        row.className = "error";
        row.lastChild.textContent = errorString;
    },
    updateControlsVisibility: function (enableImportButton) {
        var mainContainer = document.getElementById("importKMLZonesId");
        if (!mainContainer) {
            return false;
        }
        var successRows = mainContainer.querySelectorAll(".imported"),
            errorRows = mainContainer.querySelectorAll(".error");

        if (successRows.length > 0) {
            document.getElementById("hideImportedLabel").style.display = "";
        }
        if (errorRows.length > 0) {
            document.getElementById("exportKML").style.display = "";
        }
        if (enableImportButton) {
            document.getElementById("importButton").removeAttribute("disabled");
        }
        if (document.getElementsByClassName("importCheckbox").length === 0) {
            document.getElementById("selectAllLabel").style.display = "none";
        }
    },
    saveZones: function (zonesToImport) {
        var calls = [], callsParts = [], pushedCalls = 0, sentParts = 0, self = this,
            doAfterCall = function (callLength) {
                sentParts++;
                self.waiting.updateProgressBar((callLength * 100) / zonesToImport.length);
                if (sentParts === callsParts.length) {
                    self.waiting.hideProgressBar();
                    if (document.getElementById("importButton")) {
                        document.getElementById("importButton").removeAttribute("disabled");
                    }
                } else {
                    sendQuery(callsParts[sentParts]);
                }
                self.updateControlsVisibility();
            },
            sendQuery = function (call) {
                kml.api.multiCall(call, function (data) {
                    call.every(function (callData, index) {
                        var zoneId = (typeof data === "string") ? data : data[index];
                        if (!document.getElementById("importKMLZonesId")) {
                            self.importedInBG.push({rowId: callData[1].entity.rowId, id: zoneId});
                        } else {
                            self.markRowSuccess(callData[1].entity.rowId, zoneId);
                        }
                        return true;
                    });
                    doAfterCall(call.length);
                }, function (errorString) {
                    call.every(function (callData) {
                        if (!document.getElementById("importKMLZonesId")) {
                            self.importedInBG.push({rowId: callData[1].entity.rowId, message: errorString});
                        } else {
                            self.markRowError(callData[1].entity.rowId, errorString);
                        }
                        return true;
                    });
                    doAfterCall(call.length);
                });
            };
        if (zonesToImport.length === 0) {
            alert("No selected zones to import.");
            return;
        }
        zonesToImport.every(function (zone) {
            if (pushedCalls < self.itemsPerCall) {
                pushedCalls++;
            } else {
                callsParts.push(calls);
                calls = [];
                pushedCalls = 1;
            }
            calls.push(["Add", {typeName: "Zone", entity: zone}]);
            return true;
        });
        if (calls.length > 0) {
            callsParts.push(calls);
        }
        document.getElementById("importButton").setAttribute("disabled", "disabled");
        this.waiting.showProgressBar();
        sendQuery(callsParts[0]);
    },
    updateImportedInBG: function () {
        kml.importedInBG.every(function (importedInBG) {
            if (importedInBG.id !== undefined) {
                kml.markRowSuccess(importedInBG.rowId, importedInBG.id);
            } else if (importedInBG.message !== undefined) {
                kml.markRowError(importedInBG.rowId, importedInBG.message);
            }
            return true;
        });
        kml.updateControlsVisibility(true);
        kml.importedInBG = [];
    },
    importZones: function () {
        var checkboxes = document.getElementsByClassName("importCheckbox"),
            zonesToImport = [];

        for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
                zonesToImport.push(kml.zonesData.zones[checkboxes[i].id].zoneParameters);
                zonesToImport[zonesToImport.length - 1].rowId = checkboxes[i].id;
            }
        }
        kml.saveZones(zonesToImport);
    },
    hideImported: function (event) {
        var rows = document.getElementsByClassName("imported"), i;
        if (event.currentTarget.checked === true) {
            for (i = 0; i < rows.length; i++) {
                rows[i].style.display = "none";
            }
        } else {
            for (i = 0; i < rows.length; i++) {
                rows[i].style.display = "";
            }
        }
    },
    exportKML: function () {
        var rows = document.querySelectorAll(".checkmateListTable .error"), i, zonesString = "",
            showSave,
            downloadAttributeSupport = "download" in document.createElement("a"),
            blobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                window.MozBlobBuilder || window.MSBlobBuilder;

        for (i = 0; i < rows.length; i++) {
            var zone = kml.zonesData.zones[rows[i].id.replace("row", "")];
            zonesString += new XMLSerializer().serializeToString(zone);
        }
        zonesString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<kml>" + zonesString + "<\/kml>";

        navigator.saveBlob = navigator.saveBlob || navigator.msSaveBlob ||
            navigator.mozSaveBlob || navigator.webkitSaveBlob;
        window.saveAs = window.saveAs || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs;

        if (blobBuilder && (window.saveAs || navigator.saveBlob)) {
            showSave = function (data, name) {
                var builder = new blobBuilder(), blob;
                builder.append(data);
                blob = builder.getBlob("text/plain; charset=UTF-8" || "application/octet-stream");
                if (window.saveAs) {
                    window.saveAs(blob, name);
                } else {
                    navigator.saveBlob(blob, name);
                }
            };
        } else if (downloadAttributeSupport) {
            showSave = function (data, name) {
                var element = document.createElement("a");
                element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(zonesString));
                element.setAttribute("download", name);
                element.style.display = "none";
                document.getElementById("importKMLZonesId").appendChild(element);
                element.click();
                document.getElementById("importKMLZonesId").removeChild(element);
            };
        }

        if (!showSave) {
            alert("Your browser does not support any method of saving JavaScript gnerated data to files.");
        } else {
            showSave(zonesString, "not_imported.kml");
        }
    },
    selectAll: function (event) {
        var checkboxes = document.getElementsByClassName("importCheckbox"), i;
        for (i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = (!!event.currentTarget.checked);
        }
    },
    clearDataTables: function () {
        var removeRows = function (tableId) {
            var table = document.getElementById(tableId).querySelector("table"),
                trs = table.querySelectorAll("tr");

            if (trs.length > 2) {
                for (var i = 2; i < trs.length; i++) {
                    trs[i].parentNode.removeChild(trs[i]);
                }
            }
            if (table.parentNode.style.display != "none") {
                table.parentNode.style.display = "none";
                document.getElementById("importButton").style.display = "none";
                document.getElementById("hideImportedLabel").style.display = "none";
                document.getElementById("progressContainer").style.display = "none";
                document.getElementById("exportKML").style.display = "none";
            }
        };
        removeRows("polygonList");
        removeRows("pointList");
        document.getElementById("selectAll").checked = false;
        document.getElementById("selectAllLabel").style.display = "none";
        kml.utils.hideError();
    },
    applyOptions: function () {
        var selectedTypes = document.getElementById("typesSelect").selectedOptions ||
                kml.utils.getSelectValues(document.getElementById("typesSelect")),
            types = [],
            controllerElement = document.getElementById("optionsControllerElement"),
            allZoneTypesData = angular.element(controllerElement).scope().zoneTypeOptions;
        for (var i = 0; i < selectedTypes.length; i++) {
            allZoneTypesData.every(function (data) {
                if (data.id === selectedTypes[i].value) {
                    if (data.isSystem === true) {
                        types.push(data.id);
                    } else {
                        types.push(data);
                    }
                    return false;
                }
                return true;
            });
        }
        kml.options.zoneTypes = types;
        kml.options.zoneColor = kml.colorPickerObj.value();
        kml.options.transparencyValue = kml.colorPicker.getTransparencyControl().get();
        kml.options.stoppedInsideZones = document.getElementById("stoppedInsideZones").checked;

        kml.zonesData.zones.forEach(function (zone) {
            zone.zoneParameters = kml.getZoneParameters(zone);
        });
    },
    setDefaultOptions: function () {
        var typesSelect = document.getElementById("typesSelect");
        for (var i = 0; i < typesSelect.options.length; i++) {
            typesSelect.options[i].selected = typesSelect.options[i].value === kml.defaultZoneType ? true : false;
        }
        kml.colorPicker.setDefaultColor();
        document.getElementById("colorPickerField").value = kml.colorPicker.getDefaultColorHex();
        document.getElementById("colorPickerField").style.opacity = (kml.colorPicker.getDefaultColor()[3]) / 255;
        document.getElementById("stoppedInsideZonesNo").checked = false;
        document.getElementById("stoppedInsideZones").checked = true;
    },
    clear: function () {
        this.uploader.clear();
        this.zonesData.zones = [];
        this.zonesData.commonStyles = [];
        this.clearDataTables();
    }
};
