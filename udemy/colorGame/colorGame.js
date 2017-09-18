var numSquares = 6;
var colors = generateRandomColors(numSquares);
var squares = document.querySelectorAll(".square");
var pickedColor = pickColor();
var colorDisplay = document.getElementById("colorDisplay");
var messageDisplay = document.querySelector("#message");
var h1 = document.querySelector("h1");
var resetButton = document.querySelector("#resetButton");
var modeButtons = document.querySelectorAll(".mode")

//var easyButton = document.querySelector("#easyButton")
//var hardButton = document.querySelector("#hardButton")

for(var i = 0; i < modeButtons.length; i++){
	modeButtons[i].addEventListener("click", function() {
		modeButtons[0].classList.remove("selected")	;
		modeButtons[1].classList.remove("selected")	;
		this.classList.add("selected");
		
		this.textContent === "Easy" ? numSquares = 3: numSquares = 6;
		reset();
	});
}

function reset() {
	colors = generateRandomColors(numSquares);
	pickedColor = pickColor();
	colorDisplay.textContent = pickedColor;
	messageDisplay.textContent = "";
	resetButton.textContent = "New Colors"
	//change colos squares
	for (var i = 0; i < squares.length; i++) {
		// add initial colors to squares
		if(colors[i]){
			squares[i].style.backgroundColor = colors[i];
			squares[i].style.display = "block";
		} else {
		squares[i].style.display = "none";
	}
	}
	h1.style.backgroundColor = "steelblue";
};

// // easy Button set 3 squares
// easyButton.addEventListener("click", function() {
// 	easyButton.classList.add("selected");
// 	hardButton.classList.remove("selected");
// 	numSquares = 3;
// 		resetButton(numSquares);
// });

// // easy Button set 6 squares
// hardButton.addEventListener("click", function() {
// 	easyButton.classList.remove("selected");
// 	hardButton.classList.add("selected");
// 	numSquares = 6;
// 		resetButton(numSquares);
// });

resetButton.addEventListener("click", function() {
	reset();
	// //Picking new colors from button
	// colors = generateRandomColors(numSquares);
	// pickedColor = pickColor();
	// colorDisplay.textContent = pickedColor;
	// messageDisplay.textContent = "";
	// resetButton.textContent = "New Colors"
	// //change colos squares
	// for (var i = 0; i < squares.length; i++) {
	// 	// add initial colors to squares
	// 	if(colors[i]){
	// 		squares[i].style.backgroundColor = colors[i];
	// 		squares[i].style.display = "block";
	// 	} else {
	// 	squares[i].style.display = "none";
	// }
	// }
	// h1.style.backgroundColor = "steelblue";
});

colorDisplay.textContent = pickedColor;

//add initial colors to squares
for (var i = 0; i < squares.length; i++) {
	squares[i].style.backgroundColor = colors[i];

	//add click listeners to squares
	squares[i].addEventListener("click", function() {
		//grab color of clicked squares
		var clickedColor = this.style.backgroundColor;
		//compare color to pickedColor
		console.log(clickedColor, pickedColor)
		if (clickedColor === pickedColor) {
			messageDisplay.textContent = "Correct!";
			resetButton.textContent = "Play Again?"
			changeColors(clickedColor);
			h1.style.backgroundColor = clickedColor;
		}
		else {
			this.style.backgroundColor = "#232323";
			messageDisplay.textContent = "Try Again";
			resetButton.textContent = "Reset Colors?"
		}
	});
}

function changeColors(color) {
	//loop through all squares
	for (var i = 0; i < squares.length; i++) {
		//change each color to match given color
		squares[i].style.backgroundColor = color;
	}
}

function pickColor() {
	var random = Math.floor(Math.random() * colors.length);
	return colors[random];
}

function generateRandomColors(num) {
	//make an array
	var arr = [];
	//add num random colors to arr
	for (var i = 0; i < num; i++) {
		//get random color and push into arr
		arr.push(randomColor());
	}
	//return that array
	return arr;
}

function randomColor() {
	//pick a "red" from 0 - 255
	var r = Math.floor(Math.random() * 256);
	//pick a "green" from 0 - 255
	var g = Math.floor(Math.random() * 256);
	//pick a "blue" from 0 - 255
	var b = Math.floor(Math.random() * 256);
	return "rgb(" + r + ", " + g + ", " + b + ")";
}
