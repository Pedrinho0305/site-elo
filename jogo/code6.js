gdjs.TELA_32VITORIACode = {};
gdjs.TELA_32VITORIACode.localVariables = [];
gdjs.TELA_32VITORIACode.idToCallbackMap = new Map();
gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects1= [];
gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects2= [];
gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects1= [];
gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects2= [];
gdjs.TELA_32VITORIACode.GDtela_9595vitoriaObjects1= [];
gdjs.TELA_32VITORIACode.GDtela_9595vitoriaObjects2= [];
gdjs.TELA_32VITORIACode.GDELIASObjects1= [];
gdjs.TELA_32VITORIACode.GDELIASObjects2= [];
gdjs.TELA_32VITORIACode.GDMouse_9595CursorObjects1= [];
gdjs.TELA_32VITORIACode.GDMouse_9595CursorObjects2= [];
gdjs.TELA_32VITORIACode.GDFundoObjects1= [];
gdjs.TELA_32VITORIACode.GDFundoObjects2= [];
gdjs.TELA_32VITORIACode.GDVIDAObjects1= [];
gdjs.TELA_32VITORIACode.GDVIDAObjects2= [];
gdjs.TELA_32VITORIACode.GDcheckpointObjects1= [];
gdjs.TELA_32VITORIACode.GDcheckpointObjects2= [];
gdjs.TELA_32VITORIACode.GDTxt_9595KitMedicoObjects1= [];
gdjs.TELA_32VITORIACode.GDTxt_9595KitMedicoObjects2= [];
gdjs.TELA_32VITORIACode.GDTxt_9595VitoriaObjects1= [];
gdjs.TELA_32VITORIACode.GDTxt_9595VitoriaObjects2= [];
gdjs.TELA_32VITORIACode.GDTxt_9595ARMAObjects1= [];
gdjs.TELA_32VITORIACode.GDTxt_9595ARMAObjects2= [];
gdjs.TELA_32VITORIACode.GDcura_9595itemObjects1= [];
gdjs.TELA_32VITORIACode.GDcura_9595itemObjects2= [];
gdjs.TELA_32VITORIACode.GDInvent_95225rioObjects1= [];
gdjs.TELA_32VITORIACode.GDInvent_95225rioObjects2= [];
gdjs.TELA_32VITORIACode.GDvida_9595bossObjects1= [];
gdjs.TELA_32VITORIACode.GDvida_9595bossObjects2= [];
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595itemObjects1= [];
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595itemObjects2= [];
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595tiroObjects1= [];
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595tiroObjects2= [];
gdjs.TELA_32VITORIACode.GDmira_9595eliasObjects1= [];
gdjs.TELA_32VITORIACode.GDmira_9595eliasObjects2= [];
gdjs.TELA_32VITORIACode.GDcura_9595usarObjects1= [];
gdjs.TELA_32VITORIACode.GDcura_9595usarObjects2= [];
gdjs.TELA_32VITORIACode.GDsaida_9595fase2Objects1= [];
gdjs.TELA_32VITORIACode.GDsaida_9595fase2Objects2= [];


gdjs.TELA_32VITORIACode.mapOfGDgdjs_9546TELA_959532VITORIACode_9546GDBOTAO_95959595RECOMECARObjects1Objects = Hashtable.newFrom({"BOTAO_RECOMECAR": gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects1});
gdjs.TELA_32VITORIACode.mapOfGDgdjs_9546TELA_959532VITORIACode_9546GDBOTAO_95959595SAIRObjects1Objects = Hashtable.newFrom({"BOTAO_SAIR": gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects1});
gdjs.TELA_32VITORIACode.eventsList0 = function(runtimeScene) {

{

gdjs.copyArray(runtimeScene.getObjects("BOTAO_RECOMECAR"), gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.TELA_32VITORIACode.mapOfGDgdjs_9546TELA_959532VITORIACode_9546GDBOTAO_95959595RECOMECARObjects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Menu", false);
}
}

}


{

gdjs.copyArray(runtimeScene.getObjects("BOTAO_SAIR"), gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.TELA_32VITORIACode.mapOfGDgdjs_9546TELA_959532VITORIACode_9546GDBOTAO_95959595SAIRObjects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{runtimeScene.getGame().getVariables().getFromIndex(5).setBoolean(false);
}
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Inicio-Jogo", false);
}
}

}


};

gdjs.TELA_32VITORIACode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDtela_9595vitoriaObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDtela_9595vitoriaObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDELIASObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDELIASObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDMouse_9595CursorObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDMouse_9595CursorObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDFundoObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDFundoObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDVIDAObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDVIDAObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDcheckpointObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDcheckpointObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595KitMedicoObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595KitMedicoObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595VitoriaObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595VitoriaObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595ARMAObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595ARMAObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595itemObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595itemObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDInvent_95225rioObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDInvent_95225rioObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDvida_9595bossObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDvida_9595bossObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595itemObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595itemObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595tiroObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595tiroObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDmira_9595eliasObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDmira_9595eliasObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595usarObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595usarObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDsaida_9595fase2Objects1.length = 0;
gdjs.TELA_32VITORIACode.GDsaida_9595fase2Objects2.length = 0;

gdjs.TELA_32VITORIACode.eventsList0(runtimeScene);
gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDBOTAO_9595SAIRObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDBOTAO_9595RECOMECARObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDtela_9595vitoriaObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDtela_9595vitoriaObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDELIASObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDELIASObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDMouse_9595CursorObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDMouse_9595CursorObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDFundoObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDFundoObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDVIDAObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDVIDAObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDcheckpointObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDcheckpointObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595KitMedicoObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595KitMedicoObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595VitoriaObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595VitoriaObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595ARMAObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDTxt_9595ARMAObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595itemObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595itemObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDInvent_95225rioObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDInvent_95225rioObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDvida_9595bossObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDvida_9595bossObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595itemObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595itemObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595tiroObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDarma_9595elias_9595tiroObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDmira_9595eliasObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDmira_9595eliasObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595usarObjects1.length = 0;
gdjs.TELA_32VITORIACode.GDcura_9595usarObjects2.length = 0;
gdjs.TELA_32VITORIACode.GDsaida_9595fase2Objects1.length = 0;
gdjs.TELA_32VITORIACode.GDsaida_9595fase2Objects2.length = 0;


return;

}

gdjs['TELA_32VITORIACode'] = gdjs.TELA_32VITORIACode;
