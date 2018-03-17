// Get the document element
const docElem = document.documentElement;

// For some reason, Chrome on mobile does not like the viewport tag as given, so we need to adjust it once the DOM has loaded
const requiresViewportSizeOne = isChromeMobile();

// Holds the ratio of the window width that the body div should cover.
const WINDOW_WIDTH_RATIO = 0.55;

// Used for handling the AJAX calls
let apiSamples = [];
let apiSampleIdx = 0;
let firstResize = true;
let prevWindowWidth = 0;

// Holds the animator that handles all of the animation processes
const navbarAnimator = new SimpleCSSAnimator();
const ANIMATION_DURATION = 250;

/**
 * This code executes once the DOM has fully loaded. It performs the necessary setups and handling to have an impactful
 * but responsive homepage.
 */
window.addEventListener("load", () => {
	// Resize the viewport for mobile navigators that require it for a better viewing experience.
	adjustMobileViewport();

	// Adds the navigation functionality to the navbar button and positions it dynamically on the page.
	installNavbarButtonFunctionality();

	// Add the current page url to the descriptor on the Getting Started section
	document.getElementById("thisurl").appendChild(document.createTextNode(document.URL.replace(/#.*$/, "")));

	// Populate the body div with extra content.
	loadAsynchronousContent(document.getElementById("bodydiv"));
});

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
	/**
	 * First we get the elements that we need from the DOM.
	 */
	const welcomeMsg = document.getElementById("welcomemsg");
	const navbarDiv = document.getElementById("navbardiv");
	const navbar = document.getElementById("navbar");
	const navbarMenuDiv = document.getElementById("navbarmenudiv");
	const navbarMenu = document.getElementById("navbarmenu");

	// Define the size of the navbar button
	let navbarRect = navbar.getBoundingClientRect();
	const navbarWidth = navbarRect.width;
	const navbarHeight = navbarRect.height;

	/**
	 * Here we are adding all of the icon lines to the navbar button DOM element.
	 */
	// Define the constants associated with the icon lines that will go on the navbar button.
	const NUM_ICON_LINES = 3;
	const ICON_LINE_HEIGHT = 2;
	const ICON_LINE_WIDTH = 0.4 * navbarWidth;
	const COMPRESSION = 2;
	const NUM_DIVISIONS = COMPRESSION * (NUM_ICON_LINES + 1);
	const ROTATION = 0;

	// Add the necessary attributes and dimensions to make them look good.
	const iconlineAttr = "iconline";
	const iconLines = [];
	for (let i = 1; i <= NUM_ICON_LINES; i++) {
		let iconLine = document.createElement("div");

		iconLine.classList.add(iconlineAttr);
		iconLine.id = iconlineAttr + i;
		iconLine.style.height = ICON_LINE_HEIGHT + "px";

		// Calculate the icon line's position on the navbar button
		iconLine.style.top = ((i + NUM_DIVISIONS / 4) * navbarHeight / NUM_DIVISIONS - Math.floor(ICON_LINE_HEIGHT / 2)) + "px";
		iconLine.style.width = ICON_LINE_WIDTH + "px";
		iconLine.style.left = ((navbarWidth - ICON_LINE_WIDTH) / 2) + "px";

		// Add the new element to the array of elements being created
		iconLines.push(iconLine);

		// Add the new element to the navbar
		navbar.appendChild(iconLine);
	}

	/**
	 * Here we are adding the necessary menu elements that will pop up when the navbar button is clicked.
	 */
	// Set the initial sizes an constraints for the navbar menu
	const MENU_WIDTH_RATIO = 0.25;
	const SMALLEST_ACCEPTABLE_MENU_WIDTH = 330;
	navbarMenuDiv.style.width = Math.max((MENU_WIDTH_RATIO + (docElem.clientWidth > window.innerHeight ? 0 : (1 - docElem.clientWidth / window.innerHeight) * (1 - MENU_WIDTH_RATIO))) * docElem.clientWidth, SMALLEST_ACCEPTABLE_MENU_WIDTH) + "px";

	// Dynamically resize the navbar menu so that it fits in screens of all sizes
	window.addEventListener("resize", () => {
		// If the new window height change is significant, update the window height value used for calculating the body width
		let resizeNavbarMenu = firstResize || prevWindowWidth != docElem.clientWidth;
		let welcomeBottom = welcomeMsg.getBoundingClientRect().bottom;

		// Make sure that the width of the navbar menu looks good
		if (resizeNavbarMenu) {
			navbarMenuDiv.style.width = Math.max((MENU_WIDTH_RATIO + (docElem.clientWidth > window.innerHeight ? 0 : (1 - docElem.clientWidth / window.innerHeight) * (1 - MENU_WIDTH_RATIO))) * docElem.clientWidth, SMALLEST_ACCEPTABLE_MENU_WIDTH) + "px";
		}

		// Make sure that the navbar menu fits on the screen
		navbarMenuDiv.style.height = Math.min(window.innerHeight, window.innerHeight - welcomeBottom) + "px";
	});

	/**
	 * Here we are defining the animations that will take place when the navbar button is clicked.
	 */
	// Holds the animations that will animate the different parts of the navbar button.
	let forwardNavbarIconLineInterruptableAnimations = [];
	let backwardNavbarIconLineInterruptableAnimations = [];

	for (let i = 0; i < NUM_ICON_LINES; i++) {
		// The first icon line will become the downward diagonal
		if (i == 0) {
			forwardNavbarIconLineInterruptableAnimations.push([{
				targetElement: iconLines[i],
				css: "transform",
				cssFormatString: "translateY(%dpx) rotate(%ddeg)",
				startValues: [0, 0], // dynamic
				endValues: [navbarHeight / 2 - +iconLines[i].style.top.replace(/\D+$/, ""), 45 + ROTATION],
				duration: ANIMATION_DURATION / 2
			}]);

			backwardNavbarIconLineInterruptableAnimations.push([{
				targetElement: iconLines[i],
				css: "transform",
				cssFormatString: "translateY(%dpx) rotate(%ddeg)",
				startValues: [navbarHeight / 2 - +iconLines[i].style.top.replace(/\D+$/, ""), 45 + ROTATION], // dynamic
				endValues: [0, 0],
				duration: ANIMATION_DURATION / 2
			}]);
		}

		// The last icon line will become the upward diagonal
		else if (i == NUM_ICON_LINES - 1) {
			forwardNavbarIconLineInterruptableAnimations.push([{
				targetElement: iconLines[i],
				css: "transform",
				cssFormatString: "translateY(%dpx) rotate(%ddeg)",
				startValues: [0, 0], // dynamic
				endValues: [navbarHeight / 2 - +iconLines[i].style.top.replace(/\D+$/, ""), -45 - ROTATION],
				duration: ANIMATION_DURATION / 2
			}]);

			backwardNavbarIconLineInterruptableAnimations.push([{
				targetElement: iconLines[i],
				css: "transform",
				cssFormatString: "translateY(%dpx) rotate(%ddeg)",
				startValues: [navbarHeight / 2 - +iconLines[i].style.top.replace(/\D+$/, ""), -45 - ROTATION], // dynamic
				endValues: [0, 0],
				duration: ANIMATION_DURATION / 2
			}]);
		}

		// All other icons shrink in size and opacity
		else {
			forwardNavbarIconLineInterruptableAnimations.push([{
				targetElement: iconLines[i],
				css: "opacity",
				cssFormatString: "%d",
				startValues: [1], // dynamic
				endValues: [0],
				duration: ANIMATION_DURATION / 2
			}, {
				targetElement: iconLines[i],
				css: "width",
				cssFormatString: "%dpx",
				startValues: [ICON_LINE_WIDTH], // dynamic
				endValues: [0],
				duration: ANIMATION_DURATION / 2
			}, {
				targetElement: iconLines[i],
				css: "left",
				cssFormatString: "%dpx",
				startValues: [(navbarWidth - ICON_LINE_WIDTH) / 2], // dynamic
				endValues: [navbarWidth / 2],
				duration: ANIMATION_DURATION / 2
			}]);

			backwardNavbarIconLineInterruptableAnimations.push([{
				targetElement: iconLines[i],
				css: "opacity",
				cssFormatString: "%d",
				startValues: [0], // dynamic
				endValues: [1],
				duration: ANIMATION_DURATION / 2
			}, {
				targetElement: iconLines[i],
				css: "width",
				cssFormatString: "%dpx",
				startValues: [0], // dynamic
				endValues: [ICON_LINE_WIDTH],
				duration: ANIMATION_DURATION / 2
			}, {
				targetElement: iconLines[i],
				css: "left",
				cssFormatString: "%dpx",
				startValues: [navbarWidth / 2], // dynamic
				endValues: [(navbarWidth - ICON_LINE_WIDTH) / 2],
				duration: ANIMATION_DURATION / 2
			}]);
		}
	}

	// Holds the animations that will animate the navbar menu.
	let forwardNavbarMenuInterruptableAnimations = [{
		targetElement: navbarMenuDiv,
		css: "opacity",
		cssFormatString: "%d",
		startValues: [0], // dynamic
		endValues: [1],
		onAnimationStart: () => navbarMenuDiv.style.display = "inline-block",
		duration: ANIMATION_DURATION
	}];
	
	let backwardNavbarMenuInterruptableAnimations = [{
		targetElement: navbarMenuDiv,
		css: "opacity",
		cssFormatString: "%d",
		startValues: [1], // dynamic
		endValues: [0],
		onAnimationEnd: () => navbarMenuDiv.style.display = "none",
		duration: ANIMATION_DURATION
	}];

	const MOUSE_1 = 1;

	let navbarActive = false;
	let mousedownTarget = null;
	document.addEventListener("mousedown", e => mousedownTarget = e.which == MOUSE_1 ? e.target : null);
	document.addEventListener("mouseup", e => {
		if (navbarActive && e.which == MOUSE_1 && (e.clientX > navbarMenuDiv.getBoundingClientRect().width || e.clientY < welcomeMsg.getBoundingClientRect().bottom))
			toggleMenu();
	});

	navbar.addEventListener("mouseup", e => {
		if (Object.is(mousedownTarget, e.target) && e.which == MOUSE_1)
			toggleMenu();		
	});

	/**
	 * Here we are doing the necessary setup to position the navbar button to be permanently on the screen,
	 * but in a cool way.
	 */
	// Holds the amount of space between the welcome message h1 header and the navbar div.
	const offset = navbarDiv.getBoundingClientRect().top - welcomeMsg.getBoundingClientRect().bottom;

	// Positions the navbar so that it scrolls with the welcome message until it goes offscreen, then stays in the viewport.
	window.addEventListener("scroll", () => {
		let welcomeBottom = welcomeMsg.getBoundingClientRect().bottom;

		// Positions the navbar button so that it's always on the screen
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

		// Positions the navbar menu so that it fits flush under the welcome message (or the top of the screen).
		navbarMenuDiv.style.top = Math.max(welcomeBottom, 0) + "px";

		// Re-adjusts the height of thet navbar menu so that it fits
		navbarMenuDiv.style.height = Math.min(window.innerHeight, window.innerHeight - welcomeBottom) + "px";
	});

	// Fire a scroll event so that the navbar element is correctly positioned on initialization.
	window.dispatchEvent(new Event("scroll"));

	function toggleMenu() {
		// First stop the animator of all animations that may be in play.
		navbarAnimator.removeAll();

		// The button was just fully clicked, so change its active state and perform the appropriate actions.	
		navbarActive = !navbarActive;

		// Animtes the icon lines on the navbar button.
		animateNavbarButton();

		if (navbarActive) {
			for (let i = 0; i < forwardNavbarMenuInterruptableAnimations.length; i++) {
				let animation = forwardNavbarMenuInterruptableAnimations[i];

				if (i == 0) {
					let startOpacity = navbarMenuDiv.style.opacity;
					startOpacity = startOpacity === "" ? 0 : startOpacity;

					animation.startValues = [startOpacity];

					navbarAnimator.animate(animation);
				}
			}
		}

		else {
			for (let i = 0; i < backwardNavbarMenuInterruptableAnimations.length; i++) {
				let animation = backwardNavbarMenuInterruptableAnimations[i];

				if (i == 0) {
					let startOpacity = navbarMenuDiv.style.opacity;
					startOpacity = startOpacity === "" ? 1 : startOpacity;

					animation.startValues = [startOpacity];

					navbarAnimator.animate(animation);
				}
			}
		}
	}

	function animateNavbarButton() {
		if (navbarActive) {
			// Animate the navbar icon lines forward (to the "X" state).
			for (let i = 0; i < forwardNavbarIconLineInterruptableAnimations.length; i++) {
				let animations = forwardNavbarIconLineInterruptableAnimations[i];

				// The first icon line will become the downward diagonal
				if (i == 0) {
					let iconLine = animations[0].targetElement;
					let currentTransform = iconLine.style.transform;

					if (currentTransform === "") {
						iconLine.style.transform = "translateY(0px) rotate(0deg)";
						currentTransform = iconLine.style.transform;
					}

					animations[0].startValues = getTransformValues(currentTransform);
					navbarAnimator.animate(animations[0]);
				}

				// The last icon line will become the upward diagonal
				else if (i == NUM_ICON_LINES - 1) {
					let iconLine = animations[0].targetElement;
					let currentTransform = iconLine.style.transform;

					if (currentTransform === "") {
						iconLine.style.transform = "translateY(0px) rotate(0deg)";
						currentTransform = iconLine.style.transform;
					}

					animations[0].startValues = getTransformValues(currentTransform);
					navbarAnimator.animate(animations[0]);
				}

				// All other icons shrink in size and opacity
				else {
					let iconLine = animations[0].targetElement;
					let currentOpacity = iconLine.style.opacity;
					if (currentOpacity === "")
						currentOpacity = 1;
					else
						currentOpacity = +currentOpacity;

					let currentWidth = +iconLine.style.width.replace(/\s*\D*$/, "");
					let currentLeft = +iconLine.style.left.replace(/\s*\D*$/, "");

					// Update the dynamic values of the animation object so that interruptions are smooth.
					animations[0].startValues = [currentOpacity];
					animations[1].startValues = [currentWidth];
					animations[2].startValues = [currentLeft];

					// Add the animations to the animator
					for (let j = 0; j < animations.length; j++)
						navbarAnimator.animate(animations[j]);
				}
			}
		}

		else {
			// Animate the navbar icons backward (to the horizontal state).
			for (let i = 0; i < backwardNavbarIconLineInterruptableAnimations.length; i++) {
				let animations = backwardNavbarIconLineInterruptableAnimations[i];

				// The first icon line will become the downward diagonal
				// The first icon line will become the downward diagonal
				if (i == 0) {
					let iconLine = animations[0].targetElement;
					let currentTransform = iconLine.style.transform;

					if (currentTransform === "") {
						iconLine.style.transform = "translateY(0px) rotate(0deg)";
						currentTransform = iconLine.style.transform;
					}

					animations[0].startValues = getTransformValues(currentTransform);
					navbarAnimator.animate(animations[0]);
				}

				// The last icon line will become the upward diagonal
				else if (i == NUM_ICON_LINES - 1) {
					let iconLine = animations[0].targetElement;
					let currentTransform = iconLine.style.transform;

					if (currentTransform === "") {
						iconLine.style.transform = "translateY(0px) rotate(0deg)";
						currentTransform = iconLine.style.transform;
					}

					animations[0].startValues = getTransformValues(currentTransform);
					navbarAnimator.animate(animations[0]);
				}

				// All other icons shrink in size and opacity
				else {
					let iconLine = animations[0].targetElement;
					let currentOpacity = iconLine.style.opacity;
					if (currentOpacity === "")
						currentOpacity = 1;
					else
						currentOpacity = +currentOpacity;

					let currentWidth = +iconLine.style.width.replace(/\s*\D*$/, "");
					let currentLeft = +iconLine.style.left.replace(/\s*\D*$/, "");

					// Update the dynamic values of the animation object so that interruptions are smooth.
					animations[0].startValues = [currentOpacity];
					animations[1].startValues = [currentWidth];
					animations[2].startValues = [currentLeft];

					// Add the animations to the animator
					for (let j = 0; j < animations.length; j++)
						navbarAnimator.animate(animations[j]);
				}
			}
		}
	}

	// Extract the values from the transform css
	function getTransformValues(transformCSS) {
		return transformCSS
			// Split by spaces
			.match(/\S+\)/g)

			// Remove transformation function names
			.map(prop => prop.replace(/^[^(]+/, ""))

			// Remove parenthesis and unit strings
			.map(prop => prop.replace(/\(|\)|\D+$/g, ""))

			// Cast the strings to numbers
			.map(prop => +prop);
	}
}

function SimpleCSSAnimator() {
	// Holds the latest animation ID value
	let I = 0;

	let animations = {};

	// Holds the requestAnimationFrame ID to cancel it later. Is false if the loop is not running.
	var eventLoopID = false;

	function eventLoop() {
		let tCurr = new Date().getTime();
		let numAnimations = 0;

		for (let animationID in animations) {
			numAnimations++;
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
		for (let i = 0; i < keysToRemove.length; i++) {
			let animationID = keysToRemove[i];

			// Call the onAnimationEnd function
			animations[animationID].onAnimationEnd();

			delete animations[keysToRemove[i]];
		}

		if (numAnimations > 0)
			eventLoopID = requestAnimationFrame(eventLoop);
		else
			eventLoopID = false;
	}

	this.animate = function(options) {
		const animationID = I++;

		let animationStartTime = new Date().getTime();
		let animationPauseTime = animationStartTime;

		let transformationFunction = options.transformationFunc ? options.transformationFunc : x => x;
		let animationStartFunc = options.onAnimationStart ? options.onAnimationStart : () => {};
		let animationEndFunc = options.onAnimationEnd ? options.onAnimationEnd : () => {};

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
			// onAnimationStart: animationStartFunc,
			onAnimationEnd: animationEndFunc,
			transformationFunc: transformationFunction
		};

		animations[animationID] = animation;

		// Restart the animation loop if it had been stopped due to lack of animations.
		if (!eventLoopID)
			eventLoopID = eventLoop();

		// Call the onAnimationStat function
		animationStartFunc();

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

		if (!eventLoopID)
			eventLoopID = eventLoop();

		return this;
	};

	this.removeAnimation = function(animationID) {
		if (animations[animationID])
			delete animations[animationID];

		return this;
	};

	this.removeAll = function() {
		for (let animationID in animations)
			delete animations[animationID];

		return this;
	}

	this.pauseAll = function() {
		for (let animationID in animations)
			this.pauseAnimation(animationID);

		cancelAnimationFrame(eventLoopID);
		eventLoopID = false;

		return this;
	};

	this.continueAll = function() {
		for (let animationID in animations)
			this.playAnimation(animationID);

		if (!eventLoopID)
			eventLoopID = eventLoop();

		return this;
	};

	// Returns a deep copy of the internal state of the animations at the time of calling.
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
