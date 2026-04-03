let dragged = null;
let gradientType = "linear";
let currentAngle = 45;
let currentPalette = [];

// Add Color Picker
function addColor(defaultColor="#ff0000"){

    let wrapper = document.createElement("div");
    wrapper.style.display = "inline-block";
    wrapper.style.margin = "5px";
    wrapper.style.position = "relative";

    let input = document.createElement("input");
    input.type = "color";
    input.value = defaultColor;
    input.className = "color-input";
    input.draggable = true;

    input.oninput = generatePalette;

    // REMOVE BUTTON
    let removeBtn = document.createElement("button");
    removeBtn.innerText = "❌";
    removeBtn.style.position = "absolute";
    removeBtn.style.top = "-8px";
    removeBtn.style.right = "-8px";
    removeBtn.style.padding = "2px 5px";
    removeBtn.style.fontSize = "10px";
    removeBtn.style.background = "#022bf7";
    removeBtn.style.color = "white";
    removeBtn.style.border = "none";
    removeBtn.style.borderRadius = "50%";
    removeBtn.style.cursor = "pointer";

    removeBtn.onclick = function(){

        let container = document.getElementById("colorInputs");

        if(container.children.length <= 1){
            alert("At least one color required!");
            return;
        }

        container.removeChild(wrapper);
        generatePalette();
    };

    // DRAG SYSTEM
    input.addEventListener("dragstart", function(e){
        e.dataTransfer.setData("text/plain", null);
        dragged = wrapper;
    });

    wrapper.addEventListener("dragover", function(e){
        e.preventDefault();
    });

    wrapper.addEventListener("drop", function(e){
        e.preventDefault();

        if(dragged !== wrapper){
            let container = document.getElementById("colorInputs");
            let items = Array.from(container.children);
            let draggedIndex = items.indexOf(dragged);
            let targetIndex = items.indexOf(wrapper);

            if(draggedIndex < targetIndex){
                container.insertBefore(dragged, wrapper.nextSibling);
            } else {
                container.insertBefore(dragged, wrapper);
            }

            generatePalette();
        }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);

    document.getElementById("colorInputs").appendChild(wrapper);
}


// Angle Update function
function updateAngle(){ 
    const slider = document.getElementById("angleSlider");

    currentAngle = slider.value;
    document.getElementById("angleValue").innerText = currentAngle + "°";

    generatePalette();
}


// Generate Gradient from ALL colors
function generatePalette(){

    let wrappers = document.querySelectorAll("#colorInputs > div");

	currentPalette = [];

	wrappers.forEach(wrapper=>{
    let input = wrapper.querySelector("input");
    currentPalette.push(input.value);
	});	

    

    let gradient;

    if(gradientType === "linear"){

        gradient = `linear-gradient(${currentAngle}deg, ${currentPalette.join(",")})`;

    } else {

        let shape = document.getElementById("radialShape").value;
		let centerX = document.getElementById("centerX").value;
		let centerY = document.getElementById("centerY").value;

		gradient = `radial-gradient(${shape} at ${centerX}% ${centerY}%, ${currentPalette.join(",")})`;
    }
	
    // Apply preview
    document.getElementById("gradientPreview").style.background = gradient;

    // Update CSS code
    let cssText = `background: ${gradient};`;
    document.getElementById("cssCode").innerText = cssText;
	saveSettings();
	
}
// Save Settings For Gradient
function saveSettings(){

    let type = document.getElementById("gradientType").value;
    let angle = document.getElementById("angleSlider").value;
	
    let wrappers = document.querySelectorAll("#colorInputs > div");
    let colors = [];

    wrappers.forEach(wrapper=>{
        let input = wrapper.querySelector("input");
        colors.push(input.value);
    });

    let settings = {
    type: type,
    angle: angle,
    shape: document.getElementById("radialShape")?.value || "circle",
    colors: colors
};

    localStorage.setItem("gradientSettings", JSON.stringify(settings));
}
// Load Settings function
function loadSettings(){

    let saved = localStorage.getItem("gradientSettings");
    if(!saved) return;

    let settings = JSON.parse(saved);

    // Set gradient type
    gradientType = settings.type;
    document.getElementById("gradientType").value = settings.type;

    // Show radial options if needed
	if(settings.shape){
    document.getElementById("radialShape").value = settings.shape;
	}

    if(gradientType === "radial"){
        document.getElementById("radialOptions").style.display = "block";
    } else {
        document.getElementById("radialOptions").style.display = "none";
    }
	
    // Set angle
    currentAngle = settings.angle;
    let slider = document.getElementById("angleSlider");
    slider.value = settings.angle;

    document.getElementById("angleValue").innerText = settings.angle + "°";

    // Clear old colors
    document.getElementById("colorInputs").innerHTML = "";

    // Add saved colors
    settings.colors.forEach(color=>{
        addColor(color);
    });

    generatePalette();
}


// Update Gradient Function
function updateGradientType(){
    gradientType = document.getElementById("gradientType").value;

    if(gradientType === "radial"){
        document.getElementById("radialOptions").style.display = "block";
		document.getElementById("radialCenterOptions").style.display = "block";
    } else {
        document.getElementById("radialOptions").style.display = "none";
		document.getElementById("radialCenterOptions").style.display = "none";
    }

    generatePalette();
}
// Reverse function
function reverseColors(){

    let container = document.getElementById("colorInputs");
    let items = Array.from(container.children);

    items.reverse().forEach(item=>{
        container.appendChild(item);
    });

    generatePalette();
}


// Save Palette
function savePalette(){

    let name = document.getElementById("paletteName").value;

    if(!name || currentPalette.length === 0){
        alert("Generate palette and enter name");
        return;
    }

    let saved = JSON.parse(localStorage.getItem("palettes")) || [];

    saved.push({
        name:name,
        colors:currentPalette
    });

    localStorage.setItem("palettes", JSON.stringify(saved));

    document.getElementById("paletteName").value="";
    loadPalettes();
}

// Load Saved Palettes
function loadPalettes(){

    let container = document.getElementById("savedPalettes");
    container.innerHTML="";

    let saved = JSON.parse(localStorage.getItem("palettes")) || [];

    saved.forEach((palette,index)=>{

        let box = document.createElement("div");
        box.className="saved-box";

        let title = document.createElement("h4");
        title.innerText = palette.name;

        let colorsDiv = document.createElement("div");
        colorsDiv.className="palette";

        palette.colors.forEach(color=>{
            let c = document.createElement("div");
            c.style.background = color;
            colorsDiv.appendChild(c);
        });

        // Click to reload
        colorsDiv.onclick = function(){

            document.getElementById("colorInputs").innerHTML="";

            palette.colors.forEach(color=>{
                addColor(color);
            });

            generatePalette();
        }

        // Delete
        let del = document.createElement("button");
        del.innerText="Delete";

        del.onclick = function(){
            saved.splice(index,1);
            localStorage.setItem("palettes", JSON.stringify(saved));
            loadPalettes();
        }

        box.appendChild(title);
        box.appendChild(colorsDiv);
        box.appendChild(del);

        container.appendChild(box);
    });
}

function copyCSS(){
    let text = document.getElementById("cssCode").innerText;
    navigator.clipboard.writeText(text);
    alert("CSS Code Copied!");
}

function downloadCSS(){

    let cssCode = document.getElementById("cssCode").innerText;

    let blob = new Blob([`.gradient-preview {\n    ${cssCode}\n}`], 
        { type: "text/css" });

    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "gradient.css";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadPresets(){

    let presets = [
        ["#ff9a9e", "#fad0c4"],
        ["#a18cd1", "#fbc2eb"],
        ["#f6d365", "#fda085"],
        ["#84fab0", "#8fd3f4"],
        ["#fccb90", "#d57eeb"]
    ];

    let gallery = document.getElementById("presetGallery");

    presets.forEach(preset => {

        let box = document.createElement("div");
        box.style.width = "100px";
        box.style.height = "60px";
        box.style.margin = "10px";
        box.style.display = "inline-block";
        box.style.cursor = "pointer";
        box.style.borderRadius = "8px";

        box.style.background = 
            `linear-gradient(45deg, ${preset.join(",")})`;

        box.onclick = function(){

            document.getElementById("colorInputs").innerHTML="";

            preset.forEach(color=>{
                addColor(color);
            });

            generatePalette();
        };

        gallery.appendChild(box);
    });
}
function setDirection(angle){

    currentAngle = angle;

    let slider = document.getElementById("angleSlider");
    slider.value = angle;

    document.getElementById("angleValue").innerText = angle + "°";

    generatePalette();
}

function exportPNG(){

    let canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;

    let ctx = canvas.getContext("2d");

    let gradient;

    if(gradientType === "linear"){

        let angleRad = currentAngle * Math.PI / 180;

        let x = Math.cos(angleRad) * canvas.width;
        let y = Math.sin(angleRad) * canvas.height;

        gradient = ctx.createLinearGradient(
            canvas.width/2 - x/2,
            canvas.height/2 - y/2,
            canvas.width/2 + x/2,
            canvas.height/2 + y/2
        );

    } else {

        let centerX = document.getElementById("centerX").value / 100;
        let centerY = document.getElementById("centerY").value / 100;

        gradient = ctx.createRadialGradient(
            canvas.width * centerX,
            canvas.height * centerY,
            0,
            canvas.width * centerX,
            canvas.height * centerY,
            canvas.width
        );
    }

    currentPalette.forEach((color,index)=>{
        gradient.addColorStop(index/(currentPalette.length-1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    let link = document.createElement("a");
    link.download = "gradient.png";
    link.href = canvas.toDataURL();
    link.click();
}


window.onload = function(){
    loadSettings();
	document.getElementById("angleSlider")
    .addEventListener("input", updateAngle);
	
	document.getElementById("centerX")
    .addEventListener("input", generatePalette);

	document.getElementById("centerY")
    .addEventListener("input", generatePalette);
	loadPresets();
	
    // If nothing saved, add default colors
    if(!localStorage.getItem("gradientSettings")){
        addColor("#ff0000");
        addColor("#0000ff");
        generatePalette();
		
		
    }
}
function deletePalette(id) {
    fetch(`/delete_palette/${id}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                location.reload();
            }
        });
}

function editPalette(id) {
    fetch(`/get_palette/${id}`)
        .then(res => res.json())
        .then(data => {
            loadPaletteIntoBuilder(data);
        });
}

function loadPaletteIntoBuilder(data) {
    // set type
    document.getElementById("gradientType").value = data.gradient_type;
    document.getElementById("angleSlider").value = data.angle;
    document.getElementById("angleValue").innerText = data.angle + "°";

    // clear old colors
    document.getElementById("colorInputs").innerHTML = "";

    data.colors.forEach(color => addColor(color));

    generatePalette();
}



// Saved paltes loaded
loadPalettes();





