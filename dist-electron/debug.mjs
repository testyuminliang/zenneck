import * as electron from 'electron';
const api = electron['module.exports'];
console.log('type:', typeof api);
console.log('app:', typeof api?.app);
console.log('keys:', api ? Object.keys(api).slice(0, 10) : 'null');
