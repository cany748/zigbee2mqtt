// Fake coordinator does not use serial; the real binding is a .node addon that a compiled binary cannot load from disk.
exports.autoDetect = () => ({list: async () => []});
exports.LinuxBinding = exports.DarwinBinding = exports.WindowsBinding = exports.autoDetect();
