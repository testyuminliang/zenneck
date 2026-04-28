// What built-in modules does Electron provide?
const builtins = ['electron', '@electron/remote', 'fs', 'path', 'os'];
builtins.forEach(m => {
  try {
    const r = require(m);
    console.log(m + ':', typeof r, typeof r === 'object' ? Object.keys(r).slice(0,5) : r.toString().slice(0,50));
  } catch(e) {
    console.log(m + ' error:', e.message.slice(0, 60));
  }
});
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);
