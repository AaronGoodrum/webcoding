"use strict";

geotab.addin.browserAlarm = function (api, state) {
    var distributionLists = {},
        temporaryDistributionLists = {},
        currentUser,
        alarmsData = [],
        defaultType = "AudioAlarmFile",
        defaultFileType = "Wav",
        binaryDataPrefixWav = "data:audio/wav;base64,",
        binaryDataPrefixMp3 = "data:audio/mp3;base64,",
        pingExceptionsInterval = null,
        browserAlarm = document.getElementById("browserAlarm"),
        distributionListsContainer = browserAlarm.querySelector("#dlContainer"),
        turnOnButton = browserAlarm.querySelector("#turnOn"),
        searchDL = browserAlarm.querySelector("#searchDL"),
        soundsToPlay = [],
        prevSearch = "",
        cloneObject = function (obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            var temp = obj.constructor();
            for (var key in obj) {
                temp[key] = cloneObject(obj[key]);
            }
            return temp;
        },
        distributionListsView = {},
        turnOnLabel = "Turn on browser alarm",
        turnOffLabel = "Turn off browser alarm",
        isIE = function() {
            var ua = window.navigator.userAgent,
                msie = ua.indexOf("MSIE ");
            return (ua.indexOf(msie) !== -1) || !!ua.match(/Trident.*rv\:11\./);
        }(),
        waiting = function(container) {
            var containerElem = container || document.body,
                elem = document.createElement("div"),
                background = document.createElement("div");
            elem.className = "waiting";
            elem.style.display = "none";
            background.className = "waiting-background";
            containerElem.appendChild(background);
            containerElem.appendChild(elem);
            return {
                show: function() {
                    elem.style.display = "block";
                    background.style.display = "block";
                },
                hide: function() {
                    elem.style.display = "none";
                    background.style.display = "none";
                }
            }
        },
        audioTag = function() {
            if(!document.getElementById("browserAlarmAudioTag")) {
                var audioTagElem = document.createElement("audio"),
                    supportWarning = document.createElement("p");
                audioTagElem.id = "browserAlarmAudioTag";
                audioTagElem.setAttribute("type", "audio/mpeg");
                supportWarning.innerHTML = "Your browser does not support the <code>audio</code> element";
                audioTagElem.appendChild(supportWarning);
                document.body.appendChild(audioTagElem);

                audioTagElem.addEventListener("ended", function(){
                    audioTagElem.currentTime = 0;
                    audioTagElem.removeAttribute("src");
                    soundsToPlay.splice(0, 1);
                    soundsToPlay.length && playSounds();
                });
            }
            return document.getElementById("browserAlarmAudioTag");
        }(),
        searchIdTimeoutId,
        search = function(e) {
            var startTimer, code = e.keyCode || e.charCode,
                onChange = function() {
                    var key;
                    distributionListsView = {};
                    if (prevSearch !== searchDL.value) {
                        for (key in distributionLists) {
                            if(distributionLists[key].name.toLowerCase().indexOf(searchDL.value.toLowerCase()) !== -1) {
                                distributionListsView[key] = distributionLists[key];
                            }
                        }
                        renderDistributionLists();
                        prevSearch = searchDL.value;
                    }
                };
            if (searchIdTimeoutId) {
                clearTimeout(searchIdTimeoutId);
            }
            if (code === 13) {
                onChange();
                e.preventDefault();
            } else {
                startTimer = searchDL.value.length > 3 && code === 8 ? 800 : 250;
                searchIdTimeoutId = setTimeout(onChange, startTimer);
            }
        },
        initSearch = function() {
            searchDL.removeEventListener("keyup", search, false);
            searchDL.removeEventListener("click", search, false);
            searchDL.removeEventListener("mouseup", search, false);

            searchDL.removeAttribute("readonly");
            searchDL.addEventListener("keyup", search, false);
            searchDL.addEventListener("click", search, false);
            //for IE because click event is not triggering when clicking on the cross icon
            searchDL.addEventListener("mouseup", search, false);
        },
        loadErrorHandler = function(error) {
            if (!error.isAborted) {
                alert(error.message);
            }
        },
        getCurrentData = function() {
            var userName = "",
                waitingElem = waiting(distributionListsContainer.parentNode);
            api.getSession(function(credentials) {
                userName = credentials.userName;
            });
            waitingElem.show();
            api.multiCall([["Get", {
                    typeName: "NotificationBinaryFile"
                }], ["Get", {
                    typeName: "User",
                    search: {name: userName}
                }], ["Get", {
                    typeName: "DistributionList"
                }]], function(data) {
                    if (data[0]) {
                        alarmsData = data[0].filter(function (alarmItem) {
                            return alarmItem.type === defaultType && alarmItem.fileType === defaultFileType;
                        });
                    }
                    currentUser = data[1][0];
                    if(data[2] && data[2].length) {
                        var dlItems = [];
                        data[2].forEach(function (item) {
                            if ((item.name && item.name[0] !== "@") && item.id !== "DistributionListNewsId") {
                                if (item.recipients && item.recipients.length) {
                                    item.recipients.forEach(function (recipient) {
                                        if (recipient.recipientType === "Alarm") {
                                            alarmsData.length && alarmsData.forEach(function (alarm) {
                                                if (alarm.id == recipient.notificationBinaryFile.id) {
                                                    recipient.notificationBinaryFile = alarm;
                                                }
                                            });
                                        }
                                    })
                                }
                                dlItems.push(item);
                            }
                        });
                        dlItems.sort(function(a, b) {
                            if(a.name.toLowerCase() < b.name.toLowerCase()) return -1;
                            if(a.name.toLowerCase() > b.name.toLowerCase()) return 1;
                            return 0;
                        });
                        dlItems.forEach(function(item) {
                            distributionLists[item.id] = item;
                        });
                    }
                    renderDistributionLists();
                    initSearch();
                    waitingElem.hide();
                },
                function(error) {
                    waitingElem.hide();
                    loadErrorHandler(error);
                }
            );
        },
        popupWindow = function() {
            var browserAlarmPopup = document.createElement("div"),
                html = "<div class='popupContainer'>" +
                            "<div class='popupHeader'></div>" +
                                "<div class='popupContent'>" +
                                    "<div id='selectAlarmContainer'>" +
                                        "<div id='alarmList'>" +
                                        "</div>" +
                                    "</div>" +
                                    "<div id='addAlarmContainer' style='display: none'>" +
                                        "<div class='uploadRow'>" +
                                            "<div id='uploadAlarmButton' class='geotabButton'>Add file" +
                                                "<input id='uploadAlarmInput' type='file' accept='.wav,.mp3' />" +
                                            "</div>" +
                                            "<input id='alarmName' type='text' class='geotabFormEditField' />" +
                                            "<button id='applyAddedAlarmButton' class='geotabButton checkIcon positiveButton'></button>" +
                                            "<button id='cancelAddingAlarmButton' class='geotabButton closeCross negativeButton'></button>" +
                                        "</div>" +
                                    "</div>" +
                                    "<button id='addAlarmButton' class='geotabButton'>Add new sound</button>" +
                                "</div>" +
                                "<div class='popupButtons'>" +
                                    "<button id='applyPopupButton' class='geotabButton'>Save</button>" +
                                    "<button id='cancelPopupButton' class='geotabButton'>Cancel</button>" +
                                "</div>" +
                            "</div>" +
                        "</div>",
                appendPopupToPage = (function(){
                    browserAlarmPopup.id = "browserAlarmPopup";
                    browserAlarmPopup.innerHTML = html;
                    browserAlarm.appendChild(browserAlarmPopup);
                })(),
                addAlarmContainer = browserAlarm.querySelector("#addAlarmContainer"),
                selectAlarmContainer = browserAlarm.querySelector("#selectAlarmContainer"),
                alarmList = browserAlarm.querySelector("#alarmList"),
                addAlarmButton = browserAlarm.querySelector("#addAlarmButton"),
                uploadAlarmInput = browserAlarm.querySelector("#uploadAlarmInput"),
                alarmNameElement = browserAlarm.querySelector("#alarmName"),
                cancelPopupButton = browserAlarm.querySelector("#cancelPopupButton"),
                applyPopupButton = browserAlarm.querySelector("#applyPopupButton"),
                cancelAddingAlarmButton = browserAlarm.querySelector("#cancelAddingAlarmButton"),
                applyAddedAlarmButton = browserAlarm.querySelector("#applyAddedAlarmButton"),
                removedRecipients = {},
                removeAlarmFromList = function(event) {
                    var removeIcon = event.currentTarget,
                        alarmId = removeIcon.parentNode.getAttribute("data-alarm-id"),
                        dlId = browserAlarmPopup.getAttribute("data-list-id"), i;

                    for (i = 0; i < distributionLists[dlId].recipients.length; i++) {
                        if(distributionLists[dlId].recipients[i].notificationBinaryFile.id === alarmId ||
                            distributionLists[dlId].recipients[i].notificationBinaryFile.id === undefined) {
                            removedRecipients[distributionLists[dlId].recipients[i].id] = distributionLists[dlId].recipients[i];
                            distributionLists[dlId].recipients.splice(i, 1);
                            break;
                        }
                    }
                    removeIcon.removeEventListener("click", removeAlarmFromList, false);
                    removeIcon.parentNode.parentNode.removeChild(removeIcon.parentNode);
                },
                populateAlarmList = function(dlId) {
                    var row, removeIcon;
                    alarmList.textContent = "";
                    if (distributionLists[dlId].recipients.length) {
                        distributionLists[dlId].recipients.forEach(function(recipient) {
                            if (recipient.recipientType === "Alarm") {
                                row = document.createElement("div");
                                row.setAttribute("data-alarm-id", recipient.notificationBinaryFile.id);
                                removeIcon = document.createElement("button");
                                removeIcon.className = "geotabButton removeAlarm closeCross";

                                row.textContent = recipient.notificationBinaryFile.name;
                                row.appendChild(removeIcon);
                                alarmList.appendChild(row);
                                removeIcon.addEventListener("click", removeAlarmFromList, false);
                            }
                        });
                    }
                },
                showPopup = function(e) {
                    var dlId = e.currentTarget.id;
                    browserAlarmPopup.setAttribute("data-list-id", dlId);
                    populateAlarmList(dlId);
                    browserAlarmPopup.style.display = "block";
                    hideAddingAlarmArea();
                    browserAlarmPopup.querySelector(".popupHeader").textContent = distributionLists[dlId].name;
                    temporaryDistributionLists = cloneObject(distributionLists);
                },
                hidePopup = function() {
                    browserAlarmPopup.style.display = "none";
                    hideAddingAlarmArea();
                    browserAlarmPopup.removeAttribute("data-list-id");
                    distributionLists = temporaryDistributionLists;
                    removedRecipients = {};
                },
                uploadAlarm = function(e) {
                    var file = e.target.files[0], reader = new FileReader();
                    if (file.type !== "audio/wav" && file.type !== "audio/mp3") {
                        alert("Only .wav and .mp3 files are available!");
                        this.value = null;
                        alarmNameElement.value = null;
                        uploadAlarmInput.binaryData = null;
                        return;
                    }
                    reader.onload = (function() {
                        return function(e) {
                            uploadAlarmInput.binaryData = e.target.result.replace(binaryDataPrefixWav, "").replace(binaryDataPrefixMp3, "");
                            alarmNameElement.value = file.name.replace(/[^a-zA-Z0-9\.\-]/g, '');
                        };
                    })();
                    reader.onerror = function(evt) {
                        switch(evt.target.error.code) {
                            case evt.target.error.NOT_FOUND_ERR:
                                alert("File Not Found!");
                                break;
                            case evt.target.error.NOT_READABLE_ERR:
                                alert("File is not readable");
                                break;
                            case evt.target.error.ABORT_ERR:
                                break;
                            default:
                                alert("An error occurred reading this file.");
                        };
                    };
                    reader.readAsDataURL(file);
                },
                saveDistributionList = function() {
                    var dlId = browserAlarmPopup.getAttribute("data-list-id"),
                        waitingElem = waiting(browserAlarmPopup.querySelector(".popupContainer"));

                    waitingElem.show();
                    addAlarmContainer.style.display === "block" && saveNewAlarm();

                    api.call("Set", {
                        typeName: "DistributionList",
                        entity: distributionLists[dlId]
                    }, function() {
                        temporaryDistributionLists = cloneObject(distributionLists);
                        waitingElem.hide();
                        popupWindow.hide();
                        setDistributionListName(distributionLists[dlId]);
                    }, function(error) {
                        waitingElem.hide();
                        loadErrorHandler(error);
                    });
                },
                saveNewAlarm = function() {
                    var alarmName = alarmNameElement.value.trim(),
                        filePath = uploadAlarmInput.value,
                        dlId = browserAlarmPopup.getAttribute("data-list-id"),
                        notificationBinaryFile = {
                            name: alarmName,
                            fileType: defaultFileType,
                            binaryData: uploadAlarmInput.binaryData,
                            type: defaultType
                        };

                    if(!filePath.length) {
                        alert("Please, upload alarm file.");
                    } else if (!alarmName.length) {
                        alert("Alarm name can not be empty!");
                    } else {
                        distributionLists[dlId].recipients.push({
                            address: currentUser.name,
                            user: {id: currentUser.id},
                            recipientType: "Alarm",
                            notificationBinaryFile: notificationBinaryFile
                        });
                        populateAlarmList(dlId);
                        hideAddingAlarmArea();
                    }
                },
                showAddingAlarmArea = function() {
                    addAlarmContainer.style.display = "block";
                    addAlarmButton.style.display = "none";
                    uploadAlarmInput.value = "";
                    alarmNameElement.value = "";
                },
                hideAddingAlarmArea = function() {
                    addAlarmContainer.style.display = "none";
                    addAlarmButton.style.display = "block";
                };

            cancelPopupButton.addEventListener("click", hidePopup, false);
            applyPopupButton.addEventListener("click", saveDistributionList, false);
            addAlarmButton.addEventListener("click", showAddingAlarmArea, false);
            cancelAddingAlarmButton.addEventListener("click", hideAddingAlarmArea, false);
            uploadAlarmInput.addEventListener("change", uploadAlarm, false);
            applyAddedAlarmButton.addEventListener("click", saveNewAlarm, false);

            return {
                show: showPopup,
                hide: hidePopup
            }
        }(),
        setDistributionListName = function(item) {
            var alarmName,
                td = browserAlarm.querySelector(".dlRow#" + item.id + " td"),
                name = document.createElement("div");

            td.textContent = "";
            name.className = "dlName";
            name.textContent = item.name;
            td.appendChild(name);

            if (item.recipients.length) {
                item.recipients.forEach(function(recipient) {
                    if(recipient.notificationBinaryFile && recipient.recipientType === "Alarm") {
                        alarmName = document.createElement("div");
                        alarmName.className = "alarmName";
                        alarmName.textContent = recipient.notificationBinaryFile.name;
                        td.appendChild(alarmName);
                    }
                });
            }
        },
        renderDistributionLists = function() {
            if (!browserAlarm) {
                return;
            }
            var addRow = function(item) {
                var row = document.createElement("tr"),
                    td = document.createElement("td");

                    row.className = "dlRow";
                    row.id = item.id;
                    row.appendChild(td);

                    distributionListsContainer.appendChild(row);
                    setDistributionListName(item);
                    row.addEventListener("click", popupWindow.show, false);
                },
                dlId,
                lists = searchDL.value.length === 0 ? distributionLists : distributionListsView,
                rows = browserAlarm.querySelectorAll(".dlRow");

            if (rows && rows.length) {
                rows.forEach(function(row) {
                    row.removeEventListener("click", popupWindow.show, false);
                });
                distributionListsContainer.textContent = "";
            }

            for (dlId in lists) {
                addRow(lists[dlId]);
            }
        },
        pingExceptions = function(rulesVersions) {
            var key, dlsRules = {}, calls = [],
                endDate = new Date(),
                startDate = new Date();
            startDate.setMinutes(endDate.getMinutes() - 1);

            for (key in distributionLists) {
                if (distributionLists[key].recipients.length && distributionLists[key].rules.length) {
                    distributionLists[key].recipients.forEach(function (recipient) {
                        if (recipient.address === currentUser.name && recipient.recipientType === "Alarm") {
                            distributionLists[key].rules.forEach(function(rule) {
                                if (!dlsRules[key]) {
                                    dlsRules[key] = {};
                                }
                                if (!dlsRules[key][rule.id]) {
                                    dlsRules[key][rule.id] = [];
                                    calls.push(["GetFeed", {
                                        typeName: "ExceptionEvent",
                                        fromVersion: "0000000000000000",
                                        resultsLimit: 50,
                                        search: {
                                            ruleSearch: {id: rule.id},
                                            fromDate: startDate,
                                            toDate: endDate}
                                    }]);
                                }
                                dlsRules[key][rule.id].push(recipient.notificationBinaryFile);
                            });
                        }
                    });
                }
            }
            calls.forEach(function(call) {
                for (var key in rulesVersions) {
                    if (key === call[1].search.ruleSearch.id) {
                        call[1].fromVersion = rulesVersions[key];
                    }
                }
            });
            calls.length && api.multiCall(calls, function(data) {
                if (data.hasOwnProperty("data")) {
                    data = [data];
                }

                data.length && data.forEach(function(dataItem) {
                    if (dataItem.data.length) {
                        dataItem.data.forEach(function(exception) {
                            rulesVersions[exception.rule.id] = dataItem.toVersion;
                            for (var dlId in dlsRules) {
                                if (dlsRules[dlId][exception.rule.id] && dlsRules[dlId][exception.rule.id].length) {
                                    dlsRules[dlId][exception.rule.id].forEach(function(notificationBinaryFile) {
                                        soundsToPlay.push(binaryDataPrefixMp3 + notificationBinaryFile.binaryData);
                                    });
                                }
                            }
                        });
                    }
                });
                playSounds();
            }, function(error) {
                loadErrorHandler(error);
            });
        },
        changeAlarmPlaying = function() {
            var rulesVersions = {},
                turnOnCheckbox = browserAlarm.querySelector("#turnOn");
            if (turnOnCheckbox.checked) {
                browserAlarm.querySelector("#turnOnLabel").textContent = turnOffLabel;
                pingExceptionsInterval && clearInterval(pingExceptionsInterval);
                pingExceptionsInterval = setInterval(function() { pingExceptions(rulesVersions); }, Number(browserAlarm.querySelector("#requestRangeValue").value));
            } else {
                browserAlarm.querySelector("#turnOnLabel").textContent = turnOnLabel;
                clearInterval(pingExceptionsInterval);
            }
        },
        initRequestRange = function() {
            var requestRange = browserAlarm.querySelector("#requestRange"),
                requestRangeValue = browserAlarm.querySelector("#requestRangeValue"),
                decreaseRange = browserAlarm.querySelector("#decreaseRange"),
                increaseRange = browserAlarm.querySelector("#increaseRange"),
                minValue = 15000, maxValue = 120000, step = 5000,
                setRangeTitle = function() {
                    var value = Number(requestRangeValue.value) / 1000, title = "", minutes = 0;
                    if (value < 60) {
                        title = value.toString() + " seconds";
                    } else if (value >= 60) {
                        minutes = Math.floor(value / 60);
                        title = minutes.toString() + " min. ";
                        if (value / 60 - minutes) {
                            title += (value - minutes * 60).toString() + " seconds";
                        }
                    }
                    requestRange.value = title;
                },
                changeRange = function(event) {
                    var target = event.currentTarget;
                    if (target.id === "decreaseRange") {
                        increaseRange.removeAttribute("disabled");
                        if (Number(requestRangeValue.value) - step <= minValue) {
                            decreaseRange.setAttribute("disabled", "disabled");
                            requestRangeValue.value = minValue;
                        } else {
                            decreaseRange.removeAttribute("disabled");
                            requestRangeValue.value = Number(requestRangeValue.value) - step;
                        }
                    } else if (target.id === "increaseRange"){
                        decreaseRange.removeAttribute("disabled");
                        if (Number(requestRangeValue.value) + step >= maxValue) {
                            increaseRange.setAttribute("disabled", "disabled");
                            requestRangeValue.value = maxValue;
                        } else {
                            increaseRange.removeAttribute("disabled");
                            requestRangeValue.value = Number(requestRangeValue.value) + step;
                        }
                    }
                    setRangeTitle();
                    changeAlarmPlaying();
                };
            decreaseRange.addEventListener("click", changeRange, false);
            increaseRange.addEventListener("click", changeRange, false);
            decreaseRange.click();
        }(),
        playSounds = function() {
            if (soundsToPlay.length && audioTag.getAttribute("src") != soundsToPlay[0]) {
                audioTag.setAttribute("src", soundsToPlay[0]);
                audioTag.play();
            }
        };

    if (isIE) {
        browserAlarm.querySelector(".notSupportWarning").style.display = "block";
    }
    turnOnButton.addEventListener("change", changeAlarmPlaying, false);

    return {
        initialize: function (api, state, callback) {
            if (state.translate) {
                state.translate(browserAlarm);
            }
            callback();
        },
        focus: function () {
            popupWindow.hide();
            getCurrentData();
        },
        blur: function () {

        }
    };
};