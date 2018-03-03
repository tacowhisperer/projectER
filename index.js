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

    pdfjs.getDocument(url).then((pdf) => {
        console.log("SUCCESSSSS");
        for (var i = 0; i < pdf.pdfInfo.numPages; i++) {
            console.log(i);
        }
    }).catch(
        (e) => console.error(e.message));


}
