let dragged = null;
let gradientType = "linear";
let currentAngle = 45;
let currentPalette = [];
let editingPaletteId = null;
let upgradeModal = null;





function safeGet(id) {
    return document.getElementById(id);
}
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

        if(container.children.length <= 2){
           showToast("At least Two color required!", "danger");
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

    const preview = safeGet("gradientPreview");
    if(!preview) return;

    preview.style.opacity = 0;

    let wrappers = document.querySelectorAll("#colorInputs > div");

    currentPalette = [];

    wrappers.forEach(wrapper=>{
        let input = wrapper.querySelector("input");
        if(input) currentPalette.push(input.value);
    });

    setTimeout(() => {

        let gradient;

        if(gradientType === "linear"){
            gradient = `linear-gradient(${currentAngle}deg, ${currentPalette.join(",")})`;
        } else {

            const shape = safeGet("radialShape")?.value || "circle";
            const centerX = safeGet("centerX")?.value || 50;
            const centerY = safeGet("centerY")?.value || 50;

            gradient = `radial-gradient(${shape} at ${centerX}% ${centerY}%, ${currentPalette.join(",")})`;
        }
		preview.style.background = gradient;
		preview.style.opacity = 1;

        if(safeGet("cssCode"))
            safeGet("cssCode").innerText = `background: ${gradient};`;

        if (!editingPaletteId) {
            saveSettings();
        }

    }, 150);
}
// Save Settings For Gradient
function saveSettings(){

    const angleSliderEl =
        document.getElementById("angleSlider");

    const colorInputsEl =
        document.getElementById("colorInputs");

    if(!angleSliderEl || !colorInputsEl){
        return;
    }

    const colors = [];

    document.querySelectorAll("#colorInputs input")
    .forEach(input => {
        colors.push(input.value);
    });

    const settings = {
        type: gradientType,
        angle: currentAngle,
        shape:
            document.getElementById("radialShape")?.value
            || "circle",
        colors: colors
    };

    localStorage.setItem(
        "gradientSettings",
        JSON.stringify(settings)
    );
}
// Load Settings function
function loadSettings(){

    const saved = localStorage.getItem("gradientSettings");

    if(!saved) return;

    let settings;

    try{
        settings = JSON.parse(saved);
    }catch(err){
        console.error("Invalid saved settings");
        return;
    }

    // SAFE TYPE
    gradientType =
        settings.type === "radial"
        ? "radial"
        : "linear";

    // REMOVE ACTIVE
    document.querySelectorAll(".switch-btn")
    .forEach(btn => {
        btn.classList.remove("active");
    });

    // SAFE SELECTOR
    const activeBtn = document.querySelector(
        `.switch-btn[data-type="${gradientType}"]`
    );

    if(activeBtn){
        activeBtn.classList.add("active");
    }

    // SHAPE
    const radialShape = document.getElementById("radialShape");

    if(radialShape && settings.shape){
        radialShape.value = settings.shape;
    }

    // RADIAL UI
    const radialOptions =
        document.getElementById("radialOptions");

    const radialCenter =
        document.getElementById("radialCenterOptions");

    if(gradientType === "radial"){
        radialOptions?.style.setProperty("display","block");
        radialCenter?.style.setProperty("display","block");
    }else{
        radialOptions?.style.setProperty("display","none");
        radialCenter?.style.setProperty("display","none");
    }

    // ANGLE
    currentAngle = Number(settings.angle || 45);

    const slider = document.getElementById("angleSlider");

    if(slider){
        slider.value = currentAngle;
    }

    const angleValue =
        document.getElementById("angleValue");

    if(angleValue){
        angleValue.innerText = currentAngle + "°";
    }

    // COLORS
    const colorInputs =
        document.getElementById("colorInputs");

    if(colorInputs){
        colorInputs.innerHTML = "";
    }

    if(Array.isArray(settings.colors)){

        settings.colors.forEach(color => {
            addColor(color);
        });

    }else{

        addColor("#ff0000");
        addColor("#0000ff");

    }

    generatePalette();
}


// Update Gradient Function
function updateGradientType(){

    const radialOptions = safeGet("radialOptions");
    const radialCenter = safeGet("radialCenterOptions");

    if(!radialOptions || !radialCenter) return;

    const isRadial = gradientType === "radial";

    radialOptions.style.display =
        isRadial ? "block" : "none";

    radialCenter.style.display =
        isRadial ? "block" : "none";

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
	if(currentPalette.length < 2){
		showToast("Add at least 2 colors", "warning");
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
		gtag('event', 'palette_saved', {
		gradient_type: gradientType
		});
		
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
    showToast("CSS Code Copied!");
	// Analytics
    if(typeof gtag !== "undefined"){
        gtag('event', 'copy_css');
    }
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
	if(typeof gtag !== "undefined"){
        gtag('event', 'copy_css');
    }
}


document.addEventListener("DOMContentLoaded", () => {

    const modalEl =
        document.getElementById("upgradeModal");

    if(modalEl){
        upgradeModal =
            bootstrap.Modal.getOrCreateInstance(modalEl);
    }
	
});

window.onload = function () {
	
		
    if (!safeGet("angleSlider")) return;

    loadSettings();

    safeGet("angleSlider")
        ?.addEventListener("input", updateAngle);

    safeGet("centerX")
        ?.addEventListener("input", generatePalette);

    safeGet("centerY")
        ?.addEventListener("input", generatePalette);

    // DEFAULT COLORS
    if (
        document.querySelectorAll("#colorInputs > div")
        .length === 0
    ) {
        addColor("#ff0000");
        addColor("#0000ff");
        generatePalette();
    }

    updateGradientType();
};




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

    // SAFE TYPE
    gradientType =
        data.gradient_type === "radial"
        ? "radial"
        : "linear";

    // SAFE ANGLE
    currentAngle = Number(data.angle || 45);

    // REMOVE ACTIVE STATES
    document.querySelectorAll(".switch-btn")
    .forEach(btn => {
        btn.classList.remove("active");
    });

    // SAFE BUTTON SELECT
    const activeBtn = document.querySelector(
        `.switch-btn[data-type="${gradientType}"]`
    );

    if(activeBtn){
        activeBtn.classList.add("active");
    }

    // SLIDER
    if(safeGet("angleSlider")){
        safeGet("angleSlider").value = currentAngle;
    }

    // ANGLE LABEL
    if(safeGet("angleValue")){
        safeGet("angleValue").innerText =
            currentAngle + "°";
    }

    // NAME
    if(safeGet("paletteName")){
        safeGet("paletteName").value =
            data.name || "";
    }

    // STATUS
    if(safeGet("editStatus")){
        safeGet("editStatus").innerText =
            "Editing: " + (data.name || "Palette");
    }

    // RADIAL SHAPE
    if(
        safeGet("radialShape") &&
        data.radial_shape
    ){
        safeGet("radialShape").value =
            data.radial_shape;
    }

    // CENTER VALUES
    if(safeGet("centerX")){
        safeGet("centerX").value =
            data.center_x || 50;
    }

    if(safeGet("centerY")){
        safeGet("centerY").value =
            data.center_y || 50;
    }

    // UPDATE UI
    updateGradientType();

    // RESET COLORS
    if(safeGet("colorInputs")){
        safeGet("colorInputs").innerHTML = "";
    }

    // SAFE COLORS
    if(Array.isArray(data.colors)){

        data.colors.forEach(color => {
            addColor(color);
        });

    } else {

        addColor("#ff0000");
        addColor("#0000ff");

    }

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

function showToast(message, type = "success") {

    const toastEl = document.getElementById("liveToast");
    const toastMsg = document.getElementById("toastMessage");

    if (!toastEl || !toastMsg) {
        console.error("Toast elements missing");
        return;
    }

    toastMsg.innerText = message;

    toastEl.className =
        `toast align-items-center text-bg-${type} border-0`;

    const toast = bootstrap.Toast.getOrCreateInstance(toastEl);

    toast.show();
}

function checkRadial(type){

    // VALIDATE TYPE
    if(type !== "linear" && type !== "radial"){
        return;
    }

    // FREE USER BLOCK
    if(type === "radial" && userPlan === "free"){

        // REMOVE ACTIVE STATE
        document.querySelectorAll(".switch-btn")
        .forEach(btn => {
            btn.classList.remove("active");
        });

        // FORCE LINEAR ACTIVE
        const linearBtn = document.querySelector(
            '.switch-btn[data-type="linear"]'
        );

        if(linearBtn){
            linearBtn.classList.add("active");
        }

        // FORCE SAFE STATE
        gradientType = "linear";

        // HIDE RADIAL UI
        safeGet("radialOptions")?.style.setProperty(
            "display",
            "none"
        );

        safeGet("radialCenterOptions")?.style.setProperty(
            "display",
            "none"
        );

        // SHOW MODAL
        setTimeout(() => {

            showUpgradePopup("Radial gradients are available on Pro 🚀");

        }, 50);

        return;
    }

    // NORMAL FLOW
    gradientType = type;

    // RESET BUTTONS
    document.querySelectorAll(".switch-btn")
    .forEach(btn => {
        btn.classList.remove("active");
    });

    // SAFE ACTIVE BUTTON
    const activeBtn = document.querySelector(
        `.switch-btn[data-type="${type}"]`
    );

    if(activeBtn){
        activeBtn.classList.add("active");
    }

    updateGradientType();
}
function showUpgradeInline(){
    document.getElementById("upgradeInline").classList.remove("hidden");
}

function showUpgradePopup(message = null){

    if(!upgradeModal) return;

    const msg =
        document.getElementById("upgradeMessage");

    if(message && msg){
        msg.innerText = message;
    }

    upgradeModal.show();
	 // Analytics
    if(typeof gtag !== "undefined"){
        gtag('event', 'upgrade_popup_open', {
            plan: userPlan
        });
	}
}

function trackUpgradeClick(){

    if(typeof gtag !== "undefined"){

        gtag('event', 'upgrade_click', {
            source: 'upgrade_modal'
        });

    }
}


setInterval(() => {
    if (!editingPaletteId) {
        saveSettings();
    }
}, 2000);



