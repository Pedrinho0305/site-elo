gdjs.MenuCode = {};
gdjs.MenuCode.localVariables = [];
gdjs.MenuCode.idToCallbackMap = new Map();
gdjs.MenuCode.GDTexto_9595MenuObjects1= [];
gdjs.MenuCode.GDTexto_9595MenuObjects2= [];
gdjs.MenuCode.GDFundo_9595SelecaopersonObjects1= [];
gdjs.MenuCode.GDFundo_9595SelecaopersonObjects2= [];
gdjs.MenuCode.GDELIASObjects1= [];
gdjs.MenuCode.GDELIASObjects2= [];
gdjs.MenuCode.GDMouse_9595CursorObjects1= [];
gdjs.MenuCode.GDMouse_9595CursorObjects2= [];
gdjs.MenuCode.GDFundoObjects1= [];
gdjs.MenuCode.GDFundoObjects2= [];
gdjs.MenuCode.GDVIDAObjects1= [];
gdjs.MenuCode.GDVIDAObjects2= [];
gdjs.MenuCode.GDcheckpointObjects1= [];
gdjs.MenuCode.GDcheckpointObjects2= [];
gdjs.MenuCode.GDTxt_9595KitMedicoObjects1= [];
gdjs.MenuCode.GDTxt_9595KitMedicoObjects2= [];
gdjs.MenuCode.GDTxt_9595VitoriaObjects1= [];
gdjs.MenuCode.GDTxt_9595VitoriaObjects2= [];
gdjs.MenuCode.GDTxt_9595ARMAObjects1= [];
gdjs.MenuCode.GDTxt_9595ARMAObjects2= [];
gdjs.MenuCode.GDcura_9595itemObjects1= [];
gdjs.MenuCode.GDcura_9595itemObjects2= [];
gdjs.MenuCode.GDInvent_95225rioObjects1= [];
gdjs.MenuCode.GDInvent_95225rioObjects2= [];
gdjs.MenuCode.GDvida_9595bossObjects1= [];
gdjs.MenuCode.GDvida_9595bossObjects2= [];
gdjs.MenuCode.GDarma_9595elias_9595itemObjects1= [];
gdjs.MenuCode.GDarma_9595elias_9595itemObjects2= [];
gdjs.MenuCode.GDarma_9595elias_9595tiroObjects1= [];
gdjs.MenuCode.GDarma_9595elias_9595tiroObjects2= [];
gdjs.MenuCode.GDmira_9595eliasObjects1= [];
gdjs.MenuCode.GDmira_9595eliasObjects2= [];
gdjs.MenuCode.GDcura_9595usarObjects1= [];
gdjs.MenuCode.GDcura_9595usarObjects2= [];
gdjs.MenuCode.GDsaida_9595fase2Objects1= [];
gdjs.MenuCode.GDsaida_9595fase2Objects2= [];


gdjs.MenuCode.eventsList0 = function(runtimeScene) {

};gdjs.MenuCode.mapOfGDgdjs_9546MenuCode_9546GDELIASObjects1Objects = Hashtable.newFrom({"ELIAS": gdjs.MenuCode.GDELIASObjects1});
gdjs.MenuCode.mapOfGDgdjs_9546MenuCode_9546GDELIASObjects1Objects = Hashtable.newFrom({"ELIAS": gdjs.MenuCode.GDELIASObjects1});
gdjs.MenuCode.mapOfGDgdjs_9546MenuCode_9546GDELIASObjects1Objects = Hashtable.newFrom({"ELIAS": gdjs.MenuCode.GDELIASObjects1});
gdjs.MenuCode.eventsList1 = function(runtimeScene) {

{


gdjs.MenuCode.eventsList0(runtimeScene);
}


{

gdjs.copyArray(runtimeScene.getObjects("ELIAS"), gdjs.MenuCode.GDELIASObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.MenuCode.mapOfGDgdjs_9546MenuCode_9546GDELIASObjects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{runtimeScene.getGame().getVariables().getFromIndex(0).setBoolean(true);
}
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Fase1", false);
}
}

}


{

gdjs.copyArray(runtimeScene.getObjects("ELIAS"), gdjs.MenuCode.GDELIASObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.MenuCode.mapOfGDgdjs_9546MenuCode_9546GDELIASObjects1Objects, runtimeScene, true, true);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
{isConditionTrue_0 = runtimeScene.getOnceTriggers().triggerOnce(18933852);
}
}
if (isConditionTrue_0) {
/* Reuse gdjs.MenuCode.GDELIASObjects1 */
{for(var i = 0, len = gdjs.MenuCode.GDELIASObjects1.length ;i < len;++i) {
    gdjs.MenuCode.GDELIASObjects1[i].getBehavior("Animation").setAnimationName("Frente-Menu");
}
}
}

}


{

gdjs.copyArray(runtimeScene.getObjects("ELIAS"), gdjs.MenuCode.GDELIASObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.MenuCode.mapOfGDgdjs_9546MenuCode_9546GDELIASObjects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
{isConditionTrue_0 = runtimeScene.getOnceTriggers().triggerOnce(18936636);
}
}
if (isConditionTrue_0) {
/* Reuse gdjs.MenuCode.GDELIASObjects1 */
{for(var i = 0, len = gdjs.MenuCode.GDELIASObjects1.length ;i < len;++i) {
    gdjs.MenuCode.GDELIASObjects1[i].getBehavior("Animation").setAnimationName("Frente-Menu");
}
}
}

}


{


let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.runtimeScene.sceneJustBegins(runtimeScene);
if (isConditionTrue_0) {
gdjs.copyArray(runtimeScene.getObjects("ELIAS"), gdjs.MenuCode.GDELIASObjects1);
{gdjs.evtTools.input.hideCursor(runtimeScene);
}
{gdjs.evtTools.camera.centerCamera(runtimeScene, (gdjs.MenuCode.GDELIASObjects1.length !== 0 ? gdjs.MenuCode.GDELIASObjects1[0] : null), true, "", 0);
}
}

}


{


let isConditionTrue_0 = false;
{
gdjs.copyArray(runtimeScene.getObjects("Mouse_Cursor"), gdjs.MenuCode.GDMouse_9595CursorObjects1);
{for(var i = 0, len = gdjs.MenuCode.GDMouse_9595CursorObjects1.length ;i < len;++i) {
    gdjs.MenuCode.GDMouse_9595CursorObjects1[i].setPosition(gdjs.evtTools.input.getCursorX(runtimeScene, "Interface", 0),gdjs.evtTools.input.getCursorY(runtimeScene, "Interface", 0));
}
}
}

}


{


let isConditionTrue_0 = false;
{
}

}


};

gdjs.MenuCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.MenuCode.GDTexto_9595MenuObjects1.length = 0;
gdjs.MenuCode.GDTexto_9595MenuObjects2.length = 0;
gdjs.MenuCode.GDFundo_9595SelecaopersonObjects1.length = 0;
gdjs.MenuCode.GDFundo_9595SelecaopersonObjects2.length = 0;
gdjs.MenuCode.GDELIASObjects1.length = 0;
gdjs.MenuCode.GDELIASObjects2.length = 0;
gdjs.MenuCode.GDMouse_9595CursorObjects1.length = 0;
gdjs.MenuCode.GDMouse_9595CursorObjects2.length = 0;
gdjs.MenuCode.GDFundoObjects1.length = 0;
gdjs.MenuCode.GDFundoObjects2.length = 0;
gdjs.MenuCode.GDVIDAObjects1.length = 0;
gdjs.MenuCode.GDVIDAObjects2.length = 0;
gdjs.MenuCode.GDcheckpointObjects1.length = 0;
gdjs.MenuCode.GDcheckpointObjects2.length = 0;
gdjs.MenuCode.GDTxt_9595KitMedicoObjects1.length = 0;
gdjs.MenuCode.GDTxt_9595KitMedicoObjects2.length = 0;
gdjs.MenuCode.GDTxt_9595VitoriaObjects1.length = 0;
gdjs.MenuCode.GDTxt_9595VitoriaObjects2.length = 0;
gdjs.MenuCode.GDTxt_9595ARMAObjects1.length = 0;
gdjs.MenuCode.GDTxt_9595ARMAObjects2.length = 0;
gdjs.MenuCode.GDcura_9595itemObjects1.length = 0;
gdjs.MenuCode.GDcura_9595itemObjects2.length = 0;
gdjs.MenuCode.GDInvent_95225rioObjects1.length = 0;
gdjs.MenuCode.GDInvent_95225rioObjects2.length = 0;
gdjs.MenuCode.GDvida_9595bossObjects1.length = 0;
gdjs.MenuCode.GDvida_9595bossObjects2.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595itemObjects1.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595itemObjects2.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595tiroObjects1.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595tiroObjects2.length = 0;
gdjs.MenuCode.GDmira_9595eliasObjects1.length = 0;
gdjs.MenuCode.GDmira_9595eliasObjects2.length = 0;
gdjs.MenuCode.GDcura_9595usarObjects1.length = 0;
gdjs.MenuCode.GDcura_9595usarObjects2.length = 0;
gdjs.MenuCode.GDsaida_9595fase2Objects1.length = 0;
gdjs.MenuCode.GDsaida_9595fase2Objects2.length = 0;

gdjs.MenuCode.eventsList1(runtimeScene);
gdjs.MenuCode.GDTexto_9595MenuObjects1.length = 0;
gdjs.MenuCode.GDTexto_9595MenuObjects2.length = 0;
gdjs.MenuCode.GDFundo_9595SelecaopersonObjects1.length = 0;
gdjs.MenuCode.GDFundo_9595SelecaopersonObjects2.length = 0;
gdjs.MenuCode.GDELIASObjects1.length = 0;
gdjs.MenuCode.GDELIASObjects2.length = 0;
gdjs.MenuCode.GDMouse_9595CursorObjects1.length = 0;
gdjs.MenuCode.GDMouse_9595CursorObjects2.length = 0;
gdjs.MenuCode.GDFundoObjects1.length = 0;
gdjs.MenuCode.GDFundoObjects2.length = 0;
gdjs.MenuCode.GDVIDAObjects1.length = 0;
gdjs.MenuCode.GDVIDAObjects2.length = 0;
gdjs.MenuCode.GDcheckpointObjects1.length = 0;
gdjs.MenuCode.GDcheckpointObjects2.length = 0;
gdjs.MenuCode.GDTxt_9595KitMedicoObjects1.length = 0;
gdjs.MenuCode.GDTxt_9595KitMedicoObjects2.length = 0;
gdjs.MenuCode.GDTxt_9595VitoriaObjects1.length = 0;
gdjs.MenuCode.GDTxt_9595VitoriaObjects2.length = 0;
gdjs.MenuCode.GDTxt_9595ARMAObjects1.length = 0;
gdjs.MenuCode.GDTxt_9595ARMAObjects2.length = 0;
gdjs.MenuCode.GDcura_9595itemObjects1.length = 0;
gdjs.MenuCode.GDcura_9595itemObjects2.length = 0;
gdjs.MenuCode.GDInvent_95225rioObjects1.length = 0;
gdjs.MenuCode.GDInvent_95225rioObjects2.length = 0;
gdjs.MenuCode.GDvida_9595bossObjects1.length = 0;
gdjs.MenuCode.GDvida_9595bossObjects2.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595itemObjects1.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595itemObjects2.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595tiroObjects1.length = 0;
gdjs.MenuCode.GDarma_9595elias_9595tiroObjects2.length = 0;
gdjs.MenuCode.GDmira_9595eliasObjects1.length = 0;
gdjs.MenuCode.GDmira_9595eliasObjects2.length = 0;
gdjs.MenuCode.GDcura_9595usarObjects1.length = 0;
gdjs.MenuCode.GDcura_9595usarObjects2.length = 0;
gdjs.MenuCode.GDsaida_9595fase2Objects1.length = 0;
gdjs.MenuCode.GDsaida_9595fase2Objects2.length = 0;


return;

}

gdjs['MenuCode'] = gdjs.MenuCode;
