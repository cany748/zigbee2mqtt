;__out("LOADED defs=" + __mods.reduce(function (a, m) { return a + m.definitions.length; }, 0) + " ms=" + (Date.now() - __t0));
var __r = __workload(__mods, 200000); __out("WORK " + JSON.stringify(__r));
