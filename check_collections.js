const fs = require('fs');
if (fs.existsSync('./node_modules/firebase-admin')) {
    console.log('firebase-admin exists!');
} else {
    console.log('no firebase-admin');
}
