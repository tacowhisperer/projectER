const download = require('download-file');
const fs = require('fs');
const http = require('http');
const PDFParser = require('pdf2json');

const DINING_URL = "http://dining.rice.edu/undergraduate-dining/college-serveries/weekly-menus/";
const MENU_FOLDER = "./menu_pdfs/";

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

        	savePdfToFile(pdfUrls, savePdfJsonToFile, Object.keys(pdfUrls), () => console.log("Success!"));
	});

}).on("error", e => console.error("GET REQUEST ERROR: " + e.message));

function getPdfUrlOf(buildingName, diningHTML) {
	let regex = new RegExp("<p>(\\r\\n\\s)*<a href=\"([^\"]+)\" target=\"_blank\" rel=\"noopener\">" + buildingName + "<\\/a>");

	let matchesArray = diningHTML.match(regex);

	if (matchesArray.length == 3)
		// 0 = Entire match, 1 = first parenthesis, 2 = URL parenthesis
		return matchesArray[2];

	else {
		console.error("Unexpected number of matches found. Got " + matchesArray.length);
		console.error(matchesArray);
	}
}

function savePdfToFile(pdfUrls, callback, arg0, arg1) {
	for (location in pdfUrls) {
		let url = pdfUrls[location];
		let options = {
			directory: MENU_FOLDER,
			filename: location + ".pdf"
		};

		download(url, options, e => {
			if (e)
				console.error("Error downloading PDF from '" + url + "'");
			else 
				console.log("Saved " + options.filename + " to file!");

			callback(arg0, arg1);
		});
	}
}

function savePdfJsonToFile(pdfs, callback) {
	for (let i = 0; i < pdfs.length; i++) {
		let pdfParser = new PDFParser();

		pdfParser.on("pdfParser_dataError", e => {
			console.error("Error parsing '" + pdfs[i] + "':");
			console.error(e.parseError)
		});

		pdfParser.on("pdfParser_dataReady", rawPdfJsonObject => {
			// Stores the Pages array "as-is" from the pdf2json function call.
			let pagesArray = rawPdfJsonObject.formImage.Pages;
			for (let i = 0; i < pagesArray.length; i++) {
				let pageInfoObj = pagesArray[i];

				// Stores the condensed information from the raw pdf2json object.
				let newPageInfo = {};

				newPageInfo.height = pageInfoObj.Height;
				newPageInfo.texts = pageInfoObj.Texts;

				for (let j = 0; j < newPageInfo.texts.length; j++) {
					// Stores only the necessary information for each text block.
					let text = {};

					text.x = newPageInfo.texts[j].x;
					text.y = newPageInfo.texts[j].y;
					text.ts = newPageInfo.texts[j].R[0].TS;
					text.t = newPageInfo.texts[j].R[0].T;

					text.t = decodeURIComponent(text.t);

					// Override the raw data with the compressed data
					newPageInfo.texts[j] = text;
				}

				pagesArray[i] = newPageInfo;
			}

			let pdfJsonObject = {
				servery: pdfs[i],
				numPages: pagesArray.length,
				pages: pagesArray
			};

			fs.writeFile(MENU_FOLDER + pdfs[i] + ".json", JSON.stringify(pdfJsonObject, null, "\t"), callback)
		});

		pdfParser.loadPDF(MENU_FOLDER + pdfs[i] + ".pdf");
	}
}
