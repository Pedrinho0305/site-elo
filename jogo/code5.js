gdjs.TELA_32DERROTACode = {};
gdjs.TELA_32DERROTACode.localVariables = [];
gdjs.TELA_32DERROTACode.idToCallbackMap = new Map();
gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects1= [];
gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects2= [];
gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects1= [];
gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects2= [];
gdjs.TELA_32DERROTACode.GDtela_9595derrotaObjects1= [];
gdjs.TELA_32DERROTACode.GDtela_9595derrotaObjects2= [];
gdjs.TELA_32DERROTACode.GDELIASObjects1= [];
gdjs.TELA_32DERROTACode.GDELIASObjects2= [];
gdjs.TELA_32DERROTACode.GDMouse_9595CursorObjects1= [];
gdjs.TELA_32DERROTACode.GDMouse_9595CursorObjects2= [];
gdjs.TELA_32DERROTACode.GDFundoObjects1= [];
gdjs.TELA_32DERROTACode.GDFundoObjects2= [];
gdjs.TELA_32DERROTACode.GDVIDAObjects1= [];
gdjs.TELA_32DERROTACode.GDVIDAObjects2= [];
gdjs.TELA_32DERROTACode.GDcheckpointObjects1= [];
gdjs.TELA_32DERROTACode.GDcheckpointObjects2= [];
gdjs.TELA_32DERROTACode.GDTxt_9595KitMedicoObjects1= [];
gdjs.TELA_32DERROTACode.GDTxt_9595KitMedicoObjects2= [];
gdjs.TELA_32DERROTACode.GDTxt_9595VitoriaObjects1= [];
gdjs.TELA_32DERROTACode.GDTxt_9595VitoriaObjects2= [];
gdjs.TELA_32DERROTACode.GDTxt_9595ARMAObjects1= [];
gdjs.TELA_32DERROTACode.GDTxt_9595ARMAObjects2= [];
gdjs.TELA_32DERROTACode.GDcura_9595itemObjects1= [];
gdjs.TELA_32DERROTACode.GDcura_9595itemObjects2= [];
gdjs.TELA_32DERROTACode.GDInvent_95225rioObjects1= [];
gdjs.TELA_32DERROTACode.GDInvent_95225rioObjects2= [];
gdjs.TELA_32DERROTACode.GDvida_9595bossObjects1= [];
gdjs.TELA_32DERROTACode.GDvida_9595bossObjects2= [];
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595itemObjects1= [];
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595itemObjects2= [];
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595tiroObjects1= [];
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595tiroObjects2= [];
gdjs.TELA_32DERROTACode.GDmira_9595eliasObjects1= [];
gdjs.TELA_32DERROTACode.GDmira_9595eliasObjects2= [];
gdjs.TELA_32DERROTACode.GDcura_9595usarObjects1= [];
gdjs.TELA_32DERROTACode.GDcura_9595usarObjects2= [];
gdjs.TELA_32DERROTACode.GDsaida_9595fase2Objects1= [];
gdjs.TELA_32DERROTACode.GDsaida_9595fase2Objects2= [];


gdjs.TELA_32DERROTACode.mapOfGDgdjs_9546TELA_959532DERROTACode_9546GDBOTAO_95959595REINICIARObjects1Objects = Hashtable.newFrom({"BOTAO_REINICIAR": gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects1});
gdjs.TELA_32DERROTACode.mapOfGDgdjs_9546TELA_959532DERROTACode_9546GDBOTAO_95959595SAIRObjects1Objects = Hashtable.newFrom({"BOTAO_SAIR": gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects1});
gdjs.TELA_32DERROTACode.eventsList0 = function(runtimeScene) {

{

gdjs.copyArray(runtimeScene.getObjects("BOTAO_REINICIAR"), gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.TELA_32DERROTACode.mapOfGDgdjs_9546TELA_959532DERROTACode_9546GDBOTAO_95959595REINICIARObjects1Objects, runtimeScene, true, false);
if (isConditionTrue_0) {
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.isMouseButtonReleased(runtimeScene, "Left");
}
if (isConditionTrue_0) {
{gdjs.evtTools.runtimeScene.replaceScene(runtimeScene, "Fase1", false);
}
}

}


{

gdjs.copyArray(runtimeScene.getObjects("BOTAO_SAIR"), gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects1);

let isConditionTrue_0 = false;
isConditionTrue_0 = false;
isConditionTrue_0 = gdjs.evtTools.input.cursorOnObject(gdjs.TELA_32DERROTACode.mapOfGDgdjs_9546TELA_959532DERROTACode_9546GDBOTAO_95959595SAIRObjects1Objects, runtimeScene, true, false);
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

gdjs.TELA_32DERROTACode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDtela_9595derrotaObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDtela_9595derrotaObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDELIASObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDELIASObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDMouse_9595CursorObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDMouse_9595CursorObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDFundoObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDFundoObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDVIDAObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDVIDAObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDcheckpointObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDcheckpointObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595KitMedicoObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595KitMedicoObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595VitoriaObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595VitoriaObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595ARMAObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595ARMAObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595itemObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595itemObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDInvent_95225rioObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDInvent_95225rioObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDvida_9595bossObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDvida_9595bossObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595itemObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595itemObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595tiroObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595tiroObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDmira_9595eliasObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDmira_9595eliasObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595usarObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595usarObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDsaida_9595fase2Objects1.length = 0;
gdjs.TELA_32DERROTACode.GDsaida_9595fase2Objects2.length = 0;

gdjs.TELA_32DERROTACode.eventsList0(runtimeScene);
gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDBOTAO_9595REINICIARObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDBOTAO_9595SAIRObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDtela_9595derrotaObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDtela_9595derrotaObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDELIASObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDELIASObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDMouse_9595CursorObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDMouse_9595CursorObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDFundoObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDFundoObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDVIDAObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDVIDAObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDcheckpointObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDcheckpointObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595KitMedicoObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595KitMedicoObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595VitoriaObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595VitoriaObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595ARMAObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDTxt_9595ARMAObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595itemObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595itemObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDInvent_95225rioObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDInvent_95225rioObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDvida_9595bossObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDvida_9595bossObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595itemObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595itemObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595tiroObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDarma_9595elias_9595tiroObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDmira_9595eliasObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDmira_9595eliasObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595usarObjects1.length = 0;
gdjs.TELA_32DERROTACode.GDcura_9595usarObjects2.length = 0;
gdjs.TELA_32DERROTACode.GDsaida_9595fase2Objects1.length = 0;
gdjs.TELA_32DERROTACode.GDsaida_9595fase2Objects2.length = 0;


return;

}

gdjs['TELA_32DERROTACode'] = gdjs.TELA_32DERROTACode;
