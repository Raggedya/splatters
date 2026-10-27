// C1.4: values are CSS pixels / world units / seconds. No target seeking.
export const ARCADE=Object.freeze({dragSensitivity:1,maxPullX:64,maxPullY:64,minimumPull:8,minimumDown:4,
 launchSpeed:1550,powerSpeed:180,springSeconds:.055,gravity:95,
 horizontalSpan:.85,aimExponent:1.6,aimAssistance:1,hitTolerance:0,trajectorySpread:.004,impactMargin:.02,launcherDepth:.82,
 // Expected hit duration is about .42–.55s; speed, distance and gravity determine it.
 flightDurationTarget:.60,flightPowerReduction:.05625,inputSmoothingSeconds:.035,reboundEnergy:0});
export const PAINT=Object.freeze({radius:.1859,spreadSeconds:.24,burstSeconds:.48,
 maxEffects:8,maxDrips:36,dripsPerHit:5,runSeconds:3.8,runDistance:64,runStart:.12,branchAfter:.8,lateralSpread:5,
 stepHz:30,completionThreshold:1});
