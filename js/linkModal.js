$(document).ready(function () {
    var targetModal = document.location.hash.replace("#", "");
    if (targetModal.length) {
        // project links
        if (targetModal == "projectPathfinder") {
            $("#project3DPath").modal("show");
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
});