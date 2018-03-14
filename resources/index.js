// Get the document element
const docElem = document.documentElement;

// For some reason, Chrome on mobile does not like the viewport tag as given, so we need to adjust it once the DOM has loaded
const requiresViewportSizeOne = isChromeMobile();

const WINDOW_WIDTH_RATIO = 0.55;

let apiSamples = [];
let apiSampleIdx = 0;
let firstResize = true;
let prevWindowWidth = 0;

window.onload = () => {
	// Resize the viewport for mobile navigators that require it for a better viewing experience.
	adjustMobileViewport();

	// Adds the navigation functionality to the navbar button and positions it dynamically on the page.
	// installNavbarButtonFunctionality();

	// Add the current page url to the descriptor on the Getting Started section
	document.getElementById("thisurl").appendChild(document.createTextNode(document.URL.replace(/#.*$/, "")));

	// Populate the body div with extra content.
	loadAsynchronousContent(document.getElementById("bodydiv"));
};

function loadJsonExampleText(htmlPath, tE) {
	// Get the location that this example is registered on in the apiSamples array.
	const targetIdx = apiSampleIdx++;
	const targetElement = tE;

	// Register the new entry in the apiSamples array.
	apiSamples[targetIdx] = null;

	let xhttp = createAjaxCall(htmlPath, responseText => {
		// Create the new element to be appended to the target element
		let newElement = document.createElement("p");

		// Set the element's attributes
		newElement.innerHTML = responseText;

		// Append it to the end of the target element.
		while (newElement.firstChild)
			targetElement.appendChild(newElement.firstChild);

		apiSamples[targetIdx] = targetElement.lastChild;
	}, status => console.error("Request for '" + htmlPath + "' failed with status " + status));

	// Delaying sending the request allows the finish function a chance to detect that a new entry has been added.
	setTimeout(() => xhttp.send(), 16);
}

function createAjaxCall(requestPath, successCallback, failCallback) {
	let xhttp = new XMLHttpRequest();

	xhttp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200)
			successCallback(this.responseText);

		else if (this.readyState == 4)
			failCallback(this.status);
	};

	xhttp.open("GET", requestPath, true);

	return xhttp;
}

function finish(callback) {
	let ready = apiSamples.length;
	for (let i = 0; i < apiSamples.length; i++) {
		if (apiSamples[i] == null || apiSamples[i] == undefined) {
			ready = false;
			break;
		}
	}

	if (ready) 
		callback();
	else
		setTimeout(finish, 1, callback);
}

function isChromeMobile() {
	let isChromium = window.chrome;
	let winNav = window.navigator;
	let vendorName = winNav.vendor;
	let isOpera = winNav.userAgent.indexOf("OPR") > -1;
	let isIEedge = winNav.userAgent.indexOf("Edge") > -1;
	let isIOSChrome = winNav.userAgent.match("CriOS");

	return !isIOSChrome &&
		isChromium !== null &&
		typeof isChromium != 'undefined' &&
		vendorName === "Google Inc." &&
		isOpera === false &&
		isIEedge === false;
}

function adjustMobileViewport() {
	if (requiresViewportSizeOne) {
		let viewport = document.getElementById("viewport");
		let oldViewportContent = viewport.getAttribute("content");

		viewport.setAttribute("content", oldViewportContent.replace(/0\.\d+/g, "1"));
	}
}

function loadAsynchronousContent(bodyDiv) {
	// Attach the example JSON to the /WeeklyMenu list entry
	loadJsonExampleText("resources/weeklymenu.html", document.getElementById("weeklymenuapi"));

	// Attach the example JSON to the /Today list entry
	loadJsonExampleText("resources/todaymenu.html", document.getElementById("todaymenuapi"));

	// Attach the example JSON to the /Baker, /North, /Seibel, /SidRich/ South, and /West list entry
	loadJsonExampleText("resources/locationmenu.html", document.getElementById("locationmenuapi"));

	// Add the date since the last time the server updated
	let lastUpdateRequest = createAjaxCall("/LastUpdate", lastUpdateText => {
		// Create the new element to be appended to the target element
		let newElement = document.createElement("p");

		// Set the ID tag so that the CSS may style it.
		newElement.id = "lastupdateapi";

		// Create the node that holds the text
		let newElementText = document.createTextNode(lastUpdateText);

		newElement.appendChild(newElementText);

		// The target element in this case is the bodyDiv element
		let targetElement = document.getElementById("bodydiv");

		// Append it to the end of the target element.
		targetElement.appendChild(newElement);
	}, status => console.error("Request for '/LastUpdate' failed with status " + status));
	lastUpdateRequest.send();

	// Wait until all async JSON example requests have completed to commence resizing handlers
	finish(() => {
		let examples = document.getElementsByClassName("jsontextbox");

		// Handle the elements that require dynamic resizing.
		window.addEventListener("resize", () => {
			// If the new window height change is significant, update the window height value used for calculating the body width
			let resizeBodyDiv = firstResize || prevWindowWidth != docElem.clientWidth;

			// Make sure that the main text of the body looks good
			if (resizeBodyDiv) {
				bodyDiv.style.width = ((WINDOW_WIDTH_RATIO + (docElem.clientWidth > window.innerHeight ? 0 : (1 - docElem.clientWidth / window.innerHeight) * (1 - WINDOW_WIDTH_RATIO))) * docElem.clientWidth) + "px";

				firstResize = false;
				prevWindowWidth = docElem.clientWidth;
			}

			// Resize the API example text boxes
			for (let i = 0; i < examples.length; i++) {
				let apiSample = examples[i];
				let apiSampleRect = apiSample.getBoundingClientRect();

				apiSample.style.width = docElem.clientWidth - 2 * apiSampleRect.x + "px";
			}
		});

		// Fire a resize event so that the elements are sized correctly upon initiation
		window.dispatchEvent(new Event("resize"));
	});
}

function installNavbarButtonFunctionality() {
	let welcomeMsg = document.getElementById("welcomemsg");
	let navbarDiv = document.getElementById("navbardiv");

	// Holds the amount of space between the welcome message h1 header and the navbar div.
	const offset = navbarDiv.getBoundingClientRect().top - welcomeMsg.getBoundingClientRect().bottom;

	// Positions the navbar so that it scrolls with the welcome message until it goes offscreen, then stays in the viewport.
	window.addEventListener("scroll", () => {
		let welcomeBottom = welcomeMsg.getBoundingClientRect().bottom;

		if (welcomeBottom < 0) {
			navbarDiv.style.position = "fixed";
			navbarDiv.style.top = "1.5em";
			navbarDiv.style.bottom = null;
		}

		else if (welcomeBottom + offset >= 0) {
			navbarDiv.style.position = "absolute";
			navbarDiv.style.top = null;
			navbarDiv.style.bottom = "-4.5em";
		}
	});

	// Fire a scroll event so that the navbar element is correctly positioned on initialization.
	window.dispatchEvent(new Event("scroll"));
}

function SimpleCSSAnimator() {
	// Holds the latest animation ID value
	let I = 0;

	let animations = {};

	// Holds the requestAnimationFrame ID to cancel it later.
	var eventLoopID;
	eventLoop();

	function eventLoop() {
		let tCurr = new Date().getTime();

		for (let animationID in animations) {
			let animation = animations[animationID];

			if (animation.active) {
				if (animation.waspaused) {
					// Offset does not go away, it only grows the more it's paused
					animation.tOffset += tCurr - animation.animationPauseTime;
					animation.waspaused = false;
				}

				let tOffset = animation.tOffset;

				// First calculate the timesteps.
				let tStart = animation.animationStartTime + tOffset;
				let tEnd = animation.animationStartTime + animation.duration + tOffset;

				// Define the transformation function for the percentage
				let f = animation.transformationFunc;

				// Then convert the timesteps into percentages of an animation
				let pTemp = f((tCurr - tStart) / (tEnd - tStart));

				// Ensure that p doesn't go above 1 or below 0.
				let p = pTemp > 1 ? 1 : pTemp < 0 ? 0 : pTemp;
				let q = 1 - p;
				
				// console.log(JSON.stringify([tOffset, tStart, tEnd, p, q]));

				// Interpolate the values.
				let values = [];
				animation.startValues.map((sVal, i) => {
					let eVal = animation.endValues[i];

					values[i] = q * sVal + p * eVal;

					return sVal;
				});

				// Set the values in the target DOM element
				let targetElement = animation.targetElement;
				let css = animation.targetCssProperty;
				targetElement.style[css] = outputFmtCss(animation.cssFmtStr, values);

				// If p = 1, then the animation is finished
				if (p == 1)
					animation.finished = true;
			}
		}

		// Remove any finished animations.
		let keysToRemove = Object.keys(animations).filter(id => animations[id].finished);
		for (let i = 0; i < keysToRemove.length; i++)
			delete animations[keysToRemove[i]];

		eventLoopID = requestAnimationFrame(eventLoop);
	}

	this.animate = function(options) {
		const animationID = I++;

		let animationStartTime = new Date().getTime();
		let animationPauseTime = animationStartTime;

		let transformationFunction = options.transformationFunc ? options.transformationFunc : x => x;

		let animation = {
			active: true,
			waspaused: false,
			tOffset: 0,
			finished: false,
			animationStartTime: animationStartTime,
			animationPauseTime: animationPauseTime,
			targetElement: options.targetElement,
			targetCssProperty: options.css,
			cssFmtStr: options.cssFormatString,
			startValues: options.startValues,
			endValues: options.endValues,
			duration: options.duration,
			transformationFunc: transformationFunction
		};

		animations[animationID] = animation;

		return animationID;
	};

	this.pauseAnimation = function(animationID) {
		if (animations[animationID]) {
			let animation = animations[animationID];

			animation.active = false;
			animation.waspaused = true;
			animation.animationPauseTime = new Date().getTime();
		}

		return this;
	};

	this.playAnimation = function(animationID) {
		if (animations[animationID]) {
			let animation = animations[animationID];

			animation.active = true;
		}

		return this;
	};

	this.removeAnimation = function(animationID) {
		if (animations[animationID])
			delete animations[animationID];

		return this;
	};

	this.pauseAll = function() {
		for (let animationID in animations)
			this.pauseAnimation(animationID);

		cancelAnimationFrame(eventLoopID);

		return this;
	};

	this.continueAll = function() {
		for (let animationID in animations)
			this.playAnimation(animationID);

		eventLoopID = eventLoop();

		return this;
	};

	this.animations = function() {
		return JSON.parse(JSON.stringify(animations));
	};

	// Functions exactly like C-string formatting.
	function outputFmtCss(cssFmtStr, interpolationValues) {
		let outputStr = cssFmtStr;
		let i = -1;
		let value;

		while (typeof(value = interpolationValues[++i]) == 'number')
			outputStr = outputStr.replace(/%d/, value);

		return outputStr;
	}
}
