const download = require('download-file');
const express = require('express');
const fs = require('fs');
const http = require('http');
const PDFParser = require('pdf2json');
const request = require('request');
const app = express();

const DINING_URL = "http://dining.rice.edu/undergraduate-dining/college-serveries/weekly-menus/";
const MENU_FOLDER = "./menu_pdfs/";
const RICE_BLUE = "#16355b";
const MONDAY = 0;
const TUESDAY = 1;
const WEDNESDAY = 2;
const THURSDAY = 3;
const FRIDAY = 4;
const SATURDAY = 5;
const SUNDAY = 6;
const LABEL_STRLEN = 2;
const LUNCH = 1;
const DINNER = 2;
const SAME_LINE_THRESH = 0.8
const DINING_UPDATE_INTERVAL_MS = 1000 /*ms*/ * 60 /*secs*/ * 60 /*mins*/;

// Holds the response page for the / GET request
const welcomeHTML = fs.readFileSync('resources/index.html', 'utf8');

// Holds the server that listens to new requests
let server = null;

// Holds the different, final PDF JSON objects that will be deployed to the API users
let serveryJsonObjects;

// Holds the response to the /WeeklyMenu GET request
let weeklyMenu;

// Starts the menu processing callback chain.
start();

// Sets the chain to restart every hour.
setInterval(start, DINING_UPDATE_INTERVAL_MS);

function start() {
	// Waits for all dining location PDF files to be converted to usable JSON objects to start listening for requests.
	finish(() => {
		// Generate the weekly menu JSON object from the serveryJsonObjects array
		weeklyMenu = generateWeeklyMenu(serveryJsonObjects);

		// Close any previously running express servers
		if (server != null)
			server.close();

		app.set('port', (process.env.PORT || 5000));

		app.get('/', (request, response) => {
			response.type('html');
			response.send(welcomeHTML);
		});

		app.get('/Andres', (request, response) => {
			response.type('html');
			response.send("finished");
		});

		app.get('/Jade', (request, response) => {
			response.type('html');
			response.send("finished");
		})

		app.get('/WeeklyMenu', (request, response) => {
			response.type('json');
			response.send(weeklyMenu);
		});

		server = app.listen(app.get('port'), () => {
			console.log('running on port', app.get('port'));
		});
	});

	http.get(DINING_URL, response => {
		let diningHTML = "";

		console.log("Response statuscode: " + response.statusCode);
		console.log("Content:\n\n");

		response.setEncoding("utf8");
		response.on("data", chunk => diningHTML += chunk);

		response.on("end", () => {
			let pdfUrls = {
				baker: getPdfUrlOf("Baker", diningHTML),
				north: getPdfUrlOf("North", diningHTML),
				seibel: getPdfUrlOf("Seibel", diningHTML),
				sidRich: getPdfUrlOf("Sid Rich", diningHTML),
				south: getPdfUrlOf("South", diningHTML),
				west: getPdfUrlOf("West", diningHTML)
			};

			let serveryKeys = Object.keys(pdfUrls);

			// Initialize the array that will allow synchronization to occur later.
			serveryJsonObjects = new Array(serveryKeys.length);
			for (let i = 0; i < serveryKeys.length; i++)
				serveryJsonObjects[i] = null;

			// Save the PDF file as-is given from the Rice Dining website.
	        	savePdfToFile(pdfUrls, savePdfJsonToFile);
		});
	}).on("error", e => console.error("GET REQUEST ERROR: " + e.message));
}

function getPdfUrlOf(buildingName, diningHTML) {
	let regex = new RegExp("<p>(\\r\\n\\s)*<a href=\"([^\"]+)\" target=\"_blank\" rel=\"noopener\">" + buildingName + "<\\/a>");

	let matchesArray = diningHTML.match(regex);

	if (matchesArray.length == 3)
		// 0 = Entire match, 1 = first parenthesis, 2 = URL parenthesis
		return matchesArray[2];

	else {
		console.error("Unexpected number of matches found in diningHTML. Got " + matchesArray.length + " matches.");
		console.error(matchesArray);
	}
}

function savePdfToFile(pdfUrls, pdfProcessor) {
	for (serveryLocationName in pdfUrls) {
		const url = pdfUrls[serveryLocationName];
		const options = {
			directory: MENU_FOLDER,
			filename: serveryLocationName + ".pdf"
		};

		const currentLocation = serveryLocationName;
		download(url, options, e => {
			if (e)
				console.error("Error downloading PDF from '" + url + "'");
			else {
				console.log("Saved " + options.filename + " to file!");
				pdfProcessor(currentLocation);
			}
		});
	}
}

function savePdfJsonToFile(serveryLocationName, initializeServerCallback) {
	let pdfParser = new PDFParser();
	const currentLocation = serveryLocationName;

	pdfParser.on("pdfParser_dataError", e => {
		console.error("Error parsing '" + serveryLocationName + ".pdf':");
		console.error(e.parseError)
	});

	pdfParser.on("pdfParser_dataReady", rawPdfJsonObject => {
		// Sort the text elements based on x-coordinate
		for (let i = 0; i < rawPdfJsonObject.formImage.Pages.length; i++)
			rawPdfJsonObject.formImage.Pages[i].Texts.sort((a, b) => a.x > b.x ? 1 : a.x < b.x ? -1 : 0);

		// Save the complete (sorted) information to currentLocation.uncompressed.pdf for research purposes, then proceed to
		// compress the information for boundary calculations.
		fs.writeFile(MENU_FOLDER + currentLocation + ".uncompressed.json",
			JSON.stringify(rawPdfJsonObject, null, "\t"), "utf8", e => {
				if (e)
					console.error(e.message);
				else {
					console.log("Successfully saved '" + currentLocation + ".uncompressed.json' to file.");

					// Stores a deep copy of the Pages array (removing %20 from text) from the pdf2json function call.
					let pagesArray = JSON.parse(JSON.stringify(rawPdfJsonObject.formImage.Pages.map(page => {
						let newPage = page;
						newPage.Texts = newPage.Texts.map(textObj => {
							let newTextObj = textObj;
							newTextObj.R[0].T = decodeURIComponent(newTextObj.R[0].T);

							return newTextObj;
						});

						return newPage;
					})));

					for (let j = 0; j < pagesArray.length; j++) {
						let pageInfoObj = pagesArray[j];

						// Stores the condensed information from the raw pdf2json object.
						let newPageInfo = {};
						newPageInfo.texts = pageInfoObj.Texts;

						// Only leave the fills that correspond to day entries (Monday, Tuesday, etc.)
						newPageInfo.dayBounds = processDayBoundObjectArray(pageInfoObj.Fills);

						for (let k = 0; k < newPageInfo.texts.length; k++) {
							// Stores only the necessary information for each text block.
							let text = {};

							text.x = newPageInfo.texts[k].x;
							text.y = newPageInfo.texts[k].y;
							text.w = newPageInfo.texts[k].w;
							text.t = newPageInfo.texts[k].R[0].T;

							// Override the raw data with the compressed data
							newPageInfo.texts[k] = text;
						}

						newPageInfo.groups = groupTextElementsByBoundsToArray(newPageInfo.dayBounds, newPageInfo.texts);
						condenseAndOrderGroupsArraysTextElements(newPageInfo.groups);

						let menu = newPageInfo.groups;
						pagesArray[j] = menu;
					}

					let menu = reformatPageArrayToAppropraiteTitles(pagesArray);
					formatMenuEntreesForFinalOutput(menu);

					let pdfJsonObject = {
						servery: removeCamelCase(currentLocation),
						chef: getChefName(rawPdfJsonObject.formImage.Pages),
						menu: menu
					};

					let descriptiveCallback = e => {
						const fileName = currentLocation + ".json";

						if (e) {
							console.error("Error writing '" + fileName + "' to file.");
							console.error(e.message);
						} else
							console.log("Successfully wrote '" + fileName + "' to file.");
					};

					// Save the condensed information to currentLocation.pdf
					fs.writeFile(MENU_FOLDER + currentLocation + ".json",
						JSON.stringify(pdfJsonObject, null, "\t"), "utf8", descriptiveCallback);

					// Indicate that the current location has been created
					switch (currentLocation) {
						case "baker":
							serveryJsonObjects[0] = pdfJsonObject;
							break;
						case "north":
							serveryJsonObjects[1] = pdfJsonObject;
							break;
						case "seibel":
							serveryJsonObjects[2] = pdfJsonObject;
							break;
						case "sidRich":
							serveryJsonObjects[3] = pdfJsonObject;
							break;
						case "south":
							serveryJsonObjects[4] = pdfJsonObject;
							break;
						case "west":
							serveryJsonObjects[5] = pdfJsonObject;
							break;
						default:
							console.log("Unknown location encountered: \"" + currentLocation + "\"");
							break;
					}
				}
			});
	});

	pdfParser.loadPDF(MENU_FOLDER + serveryLocationName + ".pdf");
}

function processDayBoundObjectArray(pageFillsArray) {
	// Only work with the colored box bounds given to each day of the week
	let stage1 = pageFillsArray.filter(fillObj => fillObj.oc === RICE_BLUE);

	// Convert the bounds to usable coordinates
	let stage2 = stage1.map(fillObj => {
		return {
			day: "TBD",
			x1: fillObj.x,
			x2: fillObj.x + fillObj.w,
			y1: fillObj.y,
			y2: fillObj.y + fillObj.h
		};
	});

	// Ensure that Monday -> 0, Tuesday -> 1, etc. based on coordinate positions
	stage2.sort((a, b) => a.y < b.y ? -1 : a.y > b.y ? 1 : a.x < b.x ? -1 : a.x > b.x ? 1 : 0);

	// Convert "TBD" to their respective day
	const dayIndices = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

	for (let i = 0; i < stage2.length; i++)
		stage2[i].day = dayIndices[i];

	return stage2;
}

function groupTextElementsByBoundsToArray(dayBoundsArray, textsArray) {
	var groups = [];
	for (let i = 0; i < dayBoundsArray.length; i++) {
		const dayObj = dayBoundsArray[i];

		// First section the different possible columns
		let dayGroups = textsArray.filter(textObj => {
			// Calculate the amount of overlap that the textObj has with the dayObj and consider it 
			// in if has 50% overlap.
			let textObjBeforeDayObj = textObj.x < dayObj.x1;

			let x11 = textObjBeforeDayObj ? textObj.x : dayObj.x1;
			let x21 = textObjBeforeDayObj ? textObj.x + textObj.w : dayObj.x2;
			let x12 = textObjBeforeDayObj ? dayObj.x1 : textObj.x;
			let x22 = textObjBeforeDayObj ? dayObj.x2 : textObj.x + textObj.w;

			let overlapLength = x21 - x12;
			let totalLength = x22 - x11;

			// Otherwise, we just check that over 50% of the column is shared
			return overlapLength / totalLength > 0.5;
		});

		groups.push(dayGroups);
	}

	if (dayBoundsArray.length > 0) {
		// Then filter each dayGroups with values that must belong in the respective column.
		const bottomRowYCoordinate = dayBoundsArray[THURSDAY].y1;
		for (let day = 0; day < groups.length; day++) {
			if (day < THURSDAY) {
				groups[day] = groups[day].filter(textObj => textObj.y < bottomRowYCoordinate);
			} else {
				groups[day] = groups[day].filter(textObj => textObj.y > bottomRowYCoordinate);
			}
		}
	}

	return groups;
}

function removeCamelCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])([A-Z]*)/g, (match, p1, p2) =>
		" " + (typeof(p1) == "string" ? p1 : "") + (typeof(p2) == "string" ? p2 : ""));
}

function condenseAndOrderGroupsArraysTextElements(groupArray) {
	// First remove all of the V, VG, P, etc.
	for (let i = 0; i < groupArray.length; i++)
		groupArray[i] = groupArray[i].filter(textObj => textObj.t.replace(/\s/g, "").length > LABEL_STRLEN);

	// Then we sort the text elements so that they are in the order that they are presented in the pdf
	for (let i = 0; i < groupArray.length; i++)
		groupArray[i].sort((a, b) => a.y - b.y);
}

function reformatPageArrayToAppropraiteTitles(pageArray) {

    let menu = {
        lunch: pageArray[LUNCH], //the first page
        dinner: pageArray[DINNER] //the second page
    };

    const filterRegexes = [/=/, /^\s*contains(\s+\w*)?$/i, /^treenuts$/i, /^gluten$/i, /^soy$/i];

    let lunchEntres = {
        monday: menu.lunch[MONDAY].filter(mealLambda(["Monday", "Lunch Menu"], filterRegexes)), //the first entry of the first page
        tuesday: menu.lunch[TUESDAY].filter(mealLambda(["Tuesday", "Lunch Menu"], filterRegexes)),
        wednesday: menu.lunch[WEDNESDAY].filter(mealLambda(["Wednesday", "Lunch Menu"], filterRegexes)),
        thursday: menu.lunch[THURSDAY].filter(mealLambda(["Thursday", "Lunch Menu"], filterRegexes)),
        friday: menu.lunch[FRIDAY].filter(mealLambda(["Friday", "Lunch Menu"], filterRegexes)),
        saturday: menu.lunch[SATURDAY].filter(mealLambda(["Saturday", "Lunch Menu"], filterRegexes)),
        sunday: menu.lunch[SUNDAY].filter(mealLambda(["Sunday", "Lunch Menu"], filterRegexes))
    }

    let dinnerEntres = {
        monday: menu.dinner[MONDAY].filter(mealLambda(["Monday", "Dinner Menu"], filterRegexes)), //the first entry of the first page
        tuesday: menu.dinner[TUESDAY].filter(mealLambda(["Tuesday", "Dinner Menu"], filterRegexes)),
        wednesday: menu.dinner[WEDNESDAY].filter(mealLambda(["Wednesday", "Dinner Menu"], filterRegexes)),
        thursday: menu.dinner[THURSDAY].filter(mealLambda(["Thursday", "Dinner Menu"], filterRegexes)),
        friday: menu.dinner[FRIDAY].filter(mealLambda(["Friday", "Dinner Menu"], filterRegexes)),
        saturday: menu.dinner[SATURDAY].filter(mealLambda(["Saturday", "Dinner Menu"], filterRegexes)),
        sunday: menu.dinner[SUNDAY].filter(mealLambda(["Sunday", "Dinner Menu"], filterRegexes))
    }

    menu.lunch = lunchEntres;
    menu.dinner = dinnerEntres;
    return menu;

    function mealLambda(literalsToRemoveArray, regexesToRemoveArray) {
    	const literals = literalsToRemoveArray;
    	const regexes = regexesToRemoveArray;

    	return textObj => {
    		let truth = true;
    		for (let i = 0; i < literals.length; i++)
    			truth = truth && (textObj.t !== literals[i]);

    		for (let i = 0; i < regexes.length; i++)
    			truth = truth && !textObj.t.match(regexes[i]);

    		return truth;
    	}
    }
}

function formatMenuEntreesForFinalOutput(menu) {
	for (let mealtime in menu) {
		let weeklyScheduleObj = menu[mealtime];

		for (let dayOfTheWeek in weeklyScheduleObj) {
			let dayEntreeTextObjArray = weeklyScheduleObj[dayOfTheWeek];
			let formattedStringArray = [];

			// Add the first textObj text to the array if it exists
			if (dayEntreeTextObjArray.length > 0)
				formattedStringArray.push(dayEntreeTextObjArray[0].t);

			for (let i = 1; i < dayEntreeTextObjArray.length; i++) {
				let currTextObj = dayEntreeTextObjArray[i];
				let prevTextObj = dayEntreeTextObjArray[i - 1];

				if (currTextObj.y - prevTextObj.y < SAME_LINE_THRESH) {
					formattedStringArray[formattedStringArray.length - 1] += currTextObj.t;
				} else {
					formattedStringArray.push(currTextObj.t);
				}
			}

			weeklyScheduleObj[dayOfTheWeek] = formattedStringArray;
		}
	}
}

function getChefName(pagesArray) {
	const SAME_Y_COORDINATE_THRESH = 0.0001;
	let firstPage = pagesArray[0];

	// Ensure that the text elements are sorted in ascending y coordinate value
	firstPage.Texts.sort((a, b) => a.y - b.y);

	// Find the lowest y-coordinate value
	let lowestYValue = 0;
	for (let i = 0; i < firstPage.Texts.length; i++)
		if (firstPage.Texts[i].y > lowestYValue)
			lowestYValue = firstPage.Texts[i].y;

	// Only leave the lowest text elements in the array (these contain the chef name), then extract and join those strings.
	let chefName = firstPage.Texts.filter(textObj => Math.abs(textObj.y - lowestYValue) <= SAME_Y_COORDINATE_THRESH)
		.map(textObj => textObj.R[0].T)
		.join(" ");

	return chefName;
}

function generateWeeklyMenu(serveryJsonObjectsArray) {
	let weeklyMenuTemp = {};

	for (let i = 0; i < serveryJsonObjectsArray.length; i++) {
		let serveryJson = serveryJsonObjectsArray[i];

		weeklyMenuTemp[serveryJson.servery] = {};
		weeklyMenuTemp[serveryJson.servery].chef = serveryJson.chef;
		weeklyMenuTemp[serveryJson.servery].menu = serveryJson.menu;
	}

	return weeklyMenuTemp;
}

function finish(callback) {
	let timeoutID = 0;

	timeoutID = setTimeout(() => {
		let ready = true;

		if (serveryJsonObjects instanceof Array) {
			for (let i = 0; i < serveryJsonObjects.length; i++) {
				if (serveryJsonObjects[i] == null) {
					ready = false;
					break;
				}
			}
		} else
			ready = false;

		if (ready) {
			clearTimeout(timeoutID);
			callback();
		} else
			timeoutID = setTimeout(finish, 1, callback);
	}, 1);
}
