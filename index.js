const download = require('download-file');
const express = require('express');
const fs = require('fs');
const http = require('http');
const PDFParser = require('pdf2json');
const request = require('request');
const app = express();

const DINING_URL = "http://dining.rice.edu/undergraduate-dining/college-serveries/weekly-menus/";
const MENU_FOLDER = "./menu_pdfs/";


app.set('port', (process.env.PORT || 5000));

app.get('/', (request, response) => {
    response.send("Hello!");
})


app.get('/Andres', (request, response) => {
    response.send("Hello Andres!");
})

app.get('WeeklyMenu', (request, response) => {
    response.send(serveryJsonObjects);
})

// Holds the different PDF JSON objects
let serveryJsonObjects;

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

function savePdfJsonToFile(serveryLocationName, callback) {
	let pdfParser = new PDFParser();

	pdfParser.on("pdfParser_dataError", e => {
		console.error("Error parsing '" + serveryLocationName + ".pdf':");
		console.error(e.parseError)
	});

	pdfParser.on("pdfParser_dataReady", rawPdfJsonObject => {
		const currentLocation = serveryLocationName;

		// Stores the Pages array "as-is" from the pdf2json function call.
		let pagesArray = rawPdfJsonObject.formImage.Pages;
		for (let j = 0; j < pagesArray.length; j++) {
			let pageInfoObj = pagesArray[j];

			// Stores the condensed information from the raw pdf2json object.
			let newPageInfo = {};

			newPageInfo.height = pageInfoObj.Height;
			newPageInfo.texts = pageInfoObj.Texts;

			for (let k = 0; k < newPageInfo.texts.length; k++) {
				// Stores only the necessary information for each text block.
				let text = {};

				text.x = newPageInfo.texts[k].x;
				text.y = newPageInfo.texts[k].y;
				text.ts = newPageInfo.texts[k].R[0].TS;
				text.t = newPageInfo.texts[k].R[0].T;

				text.t = decodeURIComponent(text.t);

				// Override the raw data with the compressed data
				newPageInfo.texts[k] = text;
			}

			pagesArray[j] = newPageInfo;
		}

		let pdfJsonObject = {
			servery: removeCamelCase(currentLocation),
			numPages: pagesArray.length,
			pages: pagesArray
		};

		let descriptiveCallback = e => {
			const fileName = currentLocation + ".json";

			if (e) {
				console.error("Error writing '" + fileName + "' to file.");
				console.error(e.message);
			} else
				console.log("Successfully wrote '" + fileName + "' to file.");
		};
		
		fs.writeFile(MENU_FOLDER + currentLocation + ".json",
			JSON.stringify(pdfJsonObject, null, "\t"), "utf8", descriptiveCallback);
	});

	pdfParser.loadPDF(MENU_FOLDER + serveryLocationName + ".pdf");
}

function clump(pdfJsonObject, index) {
	let daysOfWeek = 5;
}

function removeCamelCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])([A-Z]*)/g, (match, p1, p2) =>
		" " + (typeof(p1) == "string" ? p1 : "") + (typeof(p2) == "string" ? p2 : ""));
}

app.listen(app.get('port'), () => {
    console.log('running on port', app.get('port'));
})




