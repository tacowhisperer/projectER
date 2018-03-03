const http = require('http');
const pdfjs = require('pdfjs-dist');
const DINING_URL = "http://dining.rice.edu/undergraduate-dining/college-serveries/weekly-menus/";

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

        	getPdfFromURL(pdfUrls.baker);
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

function getPdfFromURL(url) {
    pdfjs.workersrc = url;
    pdfjs.getDocument(url).then(pdf => {
        for (let i = 1; i <= pdf.pdfInfo.numPages; i++) {
       	    const ii = i;

            Promise.all([getPdfPageTextPromise(ii, pdf)]).then(pageTextArray => {
            	console.log("***Page " + ii + "***\n");

            	for (var pageIdx = 0; pageIdx < pageTextArray.length; pageIdx++)
            		console.log(pageTextArray[pageIdx]);

            	console.log("\n***End Page " + ii + "***\n");

            }).catch(e => {
            	console.error("Fatal error reading pages");
            	console.error(e.message);
            });
        }
    }).catch(e => console.error(e.message));


}

/**
 * Retrieves the text of a specif page within a PDF Document obtained through pdf.js 
 * 
 * @param {Integer} pageNum Specifies the number of the page 
 * @param {PDFDocument} PDFDocumentInstance The PDF document obtained 
 *
 * credit: https://jsfiddle.net/ourcodeworld/9s3hpbu2/
 **/
function getPdfPageTextPromise(pageNum, PDFDocumentInstance) {
    // Return a Promise that is solved once the text of the page is retrieven
    return new Promise(function (resolve, reject) {
        PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
            // The main trick to obtain the text of the PDF page, use the getTextContent method
            pdfPage.getTextContent().then(function (textContent) {
                var textItems = textContent.items;
                var finalString = "";

                // Concatenate the string of the item to the final string
                for (var i = 0; i < textItems.length; i++) {
                    var item = textItems[i];
                    const ii = i;

                    finalString += "Text Item #" + ii + ":\n" + item.str + "\n\n";
                }

                // Solve promise with the text retrieven from the page
                resolve(finalString);
            });
        });
    });
}
