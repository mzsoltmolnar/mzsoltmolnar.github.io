// Source: https://developers.google.com/youtube/iframe_api_reference

var tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var playerPathfinderDemo;
function onYouTubeIframeAPIReady() {
    // pathfinder demo
    playerPathfinderDemo = new YT.Player("playerPathfinderDemo", {
        class: "embed-responsive-item",
        videoId: "W9REW3eIVRQ",
    });

    $("#project3DPath").on("hide.bs.modal", function (e) {
        playerPathfinderDemo.pauseVideo();
    });

    // measurement modeling demo
    playerMeasurementMod = new YT.Player("playerMeasurementMod", {
        class: "embed-responsive-item",
        videoId: "Uvth-PDN3w4",
    });

    $("#projectMeasMod").on("hide.bs.modal", function (e) {
        playerMeasurementMod.pauseVideo();
    });

    // macro keyboard demo
    playerMacroKeyboard = new YT.Player("playerMacroKeyboard", {
        class: "embed-responsive-item",
        videoId: "DfZe0mD9_6g",
    });

    $("#projectMacroKeyboard").on("hide.bs.modal", function (e) {
        playerMacroKeyboard.pauseVideo();
    });

    // control system demo
    playerControlSystem = new YT.Player("playerControlSystem", {
        class: "embed-responsive-item",
        videoId: "aUTHqa-pE_0",
    });

    $("#researchControlSys").on("hide.bs.modal", function (e) {
        playerControlSystem.pauseVideo();
    });

    // electric skin demo
    playerElectricSkin = new YT.Player("playerElectricSkin", {
        class: "embed-responsive-item",
        videoId: "k3kCEfF_KpA",
    });

    $("#researchElectricSkin").on("hide.bs.modal", function (e) {
        playerElectricSkin.pauseVideo();
    });
}