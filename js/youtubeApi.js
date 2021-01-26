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

    // randomness tester demo
    playerRandomnessTester = new YT.Player("playerRandomnessTester", {
        class: "embed-responsive-item",
        videoId: "v5oBoQTpg_E",
    });

    $("#projectRandomnessTester").on("hide.bs.modal", function (e) {
        playerRandomnessTester.pauseVideo();
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

    // image processing demo
    playerImageProcessing = new YT.Player("playerImageProcessing", {
        class: "embed-responsive-item",
        videoId: "akm5mnIMP9c",
    });

    $("#projectImageProcessing").on("hide.bs.modal", function (e) {
        playerImageProcessing.pauseVideo();
    });

    // accuracy monitoring demo
    playerAccuracyMonitoring = new YT.Player("playerAccuracyMonitoring", {
        class: "embed-responsive-item",
        videoId: "c19JhXknD3o",
    });

    $("#researchAccMon").on("hide.bs.modal", function (e) {
        playerAccuracyMonitoring.pauseVideo();
    });
    
    // control system demo
    playerControlSystem = new YT.Player("playerControlSystem", {
        class: "embed-responsive-item",
        videoId: "aUTHqa-pE_0",
    });

    playerControlSystemProgramming = new YT.Player("playerControlSystemProgramming", {
        class: "embed-responsive-item",
        videoId: "fG1ktTBb8qo",
    });

    $("#researchControlSys").on("hide.bs.modal", function (e) {
        playerControlSystem.pauseVideo();
        playerControlSystemProgramming.pauseVideo();
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