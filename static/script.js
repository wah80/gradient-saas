let currentAngle = 45;
let currentPalette = [];
let editingPaletteId = null;
let fadeTimeout;

window.onerror = function(msg, url, line){
    console.error("JS ERROR:", msg, "at", line);
};

// Add Color Picker
function addColor(defaultColor="#ff0240"){

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
	
	const preview = document.getElementById("gradientPreview");
    if (!preview) return;

    preview.style.opacity = 0;

    let wrappers = document.querySelectorAll("#colorInputs > div");

	currentPalette = [];

	wrappers.forEach(wrapper=>{
    let input = wrapper.querySelector("input");
    currentPalette.push(input.value);
	});	

    
    setTimeout(() => {

    let gradient;

    if(gradientType === "linear"){

        gradient = `linear-gradient(${currentAngle}deg, ${currentPalette.join(",")})`;

    } else {

        let shape = document.getElementById("radialShape").value;
		let centerX = document.getElementById("centerX").value;
		let centerY = document.getElementById("centerY").value;

		gradient = `radial-gradient(${shape} at ${centerX}% ${centerY}%, ${currentPalette.join(",")})`;
    }
		
        // 🔥 Fade back in
        preview.style.opacity = 1;

    

    // Apply preview
    document.getElementById("gradientPreview").style.background = gradient;

    // Update CSS code
    let cssText = `background: ${gradient};`;
    document.getElementById("cssCode").innerText = cssText;
	if (!editingPaletteId) {
    saveSettings();
}
	}, 150); // half of transition time
}	
// Save Settings For Gradient
function saveSettings(){

    const gradientTypeEl = document.getElementById("gradientType");
    const angleSliderEl = document.getElementById("angleSlider");
    const colorInputsEl = document.getElementById("colorInputs");

    // If not on gradient page, exit safely
    if (!gradientTypeEl || !angleSliderEl || !colorInputsEl) {
        return;
    }

    let type = gradientTypeEl.value;
    let angle = angleSliderEl.value;

    let wrappers = document.querySelectorAll("#colorInputs > div");
    let colors = [];

    wrappers.forEach(wrapper=>{
        let input = wrapper.querySelector("input");
        if (input) {
            colors.push(input.value);
        }
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

    const typeEl = document.getElementById("gradientType");
    if (!typeEl) return;

    gradientType = typeEl.value;

    const radialOptions = document.getElementById("radialOptions");
    const radialCenter = document.getElementById("radialCenterOptions");

    if(gradientType === "radial"){
        radialOptions && (radialOptions.style.display = "block");
        radialCenter && (radialCenter.style.display = "block");
    } else {
        radialOptions && (radialOptions.style.display = "none");
        radialCenter && (radialCenter.style.display = "none");
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
function savePalette() {

    let name = document.getElementById("paletteName").value.trim();

    if (!name || currentPalette.length === 0) {
        showToast("Generate palette and enter name", "danger");
        return;
    }

    let data = {
        name: name,
        gradient_type: gradientType,
        angle: currentAngle,
        radial_shape: document.getElementById("radialShape").value,
        center_x: document.getElementById("centerX").value,
        center_y: document.getElementById("centerY").value,
        colors: currentPalette,
		public: document.getElementById("makePublic").checked
    };

    // 🔥 Decide endpoint dynamically
    let url = editingPaletteId
    ? `/update_palette/${editingPaletteId}`
    : "/save_palette";

fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
    },
    body: JSON.stringify(data)
})

.then(async res => {

    let responseData;

    try {
        responseData = await res.json();
    } catch (e) {
        responseData = { status: "error", message: "Server returned invalid response" };
    }

    return {
        status: res.status,
        body: responseData
    };
})

.then(response => {

    // 🔒 PRO FEATURE BLOCKED
    if (response.status === 403) {

        showUpgradePopup()
        return;
    }

    if (response.body.status === "success") {

        showToast(
            editingPaletteId
                ? "Palette updated successfully!"
                : "Palette saved successfully!",
            "success"
        );

        editingPaletteId = null;

        setTimeout(() => location.reload(), 800);

    } else {

        showToast(response.body.message || "Something went wrong", "danger");

    }

})

.catch(err => {
    console.error(err);
    showToast("Something went wrong", "danger");
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

    currentPalette.forEach((color, index) => {
    let stop = currentPalette.length === 1
        ? 0
        : index / (currentPalette.length - 1);

    gradient.addColorStop(stop, color);
	});

    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    let link = document.createElement("a");
    link.download = "gradient.png";
    link.href = canvas.toDataURL();
    link.click();
}


window.addEventListener("DOMContentLoaded", function () {

    if (!document.getElementById("colorInputs")) return;

    loadSettings();
	document.getElementById("addColorBtn")
    ?.addEventListener("click", () => addColor());

    document.getElementById("angleSlider")
        ?.addEventListener("input", updateAngle);

    document.getElementById("centerX")
        ?.addEventListener("input", generatePalette);

    document.getElementById("centerY")
        ?.addEventListener("input", generatePalette);

    document.getElementById("gradientType")
        ?.addEventListener("change", updateGradientType);

    loadPresets();

    // Default colors if empty
    if (document.querySelectorAll("#colorInputs > div").length === 0) {
        addColor("#ff0000");
        addColor("#0000ff");
        generatePalette();
    }

});

function deletePalette(id) {

    if(!confirm("Are you sure you want to delete this palette?")){
        return;
    }

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute("content");

    fetch(`/delete_palette/${id}`, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            showToast("Palette deleted!", "danger");
            setTimeout(()=>location.reload(), 800);
        } else {
            showToast("Delete failed", "warning");
        }
    });
}


function editPalette(id) {
    fetch(`/get_palette/${id}`)
        .then(res => res.json())
        .then(data => {
			
			document.getElementById("builderSection").classList.add("editing-mode");
			editingPaletteId = data.id;  // 🔥 track editing
			document.getElementById("cancelEditBtn").style.display = "inline-block";
			loadPaletteIntoBuilder(data);
			// Change button text
			document.getElementById("saveBtn").innerText = "Update Palette";
        });
		
}

function loadPaletteIntoBuilder(data) {

    gradientType = data.gradient_type;
    currentAngle = data.angle;
	
	document.getElementById("centerX").value = data.center_x || 50;
	document.getElementById("centerY").value = data.center_y || 50;
	document.getElementById("gradientType").value = data.gradient_type;
    document.getElementById("angleSlider").value = data.angle;
    document.getElementById("angleValue").innerText = data.angle + "°";
	document.getElementById("paletteName").value = data.name;
    document.getElementById("editStatus").innerText = "Editing: " + data.name;

    updateGradientType(); // important

    document.getElementById("colorInputs").innerHTML = "";
	

    data.colors.forEach(color => addColor(color));

    generatePalette();
}

function cancelEdit() {

    editingPaletteId = null;

    document.getElementById("paletteName").value = "";
    document.getElementById("editStatus").innerText = "";
    document.getElementById("saveBtn").innerText = "Save Palette";

    document.getElementById("cancelEditBtn").style.display = "none";
	document.getElementById("builderSection").classList.remove("editing-mode");
    document.getElementById("colorInputs").innerHTML = "";

    
	loadSettings();
}

function showToast(message, type="primary"){

    let toastEl = document.getElementById("liveToast");
    let toastMsg = document.getElementById("toastMessage");

    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastMsg.innerText = message;

    let toast = new bootstrap.Toast(toastEl);
    toast.show();
}
function showUpgradePopup(message = null){

    if(message){
        document.getElementById("upgradeMessage").innerText = message;
    }

    const modalEl = document.getElementById("upgradeModal");
    const modal = new bootstrap.Modal(modalEl);

    modal.show();

    setTimeout(()=>{
        modalEl.querySelector(".btn-primary")?.focus();
    },300);
}



setInterval(() => {
    if (!editingPaletteId) {
        saveSettings();
    }
}, 2000);



