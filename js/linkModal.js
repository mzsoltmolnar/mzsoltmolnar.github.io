$(document).ready(function () {
    var targetModal = document.location.hash.replace("#", "");
    if (targetModal.length) {
        // project links
        if (targetModal == "projectPathfinder") {
            $("#project3DPath").modal("show");
        }
        else if (targetModal == "projectRandomnessTester") {
            $("#projectRandomnessTester").modal("show");
        }
        else if (targetModal == "projectModeling") {
            $("#projectMeasMod").modal("show");
        }
        else if (targetModal == "projectKeyboard") {
            $("#projectMacroKeyboard").modal("show");
        }
        else if (targetModal == "projectRoboControl") {
            $("#projectImageProcessing").modal("show");
        }
        else if (targetModal == "projectRoboCompetitions") {
            $("#projectRobotCompetition").modal("show");
        }

        // research links
        else if (targetModal == "researchMonitoring") {
            $("#researchAccMon").modal("show");
        }
        else if (targetModal == "researchControlSys") {
            $("#researchControlSys").modal("show");
        }
        else if (targetModal == "researchFlexibleControlSys") {
            $("#researchPCSConf").modal("show");
        }
        else if (targetModal == "researchRemoteCNC") {
            $("#researchRemoteCNC").modal("show");
        }
        else if (targetModal == "researchElectricSkin") {
            $("#researchElectricSkin").modal("show");
        }
    }

    // Project
    $("#project3DPath").on("hide.bs.modal", changeUrlToIndex);
    $("#project3DPath").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#projectPathfinder");});

    $("#projectRandomnessTester").on("hide.bs.modal", changeUrlToIndex);
    $("#projectRandomnessTester").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#projectRandomnessTester");});

    $("#projectMeasMod").on("hide.bs.modal", changeUrlToIndex);
    $("#projectMeasMod").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#projectModeling");});


    $("#projectMacroKeyboard").on("hide.bs.modal", changeUrlToIndex);
    $("#projectMacroKeyboard").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#projectKeyboard");});

    $("#projectImageProcessing").on("hide.bs.modal", changeUrlToIndex);
    $("#projectImageProcessing").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#projectRoboControl");});

    $("#projectRobotCompetition").on("hide.bs.modal", changeUrlToIndex);
    $("#projectRobotCompetition").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#projectRoboCompetitions");});


    // Research
    $("#researchAccMon").on("hide.bs.modal", changeUrlToIndex);
    $("#researchAccMon").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#researchMonitoring");});

    $("#researchControlSys").on("hide.bs.modal", changeUrlToIndex);
    $("#researchControlSys").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#researchControlSys");});

    $("#researchPCSConf").on("hide.bs.modal", changeUrlToIndex);
    $("#researchPCSConf").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#researchFlexibleControlSys");});

    $("#researchRemoteCNC").on("hide.bs.modal", changeUrlToIndex);
    $("#researchRemoteCNC").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#researchRemoteCNC");});

    $("#researchElectricSkin").on("hide.bs.modal", changeUrlToIndex);
    $("#researchElectricSkin").on("show.bs.modal", function () {window.history.replaceState(null, "", "/#researchElectricSkin");});

    function changeUrlToIndex() {
        window.history.replaceState(null, "", "/index.html");
    }
});